import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTToday, getKSTMonth, feeMap, reportStructure, getReportCompany, getReportRole } from '@/lib/utils';
import { doc, setDoc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function EmployeeReport() {
  const { currentUser } = useAuth();
  const { allUserReports } = useData();
  
  const [reportDate, setReportDate] = useState(getKSTToday());
  const [memo, setMemo] = useState('');
  const [formData, setFormData] = useState<Record<string, Record<string, number>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const curMonth = getKSTMonth();
  let tRec = 0, tCom = 0, tPen = 0, mRevenue = 0;
  
  const sortedReportsForMonth = [...allUserReports]
    .filter(r => r.date.startsWith(curMonth))
    .sort((a, b) => a.date.localeCompare(b.date));

  let latestPending: Record<string, number> = {};

  sortedReportsForMonth.forEach(r => {
    for (let g in r.data) {
      const d = r.data[g];
      tRec += (d["접수"] || 0); 
      tCom += (d["종결"] || 0); 
      if (d["미결"] !== undefined) latestPending[g] = d["미결"];
      if (feeMap[g]) mRevenue += (d["종결"] || 0) * feeMap[g];
    }
  });

  tPen = Object.values(latestPending).reduce((a, b) => a + b, 0);

  const baseGroups = currentUser?.company && currentUser?.role && currentUser.role !== '관리자'
    ? (reportStructure[currentUser.company]?.[currentUser.role] || ["기본 업무"])
    : [];
  const groups = [...baseGroups, "조사미결"];

  useEffect(() => {
    if (!editingId) {
      const initialData: Record<string, Record<string, number>> = {};
      groups.forEach(g => {
        initialData[g] = { "접수": 0, "종결": 0, "미결": 0 };
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
    
    const today = getKSTToday();
    if (reportDate > today) {
      return alert("당일 이후의 날짜는 입력할 수 없습니다.");
    }
    
    let currentEditingId = editingId;

    if (!currentEditingId) {
      const existingReport = allUserReports.find(r => r.date === reportDate);
      if (existingReport) {
        if (existingReport.isExcluded) {
          currentEditingId = existingReport.id;
        } else {
          return alert("이미 마감보고를 하였습니다!");
        }
      }
    }

    let reportCompany = currentUser?.company || "전체";
    let reportRole = currentUser?.role || "기본 업무";

    if (currentEditingId) {
      const existingReport = allUserReports.find(r => r.id === currentEditingId);
      if (existingReport) {
        reportCompany = getReportCompany(existingReport, currentUser);
        reportRole = getReportRole(existingReport, currentUser);
      }
    }

    const data = {
      userId: currentUser?.userId,
      date: reportDate,
      data: formData,
      memo,
      company: reportCompany,
      role: reportRole,
      isExcluded: false,
      updatedAt: Date.now()
    };

    if (currentEditingId) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'daily_reports', currentEditingId), data);
      const wasExcluded = allUserReports.find(r => r.id === currentEditingId)?.isExcluded;
      alert(wasExcluded ? "보고가 제출되었습니다." : "마감보고가 수정되었습니다.");
      handleCancelEdit();
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'daily_reports'), { ...data, createdAt: Date.now() });
      alert("보고가 제출되었습니다.");
      handleCancelEdit();
    }
  };

  const handleEdit = (id: string) => {
    const r = allUserReports.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setReportDate(r.date);
    setMemo(r.memo || "");
    
    const editData: Record<string, Record<string, number>> = {};
    
    if (r.isExcluded) {
      groups.forEach(g => {
        editData[g] = { "접수": 0, "종결": 0, "미결": 0 };
      });
    } else {
      const reportGroups = Object.keys(r.data);
      reportGroups.forEach(g => {
        editData[g] = {
          "접수": r.data[g]?.["접수"] || 0,
          "종결": r.data[g]?.["종결"] || 0,
          "미결": r.data[g]?.["미결"] || 0
        };
      });
    }
    
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
      initialData[g] = { "접수": 0, "종결": 0, "미결": 0 };
    });
    setFormData(initialData);
  };

  const sortedReports = [...allUserReports].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-400 to-blue-500"></div>
        <div className="font-extrabold text-slate-800 text-xl mb-6 tracking-tight flex items-center gap-2">
          <span className="text-2xl">🗓️</span> {curMonth.split('-')[1]}월 실적 요약
        </div>
        
        <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-100 text-center mb-6 shadow-inner">
          <div className="text-sm font-bold text-indigo-400 mb-1">월 누적 예상 매출</div>
          <div className="text-3xl font-black text-indigo-600 tracking-tight">{mRevenue.toLocaleString()}<span className="text-lg ml-1">원</span></div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl text-center border border-slate-100 shadow-sm"><span className="block font-black text-2xl text-slate-800 leading-tight">{tRec}</span><span className="block text-xs text-slate-400 mt-1 font-bold">총 접수</span></div>
          <div className="bg-white p-4 rounded-2xl text-center border border-slate-100 shadow-sm"><span className="block font-black text-2xl text-emerald-500 leading-tight">{tCom}</span><span className="block text-xs text-slate-400 mt-1 font-bold">총 종결</span></div>
          <div className="bg-white p-4 rounded-2xl text-center border border-slate-100 shadow-sm"><span className="block font-black text-2xl text-rose-500 leading-tight">{tPen}</span><span className="block text-xs text-slate-400 mt-1 font-bold">총 미결</span></div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-slate-50/80 p-3 border-b border-slate-200/60 text-center text-slate-500 font-bold">항목명</th>
                <th className="bg-slate-50/80 p-3 border-b border-slate-200/60 text-center text-slate-500 font-bold">접수</th>
                <th className="bg-slate-50/80 p-3 border-b border-slate-200/60 text-center text-slate-500 font-bold">종결</th>
                <th className="bg-slate-50/80 p-3 border-b border-slate-200/60 text-center text-slate-500 font-bold">미결</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                let gRec = 0, gCom = 0, gPen = 0;
                let gLatestPending = 0;
                sortedReportsForMonth.filter(r => r.data[g]).forEach(r => {
                  gRec += (r.data[g]["접수"] || 0); 
                  gCom += (r.data[g]["종결"] || 0); 
                  if (r.data[g]["미결"] !== undefined) gLatestPending = r.data[g]["미결"];
                });
                gPen = gLatestPending;
                return (
                  <tr key={g} className="hover:bg-slate-50/50 transition-colors">
                    <td className="text-left font-bold text-indigo-600 pl-4 p-3 border-b border-slate-100 w-[40%]">{g}</td>
                    <td className="text-center p-3 border-b border-slate-100 font-medium text-slate-600">{gRec}</td>
                    <td className="text-center p-3 border-b border-slate-100 font-bold text-emerald-600">{gCom}</td>
                    <td className="text-center p-3 border-b border-slate-100 font-medium text-slate-600">{gPen}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
        <h2 className="text-xl m-0 mb-6 font-extrabold tracking-tight flex items-center gap-2 text-slate-800">
          <span className="text-2xl">📝</span> 마감보고 작성
        </h2>
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-600 mb-2">보고 날짜</label>
          <input
            type="date"
            value={reportDate}
            max={getKSTToday()}
            onChange={(e) => setReportDate(e.target.value)}
            className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
          />
        </div>

        <div className="space-y-6">
          {Object.keys(formData).map(gName => (
            <div key={gName} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-3 mb-4">
                <span className="text-indigo-600 font-extrabold text-base tracking-tight">{gName}</span>
                {feeMap[gName] !== undefined && (
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100">단가: {feeMap[gName].toLocaleString()}원</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["접수", "종결", "미결"].map(ind => {
                  if (gName === "조사미결" && (ind === "접수" || ind === "종결")) return null;
                  return (
                    <div key={ind} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                      <label className="block text-center text-[0.7rem] text-slate-500 mb-2 font-bold">{ind}</label>
                      <input
                        type="number"
                        value={formData[gName]?.[ind] || ''}
                        onChange={(e) => handleInputChange(gName, ind, e.target.value)}
                        className="w-full text-center font-black text-lg border-none bg-transparent outline-none text-slate-800 placeholder:text-slate-300"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 mb-8">
          <label className="block text-sm font-bold text-slate-600 mb-2">특이사항</label>
          <textarea
            rows={3}
            placeholder="메모를 입력하세요"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium resize-none"
          />
        </div>

        <button onClick={handleSubmit} className="w-full bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] text-[1rem]">
          {editingId ? (allUserReports.find(r => r.id === editingId)?.isExcluded ? "보고 제출하기" : "보고 수정하기") : "보고 제출하기"}
        </button>
        {editingId && (
          <button onClick={handleCancelEdit} className="w-full mt-3 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-bold transition-colors">
            {allUserReports.find(r => r.id === editingId)?.isExcluded ? "작성 취소" : "수정 취소"}
          </button>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
        <h2 className="text-xl m-0 mb-6 font-extrabold tracking-tight flex items-center gap-2 text-slate-800">
          <span className="text-2xl">📑</span> 최근 마감보고 내역
        </h2>
        <div className="flex flex-col gap-4">
          {sortedReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(r => {
            let sum = 0;
            for (let k in r.data) if (feeMap[k]) sum += (r.data[k].종결 || 0) * feeMap[k];
            
            const details = Object.keys(r.data).map(k => {
              const d = r.data[k];
              if (d['접수'] || d['종결'] || d['미결']) {
                return <div key={k} className="mt-1.5 pl-2 text-sm"><span className="font-bold text-slate-700">• {k}</span> : 접수 {d['접수'] || 0} / 종결 <span className="text-emerald-600 font-bold">{d['종결'] || 0}</span> / 미결 {d['미결'] || 0}</div>;
              }
              return null;
            });

            return (
              <div key={r.id} className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group ${r.isExcluded ? 'opacity-70' : ''}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${r.isExcluded ? 'bg-slate-300' : 'bg-indigo-400'}`}></div>
                <div className="flex justify-between items-center border-b border-slate-100/80 pb-3 mb-3 pl-2">
                  <b className="text-base text-slate-800">{r.date} {r.isExcluded && <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">제출 제외됨</span>}</b>
                  {!r.isExcluded && <span className="text-indigo-600 font-black text-lg">+{sum.toLocaleString()}원</span>}
                </div>
                {!r.isExcluded && <div className="text-slate-500 leading-relaxed pl-2">{details}</div>}
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => handleEdit(r.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs rounded-xl font-bold transition-colors">{r.isExcluded ? '보고 작성' : '수정'}</button>
                  <button onClick={() => handleDelete(r.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 text-xs rounded-xl font-bold transition-colors">삭제</button>
                </div>
              </div>
            );
          })}
          {sortedReports.length === 0 && <p className="text-center text-slate-400 p-6 font-medium bg-slate-50/50 rounded-2xl">내역이 없습니다.</p>}
        </div>

        {sortedReports.length > itemsPerPage && (
          <div className="flex justify-center gap-2 mt-6">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:bg-slate-50 bg-white shadow-sm hover:bg-slate-50 transition-colors"
            >
              이전
            </button>
            <span className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
              {currentPage} / {Math.ceil(sortedReports.length / itemsPerPage)}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedReports.length / itemsPerPage), p + 1))}
              disabled={currentPage === Math.ceil(sortedReports.length / itemsPerPage)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:bg-slate-50 bg-white shadow-sm hover:bg-slate-50 transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
