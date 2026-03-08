import React, { useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';
import { useAuth, User } from '@/contexts/AuthContext';

export default function Login() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [autoLogin, setAutoLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    setErrorMsg('');
    if (!id || !pw) {
      setErrorMsg("아이디와 비밀번호를 입력하세요.");
      return;
    }
    setIsLoading(true);
    try {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id));
      if (snap.exists()) {
        const data = snap.data();
        if (data.deleted) {
          setErrorMsg("삭제된 계정입니다.");
          return;
        }
        if (data.password === pw) {
          login(data as User, autoLogin);
        } else {
          setErrorMsg("로그인 정보가 올바르지 않습니다.");
        }
      } else {
        setErrorMsg("로그인 정보가 올바르지 않습니다.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("로그인 중 오류가 발생했습니다. (Firebase 설정을 확인하세요)");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-[420px] bg-white/80 backdrop-blur-xl p-8 sm:p-10 text-center rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden">
        {/* Decorative background elements inside the card */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-[72px] h-[72px] mx-auto rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-blue-500/30 ring-4 ring-white">
            SAS
          </div>
          <h2 className="text-2xl text-slate-800 m-0 font-extrabold tracking-tight">인트라넷 로그인</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">업무 포탈에 오신 것을 환영합니다</p>
          
          {errorMsg && (
            <div className="mt-6 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-bold animate-pulse">
              {errorMsg}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="아이디"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full p-4 border border-slate-200/80 rounded-2xl text-sm bg-white/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center justify-between mt-6 mb-8 text-sm text-slate-500 font-medium px-1">
            <label className="flex items-center cursor-pointer group">
              <div className="relative flex items-center justify-center w-5 h-5 mr-3">
                <input
                  type="checkbox"
                  checked={autoLogin}
                  onChange={(e) => setAutoLogin(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
                />
                <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="group-hover:text-slate-700 transition-colors">자동 로그인 유지</span>
            </label>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white border-none p-4 rounded-2xl cursor-pointer text-[1rem] font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-slate-900/20"
          >
            {isLoading ? '인증 처리 중...' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  );
}
