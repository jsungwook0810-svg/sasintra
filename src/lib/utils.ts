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
  
  let totalLeave = 0;

  if (ty < jy) return 0;

  if (ty === jy) {
    // 입사 당해년도 (회계연도 기준 1년차)
    // 입사월부터 12월까지 만근 시 발생하는 월차 (최대 11일)
    let year1Monthly = 11 - jd.getMonth();
    if (jd.getDate() > 1) year1Monthly -= 1;
    totalLeave = Math.max(0, year1Monthly);
  } else if (ty === jy + 1) {
    // 입사 다음 해 (회계연도 기준 2년차)
    // 1. 전년도에 발생한 월차를 제외하고, 입사 1년이 될 때까지 남은 월차
    let year1Monthly = 11 - jd.getMonth();
    if (jd.getDate() > 1) year1Monthly -= 1;
    let year2Monthly = 11 - Math.max(0, year1Monthly);

    // 2. 전년도 근무일수 비례 연차
    const daysInFirstYear = Math.floor((new Date(jy, 11, 31).getTime() - jd.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const proportionalLeave = (15 * daysInFirstYear) / 365;
    
    totalLeave = year2Monthly + proportionalLeave;
  } else {
    // 회계연도 기준 3년차 이상
    const yearsOfService = ty - jy;
    const extraDays = Math.max(0, Math.floor((yearsOfService - 1) / 2));
    totalLeave = Math.min(15 + extraDays, 25);
  }

  // 반올림 규칙: 13.1 -> 13.5, 13.5 -> 13.5, 13.6 -> 14
  return Math.ceil(totalLeave * 2) / 2;
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
  const breakdown: Record<string, any> = {};
  
  reports.forEach(r => {
    for (let g in r.data) {
      const d = r.data[g];
      if (feeMap[g]) mRev += (d.종결 || 0) * feeMap[g];
      if (!breakdown[g]) breakdown[g] = { rec: 0, com: 0, pen: 0, inv: 0, rev: 0 };
      breakdown[g].rec += (d['접수'] || 0);
      breakdown[g].com += (d['종결'] || 0);
      breakdown[g].pen += (d['미결'] || 0);
      breakdown[g].inv += (d['조사미결'] || 0);
      if (feeMap[g]) breakdown[g].rev += (d.종결 || 0) * feeMap[g];
    }
  });
  
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
