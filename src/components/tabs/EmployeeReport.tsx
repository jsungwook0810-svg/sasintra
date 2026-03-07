import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTToday, getKSTMonth, feeMap, reportStructure } from '@/lib/utils';
import { doc, setDoc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function EmployeeReport() {
  const { currentUser } = useAuth();
  const { allUserReports } = useData();
  
  const [reportDate, setReportDate] = useState(getKSTToday());
  const [memo, setMemo] = useState('');
  const [formData, setFormData] = useState<Record<string, Record<string, number>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const curMonth = getKSTMonth();
  let tRec = 0, tCom = 0, tPen = 0, tInv = 0, mRevenue = 0;
  
  allUserReports.filter(r => r.date.startsWith(curMonth)).forEach(r => {
    for (let g in r.data) {
      const d = r.data[g];
      tRec += (d["접수"] || 0); tCom += (d["종결"] || 0); tPen += (d["미결"] || 0); tInv += (d["조사미결"] || 0);
      if (feeMap[g]) mRevenue += (d["종결"] || 0) * feeMap[g];
    }
  });

  const groups = currentUser?.company && currentUser?.role && currentUser.role !== '관리자'
    ? (reportStructure[currentUser.company]?.[currentUser.role] || ["기본 업무"])
    : [];

  useEffect(() => {
    if (!editingId) {
      const initialData: Record<string, Record<string, number>> = {};
      groups.forEach(g => {
        initialData[g] = { "접수": 0, "종결": 0, "미결": 0, "조사미결": 0 };
      });
      setFormData(initialData);
    }
  }, [currentUser, editingId]);

  const handleInputChange = (group: string, indicator: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [indicator]: parseInt(value) || 0
      }
    }));
  };

  const handleSubmit = async () => {
    if (!reportDate) return alert("날짜를 선택하세요.");
    
    if (!editingId) {
      const isDuplicate = allUserReports.some(r => r.date === reportDate);
      if (isDuplicate) return alert("이미 마감보고를 하였습니다!");
    }

    const data = {
      userId: currentUser?.userId,
      date: reportDate,
      data: formData,
      memo,
      updatedAt: Date.now()
    };

    if (editingId) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'daily_reports', editingId), data);
      alert("마감보고가 수정되었습니다.");
      handleCancelEdit();
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'daily_reports'), { ...data, createdAt: Date.now() });
      alert("보고가 제출되었습니다.");
    }
  };

  const handleEdit = (id: string) => {
    const r = allUserReports.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setReportDate(r.date);
    setMemo(r.memo || "");
    
    const editData: Record<string, Record<string, number>> = {};
    groups.forEach(g => {
      editData[g] = {
        "접수": r.data[g]?.["접수"] || 0,
        "종결": r.data[g]?.["종결"] || 0,
        "미결": r.data[g]?.["미결"] || 0,
        "조사미결": r.data[g]?.["조사미결"] || 0
      };
    });
    setFormData(editData);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("이 마감보고를 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'daily_reports', id));
      alert("삭제 완료");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setReportDate(getKSTToday());
    setMemo("");
    const initialData: Record<string, Record<string, number>> = {};
    groups.forEach(g => {
      initialData[g] = { "접수": 0, "종결": 0, "미결": 0, "조사미결": 0 };
    });
    setFormData(initialData);
  };

  const sortedReports = [...allUserReports].sort((a, b) => b.date.localeCompare(a.date));
  const limit = showFullHistory ? 10 : 5;

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <div className="font-extrabold text-slate-800 text-base mb-2.5">🗓️ {curMonth.split('-')[1]}월 실적 요약</div>
        
        <div className="bg-sky-50 p-3 rounded-xl border border-sky-200 text-center mb-4">
          <div className="text-xl font-extrabold text-blue-500">(월 누적매출 : {mRevenue.toLocaleString()}원)</div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><span className="block font-extrabold text-lg text-slate-800 leading-tight">{tRec}</span><span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">총 접수</span></div>
          <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><span className="block font-extrabold text-lg text-emerald-500 leading-tight">{tCom}</span><span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">총 종결</span></div>
          <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><span className="block font-extrabold text-lg text-red-500 leading-tight">{tPen}</span><span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">총 미결</span></div>
          <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><span className="block font-extrabold text-lg text-amber-500 leading-tight">{tInv}</span><span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">총 조사</span></div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">항목명</th>
                <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">접수</th>
                <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">종결</th>
                <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">미결</th>
                <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">조사</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                let gRec = 0, gCom = 0, gPen = 0, gInv = 0;
                allUserReports.filter(r => r.date.startsWith(curMonth) && r.data[g]).forEach(r => {
                  gRec += (r.data[g]["접수"] || 0); gCom += (r.data[g]["종결"] || 0); gPen += (r.data[g]["미결"] || 0); gInv += (r.data[g]["조사미결"] || 0);
                });
                return (
                  <tr key={g}>
                    <td className="text-left font-bold text-blue-500 pl-2.5 p-2 border-b border-slate-100 w-[35%]">{g}</td>
                    <td className="text-center p-2 border-b border-slate-100">{gRec}</td>
                    <td className="text-center p-2 border-b border-slate-100 font-bold">{gCom}</td>
                    <td className="text-center p-2 border-b border-slate-100">{gPen}</td>
                    <td className="text-center p-2 border-b border-slate-100">{gInv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <h2 className="text-lg m-0 mb-4 font-bold">📝 마감보고 작성</h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-2">보고 날짜</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
          />
        </div>

        <div>
          {groups.map(gName => (
            <div key={gName}>
              <span className="block mt-4 text-blue-500 font-extrabold border-b-2 border-slate-200 pb-1.5">
                {gName} ({feeMap[gName]?.toLocaleString()}원)
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["접수", "종결", "미결", "조사미결"].map(ind => (
                  <div key={ind} className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                    <label className="block text-center text-[0.65rem] text-slate-500 mb-1.5">{ind}</label>
                    <input
                      type="number"
                      value={formData[gName]?.[ind] || ''}
                      onChange={(e) => handleInputChange(gName, ind, e.target.value)}
                      className="w-full text-center font-bold border-none bg-transparent outline-none"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-2">특이사항</label>
          <textarea
            rows={2}
            placeholder="메모 입력"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
          />
        </div>

        <button onClick={handleSubmit} className="w-full bg-blue-500 text-white p-3 rounded-xl font-bold transition-transform active:scale-95">
          {editingId ? "보고 수정하기" : "보고 제출하기"}
        </button>
        {editingId && (
          <button onClick={handleCancelEdit} className="w-full mt-2.5 bg-transparent border-[1.5px] border-slate-300 text-slate-600 p-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95">
            수정 취소
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <h2 className="text-base m-0 mb-4 font-bold">📑 최근 마감보고 내역</h2>
        <div className="flex flex-col gap-3">
          {sortedReports.slice(0, limit).map(r => {
            let sum = 0;
            for (let k in r.data) if (feeMap[k]) sum += (r.data[k].종결 || 0) * feeMap[k];
            
            const details = Object.keys(r.data).map(k => {
              const d = r.data[k];
              if (d['접수'] || d['종결'] || d['미결'] || d['조사미결']) {
                return <div key={k} className="mt-1 pl-1.5">• {k} : 접수 {d['접수'] || 0} / 종결 {d['종결'] || 0} / 미결 {d['미결'] || 0} / 조사 {d['조사미결'] || 0}</div>;
              }
              return null;
            });

            return (
              <div key={r.id} className="bg-white p-3 rounded-xl border border-slate-200 border-l-[4px] border-l-blue-500 shadow-sm text-xs">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1.5">
                  <b className="text-sm">{r.date}</b>
                  <span className="text-blue-500 font-extrabold">+{sum.toLocaleString()}원</span>
                </div>
                <div className="text-slate-600 leading-relaxed">{details}</div>
                <div className="flex gap-1.5 mt-2 justify-end">
                  <button onClick={() => handleEdit(r.id)} className="bg-blue-500 text-white px-3 py-1 text-xs rounded-lg font-bold">수정</button>
                  <button onClick={() => handleDelete(r.id)} className="bg-red-500 text-white px-3 py-1 text-xs rounded-lg font-bold">삭제</button>
                </div>
              </div>
            );
          })}
          {sortedReports.length === 0 && <p className="text-center text-slate-400 p-2.5">내역 없음</p>}
        </div>
        {!showFullHistory && sortedReports.length > 5 && (
          <button onClick={() => setShowFullHistory(true)} className="w-full mt-4 bg-transparent border-[1.5px] border-slate-300 text-slate-600 p-1.5 rounded-lg text-xs font-bold">
            내역 더보기 (최대 10일)
          </button>
        )}
      </div>
    </div>
  );
}
