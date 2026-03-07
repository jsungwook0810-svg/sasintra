import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function WaitingApproval() {
  const { currentUser } = useAuth();

  return (
    <div className="bg-white p-12 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5 text-center mt-10 max-w-[500px] mx-auto">
      <div className="text-6xl mb-4">⏳</div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">승인 대기 중</h2>
      <p className="text-slate-500 leading-relaxed">
        <strong className="text-blue-500">{currentUser?.name}</strong>님, 관리자의 승인을 기다리고 있습니다.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-5 px-8 py-2.5 bg-transparent border-[1.5px] border-slate-300 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
      >
        새로고침
      </button>
    </div>
  );
}
