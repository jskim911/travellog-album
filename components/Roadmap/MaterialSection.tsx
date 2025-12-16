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
}

export const MaterialSection: React.FC<MaterialSectionProps> = ({ selectedTripId }) => {
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

            // Client filter
            const filtered = selectedTripId
                ? items.filter(i => i.tripId === selectedTripId)
                : items; // Or items.filter(i => !i.tripId) ? Let's show all if no trip selected?
            // "Trip Planning Menu" -> usually users select a trip first.
            // But if they haven't, showing all or "Unassigned" is okay.
            // Let's show filtered.

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
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">
                        {selectedTripId ? '여행 자료' : '전체 자료 보관함'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        PDF, 이미지 등 여행 관련 자료를 업로드하고 관리하세요.
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
                        className={`flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md active:scale-95 ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        <span>{uploading ? '업로드 중...' : '자료 업로드'}</span>
                    </label>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="p-12 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-violet-300" />
                </div>
            ) : materials.length === 0 ? (
                <div className="p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    <p>등록된 자료가 없습니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materials.map((item) => (
                        <div key={item.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
                            {/* Preview Area */}
                            <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                {item.type === 'image' ? (
                                    <img
                                        src={item.url}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="text-slate-400 flex flex-col items-center">
                                        <FileText size={48} className="mb-2 text-violet-400" />
                                        <span className="text-xs font-bold uppercase text-slate-400">PDF Document</span>
                                    </div>
                                )}

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                    <button
                                        onClick={() => window.open(item.url, '_blank')}
                                        className="p-2 bg-white/20 hover:bg-white text-white hover:text-violet-600 rounded-full transition-all backdrop-blur-md"
                                        title="보기"
                                    >
                                        <ExternalLink size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Info Area */}
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-sm truncate mb-1" title={item.name}>
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{formatSize(item.size)}</span>
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => handleDelete(item)}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                        title="삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
