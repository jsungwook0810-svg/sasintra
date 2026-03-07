import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTToday, KOR_HOLIDAYS, feeMap } from '@/lib/utils';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function CalendarView() {
  const { currentUser } = useAuth();
  const { allUserReports, allLeavesGlobal, myMemos, globalStaffList, globalAllReports } = useData();
  
  const [currentDate, setCurrentDate] = useState(new Date(getKSTToday() + 'T00:00:00'));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [memoInput, setMemoInput] = useState('');

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const f = new Date(y, m, 1).getDay();
  const l = new Date(y, m + 1, 0).getDate();

  const targetStaffCount = globalStaffList.filter(u => u.approved && u.role !== '관리자' && u.rank !== '팀장').length;

  const changeMonth = (off: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + off);
    setCurrentDate(newDate);
  };

  const handleDayClick = (ds: string) => {
    setSelectedDay(ds);
    const myMemo = myMemos.find(mem => mem.date === ds);
    setMemoInput(myMemo ? myMemo.memo : '');
  };

  const handleSaveMemo = async (ds: string) => {
    if (!memoInput.trim()) return alert("내용을 입력하세요.");
    await setDoc(doc(db, 'artifacts', appId, 'users', currentUser!.userId, 'personal_memos', ds), {
      userId: currentUser!.userId,
      date: ds,
      memo: memoInput.trim(),
      updatedAt: Date.now()
    });
    alert("메모 저장 완료");
    setSelectedDay(null);
  };

  const handleDeleteMemo = async (ds: string) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser!.userId, 'personal_memos', ds));
    alert("메모 삭제 완료");
    setSelectedDay(null);
  };

  const renderCalendarGrid = () => {
    const days = [];
    ['일', '월', '화', '수', '목', '금', '토'].forEach((d, i) => {
      days.push(<div key={`h-${i}`} className="text-center font-bold text-xs p-1 text-slate-500">{d}</div>);
    });

    for (let i = 0; i < f; i++) {
      days.push(<div key={`e-${i}`} className="min-h-[85px]"></div>);
    }

    for (let d = 1; d <= l; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hol = KOR_HOLIDAYS[ds] || "";
      const leaves = allLeavesGlobal.filter(lv => ds >= (lv.startDate || lv.date) && ds <= (lv.endDate || lv.date));
      const hasMemo = myMemos.some(mem => mem.date === ds);
      const r = allUserReports.find(x => x.date === ds);

      let dRev = 0;
      if (r) {
        for (let k in r.data) if (feeMap[k]) dRev += (r.data[k].종결 || 0) * feeMap[k];
      }

      const isSunday = new Date(y, m, d).getDay() === 0;
      const isSaturday = new Date(y, m, d).getDay() === 6;
      const dColor = (isSunday || hol) ? 'text-red-500' : (isSaturday ? 'text-blue-500' : 'text-slate-800');
      const isToday = getKSTToday() === ds;

      let allDoneHtml = null;
      if (currentUser?.role === '관리자') {
        const submittedSet = new Set(globalAllReports.filter(rep => rep.date === ds).map(rep => rep.userId));
        if (targetStaffCount > 0 && submittedSet.size >= targetStaffCount) {
          allDoneHtml = <div className="text-[0.55rem] text-emerald-600 font-bold mt-0.5 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">✓전원완료</div>;
        }
      }

      days.push(
        <div
          key={d}
          onClick={() => handleDayClick(ds)}
          className={`min-h-[85px] bg-slate-50 rounded-lg flex flex-col items-center justify-start text-xs border p-1 relative cursor-pointer overflow-hidden transition-colors hover:bg-slate-100 ${isToday ? 'border-2 border-blue-500 bg-white' : 'border-slate-200'}`}
        >
          <span className={`font-bold ${dColor}`}>{d}</span>
          {hol && <div className="text-[0.55rem] text-red-500 font-bold mt-0.5">{hol}</div>}
          {allDoneHtml}
          {leaves.map((lv, idx) => (
            <div key={idx} className="bg-red-500 text-white text-[0.62rem] sm:text-xs rounded px-1 mt-0.5 w-[94%] text-center whitespace-normal break-words leading-tight font-bold">
              {lv.name}
            </div>
          ))}
          {dRev > 0 && <div className="text-[0.6rem] text-blue-500 font-extrabold mt-0.5 whitespace-nowrap tracking-tighter">{dRev.toLocaleString()}원</div>}
          
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {r && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
            {hasMemo && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-1 mt-2">
        {days}
      </div>
    );
  };

  const renderModal = () => {
    if (!selectedDay) return null;
    const ds = selectedDay;
    const report = allUserReports.find(x => x.date === ds);
    const dayLeaves = allLeavesGlobal.filter(lv => {
      let st = lv.startDate || lv.date || "";
      let en = lv.endDate || lv.date || "";
      return ds >= st && ds <= en;
    });
    const myMemo = myMemos.find(m => m.date === ds);
    const hol = KOR_HOLIDAYS[ds] || "";

    let allDoneHtml = null;
    if (currentUser?.role === '관리자') {
      const submittedSet = new Set(globalAllReports.filter(rep => rep.date === ds).map(rep => rep.userId));
      if (targetStaffCount > 0 && submittedSet.size >= targetStaffCount) {
        allDoneHtml = <div className="bg-emerald-500 text-white p-2 rounded-lg mb-2.5 font-bold text-center shadow-sm text-sm">🎉 모든 직원이 마감보고를 완료했습니다!</div>;
      }
    }

    let dRev = 0;
    let details = null;
    if (report) {
      for (let k in report.data) if (feeMap[k]) dRev += (report.data[k].종결 || 0) * feeMap[k];
      details = Object.keys(report.data).map(k => {
        const d = report.data[k];
        if (d['접수'] || d['종결'] || d['미결'] || d['조사미결']) {
          return <div key={k} className="mt-1 text-sm"><b>{k}</b>: 접수 {d['접수']} / 종결 {d['종결']} / 미결 {d['미결']} / 조사 {d['조사미결']}</div>;
        }
        return null;
      });
    }

    return (
      <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
        <div className="bg-white p-6 rounded-[20px] w-full max-w-[450px] shadow-2xl max-h-[85vh] overflow-y-auto">
          <h2 className="text-lg border-b border-slate-200 pb-2.5 mb-2.5 font-bold">🗓️ {ds} 상세 일정</h2>
          
          {allDoneHtml}
          {hol && <div className="bg-red-500 text-white p-2 rounded-lg mb-2.5 font-bold text-center text-sm">🇰🇷 {hol}</div>}
          
          {dayLeaves.length > 0 && (
            <div className="bg-red-50 p-2.5 rounded-xl mb-2.5 border border-red-200">
              <div className="text-red-500 font-bold text-xs mb-1">🌴 휴가자</div>
              {dayLeaves.map((lv, idx) => <div key={idx} className="text-sm"><b>• {lv.name}</b> ({lv.type})</div>)}
            </div>
          )}

          {report && (
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 mb-2.5">
              <div className="flex justify-between items-center border-b border-emerald-200 pb-1.5 mb-1.5">
                <span className="text-emerald-600 font-bold text-xs">📋 마감 보고 상세 내역</span>
                <span className="text-blue-500 font-bold text-xs">매출: {dRev.toLocaleString()}원</span>
              </div>
              <div className="text-slate-700">{details}</div>
            </div>
          )}

          <div className="mt-4">
            <label className="text-xs font-bold text-slate-800">🔒 개인 메모 (본인만 확인 가능)</label>
            <textarea
              rows={3}
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              className="w-full mt-1.5 p-2.5 rounded-lg border border-slate-300 outline-none focus:border-blue-500 text-sm"
            />
            <div className="flex gap-2.5 mt-2">
              {myMemo ? (
                <>
                  <button onClick={() => handleSaveMemo(ds)} className="flex-1 bg-blue-500 text-white p-2 rounded-lg font-bold text-sm">메모 수정</button>
                  <button onClick={() => handleDeleteMemo(ds)} className="flex-1 bg-red-500 text-white p-2 rounded-lg font-bold text-sm">삭제</button>
                </>
              ) : (
                <button onClick={() => handleSaveMemo(ds)} className="w-full bg-blue-500 text-white p-2 rounded-lg font-bold text-sm">새 메모 저장</button>
              )}
            </div>
          </div>

          <button onClick={() => setSelectedDay(null)} className="w-full mt-4 bg-transparent border-[1.5px] border-slate-300 text-slate-600 p-2 rounded-lg font-bold text-sm">닫기</button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changeMonth(-1)} className="bg-transparent border-[1.5px] border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">◀ 이전달</button>
        <h2 className="text-lg m-0 text-slate-800 font-extrabold">{y}년 {m + 1}월</h2>
        <button onClick={() => changeMonth(1)} className="bg-transparent border-[1.5px] border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">다음달 ▶</button>
      </div>
      {renderCalendarGrid()}
      {renderModal()}
    </div>
  );
}
