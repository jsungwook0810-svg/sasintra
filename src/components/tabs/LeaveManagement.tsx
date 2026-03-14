import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTToday, calculateAnnualLeave, getBusinessDays } from '@/lib/utils';
import { doc, setDoc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function LeaveManagement() {
  const { currentUser } = useAuth();
  const { allLeavesGlobal } = useData();
  
  const [startDate, setStartDate] = useState(getKSTToday());
  const [endDate, setEndDate] = useState(getKSTToday());
  const [leaveType, setLeaveType] = useState('연차 (종일)');
  const [memo, setMemo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const myLeaves = allLeavesGlobal.filter(l => l.userId === currentUser?.userId).sort((a, b) => {
    const dateA = a.startDate || a.date || "";
    const dateB = b.startDate || b.date || "";
    return dateB.localeCompare(dateA);
  });

  const cy = parseInt(new Date().getFullYear().toString());
  const jy = currentUser?.joinDate ? parseInt(currentUser.joinDate.substring(0, 4)) : cy;

  let carryOverDeficit = 0;

  if (currentUser?.joinDate) {
    for (let y = jy; y < cy; y++) {
      const generatedForYear = calculateAnnualLeave(currentUser.joinDate, y);
      let usedInYear = 0;
      myLeaves.forEach(l => {
        let st = l.startDate || l.date || "";
        if (st.startsWith(y.toString())) {
          if (l.type !== '공가' && l.type !== '무급연차') {
            usedInYear += l.days;
          }
        }
      });
      const balance = generatedForYear - usedInYear - carryOverDeficit;
      if (balance < 0) {
        carryOverDeficit = Math.abs(balance);
      } else {
        carryOverDeficit = 0;
      }
    }
  }

  let used = 0;
  myLeaves.forEach(l => {
    let st = l.startDate || l.date || "";
    if (st.startsWith(cy.toString())) {
      if (l.type !== '공가' && l.type !== '무급연차') {
        used += l.days;
      }
    }
  });

  const generatedThisYear = currentUser?.joinDate ? calculateAnnualLeave(currentUser.joinDate, cy) : 0;
  const total = generatedThisYear - carryOverDeficit;

  const handleSubmit = async () => {
    if (!startDate || !endDate) return alert("날짜를 선택하세요.");
    if (startDate > endDate) return alert("종료일이 시작일보다 빠를 수 없습니다.");
    
    let days = getBusinessDays(startDate, endDate);
    if (leaveType.includes('반차')) days = 0.5;
    if (days === 0) return alert("선택한 기간에 평일이 없습니다.");

    const data = {
      userId: currentUser?.userId,
      name: currentUser?.name,
      startDate,
      endDate,
      type: leaveType,
      days,
      memo,
      updatedAt: Date.now()
    };

    if (editingId) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leave_requests', editingId), data);
      alert("수정 완료");
      handleCancelEdit();
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests'), { ...data, createdAt: Date.now() });
      alert("신청 완료");
    }
  };

  const handleEdit = (id: string) => {
    const l = myLeaves.find(x => x.id === id);
    if (!l) return;
    setEditingId(id);
    setStartDate(l.startDate || l.date || "");
    setEndDate(l.endDate || l.date || "");
    setLeaveType(l.type);
    setMemo(l.memo || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leave_requests', id));
      alert("삭제 완료");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setStartDate(getKSTToday());
    setEndDate(getKSTToday());
    setLeaveType('연차 (종일)');
    setMemo('');
  };

  const handleKakaoShare = (leave: any) => {
    const st = leave.startDate || leave.date || "";
    const en = leave.endDate || leave.date || "";
    const dateDisp = (st === en) ? st : `${st} ~ ${en}`;
    const typeName = leave.type || '연차';
    
    const message = `[휴가 보고]\n이름: ${currentUser?.name}\n기간: ${dateDisp}\n종류: ${typeName} (${leave.days}일)\n사유: ${leave.memo || '개인 사정'}`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = `kakaotalk://send?text=${encodeURIComponent(message)}`;
      setTimeout(() => {
        navigator.clipboard.writeText(message).then(() => {
          // alert("카카오톡이 열리지 않을 경우를 대비해 클립보드에 복사되었습니다.");
        }).catch(() => {});
      }, 500);
    } else {
      navigator.clipboard.writeText(message).then(() => {
        alert("휴가 내용이 클립보드에 복사되었습니다. PC 카카오톡에 붙여넣기 해주세요.");
      }).catch(() => {
        alert("클립보드 복사에 실패했습니다.");
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><div className="font-extrabold text-lg text-slate-800">{total}일</div><div className="text-[0.65rem] text-slate-500 mt-1 font-bold">발생 연차</div></div>
        <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><div className="font-extrabold text-lg text-red-500">{used}일</div><div className="text-[0.65rem] text-slate-500 mt-1 font-bold">사용 연차</div></div>
        <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><div className="font-extrabold text-lg text-blue-500">{total - used}일</div><div className="text-[0.65rem] text-slate-500 mt-1 font-bold">잔여 연차</div></div>
      </div>

      <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <h2 className="text-lg m-0 mb-4 font-bold">🌴 휴가 신청</h2>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">시작일</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">종료일</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-1">종류</label>
          <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none">
            <option value="연차 (종일)">연차 (종일)</option>
            <option value="반차 (0.5일)">반차 (0.5일)</option>
            <option value="무급연차">무급연차</option>
            <option value="공가">공가</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-1">기타보고사항</label>
          <textarea 
            value={memo} 
            onChange={e => setMemo(e.target.value)} 
            placeholder="기타보고사항을 입력하세요 (선택)"
            className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none resize-none h-20"
          />
        </div>
        <button onClick={handleSubmit} className="w-full bg-blue-500 text-white p-3 rounded-xl font-bold transition-transform active:scale-95">
          {editingId ? "내역 수정하기" : "휴가 신청하기"}
        </button>
        {editingId && (
          <button onClick={handleCancelEdit} className="w-full mt-2.5 bg-transparent border-[1.5px] border-slate-300 text-slate-600 p-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95">
            수정 취소
          </button>
        )}
      </div>

      <h3 className="text-base text-slate-800 mt-5 mb-2.5 font-bold">🌴 나의 휴가 내역</h3>
      <div className="flex flex-col gap-3">
        {myLeaves.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(l => {
          let st = l.startDate || l.date || "";
          let en = l.endDate || l.date || "";
          const dateDisp = (st === en) ? st : `${st} ~ ${en}`;
          const typeName = l.type || '연차';
          
          return (
            <div key={l.id} className="bg-white p-3 rounded-xl border border-slate-200 border-l-[4px] border-l-blue-500 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <b className="text-sm">{dateDisp}</b><br />
                  <small className="text-slate-500">{typeName} {l.days}일</small>
                  {l.memo && (
                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-wrap">
                      <span className="font-bold text-slate-500 block mb-0.5">기타보고사항:</span>
                      {l.memo}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 ml-3 shrink-0 w-[72px] sm:w-[80px]">
                  <button onClick={() => handleKakaoShare(l)} className="w-full bg-[#FEE500] text-[#000000] px-2 py-1.5 text-[10px] sm:text-xs rounded-lg font-bold flex items-center justify-center gap-1 shadow-sm transition-transform active:scale-95">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 sm:w-3.5 sm:h-3.5">
                      <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.864 1.802 5.373 4.545 6.812-.455 1.667-1.45 5.228-1.5 5.438-.05.21.173.24.31.14 0 0 3.86-2.58 5.43-3.66.4.04.8.06 1.215.06 5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
                    </svg>
                    보고
                  </button>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(l.id)} className="flex-1 bg-slate-100 text-slate-600 border border-slate-200 py-1 text-[10px] rounded-md font-bold transition-transform active:scale-95">수정</button>
                    <button onClick={() => handleDelete(l.id)} className="flex-1 bg-rose-50 text-rose-500 border border-rose-100 py-1 text-[10px] rounded-md font-bold transition-transform active:scale-95">삭제</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {myLeaves.length === 0 && <p className="text-center text-slate-400 text-sm">내역 없음</p>}
      </div>

      {myLeaves.length > itemsPerPage && (
        <div className="flex justify-center gap-2 mt-4">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:bg-slate-50 bg-white"
          >
            이전
          </button>
          <span className="px-3 py-1.5 text-sm font-bold text-slate-700">
            {currentPage} / {Math.ceil(myLeaves.length / itemsPerPage)}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(myLeaves.length / itemsPerPage), p + 1))}
            disabled={currentPage === Math.ceil(myLeaves.length / itemsPerPage)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:bg-slate-50 bg-white"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
