import React, { useState, useRef } from 'react';
import { Download, X, Layout, Grid, List, BookOpen, Type, Sparkles } from 'lucide-react';
import { Album } from '../types';
import { generateStoryboardPDF, downloadPDF } from '../src/utils/pdfGenerator';
import { generateCaptionSuggestions } from '../src/utils/gemini';

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
    const [layout, setLayout] = useState<LayoutType>('grid');
    const [title, setTitle] = useState('나의 여행 이야기');
    const [isGenerating, setIsGenerating] = useState(false);
    const [captions, setCaptions] = useState<Record<string, string>>({});
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

    const handleExport = async () => {
        if (!previewRef.current) return;
        setIsGenerating(true);
        try {
            const photos = selectedAlbums.map(album => ({
                url: album.coverUrl,
                caption: captions[album.id],
                location: album.location
            }));

            // 실제 DOM 요소를 사용하여 고품질 PDF 생성
            // NOTE: generateStoryboardPDF uses a temporary DOM, but since we have a preview, 
            // we could utilize generatePDFFromElement if we styled the preview exactly like A4.
            // For now, using the logic in utils which rebuilds it for A4 consistency.
            const blob = await generateStoryboardPDF(
                title,
                new Date().toLocaleDateString(),
                photos,
                layout
            );

            downloadPDF(blob, `storyboard_${Date.now()}.pdf`);
        } catch (error) {
            console.error(error);
            alert('PDF 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCaptionChange = (id: string, text: string) => {
        setCaptions(prev => ({ ...prev, [id]: text }));
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

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            disabled={isGenerating}
                            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>생성 중...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={20} />
                                    <span>PDF 내보내기</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Area: Preview */}
                <div className="flex-1 bg-slate-100 p-8 overflow-y-auto flex items-start justify-center">
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
                                            src={album.coverUrl}
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
            </div>
        </div>
    );
};
