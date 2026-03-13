import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { doc, setDoc, deleteDoc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
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

  const [subTab, setSubTab] = useState<'register' | 'manage'>('manage');
  const [showResigned, setShowResigned] = useState(false);

  const [resignTarget, setResignTarget] = useState<any>(null);
  const [resignDate, setResignDate] = useState(new Date().toISOString().split('T')[0]);

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

  const requestResign = (user: any) => {
    setResignTarget(user);
    setResignDate(new Date().toISOString().split('T')[0]);
  };

  const executeResign = async () => {
    if (!resignTarget) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', resignTarget.userId), {
        isResigned: true,
        resignDate: resignDate
      });
      alert("✅ 퇴사 처리되었습니다.");
      setResignTarget(null);
    } catch (error) {
      console.error("Error resigning user:", error);
      alert("퇴사 처리 중 오류가 발생했습니다.");
    }
  };

  const cancelResign = async (user: any) => {
    if (window.confirm(`${user.name} 님의 퇴사 처리를 취소하시겠습니까?`)) {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.userId), {
          isResigned: false,
          resignDate: null
        });
        alert("✅ 퇴사 처리가 취소되었습니다.");
      } catch (error) {
        console.error("Error canceling resignation:", error);
        alert("오류가 발생했습니다.");
      }
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

  const handleHardDelete = async (id: string) => {
    if (window.confirm("영구 삭제하면 복구할 수 없으며, 과거 실적 조회 시 이름이 표시되지 않을 수 있습니다. 정말 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id));
      alert("영구 삭제되었습니다.");
    }
  };

  const getRoles = (c: string) => {
    if (c === '삼성') return ['누수팀', '재물팀', '간편심사', '관리자'];
    if (c === '마이브라운') return ['재물심사', '관리자'];
    return ['관리자'];
  };

  const activeStaff = globalStaffList.filter(u => u.approved && !u.isResigned);
  const resignedStaff = globalStaffList.filter(u => u.approved && u.isResigned);

  const groupedStaff = activeStaff.reduce((acc, user) => {
    const key = `${user.company}|${user.role}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {} as Record<string, any[]>);

  const getRankCounts = (users: any[]) => {
    const counts = users.reduce((acc, u) => {
      acc[u.rank] = (acc[u.rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const rankOrder = ['부장', '팀장', '과장', '대리', '주임', '사원'];
    return rankOrder
      .filter(r => counts[r])
      .map(r => `${r} ${counts[r]}명`)
      .join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setSubTab('register')} 
          className={`flex-1 py-3 rounded-xl font-bold transition-colors ${subTab === 'register' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
        >
          직원 등록
        </button>
        <button 
          onClick={() => setSubTab('manage')} 
          className={`flex-1 py-3 rounded-xl font-bold transition-colors ${subTab === 'manage' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
        >
          직원정보관리
        </button>
      </div>

      {subTab === 'register' && (
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
      )}

      {subTab === 'manage' && (
        <div className="space-y-6">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-slate-800 p-4 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-slate-700 flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-300 mb-1">전체</span>
              <span className="text-2xl font-extrabold text-white">{activeStaff.length}<span className="text-sm font-medium text-slate-400 ml-1">명</span></span>
            </div>
            {['삼성', '마이브라운', 'SAS'].map(comp => {
              const count = activeStaff.filter(u => u.company === comp).length;
              if (count === 0) return null;
              return (
                <div key={comp} className="flex-1 bg-white p-4 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-slate-500 mb-1">{comp}</span>
                  <span className="text-2xl font-extrabold text-blue-600">{count}<span className="text-sm font-medium text-slate-400 ml-1">명</span></span>
                </div>
              );
            })}
          </div>

          {Object.keys(groupedStaff).sort().map(key => {
            const [comp, r] = key.split('|');
            const users = groupedStaff[key];
            return (
              <div key={key} className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                  <h2 className="text-lg m-0 font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-blue-500">🏢</span> {comp} - {r}
                  </h2>
                  <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                    총 {users.length}명 <span className="mx-1 text-slate-300">|</span> {getRankCounts(users)}
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  {users.map(u => (
                    <div key={u.userId} className="bg-white p-4 rounded-xl border border-slate-200 border-l-[4px] border-l-blue-500 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span>
                          <b className="text-sm">{u.name}</b> 
                          <small className="text-slate-500 ml-1">({u.userId} / {u.rank})</small>
                        </span>
                        <div className="flex gap-1.5">
                          <button onClick={() => openEditModal(u)} className="bg-transparent border-[1.5px] border-slate-300 text-slate-600 px-3 py-1.5 text-xs rounded-lg font-bold">수정</button>
                          <button onClick={() => requestResign(u)} className="bg-slate-800 text-white px-3 py-1.5 text-xs rounded-lg font-bold">퇴사</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {resignedStaff.length > 0 && (
            <div className="mt-8">
              <button 
                onClick={() => setShowResigned(!showResigned)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 p-4 rounded-2xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm border border-slate-200"
              >
                {showResigned ? '👋 퇴사자 숨기기' : `👋 퇴사자 보기 (${resignedStaff.length}명)`}
              </button>
              
              {showResigned && (
                <div className="bg-slate-50 p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-slate-200 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <h2 className="text-lg m-0 font-bold text-slate-600 flex items-center gap-2">
                      <span className="text-slate-400">👋</span> 퇴사자 명단
                    </h2>
                    <div className="text-xs font-medium text-slate-500 bg-slate-200 px-3 py-1.5 rounded-lg">
                      총 {resignedStaff.length}명
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {resignedStaff.map(u => (
                      <div key={u.userId} className="bg-white p-4 rounded-xl border border-slate-200 border-l-[4px] border-l-slate-400 shadow-sm opacity-80">
                        <div className="flex justify-between items-center">
                          <span>
                            <b className="text-sm text-slate-700">{u.name}</b> 
                            <small className="text-slate-500 ml-1">({u.userId} / {u.company}/{u.role}/{u.rank})</small>
                            <span className="ml-2 bg-slate-200 text-slate-600 text-[0.65rem] px-2 py-0.5 rounded-full font-bold">퇴사자</span>
                          </span>
                          <div className="flex gap-1.5">
                            <button onClick={() => openEditModal(u)} className="bg-transparent border-[1.5px] border-slate-300 text-slate-600 px-3 py-1.5 text-xs rounded-lg font-bold">수정</button>
                            <button onClick={() => cancelResign(u)} className="bg-slate-400 text-white px-3 py-1.5 text-xs rounded-lg font-bold">퇴사취소</button>
                            <button onClick={() => handleHardDelete(u.userId)} className="bg-rose-50 text-rose-500 hover:bg-rose-100 px-3 py-1.5 text-xs rounded-lg font-bold">영구삭제</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeStaff.length === 0 && resignedStaff.length === 0 && (
            <div className="bg-white p-5 rounded-[20px] shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-black/5">
              <p className="text-center text-slate-500 text-sm">등록된 직원이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {resignTarget && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-[20px] w-full max-w-[400px] shadow-2xl text-center">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-lg font-bold mb-2 text-slate-800">퇴사 처리하시겠습니까?</h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              <b className="text-slate-800">{resignTarget.name}</b> 님을 퇴사 처리합니다.<br/>
              퇴사 처리 시 로그인이 제한되며 일일 미제출 명단에서 제외됩니다.<br/>
              (기존 매출 및 보고 데이터는 보존됩니다)
            </p>
            <div className="mb-6 text-left">
              <label className="block text-sm font-bold text-slate-600 mb-1">퇴사 일자</label>
              <input type="date" value={resignDate} onChange={e => setResignDate(e.target.value)} className="w-full p-3 border-[1.5px] border-slate-200 rounded-xl text-sm bg-slate-50 focus:border-blue-500 focus:bg-white outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={executeResign} className="flex-1 bg-slate-800 text-white p-3 rounded-xl font-bold">퇴사 처리</button>
              <button onClick={() => setResignTarget(null)} className="flex-1 bg-slate-100 text-slate-600 p-3 rounded-xl font-bold">취소</button>
            </div>
          </div>
        </div>
      )}

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
