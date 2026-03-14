import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Login from './components/Login';
import WaitingApproval from './components/WaitingApproval';
import MainApp from './components/MainApp';
import SeasonalEffects from './components/SeasonalEffects';

function AppContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-indigo-500 font-bold animate-pulse tracking-widest text-sm">LOADING...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  if (currentUser.isResigned) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">접근 제한</h2>
        <p className="text-slate-500 text-sm">퇴사 처리된 계정입니다. 관리자에게 문의하세요.</p>
        <button onClick={() => window.location.reload()} className="mt-6 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm">처음으로</button>
      </div>
    );
  }

  if (!currentUser.approved) {
    return <WaitingApproval />;
  }

  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}

const getSeasonalBackground = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) {
    // Spring: Cherry blossoms / fresh leaves vibe (Very subtle pastel pink)
    return "bg-gradient-to-br from-pink-100 via-slate-50 to-rose-50";
  } else if (month >= 6 && month <= 8) {
    // Summer: Ocean / clear sky vibe (Very subtle cool blue)
    return "bg-gradient-to-br from-cyan-100 via-slate-50 to-blue-50";
  } else if (month >= 9 && month <= 11) {
    // Autumn: Fall leaves / warm sunset vibe (Very subtle warm orange)
    return "bg-gradient-to-br from-orange-100 via-slate-50 to-amber-50";
  } else {
    // Winter: Snow / crisp air vibe (Very subtle icy blue/gray)
    return "bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50";
  }
};

export default function App() {
  const today = new Date();
  const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <AuthProvider>
      <div className={`font-sans text-slate-800 min-h-screen p-4 sm:p-6 md:p-8 box-border leading-relaxed bg-fixed ${getSeasonalBackground()}`}>
        <SeasonalEffects />
        <div className="max-w-[900px] mx-auto flex flex-col min-h-[calc(100vh-64px)] relative z-10">
          <header className="flex items-center justify-between p-2 pb-6 mb-4 border-b border-slate-200/50">
            <div className="flex items-center gap-4">
              <div className="w-[48px] h-[48px] bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30 relative">
                SAS
                <div className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-white text-[0.65rem] px-2 py-0.5 rounded-full font-extrabold shadow-sm border border-white/20">
                  V1.0
                </div>
              </div>
              <h1 className="text-xl m-0 text-slate-800 font-extrabold tracking-tight">
                SAS손해사정
                <span className="text-indigo-500 text-xs block mt-1 font-semibold tracking-wide uppercase">업무포탈</span>
              </h1>
            </div>
            <div className="text-sm font-bold text-slate-600 bg-white/60 px-3 py-1.5 rounded-xl shadow-sm border border-slate-200/50 backdrop-blur-md hidden sm:block">
              {formattedDate}
            </div>
          </header>
          
          <AppContent />
          
          <footer className="mt-auto pt-8 pb-4 text-center text-slate-400 text-xs font-medium tracking-wide">
            Designed by Jung sungwook | 2026 v1.0
          </footer>
        </div>
      </div>
    </AuthProvider>
  );
}
