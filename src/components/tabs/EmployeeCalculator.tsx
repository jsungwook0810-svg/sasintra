import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, feeMap, salaryData } from '@/lib/utils';

const estimateAfterTax = (gross: number) => {
  // 2024~2025년 기준 대략적인 4대보험 요율 적용
  const pension = Math.min(Math.floor(gross * 0.045), 265500); // 국민연금 4.5% (상한 약 265,500원)
  const health = Math.floor(gross * 0.03545); // 건강보험 3.545%
  const care = Math.floor(health * 0.1295); // 장기요양보험 (건보료의 12.95%)
  const employment = Math.floor(gross * 0.009); // 고용보험 0.9%
  
  // 간이세액표를 전체 구현하지 않고 소득 구간별 대략적 누진세율 적용 (1인 가구 보수적 계산)
  let incomeTax = 0;
  if (gross <= 1500000) incomeTax = 0;
  else if (gross <= 2500000) incomeTax = Math.floor(gross * 0.015);
  else if (gross <= 3500000) incomeTax = Math.floor(gross * 0.025);
  else if (gross <= 5000000) incomeTax = Math.floor(gross * 0.045);
  else if (gross <= 7000000) incomeTax = Math.floor(gross * 0.07);
  else if (gross <= 10000000) incomeTax = Math.floor(gross * 0.10);
  else incomeTax = Math.floor(gross * 0.15);
  
  const localTax = Math.floor(incomeTax * 0.1); // 지방소득세 10%
  
  const totalDeduction = pension + health + care + employment + incomeTax + localTax;
  
  return {
    afterTax: gross - totalDeduction,
    totalDeduction,
    pension,
    health,
    care,
    employment,
    incomeTax,
    localTax
  };
};

export default function EmployeeCalculator() {
  const { currentUser } = useAuth();
  const { allUserReports } = useData();
  
  const isAdminOrTest = currentUser?.name === '정성욱' || currentUser?.name === '테스트계정';

  const [revenueInput, setRevenueInput] = useState<number | ''>('');
  const [result, setResult] = useState<any>(null);

  // Simulation states
  const [simCompany, setSimCompany] = useState(currentUser?.company || '삼성');
  const [simRole, setSimRole] = useState(currentUser?.role || '누수팀');
  const [simRank, setSimRank] = useState(currentUser?.rank || '사원');

  useEffect(() => {
    // 본인의 이번 달 가매출 자동계산 (시뮬레이션 모드가 아닐 때 주로 참고)
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
    
    // 시뮬레이션 모드면 선택한 값, 아니면 본인 직급값 사용
    const targetRole = isAdminOrTest ? simRole : currentUser?.role || '누수팀';
    const targetRank = isAdminOrTest ? simRank : currentUser?.rank || '사원';
    
    const roleData = salaryData[targetRole] || salaryData["누수팀"];
    const conf = roleData[targetRank];
    
    if (!conf) {
      alert("해당 직급의 급여 기준 데이터가 없습니다.");
      return;
    }

    let isEligible = rev >= conf.target;
    let rate = 0, inc = 0;
    
    if (isEligible) {
      // 2026-04-01 바뀐 인센티브 체계
      let baseRate = 0.41; // 기본(사원) 41%
      if (targetRank === '주임') baseRate = 0.42;
      else if (targetRank === '대리') baseRate = 0.43;
      else if (targetRank === '과장') baseRate = 0.44;

      let bonusThreshold = 8500000; // 재물팀/마이브라운/간편심사 기본
      if (targetRole === "누수팀") {
        bonusThreshold = 9500000; // 누수팀인 경우
      }

      if (rev > bonusThreshold) {
        const totalRate = baseRate + 0.02; // 가산비율 2%
        rate = totalRate;
        inc = Math.floor((rev - conf.threshold) * totalRate);
      } else {
        rate = baseRate;
        inc = Math.floor((rev - conf.threshold) * baseRate);
      }
    }
    
    const net = (conf.base + inc);
    const taxCalc = estimateAfterTax(net);
    
    setResult({
      target: conf.target,
      isEligible,
      rate,
      base: conf.base,
      inc,
      net,
      tax: taxCalc,
      simulatedLabel: isAdminOrTest ? `[시뮬레이션] ${simCompany} / ${simRole} / ${simRank}` : null
    });
  };

  return (
    <div className="space-y-4">
      {isAdminOrTest && (
        <div className="bg-indigo-50 p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-indigo-100">
          <h2 className="text-lg font-extrabold text-indigo-700 mb-4 flex items-center gap-2">
            <span>⚙️</span> 관리자 시뮬레이션 모드
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">소속</label>
              <select value={simCompany} onChange={e => setSimCompany(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none">
                <option value="삼성">삼성</option>
                <option value="마이브라운">마이브라운</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">업무</label>
              <select value={simRole} onChange={e => setSimRole(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none">
                <option value="누수팀">누수팀</option>
                <option value="재물팀">재물팀</option>
                <option value="간편심사">간편심사</option>
                <option value="재물심사">재물심사</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">직급</label>
              <select value={simRank} onChange={e => setSimRank(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-xl text-sm bg-white outline-none">
                <option value="사원">사원</option>
                <option value="주임">주임</option>
                <option value="대리">대리</option>
                <option value="과장">과장</option>
                <option value="팀장">팀장</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-indigo-500 font-medium mt-3">직급과 업무를 바꿔가며 26년 4월 개편된 인센티브 급여를 테스트할 수 있습니다.</p>
        </div>
      )}

      <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <h2 className="text-lg font-bold mb-4 text-slate-800">💰 급여 계산기</h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-2">매출액 입력 {isAdminOrTest ? '(테스트용 금액 입력)' : '(가매출 자동연동)'}</label>
          <input
            type="number"
            value={revenueInput}
            onChange={(e) => setRevenueInput(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full p-4 border-[1.5px] border-slate-200 rounded-xl text-base bg-slate-50 focus:border-blue-500 focus:bg-white outline-none font-bold"
            placeholder="계산할 매출액을 입력하세요"
          />
        </div>
        <button onClick={handleCalculate} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold transition-all active:scale-[0.98] shadow-md shadow-blue-500/20">
          계산 및 구조 확인하기
        </button>
      </div>

      {result && (
        <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-emerald-100 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl"></div>
          
          {result.simulatedLabel && (
            <div className="inline-block bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-1 rounded-md mb-3">
              {result.simulatedLabel}
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-sm text-slate-600 relative z-10">
            <div className="flex justify-between items-center mb-2.5">
              <span className="font-medium">✔️ 인센티브 목표매출</span> 
              <b className="text-slate-800">{result.target.toLocaleString()}원</b>
            </div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="font-medium">✔️ 대상 여부</span> 
              {result.isEligible ? <b className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">✅ 달성</b> : <b className="text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">❌ 미달성</b>}
            </div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="font-medium">✔️ 적용 요율 <span className="text-[10px] text-slate-400 font-normal">(개편안 적용)</span></span> 
              <b className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">{result.isEligible ? (result.rate * 100).toFixed(0) + '%' : '0%'}</b>
            </div>
            <div className="w-full h-px bg-slate-200 my-3"></div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="font-medium">정규 기본급</span> 
              <b className="text-slate-800 text-base">{result.base.toLocaleString()}원</b>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">예상 인센티브</span> 
              <b className="text-amber-500 text-base">+{result.inc.toLocaleString()}원</b>
            </div>
          </div>
          
          <div className="relative z-10 pt-2">
            <div className="text-sm font-bold text-slate-500 mb-1">세전 예상 총 수령액</div>
            <div className="text-3xl font-black text-rose-500 tracking-tight mb-4">{result.net.toLocaleString()}<span className="text-lg text-rose-400 font-bold ml-1">원</span></div>

            <div className="bg-slate-800 text-white rounded-xl p-4 shadow-lg border border-slate-700">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-slate-300">세후 예상 수령액 <span className="text-[10px] text-slate-400 font-normal block md:inline mt-1 md:mt-0">(공제 約 {result.tax.totalDeduction.toLocaleString()}원)</span></span>
                <span className="text-2xl font-black text-emerald-400">{result.tax.afterTax.toLocaleString()}<span className="text-sm text-emerald-500 font-bold ml-1">원</span></span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-slate-400 mt-3 border-t border-slate-700 pt-3">
                <div className="flex justify-between"><span>국민연금</span><span className="text-white">{result.tax.pension.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>소득세</span><span className="text-white">{result.tax.incomeTax.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>건강보험</span><span className="text-white">{result.tax.health.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>지방소득세</span><span className="text-white">{result.tax.localTax.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>고용보험</span><span className="text-white">{result.tax.employment.toLocaleString()}원</span></div>
                <div className="flex justify-between text-slate-500"><span>(장기요양)</span><span>{result.tax.care.toLocaleString()}원</span></div>
              </div>
              <div className="text-[10px] text-slate-500 mt-3 text-right">※ 본 수치는 대략적인 예상값으로 실제와 차이가 있을 수 있습니다.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
