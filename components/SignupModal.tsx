import React, { useState } from 'react';
import { X, Mail, User, CheckCircle, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserStatus } from '../types';

interface SignupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchToLogin: () => void;
}

export const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (!name.trim()) {
            setError('이름을 입력해주세요.');
            setLoading(false);
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            setError('올바른 이메일 주소를 입력해주세요.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('비밀번호는 6자 이상이어야 합니다.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            setLoading(false);
            return;
        }

        try {
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update display name
            await updateProfile(user, {
                displayName: name.trim()
            });

            // Create user document in Firestore with 'pending' status
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: email.trim(),
                displayName: name.trim(),
                status: 'pending' as UserStatus,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
            });

            // 승인 대기 상태이므로 로그아웃 처리 (자동 로그인 방지)
            await signOut(auth);

            setSuccess(true);

            // Close modal after 2 seconds
            setTimeout(() => {
                setSuccess(false);
                setName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                onClose();
            }, 3000);

        } catch (err: any) {
            console.error('Signup error:', err);

            if (err.code === 'auth/email-already-in-use') {
                setError('이미 사용 중인 이메일입니다.');
            } else if (err.code === 'auth/weak-password') {
                setError('비밀번호가 너무 약합니다.');
            } else {
                setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                    <X size={20} />
                </button>

                {/* Success State */}
                {success ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} className="text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">가입 완료!</h3>
                        <p className="text-slate-600">
                            관리자 승인 후 로그인하실 수 있습니다.
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            승인 알림을 이메일로 보내드리겠습니다.
                        </p>
                    </div>
                ) : (
                    <div className="p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <User size={24} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">회원가입</h2>
                            <p className="text-slate-500 mt-1 text-sm">
                                여행 앨범을 시작해보세요
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name Input */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    이름
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="홍길동"
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Email Input */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    이메일
                                </label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="example@email.com"
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    비밀번호
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="최소 6자 이상"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Confirm Password Input */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    비밀번호 확인
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="비밀번호 재입력"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl animate-in slide-in-from-top-2">
                                    <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? '처리 중...' : '가입 신청'}
                            </button>
                        </form>

                        {/* Switch to Login */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-slate-600">
                                이미 계정이 있으신가요?{' '}
                                <button
                                    onClick={onSwitchToLogin}
                                    className="text-violet-600 font-semibold hover:underline"
                                >
                                    로그인
                                </button>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
