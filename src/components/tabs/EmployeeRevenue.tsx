import React, { useRef, useState } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth } from '@/lib/utils';
import { parseRevenueAmount, summarizeRevenue } from '@/lib/revenue';
import { db, appId } from '@/lib/firebase';

interface RevenueEditor {
  id: string;
  month: string;
  company: string;
  exists: boolean;
  originalAmount?: number;
  originalUpdatedAt?: number;
}

export default function EmployeeRevenue() {
  const { currentUser } = useAuth();
  const { globalActualRevenues, globalStaffList, revenueStatus } = useData();
  const currentMonth = getKSTMonth();
  const [month, setMonth] = useState(currentMonth);
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.userId || '');
  const [editor, setEditor] = useState<RevenueEditor | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canViewStaff = currentUser?.role === '관리자' || currentUser?.role === '팀장' ||
    currentUser?.rank === '팀장' || currentUser?.userId === 'snk12' ||
    currentUser?.userId === 'testadmin' || Boolean((currentUser as any)?.isMaster);
  const userId = (canViewStaff ? selectedUserId : currentUser?.userId) || currentUser?.userId || '';
  const isOwn = userId === currentUser?.userId;
  const year = month.slice(0, 4);
  const summary = summarizeRevenue(globalActualRevenues, userId, year);
  const selectedTotal = summary.months.find(row => row.month === month);
  const monthRecords = globalActualRevenues.filter(r => r.userId === userId && r.month === month);
  const ownCompany = currentUser?.company || '기본';
  const hasCurrentCompany = monthRecords.some(r => (r.company || ownCompany) === ownCompany);
  const maxAmount = Math.max(1, ...summary.months.map(row => row.amount));
  const money = (amount: number) => amount.toLocaleString('ko-KR') + '원';
  const ready = revenueStatus === 'ready';

  const changeMonth = (value: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    setMonth(value);
    setEditor(null);
    setMessage('');
    setError('');
  };

  const openEditor = (record?: any) => {
    if (!isOwn || !ready || saving || month > currentMonth || !currentUser) return;
    setEditor({
      id: record?.id || `${currentUser.userId}_${month}_${ownCompany}`,
      month,
      company: record?.company || ownCompany,
      exists: Boolean(record),
      originalAmount: record?.amount,
      originalUpdatedAt: record?.updatedAt
    });
    setAmountInput(record ? String(record.amount) : '');
    setError('');
    setMessage('');
  };

  const saveRevenue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current || !editor || !isOwn || !currentUser || !ready) return;
    const amount = parseRevenueAmount(amountInput);
    if (amount === null) {
      setError('매출은 0 이상의 원 단위 정수로 입력해주세요.');
      return;
    }
    if (editor.month > currentMonth) {
      setError('미래 월의 매출은 입력할 수 없습니다.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'actual_revenues', editor.id);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        const previous = snapshot.data();
        if (editor.exists) {
          if (!snapshot.exists() || previous?.userId !== currentUser.userId ||
              previous?.month !== editor.month ||
              previous?.amount !== editor.originalAmount ||
              previous?.updatedAt !== editor.originalUpdatedAt) {
            throw new Error('conflict');
          }
        } else if (snapshot.exists()) {
          throw new Error('conflict');
        }
        transaction.set(ref, {
          userId: currentUser.userId,
          month: editor.month,
          company: editor.company,
          amount,
          updatedAt: Date.now(),
          updatedBy: currentUser.userId,
          source: 'employee',
          ...(!snapshot.exists() ? { createdAt: Date.now() } : {})
        }, { merge: true });
      });
      setMessage(`${editor.month} 매출 ${money(amount)}을 저장했습니다.`);
      setEditor(null);
    } catch (e: any) {
      console.error('Revenue save failed:', e);
      setError(e?.message === 'conflict'
        ? '다른 화면에서 매출이 변경되었습니다. 취소 후 최신 금액을 확인하고 다시 수정해주세요.'
        : e?.code === 'permission-denied'
          ? '매출 저장 권한이 없습니다. 관리자에게 문의해주세요.'
          : '저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-800">📊 매출관리</h2>
        <p className="text-sm text-slate-500 mt-1">월별 본인 매출을 입력하고 월·연간 합계를 확인하세요.</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          {canViewStaff && (
            <label className="text-sm font-bold text-slate-600">
              조회 대상
              <select value={userId} disabled={saving} onChange={e => {
                setSelectedUserId(e.target.value); setEditor(null); setError(''); setMessage('');
              }} className="mt-2 w-full p-3 border border-slate-200 rounded-xl bg-slate-50">
                <option value={currentUser?.userId}>본인 ({currentUser?.name})</option>
                {globalStaffList.filter(u => u.userId !== currentUser?.userId).map(u => (
                  <option key={u.userId} value={u.userId}>{u.name} ({u.company} / {u.rank}){u.isResigned ? ' · 퇴사' : ''}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm font-bold text-slate-600">
            조회 / 입력 월
            <input type="month" value={month} max={currentMonth} disabled={saving}
              onChange={e => changeMonth(e.target.value)}
              className="mt-2 w-full p-3 border border-slate-200 rounded-xl bg-slate-50" />
          </label>
        </div>
        {!ready ? (
          <p role="status" className="mt-5 text-sm text-slate-500">
            {revenueStatus === 'error' ? '매출을 불러오지 못했습니다. 새로고침 후 다시 확인해주세요.' : '매출 기록을 불러오는 중입니다…'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="text-sm font-bold text-blue-700">{Number(month.slice(5))}월 총매출</div>
              <div className="text-2xl font-black text-blue-700 mt-2 break-all">{money(selectedTotal?.amount || 0)}</div>
              <div className="text-xs text-blue-500 mt-1">{selectedTotal?.count ? '저장된 매출 합계' : '아직 입력하지 않았습니다'}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <div className="text-sm font-bold text-emerald-700">{year}년 총매출</div>
              <div className="text-2xl font-black text-emerald-700 mt-2 break-all">{money(summary.annual)}</div>
              <div className="text-xs text-emerald-600 mt-1">{summary.months.filter(row => row.count > 0).length}개월 입력 완료</div>
            </div>
          </div>
        )}
      </section>

      {ready && (
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800">{month} 매출 입력 내역</h3>
          {!isOwn && <p className="text-sm text-slate-500 mt-2">직원 매출은 조회만 가능합니다. 수정은 직원 본인이 진행합니다.</p>}
          <div className="space-y-3 mt-4">
            {monthRecords.map(record => (
              <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-sm">{record.company || '기존 매출'}</p>
                  <p className="text-lg font-extrabold text-slate-800">{money(Number(record.amount) || 0)}</p>
                </div>
                {isOwn && month <= currentMonth && <button type="button" disabled={saving}
                  onClick={() => openEditor(record)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold disabled:opacity-50">수정</button>}
              </div>
            ))}
            {monthRecords.length === 0 && <p className="text-sm text-slate-500">이 달의 매출을 입력해주세요. 매출이 없는 달은 0원으로 저장할 수 있습니다.</p>}
          </div>
          {isOwn && !hasCurrentCompany && !editor && month <= currentMonth && (
            <button type="button" onClick={() => openEditor()} disabled={saving}
              className="mt-4 w-full p-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50">
              {monthRecords.length ? `${ownCompany} 매출 입력` : '이번 달 매출 입력'}
            </button>
          )}
          {editor && isOwn && (
            <form onSubmit={saveRevenue} className="mt-4 p-4 border border-blue-200 bg-blue-50/40 rounded-xl space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                {editor.month} · {editor.company} 매출 금액 (원)
                <input autoFocus type="text" inputMode="numeric" value={amountInput} disabled={saving}
                  onChange={e => setAmountInput(e.target.value)} placeholder="예: 8,000,000"
                  className="mt-2 w-full p-3 border border-slate-300 rounded-xl bg-white text-lg" />
              </label>
              <p className="text-xs text-slate-500">추가 금액이 아닌 해당 월의 전체 매출을 입력하세요. 수정하면 기존 금액이 바뀝니다.</p>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 p-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">{saving ? '저장 중…' : '매출 저장'}</button>
                <button type="button" disabled={saving} onClick={() => { setEditor(null); setError(''); }} className="px-4 py-3 bg-slate-100 rounded-xl font-bold">취소</button>
              </div>
            </form>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
        </section>
      )}

      {ready && (
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">📈 {year}년 월별 매출</h3>
          <div className="space-y-2">
            {summary.months.map(row => (
              <button key={row.month} type="button" disabled={saving || row.month > currentMonth}
                onClick={() => changeMonth(row.month)}
                className={`w-full text-left rounded-xl p-3 border disabled:opacity-40 ${row.month === month ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-bold">{Number(row.month.slice(5))}월</span>
                  <span className={row.count ? 'font-bold text-slate-800' : 'text-slate-400'}>{row.count ? money(row.amount) : '미입력'}</span>
                </div>
                <div className="h-1.5 mt-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.amount / maxAmount * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
