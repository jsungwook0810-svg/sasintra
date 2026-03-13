import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, getKSTToday } from '@/lib/utils';
import { KOR_HOLIDAYS } from '@/lib/constants';
import { doc, setDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function AdminCorpCard() {
  const { globalStaffList, corpCardUsages } = useData();
  const [month, setMonth] = useState(getKSTMonth());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [purpose, setPurpose] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Calculate budget
  const approvedStaffCount = globalStaffList.filter(u => u.approved && !u.isResigned).length;
  const totalBudget = approvedStaffCount * 50000;

  // Filter usages for the selected month
  const monthlyUsages = corpCardUsages.filter(u => u.date.startsWith(month));
  const sortedMonthlyUsages = [...monthlyUsages].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const totalUsed = monthlyUsages.reduce((sum, u) => sum + Number(u.amount), 0);
  const remainingBudget = totalBudget - totalUsed;

  // Calendar logic
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr);
  const monthIdx = parseInt(monthStr) - 1;
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setAmount('');
    setPurpose('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!amount || !purpose) return alert('금액과 용도를 모두 입력해주세요.');
    
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'corp_card_usages'), {
      date: selectedDate,
      amount: Number(amount),
      purpose,
      createdAt: Date.now()
    });
    
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('이 내역을 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'corp_card_usages', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-pink-500"></div>
        <h2 className="text-xl text-slate-800 m-0 mb-6 font-extrabold tracking-tight flex items-center gap-2">
          <span className="text-2xl">💳</span> 법인카드 관리
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-600 mb-2">📅 조회 연/월 선택</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center shadow-sm">
            <div className="text-sm font-bold text-slate-500 mb-1">총 예산 (인당 5만)</div>
            <div className="text-2xl font-black text-slate-800">{totalBudget.toLocaleString()}원</div>
            <div className="text-xs text-slate-400 mt-1">등록 인원: {approvedStaffCount}명</div>
          </div>
          <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 text-center shadow-sm">
            <div className="text-sm font-bold text-rose-500 mb-1">사용 금액</div>
            <div className="text-2xl font-black text-rose-600">{totalUsed.toLocaleString()}원</div>
          </div>
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 text-center shadow-sm">
            <div className="text-sm font-bold text-emerald-500 mb-1">잔여 금액</div>
            <div className="text-2xl font-black text-emerald-600">{remainingBudget.toLocaleString()}원</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-500">
            <div className="p-3 text-rose-500">일</div>
            <div className="p-3">월</div>
            <div className="p-3">화</div>
            <div className="p-3">수</div>
            <div className="p-3">목</div>
            <div className="p-3">금</div>
            <div className="p-3 text-blue-500">토</div>
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {days.map((d, i) => {
              if (!d) return <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/30"></div>;
              
              const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayUsages = monthlyUsages.filter(u => u.date === dateStr);
              const isToday = dateStr === getKSTToday();
              const holidayName = KOR_HOLIDAYS[dateStr];
              const isWeekend = new Date(year, monthIdx, d).getDay() === 0 || new Date(year, monthIdx, d).getDay() === 6;
              const isRedDay = isWeekend || !!holidayName;

              return (
                <div 
                  key={d} 
                  onClick={() => handleDayClick(d)}
                  className={`min-h-[100px] border-b border-r border-slate-100 p-2 cursor-pointer hover:bg-purple-50 transition-colors relative ${isToday ? 'bg-indigo-50/30' : ''}`}
                >
                  <div className={`text-xs font-bold mb-1 flex justify-between items-start ${isRedDay ? 'text-rose-500' : 'text-slate-600'}`}>
                    <div>
                      {d}
                      {isToday && <span className="ml-1 text-[0.6rem] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">오늘</span>}
                    </div>
                    {holidayName && <span className="text-[0.6rem] text-rose-500 bg-rose-50 px-1 rounded">{holidayName}</span>}
                  </div>
                  <div className="space-y-1">
                    {dayUsages.map(u => (
                      <div key={u.id} className="text-[0.65rem] bg-rose-50 text-rose-600 p-1 rounded border border-rose-100 leading-tight" onClick={(e) => e.stopPropagation()}>
                        <div className="font-bold flex justify-between">
                          <span>-{u.amount.toLocaleString()}</span>
                          <button onClick={() => handleDelete(u.id)} className="text-rose-400 hover:text-rose-700">×</button>
                        </div>
                        <div className="truncate text-slate-500">{u.purpose}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📋</span> 상세 사용 내역
          </h3>
          <div className="flex flex-col gap-3">
            {sortedMonthlyUsages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(u => (
              <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800 text-sm mb-1">{u.date}</div>
                  <div className="text-slate-600 text-sm">{u.purpose}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-extrabold text-rose-600">-{u.amount.toLocaleString()}원</div>
                  <button onClick={() => handleDelete(u.id)} className="bg-rose-50 text-rose-500 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">삭제</button>
                </div>
              </div>
            ))}
            {sortedMonthlyUsages.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8 bg-slate-50 rounded-2xl border border-slate-100">
                사용 내역이 없습니다.
              </div>
            )}
          </div>

          {sortedMonthlyUsages.length > itemsPerPage && (
            <div className="flex justify-center gap-2 mt-6">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:bg-slate-50 bg-white shadow-sm hover:bg-slate-50 transition-colors"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
                {currentPage} / {Math.ceil(sortedMonthlyUsages.length / itemsPerPage)}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedMonthlyUsages.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(sortedMonthlyUsages.length / itemsPerPage)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:bg-slate-50 bg-white shadow-sm hover:bg-slate-50 transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-[420px] shadow-2xl border border-white/20">
            <h2 className="text-xl font-extrabold mb-2 text-slate-800 tracking-tight">💳 법인카드 사용 내역 추가</h2>
            <p className="font-bold text-purple-600 mb-6">{selectedDate}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-600 mb-2">사용 금액 (원)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-medium"
                placeholder="예: 15000"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-600 mb-2">사용처 / 용도</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-medium"
                placeholder="예: 점심 식대 (김밥천국)"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-bold transition-colors">취소</button>
              <button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-2xl font-bold transition-all shadow-lg shadow-purple-600/20 active:scale-[0.98]">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
