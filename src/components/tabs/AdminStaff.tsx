import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';

export default function AdminStaff() {
  const { globalStaffList } = useData();
  const [name, setName] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [company, setCompany] = useState('삼성');
  const [role, setRole] = useState('누수팀');
  const [rank, setRank] = useState('사원');

  const [editStaff, setEditStaff] = useState<any>(null);
  const [editCompany, setEditCompany] = useState('삼성');
  const [editRole, setEditRole] = useState('누수팀');
  const [editRank, setEditRank] = useState('사원');

  const handleCheckId = async () => {
    if (!id || id.length < 4) {
      alert("아이디 4자 이상 필수");
      return;
    }
    const s = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id));
    if (s.exists()) alert("❌ 중복 아이디");
    else alert("✅ 사용 가능");
  };

  const handleRegister = async () => {
    if (!id || !pw || !name || !joinDate) {
      alert("정보를 모두 입력하세요.");
      return;
    }
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id), {
      userId: id,
      password: pw,
      name,
      joinDate,
      approved: true,
      company,
      role,
      rank,
      createdAt: Date.now()
    });
    alert("직원 등록 완료!");
    setName(''); setJoinDate(''); setId(''); setPw('');
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uid));
      alert("삭제 완료");
    }
  };

  const openEditModal = (u: any) => {
    setEditStaff(u);
    setEditCompany(u.company || '삼성');
    setEditRole(u.role || '누수팀');
    setEditRank(u.rank || '사원');
  };

  const handleUpdateStaff = async () => {
    if (!editStaff) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editStaff.userId), {
      approved: true,
      company: editCompany,
      role: editRole,
      rank: editRank
    });
    setEditStaff(null);
    alert("수정 완료");
  };

  const getRoles = (c: string) => {
    return c === '삼성'
      ? ['누수팀', '재물팀', '간편심사', '관리자']
      : ['관리자'];
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border-t-[5px] border-amber-500">
        <h2 className="text-lg text-amber-500 m-0 mb-4 font-bold">👤 직원 신규 등록</h2>
        
        <div className="mb-3">
          <label className="block text-sm font-bold text-slate-600 mb-1">성명 (실명)</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" />
        </div>
        
        <div className="mb-3">
          <label className="block text-sm font-bold text-slate-600 mb-1">입사일자</label>
          <input type="date" value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" />
        </div>
        
        <div className="mb-3">
          <label className="block text-sm font-bold text-slate-600 mb-1">아이디 (ID)</label>
          <div className="flex gap-2">
            <input type="text" placeholder="아이디 입력" value={id} onChange={e => setId(e.target.value)} className="flex-1 p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" />
            <button onClick={handleCheckId} className="bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold">중복확인</button>
          </div>
        </div>
        
        <div className="mb-3">
          <label className="block text-sm font-bold text-slate-600 mb-1">비밀번호 (초기 PW)</label>
          <input type="text" value={pw} onChange={e => setPw(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" />
        </div>
        
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="col-span-2">
            <label className="block text-sm font-bold text-slate-600 mb-1">보험사</label>
            <select value={company} onChange={e => { setCompany(e.target.value); setRole(getRoles(e.target.value)[0]); }} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none">
              <option value="삼성">삼성</option>
              <option value="마이브라운">마이브라운</option>
              <option value="SAS">SAS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">부서</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none">
              {getRoles(company).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">직급</label>
            <select value={rank} onChange={e => setRank(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none">
              {['사원', '주임', '대리', '과장', '팀장', '부장'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        
        <button onClick={handleRegister} className="w-full bg-blue-500 text-white p-3 rounded-xl font-bold mt-2">직원 등록 완료</button>
      </div>

      <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
        <h2 className="text-lg m-0 mb-4 font-bold">🏢 전체 직원 명단</h2>
        <div className="flex flex-col gap-3">
          {globalStaffList.filter(u => u.approved).map(u => (
            <div key={u.userId} className="bg-white p-4 rounded-xl border border-slate-200 border-l-[4px] border-l-blue-500 shadow-sm">
              <div className="flex justify-between items-center">
                <span><b className="text-sm">{u.name}</b> <small className="text-slate-500">({u.company}/{u.role}/{u.rank})</small></span>
                <div className="flex gap-1.5">
                  <button onClick={() => openEditModal(u)} className="bg-transparent border-[1.5px] border-slate-300 text-slate-600 px-3 py-1.5 text-xs rounded-lg font-bold">수정</button>
                  <button onClick={() => handleDelete(u.userId)} className="bg-red-500 text-white px-3 py-1.5 text-xs rounded-lg font-bold">삭제</button>
                </div>
              </div>
            </div>
          ))}
          {globalStaffList.filter(u => u.approved).length === 0 && <p className="text-center text-slate-500 text-sm">직원 없음</p>}
        </div>
      </div>

      {editStaff && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-[20px] w-full max-w-[450px] shadow-2xl">
            <h2 className="text-lg font-bold mb-2">직원 정보 수정</h2>
            <p className="font-bold text-blue-500 mb-4">{editStaff.name}님</p>
            
            <div className="mb-3">
              <label className="block text-sm font-bold text-slate-600 mb-1">보험사</label>
              <select value={editCompany} onChange={e => { setEditCompany(e.target.value); setEditRole(getRoles(e.target.value)[0]); }} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none">
                <option value="삼성">삼성</option>
                <option value="마이브라운">마이브라운</option>
                <option value="SAS">SAS</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-bold text-slate-600 mb-1">부서</label>
              <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none">
                {getRoles(editCompany).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-600 mb-1">직급</label>
              <select value={editRank} onChange={e => setEditRank(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none">
                {['사원', '주임', '대리', '과장', '팀장', '부장'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            
            <button onClick={handleUpdateStaff} className="w-full bg-blue-500 text-white p-3 rounded-xl font-bold mb-2">완료</button>
            <button onClick={() => setEditStaff(null)} className="w-full bg-transparent border-[1.5px] border-slate-300 text-slate-600 p-3 rounded-xl font-bold">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
