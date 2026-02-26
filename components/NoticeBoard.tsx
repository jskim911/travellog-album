import React, { useState, useEffect } from 'react';
import {
    Bell, Plus, ChevronRight, X, Trash2, Edit3,
    CheckCircle2, AlertCircle, Megaphone, Calendar, User as UserIcon
} from 'lucide-react';
import {
    collection, query, onSnapshot, orderBy, where,
    addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Notice } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface NoticeBoardProps {
    isAdmin: boolean;
    currentUser: { uid: string; displayName: string } | null;
    isSmartphoneMode?: boolean;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({
    isAdmin: _isAdmin,
    currentUser,
    isSmartphoneMode = false
}) => {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPriority, setIsPriority] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

    useEffect(() => {
        if (!currentUser) return;
        // userId 필터만 유지 (복합 색인 요구 방지)
        const q = query(
            collection(db, 'notices'),
            where('userId', '==', currentUser.uid)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notice[];

            // 클라이언트사이드 정렬 (createdAt 내림차순)
            const sorted = fetched.sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            });

            setNotices(sorted);
            setIsLoading(false);
        }, (error) => {
            console.error("Notice fetch error:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        try {
            const noticeData = {
                title,
                content,
                isPriority,
                updatedAt: serverTimestamp(),
            };

            if (editingNotice) {
                await updateDoc(doc(db, 'notices', editingNotice.id), noticeData);
            } else {
                await addDoc(collection(db, 'notices'), {
                    ...noticeData,
                    userId: currentUser.uid,
                    authorId: currentUser.uid,
                    authorName: currentUser.displayName || '사용자',
                    createdAt: serverTimestamp(),
                });
            }

            resetForm();
        } catch (error) {
            console.error("Error saving notice:", error);
            alert("공지사항 저장 중 오류가 발생했습니다.");
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("이 공지사항을 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, 'notices', id));
            if (selectedNotice?.id === id) setSelectedNotice(null);
        } catch (error) {
            console.error("Error deleting notice:", error);
        }
    };

    const handleEdit = (notice: Notice, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingNotice(notice);
        setTitle(notice.title);
        setContent(notice.content);
        setIsPriority(notice.isPriority || false);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setIsPriority(false);
        setEditingNotice(null);
        setIsModalOpen(false);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    return (
        <div className={`w-full mb-12 ${isSmartphoneMode ? 'px-1' : ''}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-100">
                        <Megaphone size={20} />
                    </div>
                    <div>
                        <h2 className={`${isSmartphoneMode ? 'text-xl' : 'text-2xl'} font-black text-slate-900 tracking-tight`}>나의 공지사항</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Your Personal Updates & Memos</p>
                    </div>
                </div>
                {currentUser && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        <span>작성하기</span>
                    </button>
                )}
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                        <p className="text-slate-400 font-bold text-sm">소식을 불러오는 중...</p>
                    </div>
                ) : notices.length === 0 ? (
                    <div className="p-16 text-center">
                        <Bell size={40} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-extrabold">등록된 공지사항이 없습니다.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {notices.map((notice) => (
                            <motion.div
                                key={notice.id}
                                whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
                                onClick={() => setSelectedNotice(notice)}
                                className={`p-5 sm:p-6 cursor-pointer transition-all flex items-center gap-4 group ${notice.isPriority ? 'bg-indigo-50/30' : ''}`}
                            >
                                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${notice.isPriority ? 'bg-indigo-500 shadow-lg shadow-indigo-200 animate-pulse' : 'bg-slate-200'}`} />
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {notice.isPriority && (
                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-black rounded-md uppercase tracking-wider">주요</span>
                                        )}
                                        <h3 className={`text-[15px] sm:text-base font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors`}>
                                            {notice.title}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(notice.createdAt)}</span>
                                        <span className="flex items-center gap-1"><UserIcon size={12} /> {notice.authorName}</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-1">
                                    {currentUser && (
                                        <div className="flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleEdit(notice, e)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit3 size={16} /></button>
                                            <button onClick={(e) => handleDelete(notice.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                    <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notice Detail Modal */}
            <AnimatePresence>
                {selectedNotice && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedNotice(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 sm:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                            <Bell size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{selectedNotice.title}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(selectedNotice.createdAt)}</span>
                                                <span className="flex items-center gap-1"><UserIcon size={13} /> {selectedNotice.authorName}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedNotice(null)} className="p-3 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"><X size={20} /></button>
                                </div>

                                <div className="prose prose-slate max-w-none">
                                    <div className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-wrap min-h-[200px] border-t border-slate-50 pt-6">
                                        {selectedNotice.content}
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button onClick={() => setSelectedNotice(null)} className="px-8 py-3 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 transition-all">확인</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Editor Modal (Admin Only) */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={resetForm}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                        >
                            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-slate-900">{editingNotice ? '공지사항 수정' : '새 공지사항 작성'}</h3>
                                    <button type="button" onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">제목</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            placeholder="공지사항 제목을 입력하세요"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">내용</label>
                                        <textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            required
                                            placeholder="공지 내용을 입력하세요"
                                            rows={6}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                        <input
                                            type="checkbox"
                                            id="priority"
                                            checked={isPriority}
                                            onChange={(e) => setIsPriority(e.target.checked)}
                                            className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="priority" className="text-sm font-black text-indigo-900 flex items-center gap-2 cursor-pointer">
                                            <AlertCircle size={16} />
                                            주요 공지로 설정 (상단 강조)
                                        </label>
                                    </div>
                                </div>

                                <div className="mt-10 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 text-sm font-black rounded-2xl hover:bg-slate-200 transition-all"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] py-4 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95"
                                    >
                                        {editingNotice ? '수정 완료' : '등록하기'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
