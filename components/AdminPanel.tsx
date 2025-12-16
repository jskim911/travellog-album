import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Users, Clock, UserCheck, UserX, Trash2, Eye } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserStatus } from '../types';

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

    // ... (useEffect hook remains same)

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);

        // Query pending users
        const pendingQuery = query(
            collection(db, 'users'),
            where('status', '==', 'pending')
        );

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

        // Query all users
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
            await updateDoc(doc(db, 'users', uid), {
                retentionPeriod: days
            });
            alert('승인되었습니다.');
        } catch (error) {
            console.error('Error updating retention:', error);
            alert('데이터 보관 기간 수정 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (!window.confirm('이 사용자를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        setProcessingUid(uid);
        try {
            await deleteDoc(doc(db, 'users', uid));
            // TODO: Also delete user's photos, storyboards, etc.
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('사용자 삭제 중 오류가 발생했습니다.');
        } finally {
            setProcessingUid(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-blue-600 text-white p-6 z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">관리자 패널</h2>
                                <p className="text-white/90 mt-1">
                                    <span className="font-bold text-lg">{adminName || '관리자'}</span>
                                    <span className="text-white/80 ml-2 font-medium">({adminEmail})</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'pending'
                                ? 'bg-white text-violet-600'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Clock size={18} />
                                대기 중 ({pendingUsers.length})
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'all'
                                ? 'bg-white text-violet-600'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Users size={18} />
                                전체 사용자 ({allUsers.length})
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto"></div>
                            <p className="text-slate-500 mt-4">로딩 중...</p>
                        </div>
                    ) : activeTab === 'pending' ? (
                        pendingUsers.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserCheck size={32} className="text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">승인 대기 중인 사용자가 없습니다</h3>
                                <p className="text-slate-500 mt-1">모든 사용자가 승인 처리되었습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingUsers.map((user) => (
                                    <div
                                        key={user.uid}
                                        className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                {user.displayName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900">{user.displayName}</h4>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    가입일: {user.createdAt.toLocaleDateString('ko-KR')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove(user.uid)}
                                                disabled={processingUid === user.uid}
                                                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <Check size={18} />
                                                승인
                                            </button>
                                            <button
                                                onClick={() => handleReject(user.uid)}
                                                disabled={processingUid === user.uid}
                                                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <X size={18} />
                                                거부
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="space-y-3">
                            {allUsers.map((user) => (
                                <div
                                    key={user.uid}
                                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                            {user.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900">{user.displayName}</h4>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${user.status === 'approved'
                                                        ? 'bg-green-100 text-green-700'
                                                        : user.status === 'rejected'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-yellow-100 text-yellow-700'
                                                        }`}
                                                >
                                                    {user.status === 'approved' ? (
                                                        <>
                                                            <UserCheck size={12} /> 승인됨
                                                        </>
                                                    ) : user.status === 'rejected' ? (
                                                        <>
                                                            <UserX size={12} /> 거부됨
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock size={12} /> 대기 중
                                                        </>
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    가입: {user.createdAt.toLocaleDateString('ko-KR')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                                    <Clock size={12} /> 보관기간:
                                                </span>
                                                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                                                    {[10, 20, 30, 60, 90].map(days => (
                                                        <button
                                                            key={days}
                                                            onClick={() => handleUpdateRetention(user.uid, days)}
                                                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${(user.retentionPeriod || 30) === days
                                                                ? 'bg-violet-100 text-violet-700 shadow-sm'
                                                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                                                }`}
                                                        >
                                                            {days}일
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {user.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(user.uid)}
                                                    disabled={processingUid === user.uid}
                                                    className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-lg transition-all text-sm disabled:opacity-50"
                                                >
                                                    승인
                                                </button>
                                                <button
                                                    onClick={() => handleReject(user.uid)}
                                                    disabled={processingUid === user.uid}
                                                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-all text-sm disabled:opacity-50"
                                                >
                                                    거부
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDeleteUser(user.uid)}
                                            disabled={processingUid === user.uid}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                            title="사용자 삭제"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Stats */}
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-violet-600">
                                {allUsers.filter(u => u.status === 'approved').length}
                            </div>
                            <div className="text-xs text-slate-600">승인된 사용자</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</div>
                            <div className="text-xs text-slate-600">대기 중</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-600">
                                {allUsers.filter(u => u.status === 'rejected').length}
                            </div>
                            <div className="text-xs text-slate-600">거부됨</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
