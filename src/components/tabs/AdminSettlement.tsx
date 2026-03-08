import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, calculatePerformance } from '@/lib/utils';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function AdminSettlement() {
  const { globalStaffList, globalAllReports, globalActualRevenues } = useData();
  const [subTab, setSubTab] = useState<'input' | 'stats'>('input');
  const [month, setMonth] = useState(getKSTMonth());
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [actualRevenue, setActualRevenue] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('삼성');

  const staffList = globalStaffList.filter(u => 
    u.rank !== '팀장' && 
    u.role !== '관리자' && 
    u.company === selectedCompany &&
    (u.approved || globalAllReports.some(r => r.userId === u.userId && r.date.startsWith(month)) || globalActualRevenues.some(r => r.userId === u.userId && r.month === month))
  );

  const handleSaveActualRevenue = async () => {
    if (!selectedStaff) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'actual_revenues', `${selectedStaff.userId}_${month}`), {
      userId: selectedStaff.userId,
      month,
      amount: actualRevenue,
      updatedAt: Date.now()
    }, { merge: true });
    setIsModalOpen(false);
    alert("정산 완료");
  };

  const handleDeleteActualRevenue = async (uid: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'actual_revenues', `${uid}_${month}`));
      alert("삭제됨");
    }
  };

  const openModal = (staff: any, provRevenue: number) => {
    setSelectedStaff(staff);
    const ex = globalActualRevenues.find(r => r.userId === staff.userId && r.month === month);
    setActualRevenue(ex ? ex.amount : provRevenue);
    setIsModalOpen(true);
  };

  const renderInput = () => (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 mb-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
      <h2 className="text-xl text-slate-800 m-0 mb-6 font-extrabold tracking-tight flex items-center gap-2">
        <span className="text-2xl">💰</span> 월간 매출 관리 <span className="text-sm font-medium text-slate-400 font-normal ml-2">(확정 매출 입력)</span>
      </h2>
      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-600 mb-2">📅 조회 월 선택</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
        />
      </div>

      <div className="my-6 p-5 bg-rose-50/80 rounded-2xl border border-rose-100">
        <h3 className="text-sm text-rose-600 m-0 mb-4 font-bold flex items-center gap-2">
          <span className="animate-pulse">⚠️</span> 이달의 미정산 직원
        </h3>
        <div className="flex flex-col gap-3">
          {staffList.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-4 bg-white/50 rounded-xl">해당 보험사에 등록된 직원이 없습니다.</p>
          ) : (
            <>
              {staffList.map(u => {
                const p = calculatePerformance(u.userId, month, globalStaffList, globalAllReports, globalActualRevenues);
                if (!p) return null;
                const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
                if (act) return null;

                return (
                  <div key={u.userId} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-400"></div>
                    <div className="flex justify-between items-center pl-2">
                      <b className="text-sm text-slate-800">{u.name} <small className="text-slate-400 font-medium ml-1">({u.company}/{u.role}/{u.rank})</small></b>
                      <button onClick={() => openModal(u, p.revenue)} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 text-xs rounded-xl font-bold transition-colors shadow-sm shadow-rose-500/20">정산입력</button>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 pl-2 font-medium">보고(가매출): <span className="text-slate-700 font-bold">{p.revenue.toLocaleString()}</span>원</div>
                  </div>
                );
              })}
              {staffList.filter(u => {
                const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
                return !act;
              }).length === 0 && <p className="text-center text-sm text-emerald-600 font-bold py-4 bg-emerald-50/50 rounded-xl">🎉 전원 정산 완료!</p>}
            </>
          )}
        </div>
      </div>

      <h3 className="text-sm text-slate-800 mt-8 mb-4 font-bold flex items-center gap-2">
        <span>✅</span> 완료된 정산 내역
      </h3>
      <div className="flex flex-col gap-3">
        {staffList.map(u => {
          const p = calculatePerformance(u.userId, month, globalStaffList, globalAllReports, globalActualRevenues);
          if (!p) return null;
          const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
          if (!act) return null;

          return (
            <div key={u.userId} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400"></div>
              <div className="flex justify-between items-center pl-2 mb-3">
                <b className="text-sm text-slate-800">{u.name} <small className="text-slate-500 font-medium ml-1">({u.company}/{u.role}/{u.rank})</small></b>
                <div className="flex gap-2">
                  <button onClick={() => openModal(u, p.revenue)} className="bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-3 py-1.5 text-xs rounded-xl font-bold transition-colors">수정</button>
                  <button onClick={() => handleDeleteActualRevenue(u.userId)} className="bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 px-3 py-1.5 text-xs rounded-xl font-bold transition-colors">삭제</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pl-2 bg-white/60 p-3 rounded-xl border border-emerald-50/50">
                <div className="text-slate-500 font-medium">보고: <span className="text-slate-700">{p.revenue.toLocaleString()}</span>원</div>
                <div className="text-emerald-600 font-bold">확정: {act.amount.toLocaleString()}원</div>
                <div className="text-slate-500 font-medium">인센: <span className="text-amber-600 font-bold">{p.incentive.toLocaleString()}</span>원</div>
                <div className="text-rose-500 font-bold">실수령: {p.netPay.toLocaleString()}원</div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-[420px] shadow-2xl border border-white/20">
            <h2 className="text-xl font-extrabold mb-2 text-slate-800 tracking-tight">💰 정식 매출액 확정</h2>
            <p className="font-bold text-indigo-600 mb-6">{selectedStaff?.name}님</p>
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-600 mb-2">보험사 확인 정식 매출 (원)</label>
              <input
                type="number"
                value={actualRevenue}
                onChange={(e) => setActualRevenue(Number(e.target.value))}
                className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-bold transition-colors">취소</button>
              <button onClick={handleSaveActualRevenue} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStats = () => {
    const year = month.split('-')[0];
    
    // Monthly stats calculation
    let totalMonthlyRevenue = 0;
    let activeStaffCount = 0;
    const monthlyRankings: {name: string, company: string, role: string, rank: string, revenue: number}[] = [];

    staffList.forEach(u => {
      const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
      if (act && act.amount > 0) {
        totalMonthlyRevenue += act.amount;
        activeStaffCount++;
        monthlyRankings.push({
          name: u.name,
          company: u.company,
          role: u.role,
          rank: u.rank,
          revenue: act.amount
        });
      }
    });

    monthlyRankings.sort((a, b) => b.revenue - a.revenue);
    const averageMonthlyRevenue = activeStaffCount > 0 ? Math.round(totalMonthlyRevenue / activeStaffCount) : 0;

    // Annual stats calculation
    const annualRevenues: Record<string, {name: string, company: string, role: string, rank: string, total: number}> = {};
    staffList.forEach(u => {
      annualRevenues[u.userId] = { name: u.name, company: u.company, role: u.role, rank: u.rank, total: 0 };
    });

    // We need to sum up all months in the selected year
    for (let m = 1; m <= 12; m++) {
      const mStr = `${year}-${m.toString().padStart(2, '0')}`;
      staffList.forEach(u => {
        const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === mStr);
        if (act && act.amount > 0) {
          annualRevenues[u.userId].total += act.amount;
        }
      });
    }

    const annualList = Object.values(annualRevenues).filter(u => u.total > 0).sort((a, b) => b.total - a.total);
    const highestAnnual = annualList.length > 0 ? annualList[0] : null;
    const lowestAnnual = annualList.length > 0 ? annualList[annualList.length - 1] : null;

    return (
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
        <h2 className="text-xl text-slate-800 m-0 mb-6 font-extrabold tracking-tight flex items-center gap-2">
          <span className="text-2xl">📊</span> 매출 통계 <span className="text-sm font-medium text-slate-400 font-normal ml-2">(연/월 기준)</span>
        </h2>
        
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-600 mb-2">📅 조회 연/월 선택</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-indigo-50/80 p-6 rounded-3xl border border-indigo-100 shadow-sm">
            <div className="text-sm font-bold text-indigo-500 mb-2">전 직원 누적 월매출 ({month})</div>
            <div className="text-3xl font-black text-indigo-700 tracking-tight">{totalMonthlyRevenue.toLocaleString()}<span className="text-lg ml-1">원</span></div>
          </div>
          <div className="bg-purple-50/80 p-6 rounded-3xl border border-purple-100 shadow-sm">
            <div className="text-sm font-bold text-purple-500 mb-2">전 직원 평균 월매출 ({month})</div>
            <div className="text-3xl font-black text-purple-700 tracking-tight">{averageMonthlyRevenue.toLocaleString()}<span className="text-lg ml-1">원</span></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg text-slate-800 mb-4 font-extrabold flex items-center gap-2">
            <span>🏆</span> {year}년 연간 최고/최저 매출
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highestAnnual ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400"></div>
                <div className="text-xs font-bold text-amber-500 mb-1">연간 최고 매출</div>
                <div className="font-bold text-slate-800 text-lg mb-1">{highestAnnual.name} <span className="text-xs text-slate-400 font-medium">({highestAnnual.company}/{highestAnnual.role}/{highestAnnual.rank})</span></div>
                <div className="text-amber-600 font-black text-xl">{highestAnnual.total.toLocaleString()}원</div>
              </div>
            ) : (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-400 text-sm font-medium text-center">데이터 없음</div>
            )}
            {lowestAnnual && lowestAnnual.userId !== highestAnnual?.userId ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-300"></div>
                <div className="text-xs font-bold text-slate-500 mb-1">연간 최저 매출</div>
                <div className="font-bold text-slate-800 text-lg mb-1">{lowestAnnual.name} <span className="text-xs text-slate-400 font-medium">({lowestAnnual.company}/{lowestAnnual.role}/{lowestAnnual.rank})</span></div>
                <div className="text-slate-600 font-black text-xl">{lowestAnnual.total.toLocaleString()}원</div>
              </div>
            ) : (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-400 text-sm font-medium text-center">데이터 없음</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg text-slate-800 mb-4 font-extrabold flex items-center gap-2">
            <span>📈</span> {month}월 매출 순위
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
            {monthlyRankings.length > 0 ? (
              monthlyRankings.map((staff, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{staff.name}</div>
                      <div className="text-xs text-slate-500">{staff.company} / {staff.role} / {staff.rank}</div>
                    </div>
                  </div>
                  <div className="font-black text-indigo-600">
                    {staff.revenue.toLocaleString()}원
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 font-medium">해당 월의 매출 데이터가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4 flex items-center justify-between">
        <label className="font-bold text-slate-700 mr-4">🏢 보험사 선택</label>
        <select 
          value={selectedCompany} 
          onChange={(e) => setSelectedCompany(e.target.value)} 
          className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 outline-none font-medium"
        >
          <option value="삼성">삼성</option>
          <option value="마이브라운">마이브라운</option>
        </select>
      </div>

      <nav className="flex bg-slate-100/80 backdrop-blur-sm rounded-2xl p-1.5 mb-6 border border-slate-200/50">
        <div
          onClick={() => setSubTab('input')}
          className={`flex-1 p-3 text-sm font-bold text-center rounded-xl cursor-pointer transition-all ${subTab === 'input' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
        >
          💰 정산 입력
        </div>
        <div
          onClick={() => setSubTab('stats')}
          className={`flex-1 p-3 text-sm font-bold text-center rounded-xl cursor-pointer transition-all ${subTab === 'stats' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}
        >
          📊 매출 통계
        </div>
      </nav>
      {subTab === 'input' ? renderInput() : renderStats()}
    </div>
  );
}
