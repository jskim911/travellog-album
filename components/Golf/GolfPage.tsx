import React, { useState, useEffect } from 'react';
import {
    Plus, Calendar, MapPin, Users, ChevronRight,
    Trophy, Settings2, Trash2, ArrowLeft,
    Grid3x3, Save, X, Minus, PlusCircle, Camera, Files, Copy, ImagePlus
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
            courseImageUrl: score.courseImageUrl
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
                            <div className="flex gap-3 items-center">
                                <div
                                    onClick={(e) => {
                                        if (score.courseImageUrl) {
                                            e.stopPropagation();
                                            setViewerImage(score.courseImageUrl);
                                        }
                                    }}
                                    className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-300 hover:border-emerald-300 transition-all active:scale-95"
                                >
                                    {score.courseImageUrl ? (
                                        <img src={score.courseImageUrl} alt={score.courseName} className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera size={20} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-base font-black text-slate-800 truncate pr-2 leading-tight">{score.courseName}</h3>
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleEdit(score, e)}
                                                className="p-1 text-slate-300 hover:text-indigo-500"
                                                title="이미지 재업로드"
                                            >
                                                <ImagePlus size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleCopy(score, e)}
                                                className="p-1 text-slate-300 hover:text-emerald-500"
                                                title="복사하여 만들기"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleEdit(score, e)}
                                                className="p-1 text-slate-300 hover:text-blue-500"
                                                title="상세 수정"
                                            >
                                                <Settings2 size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(score.id, e)}
                                                className="p-1 text-slate-300 hover:text-red-500"
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
    const [holePars, setHolePars] = useState<number[]>(initialData?.holePars || new Array(18).fill(4));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>(initialData?.courseImageUrl || '');

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (): Promise<string | undefined> => {
        if (!imageFile) return initialData?.courseImageUrl;
        try {
            const storageRef = ref(storage, `golf_courses/${userId}/${Date.now()}_${imageFile.name}`);
            const snapshot = await uploadBytes(storageRef, imageFile);
            return await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error('Image upload error:', error);
            return undefined;
        }
    };

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
            const imageUrl = await uploadImage();

            const initialScores: { [key: number]: number[] } = {};
            participants.forEach((_, idx) => {
                // 수정 모드이고 기존 참가자라면 기존 점수 보존, 아니면 파(Par)로 초기화
                if (isEditMode && initialData?.scores && initialData.scores[idx]) {
                    initialScores[idx] = initialData.scores[idx];
                } else {
                    initialScores[idx] = [...holePars];
                }
            });

            const scorePayload = {
                courseName,
                date,
                participants: participants.filter(p => p.trim()),
                holePars,
                scores: initialScores,
                courseImageUrl: imageUrl || '',
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
            <button onClick={onBack} className={`flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-6 font-bold transition-colors ${isSmartphoneMode ? 'px-4' : ''}`}>
                <ArrowLeft size={20} />
                <span>돌아가기</span>
            </button>

            <div className={`bg-white border-slate-200 overflow-hidden ${isSmartphoneMode ? 'rounded-none border-x-0' : 'rounded-[2.5rem] border shadow-xl'}`}>
                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Course Image Upload */}
                        <div className="w-full md:w-64">
                            <label className="block text-sm font-black text-slate-700 mb-2 ml-1">골프장 정보 (코드/이미지)</label>
                            <div className="relative group">
                                <label className="relative flex flex-col items-center justify-center w-full h-40 md:h-64 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-100 transition-all overflow-hidden shadow-inner">
                                    {previewUrl ? (
                                        <>
                                            <img src={previewUrl} alt="Course" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white gap-2 transition-colors hover:bg-black/50">
                                                <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 shadow-lg">
                                                    <Camera size={28} />
                                                </div>
                                                <span className="text-sm font-black drop-shadow-md bg-indigo-600 px-4 py-1.5 rounded-full shadow-lg">사진 변경</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <div className="bg-slate-200/50 p-4 rounded-full mb-3 shadow-inner">
                                                <Camera size={32} />
                                            </div>
                                            <span className="text-xs font-black">골프장 정보 이미지 업로드</span>
                                            <p className="text-[10px] mt-1 text-slate-300">클릭하여 파일을 선택하세요</p>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>

                                {previewUrl && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setImageFile(null);
                                            setPreviewUrl('');
                                        }}
                                        className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all z-20 border-2 border-white"
                                        title="이미지 삭제"
                                    >
                                        <X size={20} className="stroke-[3]" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">골프장 이름</label>
                                <input
                                    required
                                    value={courseName}
                                    onChange={e => setCourseName(e.target.value)}
                                    placeholder="예: 베네스트 GC"
                                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-emerald-200 font-bold transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-2 ml-1">라운딩 날짜</label>
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

                    <div>
                        <label className="block text-sm font-black text-slate-700 mb-4 ml-1">18홀 파(Par) 설정 (기본값: 72타)</label>
                        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                            {holePars.map((par, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                                    <select
                                        value={par}
                                        onChange={e => {
                                            const newPars = [...holePars];
                                            newPars[idx] = parseInt(e.target.value);
                                            setHolePars(newPars);
                                        }}
                                        className="w-full p-1 bg-slate-50 rounded-lg text-xs font-black border-none focus:ring-1 focus:ring-emerald-200 text-center appearance-none cursor-pointer"
                                    >
                                        <option value={3}>3</option>
                                        <option value={4}>4</option>
                                        <option value={5}>5</option>
                                    </select>
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

// --- Image Viewer Modal ---
const ImageViewer: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
    return (
        <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center transition-all"
            >
                <X size={24} />
            </button>
            <img
                src={url}
                alt="Enlarged view"
                className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

// --- Sub Components (Scorecard View) ---

interface ScorecardViewProps {
    scoreData: GolfScore;
    onBack: () => void;
    isSmartphoneMode: boolean;
    onShowImage: (url: string) => void;
}

const ScorecardView: React.FC<ScorecardViewProps> = ({ scoreData, onBack, isSmartphoneMode, onShowImage }) => {
    const [localScores, setLocalScores] = useState(scoreData.scores);
    const [isSaving, setIsSaving] = useState(false);

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

    return (
        <div className="animate-in fade-in duration-500">
            <div className={`flex items-center justify-between mb-4 ${isSmartphoneMode ? 'px-4' : ''}`}>
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-emerald-600 transition-all shadow-sm">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2.5">
                        {scoreData.courseImageUrl && (
                            <div
                                onClick={() => onShowImage(scoreData.courseImageUrl!)}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0 cursor-pointer hover:border-emerald-400 transition-all active:scale-95 shadow-sm"
                            >
                                <img src={scoreData.courseImageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-0.5">{scoreData.courseName}</h2>
                            <p className="text-[10px] text-slate-400 font-bold">{scoreData.date}</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-50"
                    title="중간 저장"
                >
                    <Save size={20} />
                </button>
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
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg font-mono text-sm font-black transition-all bg-white border-2 border-emerald-500 text-emerald-600 shadow-sm">
                                                        {currentScore === 0 ? scoreData.holePars[hIdx] : currentScore}
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
