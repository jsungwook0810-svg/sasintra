import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { getKSTMonth, getKSTToday, calculatePerformance, feeMap } from '@/lib/utils';

export default function AdminReports() {
  const { globalStaffList, globalAllReports, globalActualRevenues } = useData();
  const [subTab, setSubTab] = useState('stats');
  const [month, setMonth] = useState(getKSTMonth());
  const [liveDate, setLiveDate] = useState(getKSTToday());
  const [selectedCompany, setSelectedCompany] = useState('삼성');

  const renderStats = () => {
    let totalRev = 0, tRec = 0, tCom = 0, tPen = 0, tInv = 0;
    const itemSummary: Record<string, any> = {};
    const userStatsHtml: any[] = [];

    globalStaffList.filter(u => u.approved && u.company === selectedCompany).forEach(u => {
      const p = calculatePerformance(u.userId, month, globalStaffList, globalAllReports, globalActualRevenues);
      if (p) {
        totalRev += p.revenue;
        p.reports.forEach((r: any) => {
          for (let g in r.data) {
            const d = r.data[g];
            tRec += (d["접수"] || 0); tCom += (d["종결"] || 0); tPen += (d["미결"] || 0); tInv += (d["조사미결"] || 0);

            if (!itemSummary[g]) itemSummary[g] = { rec: 0, com: 0, pen: 0, inv: 0, rev: 0 };
            itemSummary[g].rec += (d["접수"] || 0); itemSummary[g].com += (d["종결"] || 0);
            itemSummary[g].pen += (d["미결"] || 0); itemSummary[g].inv += (d["조사미결"] || 0);
            if (feeMap[g]) itemSummary[g].rev += (d["종결"] || 0) * feeMap[g];
          }
        });

        if (u.role !== '관리자' && p.reports.length > 0) {
          let uRec = 0, uCom = 0, uPen = 0, uInv = 0;
          const details = Object.keys(p.itemBreakdown).map(k => {
            const d = p.itemBreakdown[k];
            if (d.rec > 0 || d.com > 0 || d.pen > 0 || d.inv > 0) {
              uRec += d.rec; uCom += d.com; uPen += d.pen; uInv += d.inv;
              return <div key={k} className="mt-1 pl-1.5">• {k} : 접수 {d.rec} / 종결 {d.com} / 미결 {d.pen} / 조사 {d.inv}</div>;
            }
            return null;
          });

          userStatsHtml.push(
            <div key={u.userId} className="bg-white p-4 rounded-xl border border-slate-200 border-l-[4px] border-l-blue-500 shadow-sm mb-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2.5">
                <b className="text-base">{u.name} <small className="text-slate-500 font-normal">({u.company}/{u.role}/{u.rank})</small></b>
                <span className="text-blue-500 font-black text-lg">{p.revenue.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between mb-2.5 font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg text-center">
                <div className="flex-1">접수<br /><span className="text-lg">{uRec}</span></div>
                <div className="flex-1 text-emerald-500">종결<br /><span className="text-lg">{uCom}</span></div>
                <div className="flex-1 text-red-500">미결<br /><span className="text-lg">{uPen}</span></div>
                <div className="flex-1 text-amber-500">조사<br /><span className="text-lg">{uInv}</span></div>
              </div>
              <div className="text-slate-600 text-xs leading-relaxed">{details}</div>
            </div>
          );
        }
      }
    });

    return (
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border-t-[5px] border-blue-500">
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-600 mb-2">조회 월 선택</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" />
          </div>
          <div className="bg-slate-100 mb-3 p-4 rounded-xl text-center border border-slate-200">
            <span className="block font-extrabold text-2xl text-blue-500 leading-tight">{totalRev.toLocaleString()}원</span>
            <span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">{selectedCompany} 합산 가매출액</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><span className="block font-extrabold text-lg text-slate-800">{tRec}</span><span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">총 접수</span></div>
            <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><span className="block font-extrabold text-lg text-emerald-500">{tCom}</span><span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">총 종결</span></div>
            <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><span className="block font-extrabold text-lg text-red-500">{tPen}</span><span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">총 미결</span></div>
            <div className="bg-white p-3 rounded-xl text-center border border-slate-200"><span className="block font-extrabold text-lg text-amber-500">{tInv}</span><span className="block text-[0.65rem] text-slate-500 mt-1 font-bold">총 조사</span></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
          <h2 className="text-base m-0 mb-4 font-bold">📦 항목별 가매출 통계</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">항목</th>
                  <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">접수</th>
                  <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">종결</th>
                  <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">미결</th>
                  <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">조사</th>
                  <th className="bg-slate-100 p-1.5 border-b border-slate-200 text-center text-slate-600 font-extrabold">매출</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(itemSummary).map(it => {
                  const s = itemSummary[it];
                  if (s.rec > 0 || s.com > 0 || s.pen > 0 || s.inv > 0) {
                    return (
                      <tr key={it}>
                        <td className="text-left font-bold text-blue-500 pl-2 p-2 border-b border-slate-100">{it}</td>
                        <td className="text-center p-2 border-b border-slate-100">{s.rec}</td>
                        <td className="text-center p-2 border-b border-slate-100">{s.com}</td>
                        <td className="text-center p-2 border-b border-slate-100">{s.pen}</td>
                        <td className="text-center p-2 border-b border-slate-100">{s.inv}</td>
                        <td className="text-center p-2 border-b border-slate-100 font-extrabold">{s.rev.toLocaleString()}원</td>
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
          <h2 className="text-base m-0 mb-4 font-bold">👥 직원별 월간 누적 성과</h2>
          <div className="flex flex-col gap-3">
            {userStatsHtml.length > 0 ? userStatsHtml : <p className="text-center p-2.5 text-slate-500 text-sm">해당 월에 제출된 마감보고가 없습니다.</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderLive = () => {
    const dailyReports = globalAllReports.filter(r => r.date === liveDate);
    const submittedUids = dailyReports.map(r => r.userId);

    const unreported: any[] = [];
    const reported: any[] = [];

    globalStaffList.filter(u => u.approved && u.company === selectedCompany && u.role !== '관리자' && u.rank !== '팀장').forEach(u => {
      if (!submittedUids.includes(u.userId)) {
        unreported.push(
          <div key={u.userId} className="bg-white p-3 rounded-xl border border-slate-200 border-l-[4px] border-l-red-500 shadow-sm mb-2">
            <b>{u.name}</b> <span className="text-xs text-slate-500">({u.company}/{u.role}/{u.rank})</span> - <b className="text-red-500 text-sm">미제출</b>
          </div>
        );
      } else {
        const rep = dailyReports.find(r => r.userId === u.userId);
        if (!rep) return;
        let dRev = 0;
        const details = Object.keys(rep.data).map(k => {
          const d = rep.data[k];
          if (feeMap[k]) dRev += (d.종결 || 0) * feeMap[k];
          if (d['접수'] || d['종결'] || d['미결'] || d['조사미결']) {
            return <div key={k} className="mt-1 pl-1.5">• {k} : 접수 {d['접수'] || 0} / 종결 {d['종결'] || 0} / 미결 {d['미결'] || 0} / 조사 {d['조사미결'] || 0}</div>;
          }
          return null;
        });

        reported.push(
          <div key={u.userId} className="bg-white p-3 rounded-xl border border-slate-200 border-l-[4px] border-l-blue-500 shadow-sm mb-2 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1.5">
              <b className="text-sm">{u.name} <small className="text-slate-500 font-normal">({u.company}/{u.role}/{u.rank})</small></b>
              <span className="text-blue-500 font-extrabold">+{dRev.toLocaleString()}원</span>
            </div>
            <div className="text-slate-600 leading-relaxed">{details}</div>
            {rep.memo && <div className="mt-1.5 text-slate-500 italic">📝 {rep.memo}</div>}
          </div>
        );
      }
    });

    return (
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border-t-[5px] border-amber-500">
          <h2 className="text-base m-0 mb-2.5 font-bold">📅 조회 일자 선택</h2>
          <input
            type="date"
            value={liveDate}
            onChange={(e) => setLiveDate(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          />
        </div>
        <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border-t-[5px] border-red-500">
          <h2 className="text-base text-red-500 m-0 mb-2.5 font-bold">⚠️ {selectedCompany} 마감보고 미제출자</h2>
          <div className="flex flex-col">
            {unreported.length > 0 ? unreported : <p className="text-center text-sm text-slate-500">미제출자가 없습니다.</p>}
          </div>
        </div>
        <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
          <h2 className="text-lg m-0 mb-3 font-bold">👥 {selectedCompany} 직원별 보고 현황</h2>
          <div className="flex flex-col">
            {reported.length > 0 ? reported : <p className="text-center text-sm text-slate-500">제출된 보고가 없습니다.</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4 flex items-center justify-between">
        <label className="font-bold text-slate-700 mr-4">🏢 보험사 선택</label>
        <select 
          value={selectedCompany} 
          onChange={(e) => setSelectedCompany(e.target.value)} 
          className="flex-1 p-2 border border-slate-300 rounded-lg text-sm focus:border-indigo-500 outline-none font-medium"
        >
          <option value="삼성">삼성</option>
          <option value="마이브라운">마이브라운</option>
        </select>
      </div>

      <nav className="flex bg-slate-100 rounded-xl p-1 mb-4">
        <div
          onClick={() => setSubTab('stats')}
          className={`flex-1 p-2.5 text-sm font-bold text-center rounded-lg cursor-pointer transition-all ${subTab === 'stats' ? 'bg-white text-blue-500 shadow-sm' : 'text-slate-500'}`}
        >
          📊 통합성과
        </div>
        <div
          onClick={() => setSubTab('live')}
          className={`flex-1 p-2.5 text-sm font-bold text-center rounded-lg cursor-pointer transition-all ${subTab === 'live' ? 'bg-white text-blue-500 shadow-sm' : 'text-slate-500'}`}
        >
          📋 업무현황
        </div>
      </nav>
      {subTab === 'stats' ? renderStats() : renderLive()}
    </div>
  );
}
