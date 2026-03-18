import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, calculatePerformance } from '@/lib/utils';
import { doc, setDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function AdminSettlement() {
  const { globalStaffList, globalAllReports, globalActualRevenues } = useData();
  const [month, setMonth] = useState(getKSTMonth());
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [actualRevenue, setActualRevenue] = useState<number | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('전체');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const staffList = globalStaffList.filter(u => {
    if (u.rank === '팀장' || u.role === '관리자' || (selectedCompany !== '전체' && u.company !== selectedCompany)) return false;
    
    // 입사월 이전이면 제외
    if (u.joinDate && u.joinDate.substring(0, 7) > month) return false;

    const hasReportsThisMonth = globalAllReports.some(r => r.userId === u.userId && r.date.startsWith(month));
    const hasRevenueThisMonth = globalActualRevenues.some(r => r.userId === u.userId && r.month === month);

    if (!u.approved) {
      return hasReportsThisMonth || hasRevenueThisMonth;
    }

    if (u.isResigned) {
      const resignMonth = u.resignDate ? u.resignDate.substring(0, 7) : '';
      return resignMonth >= month || hasReportsThisMonth || hasRevenueThisMonth;
    }

    return true;
  });

  const unsettledStaff = staffList.filter(u => {
    const p = calculatePerformance(u.userId, month, globalStaffList, globalAllReports, globalActualRevenues);
    if (!p) return false;
    const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
    return !act;
  });

  const settledStaff = staffList.filter(u => {
    const p = calculatePerformance(u.userId, month, globalStaffList, globalAllReports, globalActualRevenues);
    if (!p) return false;
    const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
    return !!act;
  });

  const handleSaveActualRevenue = async (amountOverride?: number) => {
    if (!selectedStaff) return;
    const finalAmount = amountOverride !== undefined ? amountOverride : (Number(actualRevenue) || 0);

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'actual_revenues', `${selectedStaff.userId}_${month}`), {
      userId: selectedStaff.userId,
      month,
      amount: finalAmount,
      updatedAt: Date.now()
    }, { merge: true });

    // 알림 전송
    await addDoc(collection(db, 'artifacts', appId, 'users', selectedStaff.userId, 'notifications'), {
      title: '매출 확정 알림',
      body: `${month}월의 확정 매출이 업데이트 되었습니다.`,
      createdAt: new Date().toISOString(),
      read: false,
      type: 'settlement'
    });

    setIsModalOpen(false);
    alert("정산 완료");
    
    // 페이지네이션 조정 (현재 페이지에 남은 항목이 없으면 이전 페이지로)
    const remainingUnsettled = unsettledStaff.length - 1;
    if (remainingUnsettled > 0 && Math.ceil(remainingUnsettled / itemsPerPage) < currentPage) {
      setCurrentPage(Math.max(1, currentPage - 1));
    }
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
    setActualRevenue(ex ? ex.amount : (provRevenue === 0 ? '' : provRevenue));
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {['전체', '삼성', '마이브라운'].map(c => (
          <button
            key={c}
            onClick={() => { setSelectedCompany(c); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${selectedCompany === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
          >
            {c}
          </button>
        ))}
      </div>

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
            {unsettledStaff.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4 bg-white/50 rounded-xl">해당 보험사에 미정산 직원이 없습니다.</p>
            ) : (
              <>
                {unsettledStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(u => {
                  const p = calculatePerformance(u.userId, month, globalStaffList, globalAllReports, globalActualRevenues);
                  if (!p) return null;

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
                {unsettledStaff.length > itemsPerPage && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50 bg-white shadow-sm"
                    >
                      이전
                    </button>
                    <span className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
                      {currentPage} / {Math.ceil(unsettledStaff.length / itemsPerPage)}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(unsettledStaff.length / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(unsettledStaff.length / itemsPerPage)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50 bg-white shadow-sm"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <h3 className="text-sm text-slate-800 mt-8 mb-4 font-bold flex items-center gap-2">
          <span>✅</span> 완료된 정산 내역
        </h3>
        <div className="flex flex-col gap-3">
          {settledStaff.map(u => {
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
                onChange={(e) => setActualRevenue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                placeholder="0"
              />
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => handleSaveActualRevenue(0)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 p-3 rounded-xl font-bold transition-colors text-sm">매출입력 안함 (0원 처리)</button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-bold transition-colors">취소</button>
              <button onClick={() => handleSaveActualRevenue()} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
