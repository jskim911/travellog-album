import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../src/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { signInId, signUpId } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                await signInId(id, password);
            } else {
                if (!name.trim()) throw new Error("이름을 입력해주세요.");
                await signUpId(id, password, name);
            }
            onClose(); // Close modal on success
            // Reset form
            setId('');
            setPassword('');
            setName('');
        } catch (err: any) {
            console.error("Auth error:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("아이디 또는 비밀번호가 올바르지 않습니다.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("이미 사용 중인 아이디입니다.");
            } else if (err.code === 'auth/weak-password') {
                setError("비밀번호는 6자 이상이어야 합니다.");
            } else {
                setError(err.message || "오류가 발생했습니다. 다시 시도해주세요.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative bg-white/90 backdrop-blur-2xl rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/20"
            >
                {/* Decorative Header */}
                <div className="h-32 bg-gradient-to-br from-indigo-600 to-sky-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                            <circle cx="10" cy="10" r="20" />
                            <circle cx="90" cy="90" r="30" />
                        </svg>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-2">
                            {isLogin ? <LogIn size={24} /> : <UserPlus size={24} />}
                        </div>
                        <h2 className="text-xl font-black tracking-tight">
                            {isLogin ? 'TravelLog 시작하기' : '새로운 여정의 시작'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-black/10 text-white hover:bg-black/20 transition-all backdrop-blur-md"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-8 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2"
                                >
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium text-slate-800"
                                            placeholder="홍길동"
                                            required={!isLogin}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">아이디</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium text-slate-800"
                                    placeholder="your-id"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium text-slate-800"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 flex items-center gap-3"
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 btn-premium text-white font-black rounded-2xl shadow-xl shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <span>{isLogin ? '로그인' : '가입 완료'}</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                            }}
                            className="text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors group"
                        >
                            {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'} {' '}
                            <span className="text-indigo-600 group-hover:underline underline-offset-4 ml-1">
                                {isLogin ? '회원가입' : '로그인'}
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
