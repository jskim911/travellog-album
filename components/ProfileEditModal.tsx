import React, { useState, useRef, useEffect } from 'react';
import { X, User, Camera, Upload, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../src/hooks/useAuth';
import imageCompression from 'browser-image-compression';

interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
    const { user, updateUserProfile } = useAuth();
    const [name, setName] = useState(user?.displayName || '');
    const [imagePreview, setImagePreview] = useState<string | null>(user?.photoURL || null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setImagePreview(user.photoURL || null);
        }
    }, [user, isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            let photoFile = selectedFile || undefined;

            if (photoFile) {
                const options = {
                    maxSizeMB: 0.5,
                    maxWidthOrHeight: 400,
                    useWebWorker: true
                };
                photoFile = await imageCompression(photoFile, options);
            }

            await updateUserProfile({
                displayName: name.trim(),
                photoFile: photoFile as File | undefined
            });

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 1500);
        } catch (error) {
            console.error("Profile update failed", error);
            alert("프로필 수정 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-center text-white relative">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
                            >
                                <X size={20} />
                            </button>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                <User size={32} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">프로필 설정</h2>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-1">Edit Account</p>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Photo Edit */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative group">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden cursor-pointer"
                                        >
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <User size={40} />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera size={24} className="text-white" />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-1 right-1 w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform"
                                        >
                                            <Upload size={16} />
                                        </button>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>

                                {/* Name Input */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none font-bold text-slate-700 transition-all"
                                        placeholder="이름 입력"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-3">
                                    <button
                                        type="submit"
                                        disabled={loading || success}
                                        className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 ${success ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-indigo-100 active:scale-95'
                                            }`}
                                    >
                                        {loading ? (
                                            <Loader2 size={24} className="animate-spin" />
                                        ) : success ? (
                                            <>
                                                <CheckCircle2 size={20} />
                                                변경 완료
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={20} className="text-yellow-300" />
                                                수정 완료
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
