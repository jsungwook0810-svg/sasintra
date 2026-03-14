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
  const [isNavOpen, setIsNavOpen] = useState(false);

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
    <div className="flex flex-col min-h-[calc(100vh-30px)] relative">
      {/* Hamburger Button and Active Tab Title */}
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => setIsNavOpen(true)}
          className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
          {tabs.find(t => t.id === activeTab)?.label.replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim()}
        </h2>
      </div>

      {/* Navigation Drawer Overlay */}
      {isNavOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsNavOpen(false)}
        ></div>
      )}

      {/* Navigation Drawer */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Drawer Header: User Profile */}
        <div className="bg-slate-900 text-white p-6 flex flex-col gap-5">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-extrabold text-xl tracking-tight">{currentUser?.name}님</div>
              <div className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-2">
                <span className="bg-slate-800 px-2 py-0.5 rounded-md text-slate-300">{currentUser?.company}</span>
                <span>{currentUser?.role}</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                <span>{currentUser?.rank}</span>
              </div>
            </div>
            <button onClick={() => setIsNavOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => { setShowProfileModal(true); setIsNavOpen(false); }}
            className="w-full py-2.5 bg-white/10 text-xs text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/10"
          >
            내정보수정
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="flex flex-col gap-1 px-4">
            {tabs.map(t => (
              <div
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setIsNavOpen(false);
                }}
                className={`p-4 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 ${
                  activeTab === t.id
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {t.label}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full p-4 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            로그아웃
          </button>
        </div>
      </div>

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
