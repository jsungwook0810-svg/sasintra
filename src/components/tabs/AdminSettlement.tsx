import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, calculatePerformance } from '@/lib/utils';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function AdminSettlement() {
  const { globalStaffList, globalAllReports, globalActualRevenues } = useData();
  const [month, setMonth] = useState(getKSTMonth());
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [actualRevenue, setActualRevenue] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const staffList = globalStaffList.filter(u => u.approved && u.rank !== '팀장' && u.role !== '관리자');

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

  return (
    <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border-t-[5px] border-emerald-500 mb-4">
      <h2 className="text-base text-slate-800 m-0 mb-4 font-bold">💰 월간 매출 관리 (확정 매출 입력)</h2>
      <div className="mb-4">
        <label className="block text-sm font-bold text-slate-600 mb-2">📅 조회 월 선택</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
        />
      </div>

      <div className="my-4 p-4 bg-red-50 rounded-xl border border-red-200">
        <h3 className="text-sm text-red-500 m-0 mb-2 font-bold">⚠️ 이달의 미정산 직원</h3>
        <div className="flex flex-col gap-3">
          {staffList.map(u => {
            const p = calculatePerformance(u.userId, month, globalStaffList, globalAllReports, globalActualRevenues);
            if (!p) return null;
            const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
            if (act) return null;

            return (
              <div key={u.userId} className="bg-white p-4 rounded-xl border border-slate-200 border-l-[5px] border-l-red-500 shadow-sm">
                <div className="flex justify-between items-center">
                  <b className="text-sm">{u.name} <small className="text-slate-500 font-normal">({u.company}/{u.role})</small></b>
                  <button onClick={() => openModal(u, p.revenue)} className="bg-red-500 text-white px-3 py-1.5 text-xs rounded-lg font-bold">정산입력</button>
                </div>
                <div className="text-xs text-slate-600 mt-2">보고(가매출): {p.revenue.toLocaleString()}원</div>
              </div>
            );
          })}
          {staffList.filter(u => {
            const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
            return !act;
          }).length === 0 && <p className="text-center text-sm text-slate-500">🎉 전원 정산 완료!</p>}
        </div>
      </div>

      <h3 className="text-sm text-slate-800 mt-5 mb-2 font-bold">✅ 완료된 정산 내역</h3>
      <div className="flex flex-col gap-3">
        {staffList.map(u => {
          const p = calculatePerformance(u.userId, month, globalStaffList, globalAllReports, globalActualRevenues);
          if (!p) return null;
          const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === month);
          if (!act) return null;

          return (
            <div key={u.userId} className="bg-emerald-50 p-4 rounded-xl border border-slate-200 border-l-[5px] border-l-emerald-500 shadow-sm">
              <div className="flex justify-between items-center">
                <b className="text-sm">{u.name}</b>
                <div className="flex gap-1.5">
                  <button onClick={() => openModal(u, p.revenue)} className="bg-blue-500 text-white px-3 py-1.5 text-xs rounded-lg font-bold">수정</button>
                  <button onClick={() => handleDeleteActualRevenue(u.userId)} className="bg-transparent border-[1.5px] border-slate-300 text-slate-600 px-3 py-1.5 text-xs rounded-lg font-bold">삭제</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs mt-2">
                <div>보고: {p.revenue.toLocaleString()}원</div>
                <div className="text-blue-500">확정: {act.amount.toLocaleString()}원</div>
                <div>인센: <b className="text-amber-500">{p.incentive.toLocaleString()}원</b></div>
                <div className="text-red-500 font-bold">실수령: {p.netPay.toLocaleString()}원</div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-[20px] w-full max-w-[450px] shadow-2xl">
            <h2 className="text-lg font-bold mb-2">💰 정식 매출액 확정</h2>
            <p className="font-bold text-blue-500 mb-4">{selectedStaff?.name}님</p>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-600 mb-2">보험사 확인 정식 매출 (원)</label>
              <input
                type="number"
                value={actualRevenue}
                onChange={(e) => setActualRevenue(Number(e.target.value))}
                className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
              />
            </div>
            <button onClick={handleSaveActualRevenue} className="w-full bg-blue-500 text-white p-3 rounded-xl font-bold mb-2">저장</button>
            <button onClick={() => setIsModalOpen(false)} className="w-full bg-transparent border-[1.5px] border-slate-300 text-slate-600 p-3 rounded-xl font-bold">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
