import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, calculatePerformance } from '@/lib/utils';
import { collection, doc, setDoc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function TeamLeaderEvaluation() {
  const { globalStaffList, globalAllReports, globalActualRevenues } = useData();
  const [selectedMonth, setSelectedMonth] = useState(getKSTMonth());
  const [evaluations, setEvaluations] = useState<any[]>([]);
  
  // Fetch evaluations for the selected month
  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'evaluations'), where("month", "==", selectedMonth));
    const unsub = onSnapshot(q, (snap) => {
      setEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [selectedMonth]);

  // Filter staff for 삼성 누수팀
  const targetStaff = useMemo(() => {
    return globalStaffList.filter(u => u.company === '삼성' && u.role === '누수팀' && u.rank !== '팀장' && u.rank !== '관리자' && !u.isHidden);
  }, [globalStaffList]);

  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  // Calculate scores
  const staffScores = useMemo(() => {
    let maxRev = 0;
    let minLeak = Infinity;
    let maxLeak = -Infinity;

    const staffData = targetStaff.map(u => {
      // Get Evaluation Data
      const evalData = evaluations.find(e => e.userId === u.userId) || {};
      
      // Get Revenue (Strictly Confirmed Revenue)
      let uConfRev = 0;
      if (evalData.overrideRevenue !== undefined) {
        uConfRev = evalData.overrideRevenue;
      } else {
        const acts = globalActualRevenues.filter(ar => ar.userId === u.userId && ar.month === selectedMonth && (ar.company === '삼성' || (!ar.company && u.company === '삼성')));
        if (acts.length > 0) {
          uConfRev = acts.reduce((sum, ar) => sum + (ar.amount || 0), 0);
        }
      }

      if (uConfRev > maxRev) maxRev = uConfRev;

      const extComplaints = evalData.externalComplaints || 0;
      const intComplaints = evalData.internalComplaints || 0;
      const leakScore = evalData.leakScore !== undefined ? evalData.leakScore : 0;

      if (leakScore < minLeak) minLeak = leakScore;
      if (leakScore > maxLeak) maxLeak = leakScore;

      return {
        user: u,
        revenue: uConfRev,
        extComplaints,
        intComplaints,
        leakScore,
        evalData
      };
    });

    const calculated = staffData.map(d => {
      // 1. Revenue Score (50%)
      const revScore = maxRev > 0 ? (d.revenue / maxRev) * 50 : 0;

      // 2. Complaints Score (30%)
      const complaintDeduction = (d.extComplaints * 3) + (d.intComplaints * 1);
      const complaintScore = Math.max(0, 30 - complaintDeduction);

      // 3. Leak Score (20%)
      let leakFinalScore = 20;
      if (maxLeak > minLeak) {
        leakFinalScore = ((maxLeak - d.leakScore) / (maxLeak - minLeak)) * 20;
      } else if (d.leakScore > 0) {
        leakFinalScore = 20;
      }

      const totalScore = revScore + complaintScore + leakFinalScore;

      return {
        ...d,
        revScore,
        complaintScore,
        leakFinalScore,
        totalScore
      };
    }).sort((a, b) => b.totalScore - a.totalScore);

    // Assign Grades and Mileage
    const totalN = calculated.length;
    return calculated.map((s, idx) => {
      let grade = 'B';
      let points = 0;

      if (totalN > 0) {
        if (totalN <= 7) {
          if (idx === 0) { grade = 'S'; points = 5; }
          else if (idx === 1 || idx === 2) { grade = 'A'; points = 3; }
          else if (idx >= totalN - 2 && idx > 2) { grade = 'C'; points = -3; }
          else { grade = 'B'; points = 0; }
        } else {
          const sCount = Math.max(1, Math.round(totalN * 0.15));
          const aCount = Math.max(2, Math.round(totalN * 0.25));
          const cCount = Math.max(2, Math.round(totalN * 0.20));
          
          if (idx < sCount) { grade = 'S'; points = 5; }
          else if (idx < sCount + aCount) { grade = 'A'; points = 3; }
          else if (idx >= totalN - cCount) { grade = 'C'; points = -3; }
          else { grade = 'B'; points = 0; }
        }
      }

      // 대외민원 발생 시 추가 차감 (-3점/건)
      const finalMileage = points - (s.extComplaints * 3);

      return {
        ...s,
        grade,
        gradePoints: points,
        finalMileage
      };
    });

  }, [targetStaff, selectedMonth, globalActualRevenues, evaluations]);

  const handleEditClick = () => {
    const initialDrafts: Record<string, any> = {};
    staffScores.forEach(s => {
      initialDrafts[s.user.userId] = {
        revenue: s.revenue,
        extComplaints: s.extComplaints,
        intComplaints: s.intComplaints,
        leakScore: s.leakScore
      };
    });
    setDrafts(initialDrafts);
    setIsEditing(true);
  };

  const handleDraftChange = (userId: string, field: string, value: number) => {
    setDrafts(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = async () => {
    try {
      const batch = writeBatch(db);
      
      Object.keys(drafts).forEach(userId => {
        const draft = drafts[userId];
        const docId = `${userId}_${selectedMonth}`;
        const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'evaluations'), docId);
        
        batch.set(ref, {
          userId,
          month: selectedMonth,
          company: '삼성',
          role: '누수팀',
          overrideRevenue: draft.revenue,
          externalComplaints: draft.extComplaints,
          internalComplaints: draft.intComplaints,
          leakScore: draft.leakScore,
          updatedAt: Date.now()
        }, { merge: true });
      });
      
      await batch.commit();
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving evaluations:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`${selectedMonth}월 평가 데이터를 정말 초기화하시겠습니까?\n(입력된 매출, 민원, 대물누수평가 점수가 모두 삭제됩니다)`)) return;
    try {
      const batch = writeBatch(db);
      staffScores.forEach(s => {
        const docId = `${s.user.userId}_${selectedMonth}`;
        const ref = doc(collection(db, 'artifacts', appId, 'public', 'data', 'evaluations'), docId);
        batch.delete(ref);
      });
      await batch.commit();
      setIsEditing(false);
      alert("초기화되었습니다.");
    } catch (error) {
      console.error("Reset error:", error);
      alert("초기화 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
        <h2 className="text-xl text-slate-800 m-0 mb-6 font-extrabold tracking-tight flex items-center gap-2">
          <span className="text-2xl">📈</span> 직원 평가 <span className="text-sm font-medium text-slate-400 font-normal ml-2">(삼성 누수팀)</span>
        </h2>

        <div className="flex justify-between items-end mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">평가 월 선택</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={isEditing}
              className="w-full md:w-64 p-3 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium disabled:opacity-50"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleReset}
              disabled={isEditing}
              className="bg-white text-rose-500 border border-rose-200 px-4 py-3 rounded-xl font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              초기화
            </button>
            {isEditing ? (
              <button 
                onClick={handleSaveAll}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors"
              >
                저장하기
              </button>
            ) : (
              <button 
                onClick={handleEditClick}
                className="bg-white text-indigo-600 border border-indigo-200 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
              >
                수정하기
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-sm text-indigo-800">
          <h4 className="font-bold mb-2">📋 평가 기준 안내</h4>
          <ul className="list-disc list-inside space-y-1 text-indigo-700/80">
            <li><b className="text-indigo-800">매출 (50%):</b> 최고 매출 달성자 기준으로 상대평가 됩니다. (확정매출 기준)</li>
            <li><b className="text-indigo-800">민원 (30%):</b> 기본 30점 만점에서 대외민원 1건당 3점 차감, 내부민원 1건당 1점씩 차감됩니다.</li>
            <li><b className="text-indigo-800">대물누수평가 (20%):</b> 점수가 낮을수록 높은 평가를 받으며, 직원 간 상대평가로 점수가 산정됩니다.</li>
            <li><b className="text-indigo-800">고과 등급 및 마일리지:</b> 총점에 따라 등급(S, A, B, C)이 부여되며, S=5점, A=3점, B=0점, C=-3점의 마일리지가 적립됩니다. (대외민원 발생 시 마일리지 추가 -3점 차감)</li>
          </ul>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="p-3 text-sm font-bold text-slate-600 rounded-tl-xl text-center">순위</th>
                <th className="p-3 text-sm font-bold text-slate-600">직원명</th>
                <th className="p-3 text-sm font-bold text-slate-600 text-center">매출 (50%)</th>
                <th className="p-3 text-sm font-bold text-slate-600 text-center">대외민원 (건)</th>
                <th className="p-3 text-sm font-bold text-slate-600 text-center">내부민원 (건)</th>
                <th className="p-3 text-sm font-bold text-slate-600 text-center">대물누수평가</th>
                <th className="p-3 text-sm font-bold text-indigo-600 text-right">총점</th>
                <th className="p-3 text-sm font-bold text-amber-600 text-center rounded-tr-xl">고과/마일리지</th>
              </tr>
            </thead>
            <tbody>
              {staffScores.map((s, idx) => {
                const draft = drafts[s.user.userId] || {};
                
                let gradeColor = 'text-slate-600';
                if (s.grade === 'S') gradeColor = 'text-amber-500';
                if (s.grade === 'A') gradeColor = 'text-emerald-500';
                if (s.grade === 'C') gradeColor = 'text-rose-500';

                return (
                  <tr key={s.user.userId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-sm font-bold text-slate-800 text-center">
                      {isEditing ? '-' : idx + 1}
                    </td>
                    <td className="p-3 text-sm font-bold text-slate-800">
                      {s.user.name} <span className="text-xs text-slate-400 font-normal">({s.user.rank})</span>
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={draft.revenue ?? s.revenue}
                          onChange={(e) => handleDraftChange(s.user.userId, 'revenue', Number(e.target.value))}
                          className="w-24 p-1.5 text-center border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                        />
                      ) : (
                        <>
                          <div className="text-sm font-bold text-slate-700">{s.revenue.toLocaleString()}원</div>
                          <div className="text-xs text-indigo-500 font-medium">{s.revScore.toFixed(1)}점</div>
                        </>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input 
                          type="number" 
                          min="0"
                          value={draft.extComplaints ?? s.extComplaints}
                          onChange={(e) => handleDraftChange(s.user.userId, 'extComplaints', Number(e.target.value))}
                          className="w-16 p-1.5 text-center border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                        />
                      ) : (
                        <div className="text-sm text-slate-700">{s.extComplaints}</div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input 
                          type="number" 
                          min="0"
                          value={draft.intComplaints ?? s.intComplaints}
                          onChange={(e) => handleDraftChange(s.user.userId, 'intComplaints', Number(e.target.value))}
                          className="w-16 p-1.5 text-center border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                        />
                      ) : (
                        <div className="text-sm text-slate-700">{s.intComplaints}</div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={draft.leakScore ?? s.leakScore}
                          onChange={(e) => handleDraftChange(s.user.userId, 'leakScore', Number(e.target.value))}
                          className="w-20 p-1.5 text-center border border-slate-200 rounded-lg text-sm focus:border-indigo-500 outline-none"
                        />
                      ) : (
                        <>
                          <div className="text-sm text-slate-700">{s.leakScore}</div>
                          <div className="text-xs text-indigo-500 font-medium mt-1">{s.leakFinalScore.toFixed(1)}점</div>
                        </>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {isEditing ? (
                        <div className="text-sm text-slate-400">저장 후 계산됨</div>
                      ) : (
                        <>
                          <div className="text-lg font-extrabold text-indigo-600">{s.totalScore.toFixed(1)}점</div>
                          <div className="text-xs text-slate-400">민원: {s.complaintScore.toFixed(1)}점</div>
                        </>
                      )}
                    </td>
                    <td className="p-3 text-center bg-amber-50/30">
                      {isEditing ? (
                        <div className="text-sm text-slate-400">-</div>
                      ) : (
                        <>
                          <div className={`text-xl font-black ${gradeColor}`}>{s.grade}</div>
                          <div className={`text-xs font-bold mt-1 ${s.finalMileage < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {s.finalMileage > 0 ? '+' : ''}{s.finalMileage}점
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {staffScores.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                    평가 대상 직원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
