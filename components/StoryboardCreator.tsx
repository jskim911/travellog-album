import React, { useState, useRef } from 'react';
import { Download, X, Layout, Grid, List, BookOpen, Type, Sparkles, Save } from 'lucide-react';
import { Album } from '../types';

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
    const [title, setTitle] = useState('나의 여행 이야기');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [captions, setCaptions] = useState<Record<string, string>>({});
    const [base64Images, setBase64Images] = useState<Record<string, string>>({});
    const previewRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    // Initialize captions if empty
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

    // Pre-load images as Base64 for PDF generation
    React.useEffect(() => {
        const loadImages = async () => {
            const promises = selectedAlbums.map(async (album) => {
                // 이미 Base64가 있으면 스킵
                if (base64Images[album.id]) return;

                // 변환 시도
                const base64 = await convertImageToBase64(album.coverUrl);
                if (base64 !== album.coverUrl) {
                    setBase64Images(prev => ({ ...prev, [album.id]: base64 }));
                }
            });
            await Promise.all(promises);
        };

        if (isOpen) {
            loadImages();
        }
    }, [selectedAlbums, isOpen]);

    const handleExport = () => {
        if (!previewRef.current) return;
        setIsGenerating(true);

        // 1. Create invisible iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            setIsGenerating(false);
            return;
        }

        // 2. Copy all styles (Tailwind, Fonts, etc.)
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach(style => {
            doc.head.appendChild(style.cloneNode(true));
        });

        // 3. Add Print-specific styles
        const printStyle = doc.createElement('style');
        printStyle.innerHTML = `
            @media print {
                @page { margin: 15mm; size: A4; } /* 모든 페이지에 15mm 여백 강제 */
                body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; } /* 사진 짤림 방지 */
            }
            body { background: white; }
            #print-container { 
                width: 100% !important; 
                height: auto !important; 
                margin: 0 !important; 
                padding: 0 !important; /* 페이지 마진이 있으므로 내부 패딩 제거 */
                box-shadow: none !important; 
                transform: none !important;
            }
        `;
        doc.head.appendChild(printStyle);

        // 4. Copy Content (Clone to avoid referencing live DOM)
        const contentClone = previewRef.current.cloneNode(true) as HTMLElement;
        contentClone.id = 'print-container';

        // Remove inline styles that might conflict with print layout
        contentClone.style.width = '100%';
        contentClone.style.minHeight = 'auto';
        contentClone.style.height = 'auto';
        contentClone.style.transform = 'none';
        contentClone.style.padding = '0';
        contentClone.style.margin = '0';

        doc.body.appendChild(contentClone);

        // 5. Wait for images to load in Iframe, then Print
        const images = doc.querySelectorAll('img');
        const totalImages = images.length;
        let loadedImages = 0;

        const triggerPrint = () => {
            // Short delay to ensure rendering
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();

                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    setIsGenerating(false);
                }, 1000);
            }, 500);
        };

        if (totalImages === 0) {
            triggerPrint();
        } else {
            const onImageLoad = () => {
                loadedImages++;
                if (loadedImages >= totalImages) triggerPrint();
            };

            images.forEach(img => {
                if (img.complete) {
                    onImageLoad();
                } else {
                    img.onload = onImageLoad;
                    img.onerror = onImageLoad;
                }
            });
        }
    };

    const handleDownloadPDF = async () => {
        if (!previewRef.current) return;
        setIsGenerating(true);
        try {
            const blob = await generatePDFFromElement(previewRef.current, `${title}.pdf`, {
                orientation: 'portrait',
                format: 'a4'
            });
            downloadPDF(blob, `${title}.pdf`);
        } catch (error) {
            console.error('PDF Download failed', error);
            alert('PDF 저장에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCaptionChange = (id: string, text: string) => {
        setCaptions(prev => ({ ...prev, [id]: text }));
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const storyboardData = {
                userId: user.uid,
                title,
                layout,
                photos: selectedAlbums.map(album => ({
                    photoId: album.id,
                    url: album.coverUrl,
                    caption: captions[album.id] || '',
                    location: album.location || ''
                })),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'storyboards'), storyboardData);
            alert('스토리보드가 저장되었습니다!');
        } catch (error) {
            console.error('Failed to save storyboard:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden flex shadow-2xl">

                {/* Left Sidebar: Controls */}
                <div className="w-80 bg-white border-r border-slate-200 flex flex-col p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <BookOpen className="text-violet-600" />
                            Storybook
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Title Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">제목</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 focus:border-violet-500 focus:outline-none transition-all"
                                placeholder="스토리보드 제목"
                            />
                        </div>

                        {/* Layout Selection */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">레이아웃</label>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => setLayout('grid')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${layout === 'grid'
                                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                                        : 'border-slate-200 hover:border-violet-200 text-slate-600'
                                        }`}
                                >
                                    <Grid size={18} />
                                    <span className="font-bold">Grid View</span>
                                </button>
                                <button
                                    onClick={() => setLayout('timeline')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${layout === 'timeline'
                                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                                        : 'border-slate-200 hover:border-violet-200 text-slate-600'
                                        }`}
                                >
                                    <List size={18} />
                                    <span className="font-bold">Timeline</span>
                                </button>
                                <button
                                    onClick={() => setLayout('magazine')}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${layout === 'magazine'
                                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                                        : 'border-slate-200 hover:border-violet-200 text-slate-600'
                                        }`}
                                >
                                    <Layout size={18} />
                                    <span className="font-bold">Magazine</span>
                                </button>
                            </div>
                        </div>

                        {/* Selected Photos List (Editable Captions) */}
                        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                                사진별 캡션 ({selectedAlbums.length})
                            </label>
                            <div className="overflow-y-auto pr-2 space-y-3 flex-1 scrollbar-thin">
                                {selectedAlbums.map((album) => (
                                    <div key={album.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        <div className="flex gap-3 mb-2">
                                            <img src={album.coverUrl} className="w-12 h-12 rounded-lg object-cover bg-slate-200" alt="" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate">{album.title}</p>
                                                <p className="text-[10px] text-slate-400">{album.location}</p>
                                            </div>
                                        </div>
                                        <textarea
                                            value={captions[album.id] || ''}
                                            onChange={(e) => handleCaptionChange(album.id, e.target.value)}
                                            placeholder="캡션을 입력하세요..."
                                            className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg focus:border-violet-400 focus:outline-none resize-none"
                                            rows={2}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>
                </div>

                {/* Main Area Wrapper */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-100">
                    {/* Scrollable Preview Area */}
                    <div className="flex-1 overflow-y-auto p-8 flex items-start justify-center">
                        <div
                            ref={previewRef}
                            className="bg-white shadow-2xl transition-all duration-500 origin-top"
                            style={{
                                width: '794px', // A4 width at 96 DPI
                                minHeight: '1123px', // A4 height at 96 DPI
                                padding: '60px',
                                transform: 'scale(0.85)', // Scale down to fit
                            }}
                        >
                            {/* Live Preview Content */}
                            <h1 className="text-4xl font-black text-slate-900 mb-4">{title}</h1>
                            <p className="text-slate-500 mb-12 flex items-center gap-2">
                                <Sparkles size={16} />
                                {new Date().toLocaleDateString()}의 기록
                            </p>

                            <div className={`
                grid gap-6
                ${layout === 'grid' ? 'grid-cols-2' : ''}
                ${layout === 'timeline' ? 'grid-cols-1 max-w-2xl mx-auto' : ''}
                ${layout === 'magazine' ? 'grid-cols-3' : ''}
                `}>
                                {selectedAlbums.map((album) => (
                                    <div key={album.id} className="break-inside-avoid mb-4">
                                        <div className="relative group overflow-hidden rounded-xl bg-slate-100 mb-3">
                                            <img
                                                src={base64Images[album.id] || album.coverUrl}
                                                alt={album.title}
                                                className="w-full h-auto object-cover"
                                            />
                                        </div>
                                        {(captions[album.id] || album.title) && (
                                            <div className={`${layout === 'timeline' ? 'text-center' : ''}`}>
                                                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                                                    {captions[album.id] || album.title}
                                                </p>
                                                {layout === 'timeline' && (
                                                    <span className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500 font-medium">
                                                        {album.location || 'Unknown Location'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Fixed Bottom Action Bar */}
                    <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3 z-10 shrink-0">
                        <span className="text-sm text-slate-500 mr-auto pl-2">
                            * PDF 저장 후 인쇄하시면 더 깔끔합니다.
                        </span>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || isGenerating}
                            className="px-6 py-3 bg-white border-2 border-slate-200 hover:border-violet-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-70"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-violet-600/30 border-t-violet-600 rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            <span>저장</span>
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={isGenerating || isSaving}
                            className="px-6 py-3 bg-white border-2 border-slate-200 hover:border-violet-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-70"
                        >
                            <Layout size={18} />
                            <span>인쇄 미리보기</span>
                        </button>

                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGenerating || isSaving}
                            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>생성 중...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    <span>PDF 다운로드</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
