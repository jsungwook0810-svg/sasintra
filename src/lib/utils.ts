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

export function calculateAnnualLeave(jStr: string) {
  if (!jStr) return 0;
  const jd = new Date(jStr);
  const ty = getKSTTime().getFullYear();
  const jy = jd.getFullYear();
  
  if (ty === jy) return Math.max(0, getKSTTime().getMonth() - jd.getMonth());
  if (ty === jy + 1) {
    const d = Math.floor((new Date(jy, 11, 31).getTime() - jd.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return parseFloat(((15 * d) / 365).toFixed(1));
  }
  return Math.min(15 + Math.max(0, Math.floor((ty - jy - 2) / 2)), 25);
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
