import React, { useState, useRef } from 'react';
import { Download, X, Layout, Grid, List, BookOpen, Type, Sparkles, Save, Printer, ChevronRight } from 'lucide-react';
import { Album } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

import { generatePDFFromElement, downloadPDF } from '../src/utils/pdfGenerator';
import { convertImageToBase64 } from '../src/utils/imageUtils';
import { generateCaptionSuggestions } from '../src/utils/gemini';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../src/hooks/useAuth';

interface StoryboardCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    selectedAlbums: Album[];
}

type LayoutType = 'grid' | 'timeline' | 'magazine';

export const StoryboardCreator: React.FC<StoryboardCreatorProps> = ({
    isOpen,
    onClose,
    selectedAlbums
}) => {
    const { user } = useAuth();
    const [layout, setLayout] = useState<LayoutType>('grid');
    const [title, setTitle] = useState('나의 여행 기록');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [captions, setCaptions] = useState<Record<string, string>>({});
    const [base64Images, setBase64Images] = useState<Record<string, string>>({});
    const previewRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const initialCaptions: Record<string, string> = {};
        selectedAlbums.forEach(album => {
            if (!captions[album.id]) {
                initialCaptions[album.id] = album.caption || album.title || '';
            }
        });
        if (Object.keys(initialCaptions).length > 0) {
            setCaptions(prev => ({ ...prev, ...initialCaptions }));
        }
    }, [selectedAlbums]);

    React.useEffect(() => {
        const loadImages = async () => {
            const promises = selectedAlbums.map(async (album) => {
                if (base64Images[album.id]) return;
                const base64 = await convertImageToBase64(album.coverUrl);
                if (base64 !== album.coverUrl) {
                    setBase64Images(prev => ({ ...prev, [album.id]: base64 }));
                }
            });
            await Promise.all(promises);
        };
        if (isOpen) loadImages();
    }, [selectedAlbums, isOpen]);

    const handleExport = () => {
        if (!previewRef.current) return;
        setIsGenerating(true);

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            setIsGenerating(false);
            return;
        }

        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach(style => doc.head.appendChild(style.cloneNode(true)));

        const printStyle = doc.createElement('style');
        printStyle.innerHTML = `
            @media print {
                @page { margin: 15mm; size: A4; }
                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                .break-inside-avoid { page-break-inside: avoid; }
            }
            body { background: white; }
            #print-container { width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; transform: none !important; }
        `;
        doc.head.appendChild(printStyle);

        const contentClone = previewRef.current.cloneNode(true) as HTMLElement;
        contentClone.id = 'print-container';
        Object.assign(contentClone.style, { width: '100%', height: 'auto', transform: 'none', padding: '0', margin: '0' });
        doc.body.appendChild(contentClone);

        const images = doc.querySelectorAll('img');
        let loaded = 0;
        const trigger = () => {
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    setIsGenerating(false);
                }, 1000);
            }, 500);
        };

        if (images.length === 0) trigger();
        else {
            images.forEach(img => {
                img.onload = img.onerror = () => { if (++loaded >= images.length) trigger(); };
            });
        }
    };

    const handleDownloadPDF = async () => {
        if (!previewRef.current) return;
        setIsGenerating(true);
        try {
            const blob = await generatePDFFromElement(previewRef.current, `${title}.pdf`, { orientation: 'portrait', format: 'a4' });
            downloadPDF(blob, `${title}.pdf`);
        } catch (error) {
            alert('PDF 저장에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'storyboards'), {
                userId: user.uid, title, layout,
                photos: selectedAlbums.map(album => ({
                    photoId: album.id, url: album.coverUrl,
                    caption: captions[album.id] || '',
                    location: album.location || ''
                })),
                createdAt: serverTimestamp(), updatedAt: serverTimestamp()
            });
            alert('스토리보드가 저장되었습니다!');
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-[90rem] h-[90vh] bg-slate-50 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col sm:flex-row border border-white/20"
            >
                {/* Left Sidebar: Controls Area */}
                <div className="w-full sm:w-[24rem] bg-white/80 backdrop-blur-md border-r border-slate-200 flex flex-col p-8 overflow-y-auto shrink-0 scrollbar-none">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                <BookOpen size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Storybook</h2>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-all active:scale-90">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-8 flex-1">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Document Title</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-black text-slate-800 focus:outline-none transition-all shadow-inner group-hover:bg-white"
                                    placeholder="Enter title..."
                                />
                                <Type size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Select Layout</label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'grid', icon: Grid, label: 'Modern Grid' },
                                    { id: 'timeline', icon: List, label: 'Story Timeline' },
                                    { id: 'magazine', icon: Layout, label: 'Magazine Editorial' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setLayout(item.id as LayoutType)}
                                        className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all group ${layout === item.id
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-lg shadow-indigo-100'
                                                : 'border-slate-50 bg-slate-50 hover:bg-white hover:border-indigo-200 text-slate-500'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <item.icon size={20} className={layout === item.id ? 'text-indigo-600' : 'text-slate-400'} />
                                            <span className="font-black tracking-tight">{item.label}</span>
                                        </div>
                                        {layout === item.id && <motion.div layoutId="layout-active" className="w-2 h-2 bg-indigo-600 rounded-full" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Edit Captions ({selectedAlbums.length})</label>
                            <div className="space-y-3 pb-4">
                                {selectedAlbums.map((album) => (
                                    <div key={album.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all group">
                                        <div className="flex gap-4 mb-3">
                                            <img src={album.coverUrl} className="w-14 h-14 rounded-xl object-cover shadow-sm group-hover:scale-110 transition-transform" />
                                            <div className="flex-1 min-w-0 py-1">
                                                <p className="text-sm font-black text-slate-700 truncate">{album.title}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{album.location}</p>
                                            </div>
                                        </div>
                                        <textarea
                                            value={captions[album.id] || ''}
                                            onChange={(e) => setCaptions(prev => ({ ...prev, [album.id]: e.target.value }))}
                                            placeholder="Write a story..."
                                            className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-300 focus:outline-none resize-none scrollbar-none font-medium h-20 shadow-sm"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content: Preview Area */}
                <div className="flex-1 flex flex-col bg-slate-100/50 overflow-hidden">
                    <div className="flex-1 overflow-auto p-12 flex justify-center scrollbar-thin">
                        <motion.div
                            layout
                            ref={previewRef}
                            className="bg-white shadow-[0_32px_96px_-12px_rgba(0,0,0,0.1)] transition-all duration-700 origin-top flex flex-col"
                            style={{ width: '210mm', minHeight: '297mm', padding: '40mm 25mm' }}
                        >
                            <motion.h1 layout className="text-[4rem] font-black text-slate-900 leading-[0.9] tracking-tighter mb-4">{title}</motion.h1>
                            <div className="flex items-center gap-3 text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-16 border-b border-slate-100 pb-8">
                                <Sparkles size={14} className="text-indigo-500" />
                                <span>Travel Journal</span>
                                <span className="opacity-30">|</span>
                                <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>

                            <motion.div
                                layout
                                className={`
                                    grid gap-x-12 gap-y-16
                                    ${layout === 'grid' ? 'grid-cols-2' : ''}
                                    ${layout === 'timeline' ? 'grid-cols-1 max-w-lg mx-auto' : ''}
                                    ${layout === 'magazine' ? 'grid-cols-3' : ''}
                                `}
                            >
                                {selectedAlbums.map((album, idx) => (
                                    <motion.div
                                        layout
                                        key={album.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="break-inside-avoid relative"
                                    >
                                        <div className={`overflow-hidden rounded-sm bg-slate-100 mb-6 ${layout === 'magazine' ? 'aspect-[3/4]' : 'aspect-square'}`}>
                                            <img
                                                src={base64Images[album.id] || album.coverUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-bold text-slate-900 leading-tight uppercase tracking-tight">{album.title}</p>
                                            <p className="text-xs font-serif text-slate-500 leading-relaxed italic">
                                                {captions[album.id] || 'No additional caption provided for this memory.'}
                                            </p>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-4 opacity-60">
                                                {album.location || 'GLOBAL DESTINATION'}
                                            </p>
                                        </div>
                                        {layout === 'timeline' && (
                                            <div className="absolute -left-12 top-0 bottom-0 w-px bg-slate-100 flex items-center">
                                                <div className="w-3 h-3 bg-indigo-600 rounded-full -ml-[6px] border-4 border-white shadow-sm" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="p-6 bg-white/80 backdrop-blur-md border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
                        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            <Printer size={14} />
                            <span>Recommended format: PDF Export (A4 Portrait)</span>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isGenerating}
                                className="flex-1 sm:flex-none px-8 py-4 bg-white border-2 border-slate-200 hover:border-indigo-200 text-slate-800 rounded-[1.25rem] font-black shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /> : <Save size={20} />}
                                <span>저장</span>
                            </button>

                            <button
                                onClick={handleExport}
                                disabled={isGenerating || isSaving}
                                className="flex-1 sm:flex-none px-8 py-4 bg-white border-2 border-slate-200 hover:border-indigo-200 text-slate-800 rounded-[1.25rem] font-black shadow-sm flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Printer size={20} />
                                <span>인쇄</span>
                            </button>

                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGenerating || isSaving}
                                className="flex-[2] sm:flex-none px-10 py-4 bg-indigo-600 text-white rounded-[1.25rem] font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                            >
                                {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={20} />}
                                <span>PDF 내보내기</span>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
