import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTTime } from '@/lib/utils';

export default function EmployeeRevenue() {
  const { currentUser } = useAuth();
  const { globalActualRevenues, allUserReports } = useData();
  
  const currentYear = getKSTTime().getFullYear().toString();
  const [year, setYear] = useState(currentYear);

  let tRev = 0;
  let maxM = "-";
  let maxRev = 0;
  const h: any[] = [];

  const yearlyRevs = globalActualRevenues.filter(r => r.userId === currentUser?.userId && r.month.startsWith(year));

  for (let m = 12; m >= 1; m--) {
    const mStr = `${year}-${String(m).padStart(2, '0')}`;
    const act = yearlyRevs.find(r => r.month === mStr);
    
    if (act) {
      tRev += act.amount;
      if (act.amount > maxRev) {
        maxRev = act.amount;
        maxM = `${m}월`;
      }
      h.push(
        <div key={mStr} className="bg-white p-4 rounded-xl border border-slate-200 border-l-[4px] border-l-blue-500 shadow-sm mb-3">
          <div className="flex justify-between items-center">
            <b className="text-sm">{m}월 확정 매출</b>
            <span className="text-blue-500 font-extrabold text-lg">{act.amount.toLocaleString()}원</span>
          </div>
        </div>
      );
    } else {
      if (allUserReports.some(r => r.date.startsWith(mStr))) {
        h.push(
          <div key={mStr} className="bg-slate-50 p-4 rounded-xl border border-slate-200 opacity-80 mb-3">
            <div className="flex justify-between items-center">
              <b className="text-slate-500 text-sm">{m}월</b>
              <span className="text-slate-400 text-xs">정산 대기 중</span>
            </div>
          </div>
        );
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <h2 className="text-base text-slate-800 m-0 mb-4 font-bold">📈 연간 매출 분석</h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-2">조회 연도</label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
          >
            <option value={currentYear}>{currentYear}년</option>
            <option value={(parseInt(currentYear) - 1).toString()}>{parseInt(currentYear) - 1}년</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white p-3 rounded-xl text-center border border-slate-200">
            <span className="block font-extrabold text-lg text-blue-500">{tRev.toLocaleString()}원</span>
            <span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">연간 총 매출</span>
          </div>
          <div className="bg-white p-3 rounded-xl text-center border border-slate-200">
            <span className="block font-extrabold text-lg text-red-500">{maxRev > 0 ? `${maxM} (${maxRev.toLocaleString()}원)` : "-"}</span>
            <span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">최고 달성월</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <h2 className="text-base m-0 mb-4 font-bold">📋 월별 확정 매출 내역</h2>
        <div className="flex flex-col">
          {h.length > 0 ? h : <p className="text-center text-slate-500 text-sm">데이터가 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}
