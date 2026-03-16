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
  if (!jStr) return 0;
  const jd = new Date(jStr);
  const today = getKSTTime();
  const ty = targetYear !== undefined ? targetYear : today.getFullYear();
  const jy = jd.getFullYear();
  
  if (ty < jy) return 0;

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
    const endOfFirstYear = new Date(jy, 11, 31);
    const daysInFirstYear = Math.floor((endOfFirstYear.getTime() - jd.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    annualLeavesForTy = (15 * daysInFirstYear) / 365;
  } else {
    // 3년차 이상: 기본 15일 + 가산 연차
    const yearsOfService = ty - jy;
    const extraDays = Math.max(0, Math.floor((yearsOfService - 1) / 2));
    annualLeavesForTy = Math.min(15 + extraDays, 25);
  }

  const totalLeave = monthlyLeavesForTy + annualLeavesForTy;

  // 반올림 규칙: 13.1 -> 13.5, 13.5 -> 13.5, 13.6 -> 14
  return Math.ceil(totalLeave * 2) / 2;
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

export function calculatePerformance(uid: string, month: string, globalStaffList: any[], globalAllReports: any[], globalActualRevenues: any[]) {
  const staff = globalStaffList.find(s => s.userId === uid);
  if (!staff) return null;
  
  if (staff.role === '관리자') {
    return { name: staff.name, revenue: 0, incentive: 0, netPay: 0, company: staff.company, role: staff.role, rank: staff.rank, reports: [], itemBreakdown: {} };
  }
  
  const conf = (salaryData[staff.role] || salaryData["누수팀"])[staff.rank];
  if (!conf) return null;

  let mRev = 0;
  const reports = globalAllReports.filter(r => r.userId === uid && r.date.startsWith(month));
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
  
  const actRec = globalActualRevenues.find(ar => ar.userId === uid && ar.month === month);
  const finalRev = actRec ? actRec.amount : mRev;
  
  let inc = 0;
  if (finalRev >= conf.target) {
    let rate = 0.35;
    if (staff.company === "마이브라운") {
      rate = finalRev >= 9500000 ? 0.44 : (finalRev >= 8250000 ? 0.41 : (finalRev >= 7000000 ? 0.38 : 0.35));
    } else if (staff.role === "누수팀") {
      rate = finalRev >= 10000000 ? 0.44 : (finalRev >= 8750000 ? 0.41 : (finalRev >= 7500000 ? 0.38 : 0.35));
    }
    inc = Math.floor((finalRev - conf.threshold) * rate);
  }
  
  return {
    name: staff.name,
    revenue: mRev,
    incentive: inc,
    netPay: (conf.base + inc),
    company: staff.company,
    role: staff.role,
    rank: staff.rank,
    reports,
    itemBreakdown: breakdown
  };
}
