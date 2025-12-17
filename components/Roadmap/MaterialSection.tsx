import React, { useState, useEffect } from 'react';
import { Upload, FileText, Image as ImageIcon, Trash2, Download, ExternalLink, Loader2 } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../src/hooks/useAuth';

interface Material {
    id: string;
    userId: string;
    tripId?: string | null;
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'other';
    size: number;
    createdAt: Date;
}

interface MaterialSectionProps {
    selectedTripId: string | null;
    isSmartphoneMode?: boolean;
}

export const MaterialSection: React.FC<MaterialSectionProps> = ({ selectedTripId, isSmartphoneMode = false }) => {
    const { user } = useAuth();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Base query
        let q = query(
            collection(db, 'materials'),
            where('userId', '==', user.uid)
        );

        // If trip selected, we COULD filter. But user said "Select trip -> Material upload".
        // Usually materials are trip-specific.
        // However, if selectedTripId is null, maybe show all or none?
        // Let's assume we filter by tripId if provided, or show "global" materials if not?
        // Actually, let's keep it simple: Show all materials if no trip selected, or only trip's if selected.
        // But Firestore requires index for dynamic filtering. content-wise simpler to filter in client or just match tripId.

        // Let's rely on client side filtering for simplicity in this turn unless list is huge.
        // Actually best practice:
        // If selectedTripId present: where('tripId', '==', selectedTripId)
        // If not: where('tripId', '==', null) ?? Or all?
        // Let's fetch all user's materials and filter client side.

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            })) as Material[];

            // Client filter - Show ALL materials to ensure data visibility as requested
            // We kept selectedTripId for Upload context, but for View we show everything.
            const filtered = items;

            // Sort by date desc
            filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            setMaterials(filtered);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, selectedTripId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !user) return;

        setUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const storageRef = ref(storage, `materials/${user.uid}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);

                const type = file.type.startsWith('image/') ? 'image'
                    : file.type === 'application/pdf' ? 'pdf' : 'other';

                await addDoc(collection(db, 'materials'), {
                    userId: user.uid,
                    tripId: selectedTripId, // Can be null
                    name: file.name,
                    url,
                    type,
                    size: file.size,
                    createdAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("파일 업로드 중 오류가 발생했습니다.");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleDelete = async (material: Material) => {
        if (!window.confirm('이 자료를 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'materials', material.id));
            const storageRef = ref(storage, material.url);
            await deleteObject(storageRef).catch(e => console.warn("Storage delete failed", e));
        } catch (error) {
            console.error("Delete failed", error);
            alert("삭제 실패");
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Header - Compact */}
            <div className="flex justify-between items-center mb-4 sm:mb-6">
                <div>
                    <h2 className={`${isSmartphoneMode ? 'text-base' : 'text-xl'} font-bold text-slate-800`}>
                        자료 보관함
                    </h2>
                    <p className={`${isSmartphoneMode ? 'text-[10px]' : 'text-sm'} text-slate-500 line-clamp-1`}>
                        모든 여행 자료를 한곳에서 관리하세요.
                    </p>
                </div>
                <div>
                    <input
                        type="file"
                        id="material-upload"
                        className="hidden"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                    />
                    <label
                        htmlFor="material-upload"
                        className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg sm:rounded-xl font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span className="text-[10px] sm:text-sm">{uploading ? '업로드...' : '업로드'}</span>
                    </label>
                </div>
            </div>

            {/* List - Compact Rows */}
            {loading ? (
                <div className="p-8 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto text-violet-300" />
                </div>
            ) : materials.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">자료가 없습니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {materials.map((item, index) => (
                        <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all group overflow-hidden flex flex-col relative">
                            {/* Icon / Preview Area */}
                            <div className="aspect-[4/3] bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden relative">
                                {item.type === 'image' ? (
                                    <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <FileText size={32} className="text-slate-300 group-hover:text-violet-400 transition-colors" />
                                )}

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => window.open(item.url, '_blank')}
                                        className="p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white hover:text-violet-600 rounded-full transition-all"
                                        title="보기"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item)}
                                        className="p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white hover:text-red-500 rounded-full transition-all"
                                        title="삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3 flex flex-col flex-1">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-bold uppercase tracking-wider flex-shrink-0">
                                        {item.type}
                                    </span>
                                </div>
                                <h3 className={`${isSmartphoneMode ? 'text-xs' : 'text-sm'} font-bold text-slate-800 line-clamp-2 leading-tight mb-2`} title={item.name}>
                                    {item.name}
                                </h3>

                                <div className="mt-auto flex items-center justify-between text-[10px] text-slate-400">
                                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                    <span>{formatSize(item.size)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
