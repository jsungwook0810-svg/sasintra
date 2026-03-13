import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { db, appId } from '@/lib/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const Quill = ReactQuill as any;

export default function Notices() {
  const { currentUser } = useAuth();
  const { notices } = useData();
  const [showWrite, setShowWrite] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const quillRef = useRef<any>(null);

  useEffect(() => {
    if (currentUser && notices.length > 0) {
      const latest = notices[0].createdAt;
      if (latest > (currentUser.lastReadNotice || 0)) {
        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.userId), {
          lastReadNotice: Date.now()
        }).catch(console.error);
      }
    }
  }, [currentUser, notices]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['clean']
      ]
    }
  }), []);

  const handleWrite = async () => {
    setErrorMsg('');
    if (!title || !content || content === '<p><br></p>') {
      setErrorMsg("제목과 내용을 입력하세요.");
      return;
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notices', editingId), {
          title,
          content,
          isPinned,
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), {
          title,
          content,
          isPinned,
          author: currentUser?.name,
          authorId: currentUser?.userId,
          createdAt: Date.now()
        });
      }
      setShowWrite(false);
      setTitle('');
      setContent('');
      setIsPinned(false);
      setEditingId(null);
    } catch (e) {
      console.error(e);
      setErrorMsg(editingId ? "공지사항 수정 중 오류가 발생했습니다." : "공지사항 등록 중 오류가 발생했습니다.");
    }
  };

  const handleEditClick = () => {
    setTitle(selectedNotice.title);
    setContent(selectedNotice.content);
    setIsPinned(selectedNotice.isPinned || false);
    setEditingId(selectedNotice.id);
    setSelectedNotice(null);
    setShowWrite(true);
    setErrorMsg('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notices', id));
        setSelectedNotice(null);
      } catch (e) {
        console.error(e);
        setErrorMsg("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  // Sort notices: pinned first, then by createdAt descending
  const sortedNotices = [...notices].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="p-2 sm:p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">공지사항</h2>
        {currentUser?.role === '관리자' && (
          <button 
            onClick={() => { 
              setShowWrite(true); 
              setErrorMsg(''); 
              setTitle(''); 
              setContent(''); 
              setIsPinned(false);
              setEditingId(null); 
            }} 
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 active:scale-[0.98]"
          >
            글쓰기
          </button>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
        {sortedNotices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(n => (
          <div 
            key={n.id} 
            className={`border-b border-slate-100/80 last:border-0 p-5 sm:p-6 hover:bg-slate-50/80 cursor-pointer transition-colors group relative ${n.isPinned ? 'bg-indigo-50/30' : ''}`} 
            onClick={() => setSelectedNotice(n)}
          >
            {n.isPinned && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
            )}
            <div className="flex items-center gap-2 mb-1">
              {n.isPinned && (
                <span className="bg-indigo-100 text-indigo-600 text-[0.65rem] font-black px-2 py-0.5 rounded-md tracking-tight">상단고정</span>
              )}
              <div className="font-bold text-lg text-slate-800 group-hover:text-indigo-600 transition-colors">{n.title}</div>
            </div>
            <div className="text-sm text-slate-500 mt-2.5 flex items-center gap-3">
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold">{n.author}</span>
              <span className="text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
              {n.updatedAt && <span className="text-xs text-indigo-400 font-medium">(수정됨)</span>}
            </div>
          </div>
        ))}
        {sortedNotices.length === 0 && (
          <div className="p-16 text-center text-slate-400 font-medium">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </div>

      {sortedNotices.length > itemsPerPage && (
        <div className="flex justify-center gap-2 mt-6">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:bg-slate-50 bg-white shadow-sm hover:bg-slate-50 transition-colors"
          >
            이전
          </button>
          <span className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
            {currentPage} / {Math.ceil(sortedNotices.length / itemsPerPage)}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedNotices.length / itemsPerPage), p + 1))}
            disabled={currentPage === Math.ceil(sortedNotices.length / itemsPerPage)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:bg-slate-50 bg-white shadow-sm hover:bg-slate-50 transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {/* Write Modal */}
      {showWrite && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 sm:p-8 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-white/20">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                {editingId ? '공지사항 수정' : '공지사항 작성'}
              </h3>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-slate-700">📌 상단 고정</span>
              </label>
            </div>
            
            {errorMsg && (
              <div className="mb-5 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-bold shrink-0 border border-rose-100">
                {errorMsg}
              </div>
            )}

            <input 
              className="w-full border border-slate-200 p-4 rounded-2xl mb-5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shrink-0 transition-all font-medium placeholder:text-slate-400" 
              placeholder="제목을 입력하세요" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
            />
            <div className="mb-6 h-[300px] sm:h-[400px] shrink-0 relative rounded-2xl overflow-hidden border border-slate-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
              <Quill 
                ref={quillRef}
                theme="snow"
                value={content} 
                onChange={setContent}
                modules={modules}
                className="h-full pb-10 border-none"
                placeholder="내용을 입력하세요"
              />
            </div>
            <div className="flex justify-end gap-3 mt-2 shrink-0">
              <button 
                onClick={() => { 
                  setShowWrite(false); 
                  setTitle(''); 
                  setContent(''); 
                  setIsPinned(false);
                  setEditingId(null); 
                }} 
                className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleWrite} 
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
              >
                {editingId ? '수정 완료' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 sm:p-10 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-white/20 relative">
            {selectedNotice.isPinned && (
              <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500"></div>
            )}
            <div className="flex items-center gap-3 mb-4 shrink-0">
              {selectedNotice.isPinned && (
                <span className="bg-indigo-100 text-indigo-600 text-xs font-black px-3 py-1 rounded-lg tracking-tight">📌 상단고정</span>
              )}
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">{selectedNotice.title}</h3>
            </div>
            <div className="text-sm text-slate-500 mb-8 flex items-center gap-3 pb-6 border-b border-slate-100 shrink-0">
              <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold">{selectedNotice.author}</span>
              <span className="text-slate-400 font-medium">{new Date(selectedNotice.createdAt).toLocaleString()}</span>
              {selectedNotice.updatedAt && <span className="text-xs text-indigo-400 font-bold">(수정됨)</span>}
            </div>
            
            <div className="ql-snow mb-10 flex-1 overflow-y-auto">
              <div 
                className="ql-editor p-0 min-h-[200px] text-slate-700 leading-relaxed text-[1.05rem]"
                dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
              {currentUser?.role === '관리자' && (
                <>
                  <button 
                    onClick={handleEditClick} 
                    className="px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-100 transition-colors"
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedNotice.id)} 
                    className="px-6 py-3 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 transition-colors"
                  >
                    삭제
                  </button>
                </>
              )}
              <button 
                onClick={() => setSelectedNotice(null)} 
                className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 active:scale-[0.98]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
