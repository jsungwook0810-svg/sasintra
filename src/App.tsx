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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500 font-bold">로딩 중...</div>
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
      <div className="font-sans bg-slate-50 text-slate-800 min-h-screen p-4 box-border leading-relaxed">
        <div className="max-w-[800px] mx-auto flex flex-col min-h-[calc(100vh-30px)]">
          <header className="flex items-center justify-between p-1.5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] bg-blue-500 rounded-xl text-white flex items-center justify-center font-bold text-base relative">
                SAS
                <div className="absolute -top-1 -right-2.5 bg-emerald-500 text-white text-[0.6rem] px-1.5 py-0.5 rounded font-extrabold rotate-12">
                  V1.0
                </div>
              </div>
              <h1 className="text-lg m-0 text-slate-800 font-extrabold">
                SAS손해사정
                <span className="text-blue-500 text-xs block mt-0.5">업무 포탈 v1.0.8</span>
              </h1>
            </div>
          </header>
          
          <AppContent />
          
          <footer className="mt-auto py-5 text-center text-slate-400 text-xs">
            Designed by Jung sungwook | 2026 v1.0.8 (Final)
          </footer>
        </div>
      </div>
    </AuthProvider>
  );
}
