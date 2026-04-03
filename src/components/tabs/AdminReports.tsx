import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, getKSTToday, feeMap, getReportCompany, calculatePerformance } from '@/lib/utils';

export default function AdminReports() {
  const { globalStaffList, globalAllReports, globalActualRevenues, allLeavesGlobal } = useData();
  const [periodType, setPeriodType] = useState<'day' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState(getKSTToday());
  const [selectedMonth, setSelectedMonth] = useState(getKSTMonth());
  const [selectedYear, setSelectedYear] = useState(getKSTMonth().split('-')[0]);
  const [selectedCompany, setSelectedCompany] = useState('전체');

  const [dailyPage, setDailyPage] = useState(1);
  const [statsPage, setStatsPage] = useState(1);
  const itemsPerPage = 5;

  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    user: any;
    data: Record<string, any>;
    periodLabel: string;
  } | null>(null);

  const [pushPrompt, setPushPrompt] = useState<{
    isOpen: boolean;
    user: any;
  } | null>(null);

  const handleMissingUserClick = (user: any) => {
    setPushPrompt({ isOpen: true, user });
  };

  const handleExcludeSubmit = async () => {
    if (!pushPrompt?.user) return;
    
    try {
      const { doc, setDoc, collection } = await import('firebase/firestore');
      const { db, appId } = await import('@/lib/firebase');
      
      const reportId = `${selectedDate}_${pushPrompt.user.userId}`;
      const reportRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'daily_reports'), reportId);
      
      await setDoc(reportRef, {
        userId: pushPrompt.user.userId,
        name: pushPrompt.user.name,
        date: selectedDate,
        data: {},
        isExcluded: true,
        company: pushPrompt.user.company || '전체',
        role: pushPrompt.user.role || '기본 업무',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error excluding user:', error);
    } finally {
      setPushPrompt(null);
    }
  };

  const handleSendPush = async () => {
    if (!pushPrompt?.user) return;
    
    try {
      const { doc, setDoc, collection } = await import('firebase/firestore');
      const { db, appId } = await import('@/lib/firebase');
      
      const dateParts = selectedDate.split('-');
      const formattedDate = `${dateParts[0]}년 ${dateParts[1]}월 ${dateParts[2]}일`;

      const notifRef = doc(collection(db, 'artifacts', appId, 'users', pushPrompt.user.userId, 'notifications'));
      await setDoc(notifRef, {
        title: '마감보고 미제출 알림',
        body: `${formattedDate} 마감보고 제출이 안되었으니 제출바랍니다!`,
        createdAt: new Date().toISOString(),
        read: false,
        type: 'missing_report',
        date: selectedDate
      });
    } catch (error) {
      console.error('Error sending push:', error);
    } finally {
      setPushPrompt(null);
    }
  };

  const handleUserClick = (user: any) => {
    let aggregatedData: Record<string, { 접수: number, 종결: number, 미결: number }> = {};
    let periodLabel = '';

    if (periodType === 'day') {
      periodLabel = `${selectedDate} 마감보고 상세`;
      const todayReport = globalAllReports.find(r => r.userId === user.userId && r.date === selectedDate);
      if (todayReport) {
        aggregatedData = JSON.parse(JSON.stringify(todayReport.data));
      }
    } else {
      const prefix = periodType === 'month' ? selectedMonth : selectedYear;
      periodLabel = periodType === 'month' ? `${selectedMonth} 누적 마감보고 상세` : `${selectedYear} 누적 마감보고 상세`;
      
      const reports = globalAllReports.filter(r => r.userId === user.userId && r.date.startsWith(prefix));
      const sortedReports = [...reports].sort((a, b) => a.date.localeCompare(b.date));
      
      sortedReports.forEach(r => {
        for (let g in r.data) {
          if (!aggregatedData[g]) aggregatedData[g] = { 접수: 0, 종결: 0, 미결: 0 };
          const d = r.data[g];
          if (g === '조사미결') {
            if (d['미결'] !== undefined) aggregatedData[g]['미결'] = d['미결'];
          } else {
            aggregatedData[g]['접수'] += (d['접수'] || 0);
            aggregatedData[g]['종결'] += (d['종결'] || 0);
            if (d['미결'] !== undefined) aggregatedData[g]['미결'] = d['미결'];
          }
        }
      });
    }

    setDetailsModal({
      isOpen: true,
      user,
      data: aggregatedData,
      periodLabel
    });
  };

  useEffect(() => {
    setDailyPage(1);
    setStatsPage(1);
  }, [periodType, selectedDate, selectedMonth, selectedYear, selectedCompany]);

  const dailyStats = useMemo(() => {
    if (periodType !== 'day') return null;

    const currentMonth = selectedDate.substring(0, 7);
    const submitted: any[] = [];
    const missing: any[] = [];

    globalStaffList.forEach(u => {
      if (u.role === '관리자' || !u.approved) return;
      if (u.joinDate && u.joinDate > selectedDate) return;
      if (u.isResigned && (!u.resignDate || u.resignDate < selectedDate)) return;

      // Check if user is on leave (excluding half-day leave)
      const isOnLeave = allLeavesGlobal?.some(leave => 
        leave.userId === u.userId && 
        !leave.type.includes('반차') &&
        leave.startDate <= selectedDate && 
        leave.endDate >= selectedDate
      );
      if (isOnLeave) return;

      // Get all reports for this user up to the selected date
      const allUserReports = globalAllReports.filter(r => r.userId === u.userId && r.date <= selectedDate);
      allUserReports.sort((a, b) => b.date.localeCompare(a.date)); // Descending

      const todayReport = allUserReports.find(r => r.date === selectedDate);
      const prevReport = allUserReports.find(r => r.date < selectedDate);

      // Determine user's company on selectedDate
      let inferredCompany = u.company;
      if (todayReport) {
        inferredCompany = getReportCompany(todayReport, u);
      } else if (prevReport) {
        inferredCompany = getReportCompany(prevReport, u);
      }

      // Filter by selected company
      if (selectedCompany !== '전체' && inferredCompany !== selectedCompany) return;

      if (!todayReport) {
        missing.push({ ...u, company: inferredCompany });
        return;
      }

      if (todayReport.isExcluded) {
        return;
      }

      // Calculate today's values
      let tRec = 0, tCom = 0, tPen = 0, tInvPen = 0;
      for (let g in todayReport.data) {
        const d = todayReport.data[g];
        if (g === '조사미결') {
          tInvPen += (d['미결'] || 0);
        } else {
          tRec += (d['접수'] || 0);
          tCom += (d['종결'] || 0);
          tPen += (d['미결'] || 0);
        }
      }

      // Calculate prev values
      let pRec = 0, pCom = 0, pPen = 0, pInvPen = 0;
      if (prevReport) {
        for (let g in prevReport.data) {
          const d = prevReport.data[g];
          if (g === '조사미결') {
            pInvPen += (d['미결'] || 0);
          } else {
            pRec += (d['접수'] || 0);
            pCom += (d['종결'] || 0);
            pPen += (d['미결'] || 0);
          }
        }
      }

      // Calculate accumulated for the month up to selectedDate (only for the inferred company)
      let accRec = 0, accCom = 0;
      const monthReports = allUserReports.filter(r => r.date.startsWith(currentMonth));
      monthReports.forEach(r => {
        if (getReportCompany(r, u) !== inferredCompany) return;
        for (let g in r.data) {
          if (g !== '조사미결') {
            accRec += (r.data[g]['접수'] || 0);
            accCom += (r.data[g]['종결'] || 0);
          }
        }
      });

      submitted.push({
        ...u,
        company: inferredCompany,
        today: { rec: tRec, com: tCom, pen: tPen, invPen: tInvPen },
        diff: {
          rec: tRec - pRec,
          com: tCom - pCom,
          pen: tPen - pPen,
          invPen: tInvPen - pInvPen
        },
        acc: { rec: accRec, com: accCom }
      });
    });

    submitted.sort((a, b) => b.today.com - a.today.com || b.today.rec - a.today.rec);

    return { submitted, missing };
  }, [periodType, selectedDate, selectedCompany, globalStaffList, globalAllReports]);

  const stats = useMemo(() => {
    if (periodType === 'day') return null;
    
    const prefix = periodType === 'month' ? selectedMonth : selectedYear;
    
    let totalEstimated = 0;
    let totalConfirmed = 0;
    let totalRec = 0;
    let totalCom = 0;
    let totalPen = 0;
    let totalInvPen = 0;

    const staffStats = globalStaffList.filter(u => u.role !== '관리자').filter(u => {
      if (u.isResigned && u.resignDate) {
        if (periodType === 'month' && u.resignDate < selectedMonth + '-01') return false;
        if (periodType === 'year' && u.resignDate < selectedYear + '-01-01') return false;
      }
      if (!u.joinDate) return true;
      if (periodType === 'month') {
        return u.joinDate <= selectedMonth + '-31';
      } else {
        return u.joinDate <= selectedYear + '-12-31';
      }
    }).map(u => {
      const allPrefixReports = globalAllReports.filter(r => r.userId === u.userId && r.date.startsWith(prefix));
      
      // Filter reports by selectedCompany
      const reports = allPrefixReports.filter(r => {
        if (selectedCompany === '전체') return true;
        return getReportCompany(r, u) === selectedCompany;
      });

      const sortedReports = [...reports].sort((a, b) => a.date.localeCompare(b.date));
      
      let uRec = 0;
      let uCom = 0;
      let uPen = 0;
      let uInvPen = 0;
      let uEstRev = 0;
      let totalUserEstRev = 0;
      
      const latestPending: Record<string, number> = {};
      
      // Calculate total est rev across all companies for pro-rating
      allPrefixReports.forEach(r => {
        for (let g in r.data) {
          if (feeMap[g]) totalUserEstRev += (r.data[g]['종결'] || 0) * feeMap[g];
        }
      });
      
      sortedReports.forEach(r => {
        for (let g in r.data) {
          const d = r.data[g];
          if (g === '조사미결') {
            if (d['미결'] !== undefined) latestPending[g] = d['미결'];
          } else {
            uRec += (d['접수'] || 0);
            uCom += (d['종결'] || 0);
            if (d['미결'] !== undefined) latestPending[g] = d['미결'];
            if (feeMap[g]) uEstRev += (d['종결'] || 0) * feeMap[g];
          }
        }
      });

      uPen = Object.keys(latestPending).filter(k => k !== '조사미결').reduce((sum, k) => sum + latestPending[k], 0);
      uInvPen = latestPending['조사미결'] || 0;

      let uConfRev = 0;
      let hasConfRev = false;
      let uIncentive = 0;

      if (periodType === 'month') {
        const act = globalActualRevenues.find(ar => ar.userId === u.userId && ar.month === selectedMonth);
        if (act) {
          uConfRev = act.amount;
          hasConfRev = true;
        }
        const p = calculatePerformance(u.userId, selectedMonth, globalStaffList, globalAllReports, globalActualRevenues);
        if (p) uIncentive = p.incentive;
      } else {
        const acts = globalActualRevenues.filter(ar => ar.userId === u.userId && ar.month.startsWith(selectedYear));
        if (acts.length > 0) {
          uConfRev = acts.reduce((sum, ar) => sum + ar.amount, 0);
          hasConfRev = true;
        }
        // Calculate incentive for each month in the year
        for (let m = 1; m <= 12; m++) {
          const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
          const p = calculatePerformance(u.userId, monthStr, globalStaffList, globalAllReports, globalActualRevenues);
          if (p) uIncentive += p.incentive;
        }
      }

      // Pro-rate uConfRev and uIncentive if filtering by company
      if (selectedCompany !== '전체' && totalUserEstRev > 0) {
        const ratio = uEstRev / totalUserEstRev;
        if (hasConfRev) uConfRev = Math.round(uConfRev * ratio);
        uIncentive = Math.round(uIncentive * ratio);
      } else if (selectedCompany !== '전체' && totalUserEstRev === 0 && u.company !== selectedCompany) {
        uConfRev = 0;
        uIncentive = 0;
      }

      totalEstimated += uEstRev;
      totalConfirmed += uConfRev;
      totalRec += uRec;
      totalCom += uCom;
      totalPen += uPen;
      totalInvPen += uInvPen;

      // Determine active months for average calculation in year view
      const activeMonths = new Set(reports.map(r => r.date.substring(0, 7))).size || 1;
      const activeDays = new Set(reports.map(r => r.date)).size || 1;

      return {
        ...u,
        displayCompany: selectedCompany !== '전체' ? selectedCompany : u.company,
        rec: uRec,
        com: uCom,
        pen: uPen,
        invPen: uInvPen,
        estRev: uEstRev,
        confRev: uConfRev,
        hasConfRev,
        incentive: uIncentive,
        diff: uConfRev - uEstRev,
        activeMonths,
        activeDays,
        hasData: uRec > 0 || uCom > 0 || uPen > 0 || uInvPen > 0 || uConfRev > 0,
        matchesCompany: selectedCompany === '전체' || u.company === selectedCompany || reports.length > 0
      };
    }).filter(s => s.matchesCompany && (s.hasData || s.approved));

    staffStats.sort((a, b) => {
      const valA = a.hasConfRev ? a.confRev : a.estRev;
      const valB = b.hasConfRev ? b.confRev : b.estRev;
      return valB - valA || b.estRev - a.estRev;
    });

    return {
      totalEstimated,
      totalConfirmed,
      totalRec,
      totalCom,
      totalPen,
      totalInvPen,
      staffStats
    };
  }, [periodType, selectedMonth, selectedYear, selectedCompany, globalStaffList, globalAllReports, globalActualRevenues]);

  const monthlyBreakdown = useMemo(() => {
    if (periodType !== 'year') return null;
    const breakdown = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
      
      const monthReports = globalAllReports.filter(r => r.date.startsWith(monthStr));
      let rec = 0;
      let com = 0;
      monthReports.forEach(r => {
        const u = globalStaffList.find(s => s.userId === r.userId);
        if (selectedCompany !== '전체' && u && getReportCompany(r, u) !== selectedCompany) return;
        
        for (let g in r.data) {
          if (g !== '조사미결') {
            rec += (r.data[g]['접수'] || 0);
            com += (r.data[g]['종결'] || 0);
          }
        }
      });

      const monthRevenues = globalActualRevenues.filter(ar => ar.month === monthStr);
      let rev = 0;
      monthRevenues.forEach(ar => {
        const u = globalStaffList.find(s => s.userId === ar.userId);
        if (selectedCompany !== '전체' && u) {
          const comp = ar.company || u.company;
          if (comp !== selectedCompany) return;
        }
        rev += (ar.amount || 0);
      });

      breakdown.push({ month: m, rec, com, rev });
    }
    return breakdown;
  }, [periodType, selectedYear, selectedCompany, globalAllReports, globalActualRevenues, globalStaffList]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
        <h2 className="text-xl text-slate-800 m-0 mb-6 font-extrabold tracking-tight flex items-center gap-2">
          <span className="text-2xl">📊</span> 통합 통계 <span className="text-sm font-medium text-slate-400 font-normal ml-2">(마감/매출)</span>
        </h2>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-600 mb-2">조회 기준</label>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setPeriodType('day')}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${periodType === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                일별 보기
              </button>
              <button
                onClick={() => setPeriodType('month')}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${periodType === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                월별 보기
              </button>
              <button
                onClick={() => setPeriodType('year')}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${periodType === 'year' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                연도별 보기
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-600 mb-2">
              {periodType === 'day' ? '📅 조회 일자 선택' : periodType === 'month' ? '📅 조회 월 선택' : '📅 조회 연도 선택'}
            </label>
            {periodType === 'day' ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              />
            ) : periodType === 'month' ? (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-3 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              />
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full p-3 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              >
                {[...Array(5)].map((_, i) => {
                  const y = String(new Date().getFullYear() - i);
                  return <option key={y} value={y}>{y}년</option>;
                })}
              </select>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['전체', '삼성', '마이브라운'].map(c => (
            <button
              key={c}
              onClick={() => { setSelectedCompany(c); setDailyPage(1); setStatsPage(1); }}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${selectedCompany === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {periodType === 'year' && monthlyBreakdown && (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>
          <h3 className="text-lg text-slate-800 m-0 mb-6 font-extrabold tracking-tight flex items-center gap-2">
            <span>📅</span> {selectedYear}년 월별 요약
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="p-3 text-sm font-bold text-slate-600">월</th>
                  <th className="p-3 text-sm font-bold text-slate-600">총 접수</th>
                  <th className="p-3 text-sm font-bold text-slate-600">총 종결</th>
                  <th className="p-3 text-sm font-bold text-slate-600">총 매출 (확정기준)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map(b => (
                  <tr key={b.month} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-sm font-bold text-slate-800">{b.month}월</td>
                    <td className="p-3 text-sm text-slate-600 font-medium">{b.rec.toLocaleString()}건</td>
                    <td className="p-3 text-sm text-slate-600 font-medium">{b.com.toLocaleString()}건</td>
                    <td className="p-3 text-sm font-bold text-indigo-600">{b.rev.toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conditional Rendering based on periodType */}
      {periodType === 'day' && dailyStats ? (
        <div className="space-y-6">
          {/* Missing Reporters */}
          {dailyStats.missing.length > 0 && (
            <div className="bg-rose-50/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-400"></div>
              <h3 className="text-sm font-bold text-rose-600 mb-4 flex items-center gap-2">
                <span className="animate-pulse">⚠️</span> 마감보고 미제출자 ({dailyStats.missing.length}명)
              </h3>
              <div className="flex flex-wrap gap-2">
                {dailyStats.missing.map(u => (
                  <span 
                    key={u.userId} 
                    onClick={() => handleMissingUserClick(u)}
                    className="bg-white text-rose-500 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm border border-rose-100 cursor-pointer hover:bg-rose-50 transition-colors"
                  >
                    {u.name} <span className="text-rose-300 font-normal">({u.company})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Submitted Reporters */}
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-4 px-2 flex items-center gap-2">
              <span>✅</span> 마감보고 제출자 ({dailyStats.submitted.length}명)
            </h3>
            <div className="space-y-4">
              {dailyStats.submitted.length === 0 ? (
                <div className="text-center py-10 bg-white/50 rounded-3xl border border-slate-200 border-dashed">
                  <p className="text-slate-500 font-medium">제출된 보고가 없습니다.</p>
                </div>
              ) : (
                <>
                  {dailyStats.submitted.slice((dailyPage - 1) * itemsPerPage, dailyPage * itemsPerPage).map((staff, idx) => (
                    <div key={staff.userId} onClick={() => handleUserClick(staff)} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400"></div>
                    
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <div>
                        <h4 className="text-base font-extrabold text-slate-800">{staff.name}</h4>
                        <div className="text-xs font-medium text-slate-400">{staff.company} / {staff.role} / {staff.rank}</div>
                      </div>
                      
                      <div className="text-right bg-emerald-50 px-3 py-2 rounded-xl">
                        <div className="text-[10px] font-bold text-emerald-500 mb-1">월 누적 (접수/종결)</div>
                        <div className="text-xs font-bold text-emerald-700">
                          {staff.acc.rec}건 / {staff.acc.com}건
                        </div>
                      </div>
                    </div>

                    <div className="pl-2">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">오늘 보고 내역 (전일 대비)</div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <div className="text-[10px] text-slate-500 mb-0.5">접수</div>
                            <div className="text-sm font-bold text-slate-700">{staff.today.rec}</div>
                            <div className={`text-[10px] font-bold mt-0.5 ${staff.diff.rec > 0 ? 'text-blue-500' : staff.diff.rec < 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                              {staff.diff.rec > 0 ? '▲' : staff.diff.rec < 0 ? '▼' : '-'} {Math.abs(staff.diff.rec)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-blue-500 mb-0.5">종결</div>
                            <div className="text-sm font-bold text-blue-600">{staff.today.com}</div>
                            <div className={`text-[10px] font-bold mt-0.5 ${staff.diff.com > 0 ? 'text-blue-500' : staff.diff.com < 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                              {staff.diff.com > 0 ? '▲' : staff.diff.com < 0 ? '▼' : '-'} {Math.abs(staff.diff.com)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-amber-500 mb-0.5">현재 미결</div>
                            <div className="text-sm font-bold text-amber-600">{staff.today.pen}</div>
                            <div className={`text-[10px] font-bold mt-0.5 ${staff.diff.pen > 0 ? 'text-rose-500' : staff.diff.pen < 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                              {staff.diff.pen > 0 ? '▲' : staff.diff.pen < 0 ? '▼' : '-'} {Math.abs(staff.diff.pen)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-rose-500 mb-0.5">조사미결</div>
                            <div className="text-sm font-bold text-rose-600">{staff.today.invPen}</div>
                            <div className={`text-[10px] font-bold mt-0.5 ${staff.diff.invPen > 0 ? 'text-rose-500' : staff.diff.invPen < 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                              {staff.diff.invPen > 0 ? '▲' : staff.diff.invPen < 0 ? '▼' : '-'} {Math.abs(staff.diff.invPen)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                  {Math.ceil(dailyStats.submitted.length / itemsPerPage) > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                      <button
                        onClick={() => setDailyPage(p => Math.max(1, p - 1))}
                        disabled={dailyPage === 1}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold disabled:opacity-50 transition-all hover:bg-slate-50 active:scale-95"
                      >
                        이전
                      </button>
                      <span className="text-sm font-bold text-slate-500">
                        {dailyPage} / {Math.ceil(dailyStats.submitted.length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setDailyPage(p => Math.min(Math.ceil(dailyStats.submitted.length / itemsPerPage), p + 1))}
                        disabled={dailyPage === Math.ceil(dailyStats.submitted.length / itemsPerPage)}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold disabled:opacity-50 transition-all hover:bg-slate-50 active:scale-95"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Overall Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-400"></div>
              <h3 className="text-sm font-bold text-slate-500 mb-4">업무 흐름 요약 (마감보고 기준)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">총 접수</div>
                  <div className="text-2xl font-extrabold text-slate-800">{stats.totalRec.toLocaleString()}<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">총 종결</div>
                  <div className="text-2xl font-extrabold text-blue-600">{stats.totalCom.toLocaleString()}<span className="text-sm font-normal text-blue-400 ml-1">건</span></div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">현재 미결</div>
                  <div className="text-xl font-bold text-amber-500">{stats.totalPen.toLocaleString()}<span className="text-sm font-normal text-amber-400 ml-1">건</span></div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">현재 조사미결</div>
                  <div className="text-xl font-bold text-rose-500">{stats.totalInvPen.toLocaleString()}<span className="text-sm font-normal text-rose-400 ml-1">건</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400"></div>
              <h3 className="text-sm font-bold text-slate-500 mb-4">매출 요약</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                  <div className="text-xs font-bold text-slate-500">보고 가매출 (마감기준)</div>
                  <div className="text-lg font-bold text-slate-700">{stats.totalEstimated.toLocaleString()}원</div>
                </div>
                <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                  <div className="text-xs font-bold text-emerald-600">최종 확정매출 (입력기준)</div>
                  <div className="text-2xl font-extrabold text-emerald-600">{stats.totalConfirmed.toLocaleString()}원</div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs font-bold text-slate-400">차액 (확정 - 가매출)</div>
                  <div className={`text-sm font-bold ${stats.totalConfirmed - stats.totalEstimated >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                    {(stats.totalConfirmed - stats.totalEstimated) > 0 ? '+' : ''}{(stats.totalConfirmed - stats.totalEstimated).toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Details */}
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 mb-4 px-2 flex items-center gap-2">
              <span>👥</span> 직원별 상세 통계
            </h3>
            <div className="space-y-4">
              {stats.staffStats.length === 0 ? (
                <div className="text-center py-10 bg-white/50 rounded-3xl border border-slate-200 border-dashed">
                  <p className="text-slate-500 font-medium">해당 기간에 데이터가 없습니다.</p>
                </div>
              ) : (
                <>
                  {stats.staffStats.slice((statsPage - 1) * itemsPerPage, statsPage * itemsPerPage).map((staff, idx) => (
                    <div key={staff.userId} onClick={() => handleUserClick(staff)} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-400"></div>
                      
                      <div className="flex justify-between items-start mb-4 pl-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{(statsPage - 1) * itemsPerPage + idx + 1}위</span>
                            <h4 className="text-base font-extrabold text-slate-800">{staff.name}</h4>
                        </div>
                        <div className="text-xs font-medium text-slate-400">{staff.displayCompany} / {staff.role} / {staff.rank}</div>
                      </div>
                      
                      {periodType === 'year' ? (
                        <div className="text-right bg-indigo-50 px-3 py-2 rounded-xl">
                          <div className="text-[10px] font-bold text-indigo-400 mb-1">월 평균 (활동 {staff.activeMonths}개월)</div>
                          <div className="text-xs font-bold text-indigo-700">
                            접수 {Math.round(staff.rec / staff.activeMonths)}건 / 종결 {Math.round(staff.com / staff.activeMonths)}건
                          </div>
                        </div>
                      ) : (
                        <div className="text-right bg-emerald-50 px-3 py-2 rounded-xl">
                          <div className="text-[10px] font-bold text-emerald-500 mb-1">일 평균 (보고 {staff.activeDays}일)</div>
                          <div className="text-xs font-bold text-emerald-700">
                            접수 {(staff.rec / staff.activeDays).toFixed(1)}건 / 종결 {(staff.com / staff.activeDays).toFixed(1)}건
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
                      {/* 업무 흐름 */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">업무 흐름 (건수)</div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <div className="text-[10px] text-slate-500 mb-0.5">접수</div>
                            <div className="text-sm font-bold text-slate-700">{staff.rec}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-blue-500 mb-0.5">종결</div>
                            <div className="text-sm font-bold text-blue-600">{staff.com}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-amber-500 mb-0.5">미결</div>
                            <div className="text-sm font-bold text-amber-600">{staff.pen}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-rose-500 mb-0.5">조사미결</div>
                            <div className="text-sm font-bold text-rose-600">{staff.invPen}</div>
                          </div>
                        </div>
                      </div>

                      {/* 매출 비교 */}
                      <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                        <div className="text-[10px] font-bold text-emerald-600 mb-2 uppercase tracking-wider">매출 비교 (원)</div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-slate-500">보고(가매출)</span>
                            <span className="text-xs font-bold text-slate-700">{staff.estRev.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-700">확정매출</span>
                            <span className="text-sm font-extrabold text-emerald-600">{staff.confRev.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-amber-600">예상 인센티브</span>
                            <span className="text-sm font-extrabold text-amber-500">{staff.incentive.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-emerald-100/50">
                            <span className="text-[10px] font-medium text-slate-400">차액</span>
                            <span className={`text-xs font-bold ${staff.diff >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                              {staff.diff > 0 ? '+' : ''}{staff.diff.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                  {Math.ceil(stats.staffStats.length / itemsPerPage) > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                      <button
                        onClick={() => setStatsPage(p => Math.max(1, p - 1))}
                        disabled={statsPage === 1}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold disabled:opacity-50 transition-all hover:bg-slate-50 active:scale-95"
                      >
                        이전
                      </button>
                      <span className="text-sm font-bold text-slate-500">
                        {statsPage} / {Math.ceil(stats.staffStats.length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setStatsPage(p => Math.min(Math.ceil(stats.staffStats.length / itemsPerPage), p + 1))}
                        disabled={statsPage === Math.ceil(stats.staffStats.length / itemsPerPage)}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold disabled:opacity-50 transition-all hover:bg-slate-50 active:scale-95"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      ) : null}

      {/* Push Prompt Modal */}
      {pushPrompt?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 text-center">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-lg font-extrabold text-slate-800 mb-2">마감보고 제출 알림</h3>
              <p className="text-slate-600 font-medium text-sm">
                <span className="font-bold text-blue-600">{pushPrompt.user.name}</span> 직원에게<br/>
                마감보고를 제출하라고 다시 전달하겠습니까?
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => setPushPrompt(null)}
                className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 transition-colors"
              >
                N (취소)
              </button>
              <div className="w-[1px] bg-slate-100"></div>
              <button 
                onClick={handleExcludeSubmit}
                className="flex-1 py-4 text-indigo-600 font-bold hover:bg-indigo-50 transition-colors"
              >
                제출제외
              </button>
              <div className="w-[1px] bg-slate-100"></div>
              <button 
                onClick={handleSendPush}
                className="flex-1 py-4 text-blue-600 font-bold hover:bg-blue-50 transition-colors"
              >
                Y (전달)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">{detailsModal.user.name}</h3>
                <p className="text-sm text-slate-500 font-medium">{detailsModal.periodLabel}</p>
              </div>
              <button onClick={() => setDetailsModal(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {Object.keys(detailsModal.data).length === 0 ? (
                <p className="text-center text-slate-500 py-4 font-medium">데이터가 없습니다.</p>
              ) : (
                Object.entries(detailsModal.data)
                  .sort(([catA], [catB]) => {
                    if (catA === '조사미결') return 1;
                    if (catB === '조사미결') return -1;
                    const feeDiff = (feeMap[catB] || 0) - (feeMap[catA] || 0);
                    if (feeDiff !== 0) return feeDiff;
                    if (catA === '시설소유관리자') return -1;
                    if (catB === '시설소유관리자') return 1;
                    return catA.localeCompare(catB);
                  })
                  .map(([category, values]: [string, any]) => (
                  <div key={category} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-3 text-sm">{category}</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {category !== '조사미결' ? (
                        <>
                          <div className="bg-white py-2 rounded-xl border border-slate-100 shadow-sm">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">접수</div>
                            <div className="text-sm font-extrabold text-blue-600">{values['접수'] || 0}</div>
                          </div>
                          <div className="bg-white py-2 rounded-xl border border-slate-100 shadow-sm">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">종결</div>
                            <div className="text-sm font-extrabold text-emerald-600">{values['종결'] || 0}</div>
                          </div>
                          <div className="bg-white py-2 rounded-xl border border-slate-100 shadow-sm">
                            <div className="text-[10px] text-slate-400 font-bold mb-1">미결</div>
                            <div className="text-sm font-extrabold text-rose-600">{values['미결'] || 0}</div>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-3 bg-white py-2 rounded-xl border border-slate-100 shadow-sm">
                          <div className="text-[10px] text-slate-400 font-bold mb-1">미결</div>
                          <div className="text-sm font-extrabold text-rose-600">{values['미결'] || 0}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
