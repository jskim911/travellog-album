import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Calendar, MapPin, Users, ChevronRight,
    Trophy, Settings2, Trash2, ArrowLeft,
    Grid3x3, Save, X, Minus, PlusCircle, Camera, Files, Copy, ImagePlus,
    Image as ImageIcon, Map, FileDown
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { GolfScore } from '../../types';

interface GolfPageProps {
    userId: string;
    isSmartphoneMode: boolean;
}

export const GolfPage: React.FC<GolfPageProps> = ({ userId, isSmartphoneMode }) => {
    const [scores, setScores] = useState<GolfScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'setup' | 'scorecard'>('list');
    const [selectedScore, setSelectedScore] = useState<GolfScore | null>(null);
    const [copySourceData, setCopySourceData] = useState<Partial<GolfScore> | null>(null);
    const [viewerImage, setViewerImage] = useState<string | null>(null);
    const [isHoleInfoOpen, setIsHoleInfoOpen] = useState(false);
    const [globalHoleInfo, setGlobalHoleInfo] = useState<string[]>([]);

    // 전역 홀정보 (코스 자료) 구독
    useEffect(() => {
        if (!userId) return;
        const unsub = onSnapshot(doc(db, 'users', userId, 'golf', 'global'), (docSnap) => {
            if (docSnap.exists()) {
                setGlobalHoleInfo(docSnap.data().holeInfoUrls || []);
            }
        });
        return () => unsub();
    }, [userId]);

    // Firestore 데이터 구독
    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, 'golfScores'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as GolfScore[];
            setScores(fetched.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;

                // Priority: '오전' (Morning) should come before '오후' (Afternoon)
                const isAM_A = a.courseName.includes('오전');
                const isPM_A = a.courseName.includes('오후');
                const isAM_B = b.courseName.includes('오전');
                const isPM_B = b.courseName.includes('오후');

                if (isAM_A && isPM_B) return -1;
                if (isPM_A && isAM_B) return 1;

                // Secondary sort: oldest creation first if dates are same
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeA - timeB;
            }));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleCopy = (score: GolfScore, e: React.MouseEvent) => {
        e.stopPropagation();
        setCopySourceData({
            courseName: score.courseName,
            participants: score.participants,
            holePars: score.holePars,
            courseImageUrl: score.courseImageUrl,
            holeInfoUrls: score.holeInfoUrls || []
        });
        setView('setup');
    };

    const handleEdit = (score: GolfScore, e: React.MouseEvent) => {
        e.stopPropagation();
        setCopySourceData(score);
        setView('setup');
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('이 스코어카드를 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'golfScores', id));
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    if (view === 'setup') {
        return (
            <GolfSetupView
                onBack={() => {
                    setView('list');
                    setCopySourceData(null);
                }}
                userId={userId}
                isSmartphoneMode={isSmartphoneMode}
                initialData={copySourceData}
                isEditMode={!!copySourceData?.id}
            />
        );
    }

    if (view === 'scorecard' && selectedScore) {
        return (
            <ScorecardView
                scoreData={selectedScore}
                globalHoleInfo={globalHoleInfo}
                onBack={() => {
                    setView('list');
                    setSelectedScore(null);
                }}
                isSmartphoneMode={isSmartphoneMode}
                onShowImage={(url) => setViewerImage(url)}
            />
        );
    }

    return (
        <div className={`animate-in fade-in duration-500 ${isSmartphoneMode ? 'px-0' : ''}`}>
            {/* Image Viewer Modal */}
            {viewerImage && (
                <ImageViewer url={viewerImage} onClose={() => setViewerImage(null)} />
            )}

            {/* Hole Info Modal (Global Manager) */}
            {isHoleInfoOpen && (
                <HoleInfoModal
                    isEditMode
                    urls={globalHoleInfo}
                    onClose={() => setIsHoleInfoOpen(false)}
                    onShowImage={(url) => {
                        setViewerImage(url);
                        setIsHoleInfoOpen(false);
                    }}
                    onUpload={async (file) => {
                        try {
                            const storageRef = ref(storage, `golf_global/${userId}/${Date.now()}_${file.name}`);
                            const snapshot = await uploadBytes(storageRef, file);
                            const url = await getDownloadURL(snapshot.ref);
                            const nextUrls = [...globalHoleInfo, url];
                            await setDoc(doc(db, 'users', userId, 'golf', 'global'), {
                                holeInfoUrls: nextUrls
                            }, { merge: true });
                        } catch (error) {
                            console.error('Global hole upload error:', error);
                            alert('이미지 업로드 중 오류가 발생했습니다.');
                        }
                    }}
                    onDelete={async (url) => {
                        const nextUrls = globalHoleInfo.filter(u => u !== url);
                        await updateDoc(doc(db, 'users', userId, 'golf', 'global'), {
                            holeInfoUrls: nextUrls
                        });
                    }}
                />
            )}

            {/* Header Section */}
            <div className={`flex items-center justify-between mb-8 pb-4 border-b border-slate-100 ${isSmartphoneMode ? 'px-4' : ''}`}>
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">스코어카드</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsHoleInfoOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                        <ImageIcon size={18} className="text-emerald-500" />
                        <span>홀정보</span>
                    </button>
                    <button
                        onClick={() => setView('setup')}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        <span>추가</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isSmartphoneMode ? 'px-4' : ''}`}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-white rounded-3xl border border-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : scores.length === 0 ? (
                <div className={`mx-4 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-12 text-center`}>
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Trophy size={32} />
                    </div>
                    <p className="text-slate-400 font-bold">아직 기록된 라운딩이 없습니다.</p>
                    <button
                        onClick={() => setView('setup')}
                        className="mt-4 text-emerald-600 font-black hover:underline"
                    >
                        첫 스코어카드 만들기
                    </button>
                </div>
            ) : (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isSmartphoneMode ? 'px-4' : ''}`}>
                    {scores.map(score => (
                        <div
                            key={score.id}
                            onClick={() => {
                                setSelectedScore(score);
                                setView('scorecard');
                            }}
                            className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group relative"
                        >
                            <div className="flex gap-4 items-center">
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-base font-black text-slate-800 truncate pr-2 leading-tight">{score.courseName}</h3>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleCopy(score, e)}
                                                className="p-1.5 text-slate-300 hover:text-emerald-500 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-all"
                                                title="복사"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(score.id, e)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-all"
                                                title="삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={10} />
                                            <span>{score.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-slate-500">
                                            <Users size={10} />
                                            <span>{score.participants.length}명</span>
                                        </div>
                                        <div className="flex items-center gap-0.5 text-emerald-600 ml-auto">
                                            <span>기록 보기</span>
                                            <ChevronRight size={12} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface GolfSetupViewProps {
    onBack: () => void;
    userId: string;
    isSmartphoneMode: boolean;
    initialData?: Partial<GolfScore> | null;
    isEditMode?: boolean;
}

const GolfSetupView: React.FC<GolfSetupViewProps> = ({ onBack, userId, isSmartphoneMode, initialData, isEditMode }) => {
    const [courseName, setCourseName] = useState(initialData?.courseName || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [participants, setParticipants] = useState<string[]>(initialData?.participants || ['']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewerImage, setViewerImage] = useState<string | null>(null);


    const handleAddParticipant = () => {
        if (participants.length >= 8) return;
        setParticipants([...participants, '']);
    };

    const handleRemoveParticipant = (index: number) => {
        if (participants.length <= 1) return;
        const newPs = [...participants];
        newPs.splice(index, 1);
        setParticipants(newPs);
    };

    const handleParticipantChange = (index: number, value: string) => {
        const newPs = [...participants];
        newPs[index] = value;
        setParticipants(newPs);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseName.trim()) return alert('골프장 이름을 입력해주세요.');
        if (participants.some(p => !p.trim())) return alert('모든 참가자 이름을 입력해주세요.');

        setIsSubmitting(true);
        try {
            // 기본 파(Par) 정보 생성 (Par 4 x 18홀)
            const defaultHolePars = new Array(18).fill(4);

            const initialScores: { [key: number]: number[] } = {};
            participants.forEach((_, idx) => {
                if (isEditMode && initialData?.scores && initialData.scores[idx]) {
                    initialScores[idx] = initialData.scores[idx];
                } else {
                    initialScores[idx] = [...defaultHolePars];
                }
            });

            const scorePayload = {
                courseName,
                date,
                participants: participants.filter(p => p.trim()),
                holePars: defaultHolePars,
                scores: initialScores,
                courseImageUrl: initialData?.courseImageUrl || '',
                updatedAt: serverTimestamp()
            };

            if (isEditMode && initialData?.id) {
                await updateDoc(doc(db, 'golfScores', initialData.id), scorePayload);
            } else {
                await addDoc(collection(db, 'golfScores'), {
                    ...scorePayload,
                    userId,
                    createdAt: serverTimestamp()
                });
            }
            onBack();
        } catch (error) {
            console.error('Add document error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`w-full animate-in slide-in-from-bottom-4 duration-500 ${isSmartphoneMode ? 'px-0' : ''}`}>
            {/* Image Viewer Modal */}
            {viewerImage && (
                <ImageViewer url={viewerImage} onClose={() => setViewerImage(null)} />
            )}

            <button onClick={onBack} className={`flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6 font-bold transition-colors ${isSmartphoneMode ? 'px-4' : ''}`}>
                <ArrowLeft size={20} />
                <span>돌아가기</span>
            </button>

            <div className={`bg-white border-slate-200 overflow-hidden ${isSmartphoneMode ? 'rounded-none border-x-0' : 'rounded-[2.5rem] border shadow-xl'}`}>
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">골프장 이름</label>
                                    <input
                                        required
                                        value={courseName}
                                        onChange={e => setCourseName(e.target.value)}
                                        placeholder="예: 베네스트 GC"
                                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-200 font-bold transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">라운딩 날짜</label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-200 font-bold transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-4 ml-1">
                            <label className="block text-sm font-black text-slate-700">참가자 명단 ({participants.length}/8명)</label>
                            <button
                                type="button"
                                onClick={handleAddParticipant}
                                disabled={participants.length >= 8}
                                className="text-xs font-black text-emerald-600 hover:text-emerald-700 disabled:text-slate-300"
                            >
                                + 추가하기
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {participants.map((p, idx) => (
                                <div key={idx} className="relative group">
                                    <input
                                        required
                                        value={p}
                                        onChange={e => handleParticipantChange(idx, e.target.value)}
                                        placeholder={`플레이어 ${idx + 1}`}
                                        className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-emerald-200 font-bold text-sm transition-all text-center placeholder:text-slate-300"
                                    />
                                    {participants.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveParticipant(idx)}
                                            className="absolute -top-1 -right-1 bg-white shadow-sm border border-slate-100 rounded-full p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:bg-slate-200"
                    >
                        {isSubmitting ? (isEditMode ? '수정 중...' : '생성 중...') : (isEditMode ? '스코어카드 수정 완료' : '스코어카드 생성 완료')}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Hole Info Modal ---
interface HoleInfoModalProps {
    onClose: () => void;
    onShowImage: (url: string) => void;
    urls?: string[];
    isEditMode?: boolean;
    onUpload?: (file: File) => Promise<void>;
    onDelete?: (url: string) => void;
}

const HoleInfoModal: React.FC<HoleInfoModalProps> = ({ onClose, onShowImage, urls = [], isEditMode, onUpload, onDelete }) => {
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && onUpload) {
            setIsUploading(true);
            try {
                await onUpload(file);
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-6 sm:p-10 max-h-[95vh] flex flex-col relative">
                    {/* Main Title at the Top */}
                    <div className="mb-6">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            코스 공략 자료를<br className="sm:hidden" /> 업로드하세요
                        </h2>
                    </div>

                    {/* Compact Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all active:scale-95 z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-8">
                        {/* Premium Upload Card */}
                        {isEditMode && (
                            <div className="group relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
                                <label className="relative flex flex-col items-center justify-center w-full h-24 bg-white rounded-[2rem] border border-slate-100 cursor-pointer hover:border-emerald-200 transition-all shadow-sm overflow-hidden">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Uploading</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 text-slate-400 group-hover:text-emerald-600 transition-all transform group-hover:scale-105">
                                            <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                                                <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-slate-700">업로드</p>
                                                <p className="text-[10px] font-bold text-slate-400">갤러리에 자료를 추가합니다</p>
                                            </div>
                                        </div>
                                    )}
                                </label>
                            </div>
                        )}

                        {/* Gallery Section with Premium Header */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">정보</h4>
                                <span className="px-2 py-0.5 bg-slate-50 text-[10px] font-black text-slate-400 rounded-lg">{urls.length}</span>
                            </div>

                            {urls.length === 0 ? (
                                <div className="py-16 bg-slate-50/50 rounded-[2.5rem] text-center border border-slate-100 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-4">
                                        <ImageIcon className="text-slate-200" size={32} />
                                    </div>
                                    <p className="text-xs font-black text-slate-400">등록된 이미지가 없습니다</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {urls.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative aspect-video rounded-[2rem] overflow-hidden border border-slate-100 bg-slate-50 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1"
                                        >
                                            <img
                                                src={url}
                                                alt={`Hole ${idx + 1}`}
                                                className="w-full h-full object-cover cursor-pointer transition-transform duration-1000 group-hover:scale-110"
                                                onClick={() => onShowImage(url)}
                                            />
                                            <div
                                                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 transform scale-50 group-hover:scale-100 transition-transform duration-500">
                                                    <ImageIcon className="text-white" size={24} />
                                                </div>
                                            </div>

                                            {isEditMode && onDelete && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('이 이미지를 삭제하시겠습니까?')) {
                                                            onDelete(url);
                                                        }
                                                    }}
                                                    className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl shadow-xl flex items-center justify-center hover:bg-red-500 hover:border-red-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- Image Viewer Modal ---
const ImageViewer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-10"
            onClick={onClose}
        >
            {/* Immersive Glassmorphism Background - Fast Transition */}
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl transition-opacity duration-300" />
            <div
                className="absolute inset-0 opacity-40"
                style={{
                    backgroundImage: `url(${url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(80px) saturate(1.5)'
                }}
            />

            <button
                onClick={onClose}
                className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl flex items-center justify-center transition-all z-50 group"
            >
                <X size={24} />
            </button>

            <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative group w-full h-full sm:w-auto sm:h-auto flex items-center justify-center">
                    <img
                        src={url}
                        alt="Enlarged view"
                        className="max-w-full max-h-full sm:max-h-[85vh] sm:rounded-[2.5rem] shadow-2xl object-contain border border-white/5 transition-transform duration-500"
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Bottom Info Tip */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-60 sm:group-hover:opacity-100 transition-opacity">
                        <p className="text-[9px] font-black text-white/60 uppercase tracking-widest whitespace-nowrap">Tap to close</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Sub Components (Scorecard View) ---

interface ScorecardViewProps {
    scoreData: GolfScore;
    globalHoleInfo: string[];
    onBack: () => void;
    isSmartphoneMode: boolean;
    onShowImage: (url: string) => void;
}

const ScorecardView: React.FC<ScorecardViewProps> = ({ scoreData, globalHoleInfo, onBack, isSmartphoneMode, onShowImage }) => {
    const [localScores, setLocalScores] = useState(scoreData.scores);
    const [isSaving, setIsSaving] = useState(false);
    const scorecardRef = useRef<HTMLDivElement>(null);

    const handleScoreChange = (playerIdx: number, holeIdx: number, delta: number) => {
        const currentVal = localScores[playerIdx][holeIdx];
        // 아직 입력되지 않은(0) 상태라면 해당 홀의 파(Par) 값을 기준으로 증감
        const startVal = currentVal === 0 ? scoreData.holePars[holeIdx] : currentVal;
        const newVal = Math.max(1, startVal + delta);

        setLocalScores({
            ...localScores,
            [playerIdx]: localScores[playerIdx].map((s, idx) => idx === holeIdx ? newVal : s)
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'golfScores', scoreData.id), {
                scores: localScores
            });
            alert('스코어가 저장되었습니다.');
        } catch (error) {
            console.error('Save error:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };
    const calculateTotal = (playerIdx: number) => {
        return localScores[playerIdx].reduce((acc, s, idx) => acc + (s === 0 ? scoreData.holePars[idx] : s), 0);
    };

    const calculateToPar = (playerIdx: number) => {
        const total = calculateTotal(playerIdx);
        const parSum = scoreData.holePars.reduce((acc, p) => acc + p, 0);
        const diff = total - parSum;
        if (total === 0) return '-';
        if (diff === 0) return 'E';
        return diff > 0 ? `+${diff}` : diff;
    };

    const handleDownloadPDF = async () => {
        if (!scorecardRef.current) return;
        const element = scorecardRef.current;

        try {
            // 원본 배경색 유지를 위해 스타일 강제 적용
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#f8fafc', // slate-50 background for PDF
                windowWidth: 1200, // 전체 내용을 담기 위한 너비
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`scorecard_${scoreData.courseName}_${scoreData.date}.pdf`);
        } catch (error) {
            console.error('PDF generation error:', error);
            alert('PDF 생성 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="animate-in fade-in duration-500" ref={scorecardRef}>
            <div className={`flex items-center justify-between mb-4 ${isSmartphoneMode ? 'px-4' : ''}`}>
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-emerald-600 transition-all shadow-sm">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2.5">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-0.5">{scoreData.courseName}</h2>
                            <p className="text-[10px] text-slate-400 font-bold">{scoreData.date}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="p-2.5 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all shadow-sm"
                        title="PDF로 결과 저장"
                    >
                        <FileDown size={20} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-50"
                        title="중간 저장"
                    >
                        <Save size={20} />
                    </button>
                </div>
            </div>

            <div className={`bg-white border-slate-200 overflow-hidden ${isSmartphoneMode ? 'rounded-none border-x-0' : 'rounded-[2.5rem] border shadow-xl'}`}>
                {/* Scoreboard Table with horizontal scroll */}
                <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[800px] border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="sticky left-0 z-20 bg-slate-50 px-3 py-2.5 text-left text-[10px] font-black text-slate-400 border-r border-slate-100 min-w-[100px]">HOLE</th>
                                {scoreData.holePars.map((par, i) => (
                                    <th key={i} className="px-1 py-2.5 text-center border-r border-slate-100/50">
                                        <div className="text-[9px] text-slate-400 font-bold mb-0.5">{i + 1}</div>
                                        <div className="text-[10px] font-black text-slate-700 font-mono">P.{par}</div>
                                    </th>
                                ))}
                                <th className="px-4 py-2.5 text-center text-[10px] font-black text-slate-700 bg-emerald-50">
                                    <div className="text-[9px] text-slate-400 font-bold mb-0.5">PAR</div>
                                    <div className="text-xs">{scoreData.holePars.reduce((acc, p) => acc + p, 0)}</div>
                                </th>
                                <th className="px-4 py-2.5 text-center text-[10px] font-black text-slate-700 bg-emerald-50 border-l border-emerald-100">SCORE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scoreData.participants.map((player, pIdx) => (
                                <tr key={player} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="sticky left-0 z-20 bg-white px-3 py-3 text-xs font-black text-slate-800 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                        <div className="flex flex-col">
                                            <span className="truncate">{player}</span>
                                            <span className="text-[9px] text-slate-400 font-bold">P{pIdx + 1}</span>
                                        </div>
                                    </td>
                                    {scoreData.holePars.map((_, hIdx) => {
                                        const currentScore = localScores[pIdx][hIdx];
                                        return (
                                            <td key={hIdx} className="px-0.5 py-1.5 border-r border-slate-100/30">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <button
                                                        onClick={() => handleScoreChange(pIdx, hIdx, 1)}
                                                        className="text-slate-200 hover:text-emerald-500 transition-colors"
                                                    >
                                                        <PlusCircle size={14} />
                                                    </button>
                                                    <div className="relative w-8 h-8 flex items-center justify-center rounded-lg font-mono text-sm font-black transition-all bg-white overflow-visible">
                                                        {(() => {
                                                            const par = scoreData.holePars[hIdx];
                                                            const score = currentScore === 0 ? par : currentScore;
                                                            const diff = score - par;

                                                            if (diff === 0) return <span className="text-slate-700">{score}</span>;
                                                            if (diff > 0) return <span className="text-blue-500">{score}</span>;

                                                            // Under Par Symbols (Red)
                                                            return (
                                                                <div className="relative w-full h-full flex items-center justify-center text-red-500">
                                                                    <span className="relative z-10">{score}</span>
                                                                    {diff === -1 && (
                                                                        <div className="absolute inset-0 border-[1.5px] border-red-500 rounded-full scale-110" />
                                                                    )}
                                                                    {diff === -2 && (
                                                                        <div className="absolute inset-0.5 border-[1.5px] border-red-500 rounded-none scale-110" />
                                                                    )}
                                                                    {diff === -3 && (
                                                                        <>
                                                                            <div className="absolute inset-0 border-[1.5px] border-red-500 rounded-full scale-110" />
                                                                            <div className="absolute inset-0 border-[1.5px] border-red-500 rounded-full scale-125" />
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <button
                                                        onClick={() => handleScoreChange(pIdx, hIdx, -1)}
                                                        className="text-slate-200 hover:text-red-400 transition-colors"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-2 text-center bg-emerald-50/30">
                                        <div className="text-sm font-black text-slate-800 font-mono">{calculateTotal(pIdx)}</div>
                                    </td>
                                    <td className="px-4 py-2 text-center bg-emerald-50/50 border-l border-emerald-100">
                                        <div className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${calculateToPar(pIdx).toString().startsWith('+') ? 'text-red-500 bg-red-50' : calculateToPar(pIdx) === 'E' ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'}`}>
                                            {calculateToPar(pIdx)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>


        </div >
    );
};
