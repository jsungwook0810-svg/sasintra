import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function WaitingApproval() {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="bg-white/80 backdrop-blur-xl p-12 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 text-center max-w-[420px] w-full relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="text-6xl mb-6 animate-bounce">⏳</div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-3 tracking-tight">승인 대기 중</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            <strong className="text-indigo-600">{currentUser?.name}</strong>님,<br/>관리자의 승인을 기다리고 있습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 w-full px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-[1rem] transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20"
          >
            상태 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
