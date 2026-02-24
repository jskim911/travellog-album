import React, { useState, useRef } from 'react';
import { X, Mail, User, CheckCircle, AlertCircle, UserPlus, Lock, Loader2, Sparkles, Camera, Upload } from 'lucide-react';
import { auth, db, storage } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserStatus } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';

interface SignupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchToLogin: () => void;
}

export const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [id, setId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Profile Image State
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

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

        if (!id.trim()) {
            setError('아이디를 입력해주세요.');
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
            const email = `${id.trim()}@travellog.com`;
            // Create user account
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            let finalPhotoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${id.trim()}`;

            // Upload profile image if exists
            if (profileImage) {
                const options = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 400,
                    useWebWorker: true
                };
                const compressedFile = await imageCompression(profileImage, options);
                const storageRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}`);
                const snapshot = await uploadBytes(storageRef, compressedFile);
                finalPhotoURL = await getDownloadURL(snapshot.ref);
            }

            // Update profile
            await updateProfile(user, {
                displayName: name.trim(),
                photoURL: finalPhotoURL
            });

            // Create user document in Firestore
            const initialStatus = id.trim() === 'jskim911' ? 'approved' : 'pending';

            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                id: id.trim(),
                email: email,
                displayName: name.trim(),
                photoURL: finalPhotoURL,
                status: initialStatus as UserStatus,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp()
            });

            if (initialStatus === 'pending') {
                await signOut(auth);
            }

            setSuccess(true);

            setTimeout(() => {
                setSuccess(false);
                setName('');
                setId('');
                setPassword('');
                setConfirmPassword('');
                onClose();
            }, 3000);

        } catch (err: any) {
            console.error('Signup error:', err);
            if (err.code === 'auth/email-already-in-use') {
                setError('이미 사용 중인 아이디입니다.');
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
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/10 text-white hover:bg-black/20 transition-all backdrop-blur-md"
                >
                    <X size={18} />
                </button>

                <AnimatePresence mode="wait">
                    {success ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-10 text-center"
                        >
                            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <CheckCircle size={40} className="text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">가입 신청 완료!</h2>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                관리자 승인 후 여정을 시작하실 수 있습니다. <br />
                                잠시만 기다려주세요!
                            </p>
                            <div className="mt-8 py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100 inline-flex items-center gap-2">
                                <Sparkles size={16} className="text-amber-400" />
                                <span className="text-sm font-bold text-slate-600">ID: {id}</span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="form">
                            {/* Decorative Header */}
                            <div className="h-40 bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-400 relative overflow-hidden flex flex-col items-center justify-center text-white">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md mb-3 shadow-lg ring-1 ring-white/30">
                                    <UserPlus size={28} />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight">새로운 여정 시작</h2>
                                <p className="text-white/70 text-sm font-bold mt-1 uppercase tracking-widest">Join TravelLog</p>
                            </div>

                            <div className="p-8 sm:p-10 max-h-[70vh] overflow-y-auto scrollbar-thin">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Profile Image Upload */}
                                    <div className="flex flex-col items-center gap-4 mb-4">
                                        <div className="relative group">
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden cursor-pointer group-hover:border-indigo-400 transition-all shadow-inner"
                                            >
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                        <Camera size={24} />
                                                        <span className="text-[10px] font-black mt-1 uppercase">Photo</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-indigo-700 transition-all"
                                            >
                                                <Upload size={14} />
                                            </button>
                                        </div>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageChange}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-500">프로필 사진을 완성하세요</p>
                                        </div>
                                    </div>

                                    {/* Name Input */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium text-slate-800"
                                                placeholder="홍길동"
                                            />
                                        </div>
                                    </div>

                                    {/* ID Input */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">아이디</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                            <input
                                                type="text"
                                                value={id}
                                                onChange={(e) => setId(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium text-slate-800"
                                                placeholder="사용할 아이디"
                                            />
                                        </div>
                                    </div>

                                    {/* Password Row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium text-slate-800"
                                                    placeholder="최소 6자"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호 확인</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium text-slate-800"
                                                    placeholder="재입력"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-3"
                                        >
                                            <AlertCircle size={16} className="flex-shrink-0" />
                                            <p>{error}</p>
                                        </motion.div>
                                    )}

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 btn-premium text-white font-black rounded-2xl shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] mt-2"
                                    >
                                        {loading ? (
                                            <Loader2 size={24} className="animate-spin mx-auto" />
                                        ) : (
                                            '가입 신청하기'
                                        )}
                                    </button>
                                </form>

                                {/* Switch to Login */}
                                <div className="mt-8 text-center pb-2">
                                    <p className="text-sm font-bold text-slate-400">
                                        이미 계정이 있으신가요?{' '}
                                        <button
                                            onClick={onSwitchToLogin}
                                            className="text-indigo-600 hover:underline underline-offset-4 ml-1"
                                        >
                                            로그인
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
