import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Login from './components/Login';
import WaitingApproval from './components/WaitingApproval';
import MainApp from './components/MainApp';

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

  if (!currentUser.approved) {
    return <WaitingApproval />;
  }

  return (
    <DataProvider>
      <MainApp />
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="font-sans text-slate-800 min-h-screen p-4 sm:p-6 md:p-8 box-border leading-relaxed">
        <div className="max-w-[900px] mx-auto flex flex-col min-h-[calc(100vh-64px)]">
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
                <span className="text-indigo-500 text-xs block mt-1 font-semibold tracking-wide uppercase">Workspace Portal</span>
              </h1>
            </div>
          </header>
          
          <AppContent />
          
          <footer className="mt-auto pt-8 pb-4 text-center text-slate-400 text-xs font-medium tracking-wide">
            Designed by Jung sungwook | 2026 v1.0.8 (Final)
          </footer>
        </div>
      </div>
    </AuthProvider>
  );
}
