import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import AdminSettlement from './tabs/AdminSettlement';
import AdminReports from './tabs/AdminReports';
import AdminStaff from './tabs/AdminStaff';
import AdminCorpCard from './tabs/AdminCorpCard';
import EmployeeReport from './tabs/EmployeeReport';
import EmployeeRevenue from './tabs/EmployeeRevenue';
import EmployeeCalculator from './tabs/EmployeeCalculator';
import LeaveManagement from './tabs/LeaveManagement';
import CalendarView from './tabs/CalendarView';
import Notices from './tabs/Notices';
import { getKSTToday, KOR_HOLIDAYS } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function MainApp() {
  const { currentUser, logout } = useAuth();
  const { allUserReports, notices, allLeavesGlobal } = useData();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newPw, setNewPw] = useState('');
  
  const isAdmin = currentUser?.role === '관리자';
  const isJungSungWook = currentUser?.name === '정성욱';
  
  const tabs = isAdmin
    ? [
        { id: 'adminViewSettlement', label: '💰 매출관리(관리자용)' },
        { id: 'adminReportWrapper', label: '📝 마감보고(관리자용)' },
        ...(isJungSungWook ? [{ id: 'adminViewMgmt', label: '👥 직원관리' }] : []),
        { id: 'adminCorpCard', label: '💳 법인카드관리' },
        { id: 'subViewLeave', label: '🌴 휴가관리' },
        { id: 'subViewCal', label: '📅 일정달력' },
        { id: 'subViewNotices', label: '📢 공지사항' }
      ]
    : [
        { id: 'subViewReport', label: '📝 마감보고' },
        { id: 'subViewCalculator', label: '💰 급여계산기' },
        { id: 'subViewLeave', label: '🌴 휴가관리' },
        { id: 'subViewCal', label: '📅 일정달력' },
        { id: 'subViewMyRevenue', label: '📊 매출관리' },
        { id: 'subViewNotices', label: '📢 공지사항' }
      ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const todayStr = getKSTToday();
  const hasReportToday = allUserReports.some(r => r.date === todayStr);

  // 영업일 확인 (주말/공휴일 제외)
  const isWeekend = new Date(todayStr).getDay() === 0 || new Date(todayStr).getDay() === 6;
  const isHoliday = !!KOR_HOLIDAYS[todayStr];
  
  // 휴가 확인
  const isOnLeave = allLeavesGlobal.some(lv => 
    lv.userId === currentUser?.userId && 
    todayStr >= (lv.startDate || lv.date) && 
    todayStr <= (lv.endDate || lv.date)
  );

  const shouldShowReportReminder = !isAdmin && !hasReportToday && !isWeekend && !isHoliday && !isOnLeave;

  const unreadNotice = notices.length > 0 && notices[0].createdAt > (currentUser?.lastReadNotice || 0);

  const handleUpdatePassword = async () => {
    if (!newPw) return window.alert("비밀번호를 입력하세요.");
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser!.userId), {
        password: newPw
      });
      window.alert("비밀번호 수정 완료");
      setShowProfileModal(false);
      setNewPw('');
    } catch (e) {
      console.error(e);
      window.alert("비밀번호 수정 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-30px)]">
      {shouldShowReportReminder && (
        <div 
          onClick={() => setActiveTab('subViewReport')}
          className="mb-4 p-4 rounded-xl text-sm font-bold flex items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer bg-amber-50 text-amber-800 border border-amber-200"
        >
          ⚠️ 오늘 마감보고를 잊지 마세요!
        </div>
      )}

      {unreadNotice && (
        <div 
          onClick={() => setActiveTab('subViewNotices')}
          className="mb-4 p-4 rounded-xl text-sm font-bold flex items-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.05)] cursor-pointer bg-red-50 text-red-600 border border-red-200 animate-pulse"
        >
          🚨 공지사항이 있습니다.
        </div>
      )}

      <div className="bg-slate-900/95 backdrop-blur-md text-white flex justify-between items-center p-5 rounded-3xl mb-6 shadow-xl shadow-slate-900/10 border border-slate-800">
        <div className="flex-1">
          <div className="font-extrabold text-xl tracking-tight">{currentUser?.name}님</div>
          <div className="text-sm text-slate-400 mt-1.5 font-medium flex items-center gap-2">
            <span className="bg-slate-800 px-2 py-0.5 rounded-md text-slate-300">{currentUser?.company}</span>
            <span>{currentUser?.role}</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
            <span>{currentUser?.rank}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowProfileModal(true)}
            className="px-4 py-2.5 bg-white/5 text-xs text-white rounded-xl font-semibold hover:bg-white/10 transition-all border border-white/10"
          >
            내정보수정
          </button>
          <button
            onClick={logout}
            className="px-4 py-2.5 bg-rose-500/10 text-xs text-rose-400 rounded-xl font-semibold hover:bg-rose-500/20 transition-all border border-rose-500/20"
          >
            로그아웃
          </button>
        </div>
      </div>

      <nav className="grid grid-cols-3 gap-2 mb-6 p-1.5 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/50">
        {tabs.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`p-3 text-center rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all duration-200 ${
              activeTab === t.id
                ? 'bg-white text-indigo-600 shadow-md shadow-slate-200/50 ring-1 ring-slate-100'
                : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
            }`}
          >
            {t.label}
          </div>
        ))}
      </nav>

      <div className="flex-1">
        {activeTab === 'adminViewSettlement' && <AdminSettlement />}
        {activeTab === 'adminReportWrapper' && <AdminReports />}
        {activeTab === 'adminViewMgmt' && <AdminStaff />}
        {activeTab === 'adminCorpCard' && <AdminCorpCard />}
        {activeTab === 'subViewReport' && <EmployeeReport />}
        {activeTab === 'subViewCalculator' && <EmployeeCalculator />}
        {activeTab === 'subViewLeave' && <LeaveManagement />}
        {activeTab === 'subViewCal' && <CalendarView />}
        {activeTab === 'subViewMyRevenue' && <EmployeeRevenue />}
        {activeTab === 'subViewNotices' && <Notices />}
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-slate-800">비밀번호 변경</h3>
            <input 
              type="password"
              className="w-full border border-slate-200 p-3 rounded-xl mb-6 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              placeholder="새 비밀번호 입력" 
              value={newPw} 
              onChange={e => setNewPw(e.target.value)} 
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => { setShowProfileModal(false); setNewPw(''); }} 
                className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
              >
                취소
              </button>
              <button 
                onClick={handleUpdatePassword} 
                className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
