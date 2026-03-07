import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, feeMap, salaryData } from '@/lib/utils';

export default function EmployeeCalculator() {
  const { currentUser } = useAuth();
  const { allUserReports } = useData();
  
  const [revenueInput, setRevenueInput] = useState<number | ''>('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const curMonth = getKSTMonth();
    let mRevenue = 0;
    allUserReports.filter(r => r.date.startsWith(curMonth)).forEach(r => {
      for (let g in r.data) {
        const d = r.data[g];
        if (feeMap[g]) mRevenue += (d["종결"] || 0) * feeMap[g];
      }
    });
    setRevenueInput(mRevenue);
  }, [allUserReports]);

  const handleCalculate = () => {
    const rev = Number(revenueInput) || 0;
    if (!currentUser) return;
    
    const conf = (salaryData[currentUser.role] || salaryData["누수팀"])[currentUser.rank];
    if (!conf) return;

    let isEligible = rev >= conf.target;
    let rate = 0, inc = 0;
    
    if (isEligible) {
      rate = (currentUser.role === "누수팀") 
        ? (rev >= 10000000 ? 0.44 : (rev >= 8750000 ? 0.41 : (rev >= 7500000 ? 0.38 : 0.35))) 
        : 0.35;
      inc = Math.floor((rev - conf.threshold) * rate);
    }
    
    const net = (conf.base + inc) - Math.floor((conf.base + inc) * 0.033);
    
    setResult({
      target: conf.target,
      isEligible,
      rate,
      base: conf.base,
      inc,
      net
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <h2 className="text-lg font-bold mb-4">💰 급여 계산기</h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-2">매출액 입력 (자동연동)</label>
          <input
            type="number"
            value={revenueInput}
            onChange={(e) => setRevenueInput(Number(e.target.value))}
            className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none"
          />
        </div>
        <button onClick={handleCalculate} className="w-full bg-blue-500 text-white p-3 rounded-xl font-bold transition-transform active:scale-95">
          계산하기
        </button>
      </div>

      {result && (
        <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-sm text-slate-600">
            <div className="flex justify-between mb-2"><span>• 인센티브 목표매출:</span> <b>{result.target.toLocaleString()}원</b></div>
            <div className="flex justify-between mb-2"><span>• 대상 여부:</span> {result.isEligible ? <b className="text-emerald-500">✅ 달성</b> : <b className="text-red-500">❌ 미달성</b>}</div>
            <div className="flex justify-between mb-2"><span>• 적용 요율:</span> <b>{result.isEligible ? (result.rate * 100).toFixed(0) + '%' : '0%'}</b></div>
            <div className="flex justify-between border-t border-dashed border-slate-300 pt-2 mt-2"><span>• 내 기본급:</span> <b className="text-blue-500">{result.base.toLocaleString()}원</b></div>
            <div className="flex justify-between mt-2"><span>• 인센티브 금액:</span> <b className="text-amber-500">+{result.inc.toLocaleString()}원</b></div>
          </div>
          <div className="text-sm font-bold text-slate-800 mb-1">세후 예상 총 수령액 (3.3% 공제)</div>
          <div className="text-3xl font-black text-red-500">{result.net.toLocaleString()}원</div>
        </div>
      )}
    </div>
  );
}
