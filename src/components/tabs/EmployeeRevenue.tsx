import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTTime } from '@/lib/utils';

export default function EmployeeRevenue() {
  const { currentUser } = useAuth();
  const { globalActualRevenues, allUserReports, globalStaffList } = useData();
  
  const isMaster = currentUser?.userId === 'snk12' || currentUser?.userId === 'testadmin' || (currentUser as any)?.isMaster || currentUser?.name === '정성욱' || currentUser?.rank === '팀장';
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.userId || '');

  const currentYear = getKSTTime().getFullYear().toString();
  const [year, setYear] = useState(currentYear);

  const targetUserId = isMaster && selectedUserId ? selectedUserId : currentUser?.userId;
  const targetUser = globalStaffList.find(u => u.userId === targetUserId) || currentUser;

  let tRev = 0;
  let maxM = "-";
  let maxRev = 0;
  const h: any[] = [];

  const yearlyRevs = globalActualRevenues.filter(r => r.userId === targetUserId && r.month.startsWith(year));

  for (let m = 12; m >= 1; m--) {
    const mStr = `${year}-${String(m).padStart(2, '0')}`;
    const acts = yearlyRevs.filter(r => r.month === mStr);
    
    if (acts.length > 0) {
      const totalAmount = acts.reduce((sum, act) => sum + (act.amount || 0), 0);
      tRev += totalAmount;
      if (totalAmount > maxRev) {
        maxRev = totalAmount;
        maxM = `${m}월`;
      }
      
      h.push(
        <div key={mStr} className="bg-white p-4 rounded-xl border border-slate-200 border-l-[4px] border-l-blue-500 shadow-sm mb-3">
          <div className="flex justify-between items-center">
            <b className="text-sm">{m}월 확정 매출</b>
            <span className="text-blue-500 font-extrabold text-lg">{totalAmount.toLocaleString()}원</span>
          </div>
          {acts.length > 1 && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
              {acts.map((act, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-500">
                  <span>{act.company || targetUser?.company || '기본'}</span>
                  <span>{act.amount.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      if (allUserReports.some(r => r.userId === targetUserId && r.date.startsWith(mStr))) {
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
        <h2 className="text-base text-slate-800 m-0 mb-4 font-bold flex items-center justify-between">
          <span>📈 연간 매출 분석</span>
          {isMaster && (
            <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
              👑 마스터 조회 모드
            </span>
          )}
        </h2>

        {isMaster && (
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-600 mb-2">조회 대상 직원</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-3 border-[1.5px] border-amber-300 rounded-xl text-sm bg-amber-50/50 focus:border-amber-500 focus:bg-white outline-none font-medium"
            >
              <option value={currentUser?.userId}>본인 ({currentUser?.name} / {currentUser?.rank})</option>
              {globalStaffList
                .filter(u => u.approved && !u.isResigned && u.userId !== currentUser?.userId)
                .map(u => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.company} / {u.role} / {u.rank} / {u.userId})
                  </option>
                ))}
            </select>
          </div>
        )}

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
