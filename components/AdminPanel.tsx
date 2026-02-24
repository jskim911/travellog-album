import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Users, Clock, UserCheck, UserX, Trash2, Eye, Sparkles } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserStatus } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserUid: string;
    adminName?: string;
    adminEmail?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentUserUid, adminName, adminEmail }) => {
    const [pendingUsers, setPendingUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
    const [loading, setLoading] = useState(true);
    const [processingUid, setProcessingUid] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);

        const pendingQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
        const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                ...doc.data(),
                uid: doc.id,
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                approvedAt: doc.data().approvedAt?.toDate(),
                lastLoginAt: doc.data().lastLoginAt?.toDate(),
                retentionPeriod: doc.data().retentionPeriod || 30
            })) as User[];
            setPendingUsers(users);
            setLoading(false);
        });

        const allQuery = query(collection(db, 'users'));
        const unsubscribeAll = onSnapshot(allQuery, (snapshot) => {
            const users = snapshot.docs.map(doc => ({
                ...doc.data(),
                uid: doc.id,
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                approvedAt: doc.data().approvedAt?.toDate(),
                lastLoginAt: doc.data().lastLoginAt?.toDate(),
                retentionPeriod: doc.data().retentionPeriod || 30
            })) as User[];
            setAllUsers(users);
        });

        return () => {
            unsubscribePending();
            unsubscribeAll();
        };
    }, [isOpen]);

    const handleApprove = async (uid: string) => {
        setProcessingUid(uid);
        try {
            await updateDoc(doc(db, 'users', uid), {
                status: 'approved' as UserStatus,
                approvedAt: serverTimestamp(),
                approvedBy: currentUserUid
            });
        } catch (error) {
            console.error('Error approving user:', error);
            alert('사용자 승인 중 오류가 발생했습니다.');
        } finally {
            setProcessingUid(null);
        }
    };

    const handleReject = async (uid: string) => {
        if (!window.confirm('이 사용자를 거부하시겠습니까?')) return;
        setProcessingUid(uid);
        try {
            await updateDoc(doc(db, 'users', uid), {
                status: 'rejected' as UserStatus,
                approvedAt: serverTimestamp(),
                approvedBy: currentUserUid
            });
        } catch (error) {
            console.error('Error rejecting user:', error);
            alert('사용자 거부 중 오류가 발생했습니다.');
        } finally {
            setProcessingUid(null);
        }
    };

    const handleUpdateRetention = async (uid: string, days: number) => {
        try {
            await updateDoc(doc(db, 'users', uid), { retentionPeriod: days });
        } catch (error) {
            console.error('Error updating retention:', error);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!window.confirm('이 사용자를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
        setProcessingUid(uid);
        try {
            await deleteDoc(doc(db, 'users', uid));
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('사용자 삭제 중 오류가 발생했습니다.');
        } finally {
            setProcessingUid(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
            >
                {/* Header Section */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-400 p-8 sm:p-10 relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg ring-1 ring-white/20">
                                <Shield size={32} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tighter">관리자 시스템</h2>
                                <p className="text-white/80 font-bold flex items-center gap-2 mt-1">
                                    <span className="text-lg">{adminName}</span>
                                    <span className="opacity-60 text-sm">|</span>
                                    <span className="opacity-60 text-sm">{adminEmail}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="absolute sm:relative top-0 right-0 p-3 bg-black/10 text-white rounded-full hover:bg-black/20 transition-all backdrop-blur-md border border-white/10"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-3 mt-10">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-6 py-2.5 rounded-2xl font-black transition-all flex items-center gap-2 text-sm uppercase tracking-widest ${activeTab === 'pending'
                                ? 'bg-white text-indigo-600 shadow-xl'
                                : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                                }`}
                        >
                            <Clock size={18} />
                            <span>대기 중 ({pendingUsers.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-6 py-2.5 rounded-2xl font-black transition-all flex items-center gap-2 text-sm uppercase tracking-widest ${activeTab === 'all'
                                ? 'bg-white text-indigo-600 shadow-xl'
                                : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                                }`}
                        >
                            <Users size={18} />
                            <span>전체 회원 ({allUsers.length})</span>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 sm:p-10 scrollbar-thin">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20">
                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="text-slate-400 font-bold mt-4 uppercase tracking-widest text-xs">Loading Users...</p>
                            </motion.div>
                        ) : activeTab === 'pending' ? (
                            <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                {pendingUsers.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                        <UserCheck size={48} className="mx-auto text-slate-300 mb-4" />
                                        <h3 className="text-xl font-black text-slate-800">모두 승인되었습니다</h3>
                                        <p className="text-slate-400 font-bold mt-1">대기 중인 사용자가 없습니다.</p>
                                    </div>
                                ) : (
                                    pendingUsers.map(user => (
                                        <div key={user.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-sky-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                                    {user.displayName.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-black text-slate-800">{user.displayName}</h4>
                                                    <p className="text-slate-400 font-bold text-sm tracking-tight">{user.email}</p>
                                                    <span className="inline-block mt-2 px-3 py-1 bg-yellow-50 text-yellow-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-yellow-100">Pending</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-4 sm:mt-0">
                                                <button onClick={() => handleApprove(user.uid)} className="flex-1 sm:flex-none px-6 py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 text-sm">
                                                    <Check size={18} /> 승인
                                                </button>
                                                <button onClick={() => handleReject(user.uid)} className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm">
                                                    <X size={18} /> 거부
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        ) : (
                            <motion.div key="all" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                {allUsers.map(user => (
                                    <div key={user.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl">
                                                {user.displayName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className="text-lg font-black text-slate-800">{user.displayName}</h4>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${user.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            user.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                'bg-yellow-50 text-yellow-600 border-yellow-100'
                                                        }`}>
                                                        {user.status}
                                                    </span>
                                                </div>
                                                <p className="text-slate-400 font-bold text-sm tracking-tight">{user.email}</p>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1">
                                                        <Clock size={10} /> {user.createdAt.toLocaleDateString()} 가입
                                                    </span>
                                                    <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-100 shadow-inner">
                                                        {[10, 30, 90].map(days => (
                                                            <button
                                                                key={days}
                                                                onClick={() => handleUpdateRetention(user.uid, days)}
                                                                className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${user.retentionPeriod === days ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                            >
                                                                {days}D
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-4 sm:mt-0">
                                            {user.status === 'pending' && (
                                                <button onClick={() => handleApprove(user.uid)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                                                    <Check size={20} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteUser(user.uid)} className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Stats Area */}
                <div className="bg-slate-50/80 backdrop-blur-md border-t border-slate-100 p-6 sm:px-10 flex-shrink-0">
                    <div className="flex items-center justify-around max-w-2xl mx-auto">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-indigo-600">{allUsers.filter(u => u.status === 'approved').length}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                            <span className="block text-2xl font-black text-amber-500">{pendingUsers.length}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                            <span className="block text-2xl font-black text-red-400">{allUsers.filter(u => u.status === 'rejected').length}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejected</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
