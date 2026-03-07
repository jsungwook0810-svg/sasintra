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
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
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
          updatedAt: Date.now()
        });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notices'), {
          title,
          content,
          author: currentUser?.name,
          authorId: currentUser?.userId,
          createdAt: Date.now()
        });
      }
      setShowWrite(false);
      setTitle('');
      setContent('');
      setEditingId(null);
    } catch (e) {
      console.error(e);
      setErrorMsg(editingId ? "공지사항 수정 중 오류가 발생했습니다." : "공지사항 등록 중 오류가 발생했습니다.");
    }
  };

  const handleEditClick = () => {
    setTitle(selectedNotice.title);
    setContent(selectedNotice.content);
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">공지사항</h2>
        {currentUser?.role === '관리자' && (
          <button 
            onClick={() => { 
              setShowWrite(true); 
              setErrorMsg(''); 
              setTitle(''); 
              setContent(''); 
              setEditingId(null); 
            }} 
            className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors"
          >
            글쓰기
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {notices.map(n => (
          <div 
            key={n.id} 
            className="border-b border-slate-100 last:border-0 p-5 hover:bg-slate-50 cursor-pointer transition-colors" 
            onClick={() => setSelectedNotice(n)}
          >
            <div className="font-bold text-lg text-slate-800">{n.title}</div>
            <div className="text-sm text-slate-500 mt-2 flex items-center gap-2">
              <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-medium">{n.author}</span>
              <span>{new Date(n.createdAt).toLocaleString()}</span>
              {n.updatedAt && <span className="text-xs text-slate-400">(수정됨)</span>}
            </div>
          </div>
        ))}
        {notices.length === 0 && (
          <div className="p-12 text-center text-slate-500 font-medium">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </div>

      {/* Write Modal */}
      {showWrite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
            <h3 className="text-xl font-bold mb-4 text-slate-800 shrink-0">
              {editingId ? '공지사항 수정' : '공지사항 작성'}
            </h3>
            
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold shrink-0">
                {errorMsg}
              </div>
            )}

            <input 
              className="w-full border border-slate-200 p-3 rounded-xl mb-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shrink-0" 
              placeholder="제목을 입력하세요" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
            />
            <div className="mb-4 h-[300px] sm:h-[400px] shrink-0 relative">
              <Quill 
                ref={quillRef}
                theme="snow"
                value={content} 
                onChange={setContent}
                modules={modules}
                className="h-full pb-10"
                placeholder="내용을 입력하세요"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4 shrink-0">
              <button 
                onClick={() => { 
                  setShowWrite(false); 
                  setTitle(''); 
                  setContent(''); 
                  setEditingId(null); 
                }} 
                className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
              >
                취소
              </button>
              <button 
                onClick={handleWrite} 
                className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600"
              >
                {editingId ? '수정 완료' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
            <h3 className="text-2xl font-bold mb-3 text-slate-800 shrink-0">{selectedNotice.title}</h3>
            <div className="text-sm text-slate-500 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100 shrink-0">
              <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-medium">{selectedNotice.author}</span>
              <span>{new Date(selectedNotice.createdAt).toLocaleString()}</span>
              {selectedNotice.updatedAt && <span className="text-xs text-slate-400">(수정됨)</span>}
            </div>
            
            <div className="ql-snow mb-8 flex-1 overflow-y-auto">
              <div 
                className="ql-editor p-0 min-h-[200px] text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
              {currentUser?.role === '관리자' && (
                <>
                  <button 
                    onClick={handleEditClick} 
                    className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100"
                  >
                    수정
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedNotice.id)} 
                    className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100"
                  >
                    삭제
                  </button>
                </>
              )}
              <button 
                onClick={() => setSelectedNotice(null)} 
                className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
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
