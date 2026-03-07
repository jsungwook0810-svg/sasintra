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
      if (snap.exists() && snap.data().password === pw) {
        login(snap.data() as User, autoLogin);
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
    <div className="max-w-[400px] mx-auto mt-10 p-10 text-center bg-white rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
      <div className="bg-blue-500 w-[60px] h-[60px] rounded-2xl inline-flex items-center justify-center text-white font-bold text-2xl mb-4">
        SAS
      </div>
      <h2 className="text-xl text-slate-800 m-0 font-extrabold">인트라넷 로그인</h2>
      
      {errorMsg && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-500 text-sm rounded-xl font-bold">
          {errorMsg}
        </div>
      )}

      <div className="mt-5">
        <input
          type="text"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none text-center"
        />
      </div>
      <div className="mt-4 mb-4">
        <input
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none text-center"
        />
      </div>
      <div className="flex items-center justify-center mb-6 text-sm text-slate-500">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
            className="mr-2 w-4 h-4 accent-blue-500"
          />
          자동 로그인 유지
        </label>
      </div>
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full bg-blue-500 text-white border-none p-3 rounded-xl cursor-pointer text-[0.95rem] font-bold transition-transform active:scale-95 disabled:opacity-50"
      >
        {isLoading ? '처리 중...' : '로그인'}
      </button>
    </div>
  );
}
