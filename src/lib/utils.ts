import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { KOR_HOLIDAYS, feeMap, salaryData, reportStructure } from "./constants";

export { KOR_HOLIDAYS, feeMap, salaryData, reportStructure };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getKSTTime() {
  const now = new Date();
  return new Date(now.getTime() + (9 * 60 * 60 * 1000));
}

export function getKSTToday() {
  return getKSTTime().toISOString().slice(0, 10);
}

export function getKSTMonth() {
  return getKSTTime().toISOString().slice(0, 7);
}

export function getBusinessDays(startStr: string, endStr: string) {
  let count = 0;
  let [sy, sm, sd] = startStr.split('-').map(Number);
  let cur = new Date(sy, sm - 1, sd);
  let [ey, em, ed] = endStr.split('-').map(Number);
  const end = new Date(ey, em - 1, ed);
  
  while (cur <= end) {
    const day = cur.getDay();
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
    if (day !== 0 && day !== 6 && !KOR_HOLIDAYS[dateStr]) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function calculateAnnualLeave(jStr: string, targetYear?: number) {
  if (!jStr) return { total: 0, monthly: 0, annual: 0, displayForEmployee: 0 };
  const jd = new Date(jStr);
  const today = getKSTTime();
  const ty = targetYear !== undefined ? targetYear : today.getFullYear();
  const jy = jd.getFullYear();
  
  if (ty < jy) return { total: 0, monthly: 0, annual: 0, displayForEmployee: 0 };

  // Helper to get full months worked between two dates
  const getMonthsDiff = (start: Date, end: Date) => {
    if (end < start) return 0;
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += end.getMonth();
    if (end.getDate() < start.getDate()) {
      months--;
    }
    return Math.max(0, months);
  };

  // Determine the "as of" date for the target year
  let asOfDateForTy = new Date(ty, 11, 31);
  if (ty === today.getFullYear()) {
    asOfDateForTy = today;
  } else if (ty > today.getFullYear()) {
    asOfDateForTy = new Date(ty, 11, 31);
  }

  let asOfDateForPrev = new Date(ty - 1, 11, 31);

  // 1. Calculate Monthly Leaves (월차) - max 11 days total for the first year of service
  const totalMonthlyUpToTy = Math.min(11, getMonthsDiff(jd, asOfDateForTy));
  const totalMonthlyUpToPrev = Math.min(11, getMonthsDiff(jd, asOfDateForPrev));
  const monthlyLeavesForTy = Math.max(0, totalMonthlyUpToTy - totalMonthlyUpToPrev);

  let annualLeavesForTy = 0;

  // 2. Calculate Annual Leaves (연차)
  if (ty === jy) {
    // 입사 당해년도: 연차는 없고 월차만 발생
    annualLeavesForTy = 0;
  } else if (ty === jy + 1) {
    // 입사 이듬해: 전년도 근무일수에 비례하여 1월 1일에 연차 발생
    let ratio;
    if (jd.getDate() === 1) {
      ratio = (12 - jd.getMonth()) / 12;
    } else {
      const endOfFirstYear = new Date(jy, 11, 31);
      const daysInFirstYear = Math.floor((endOfFirstYear.getTime() - jd.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      ratio = daysInFirstYear / 365;
    }
    annualLeavesForTy = 15 * ratio;
  } else {
    // 3년차 이상: 기본 15일 + 가산 연차
    const yearsOfService = ty - jy;
    const extraDays = Math.max(0, Math.floor((yearsOfService - 1) / 2));
    annualLeavesForTy = Math.min(15 + extraDays, 25);
  }

  const totalLeave = monthlyLeavesForTy + annualLeavesForTy;

  // 반올림 규칙: 0.5 미만은 버림, 0.5 초과는 올림, 정확히 0.5는 0.5로 유지
  const roundLeave = (val: number) => {
    const integerPart = Math.floor(val);
    const decimalPart = val - integerPart;
    const dec = Math.round(decimalPart * 100);
    if (dec < 50) return integerPart;
    if (dec === 50) return integerPart + 0.5;
    return integerPart + 1;
  };

  const roundedTotal = roundLeave(totalLeave);
  const roundedMonthly = roundLeave(monthlyLeavesForTy);
  const roundedAnnual = roundLeave(annualLeavesForTy);

  // 1년 미만 직원은 월차만 보이게, 1년이 지나면 연차 비례 휴가도 보이게
  const oneYearAnniversary = new Date(jd);
  oneYearAnniversary.setFullYear(oneYearAnniversary.getFullYear() + 1);

  let displayForEmployee = roundedTotal;
  if (ty === today.getFullYear()) {
    if (today < oneYearAnniversary) {
      // 1년 미만: 현재 발생된 월차만 표시
      displayForEmployee = roundedMonthly;
    }
  }

  return {
    total: roundedTotal,
    monthly: roundedMonthly,
    annual: roundedAnnual,
    displayForEmployee: displayForEmployee
  };
}

export function getReportCompany(report: any, staff: any) {
  if (report?.company) return report.company;
  
  const keys = Object.keys(report?.data || {});
  if (keys.includes("골프용품") || keys.includes("가전제품") || keys.includes("홀인원") || keys.includes("시설소유관리자") || keys.includes("300만원 초과")) {
    return "삼성";
  }
  if (keys.length > 0 && keys.every(k => k === "펫보험" || k === "조사미결")) {
    return "마이브라운";
  }
  
  return staff?.company || "전체";
}

export function getReportRole(report: any, staff: any) {
  if (report?.role) return report.role;
  
  const keys = Object.keys(report?.data || {});
  if (keys.includes("시설소유관리자")) return "누수팀";
  if (keys.includes("골프용품") && !keys.includes("시설소유관리자")) return "재물팀";
  if (keys.includes("펫보험") && !keys.includes("골프용품") && keys.length <= 2) {
    if (staff?.role === "재물심사" || staff?.role === "재물팀") return staff.role;
    return "재물심사";
  }
  
  return staff?.role || "기본 업무";
}

export function calculatePerformance(uid: string, month: string, globalStaffList: any[], globalAllReports: any[], globalActualRevenues: any[], targetCompany?: string) {
  const staff = globalStaffList.find(s => s.userId === uid);
  if (!staff) return null;
  
  if (staff.role === '관리자') {
    return { name: staff.name, revenue: 0, incentive: 0, netPay: 0, company: staff.company, role: staff.role, rank: staff.rank, reports: [], itemBreakdown: {} };
  }
  
  const conf = (salaryData[staff.role] || salaryData["누수팀"])[staff.rank];
  if (!conf) return null;

  let mRev = 0;
  let reports = globalAllReports.filter(r => r.userId === uid && r.date.startsWith(month));
  if (targetCompany && targetCompany !== '전체') {
    reports = reports.filter(r => getReportCompany(r, staff) === targetCompany);
  }
  
  const sortedReports = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  const breakdown: Record<string, any> = {};
  
  sortedReports.forEach(r => {
    for (let g in r.data) {
      const d = r.data[g];
      if (!breakdown[g]) breakdown[g] = { rec: 0, com: 0, pen: 0, rev: 0 };
      breakdown[g].rec += (d['접수'] || 0);
      breakdown[g].com += (d['종결'] || 0);
      if (d['미결'] !== undefined) breakdown[g].pen = d['미결'];
      if (feeMap[g]) breakdown[g].rev += (d['종결'] || 0) * feeMap[g];
    }
  });

  mRev = Object.values(breakdown).reduce((sum, b) => sum + b.rev, 0);
  
  let actRecs = globalActualRevenues.filter(ar => ar.userId === uid && ar.month === month);
  if (targetCompany && targetCompany !== '전체') {
    actRecs = actRecs.filter(ar => ar.company === targetCompany || (!ar.company && staff.company === targetCompany));
  }
  const finalRev = actRecs.length > 0 ? actRecs.reduce((sum, ar) => sum + ar.amount, 0) : mRev;
  
  let inc = 0;
  if (finalRev >= conf.threshold) {
    // 2026-04-01 이후 새로운 인센티브 체계 적용
    let baseRate = 0.41;
    if (staff.rank === '주임') baseRate = 0.42;
    else if (staff.rank === '대리') baseRate = 0.43;
    else if (staff.rank === '과장') baseRate = 0.44;

    const comp = targetCompany && targetCompany !== '전체' ? targetCompany : staff.company;
    
    let bonusThreshold = 8500000; // 재물팀, 마이브라운 기준
    if (staff.role === "누수팀") {
      bonusThreshold = 9500000; // 누수팀 기준
    }

    if (finalRev > bonusThreshold) {
      // 보너스 구간: 기준액 초과분 전체에 대해 (기본비율) 적용 + 보너스 기준 초과분에 대해 (가산비율 2%) 추가 적용
      // 문서의 예시: 대리 매출 1000만원 시 (1000-600)*45% 가 아니라, 
      // 문서의 정확한 예시: (1000-600)*45% 를 적용한다고 되어 있음. 
      // "대리 매출이 1000만원 일시 인센기준 600만원 초과분의 기본비율(43%) + 가산비율(2%) 총 45%를 적용한다. (1000-600)*45%"
      // 즉, 전체 초과분에 대해 45%를 적용하는 것임.
      const totalRate = baseRate + 0.02;
      inc = Math.floor((finalRev - conf.threshold) * totalRate);
    } else {
      // 기본 구간
      inc = Math.floor((finalRev - conf.threshold) * baseRate);
    }
  }
  
  return {
    name: staff.name,
    revenue: mRev,
    incentive: inc,
    netPay: (conf.base + inc),
    company: staff.company,
    role: staff.role,
    rank: staff.rank,
    reports: sortedReports,
    itemBreakdown: breakdown
  };
}
