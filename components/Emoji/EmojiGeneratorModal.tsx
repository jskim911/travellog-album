import React, { useState, useRef, useEffect } from 'react';
import { X, Crop, Sparkles, Download, RefreshCw, Check, Image as ImageIcon } from 'lucide-react';
import { Album } from '../../types';

interface EmojiGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    photos: Album[]; // 갤러리 사진 목록
}

type Step = 'select' | 'crop' | 'result';

export const EmojiGeneratorModal: React.FC<EmojiGeneratorModalProps> = ({ isOpen, onClose, photos }) => {
    const [step, setStep] = useState<Step>('select');
    const [selectedPhoto, setSelectedPhoto] = useState<Album | null>(null);

    // Crop Photo State
    const [cropScale, setCropScale] = useState(1);
    const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Generating State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedEmojis, setGeneratedEmojis] = useState<string[]>([]);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setStep('select');
            setSelectedPhoto(null);
            setGeneratedEmojis([]);
        }
    }, [isOpen]);

    const handleSelectPhoto = (photo: Album) => {
        setSelectedPhoto(photo);
        setStep('crop');
        // Reset crop state
        setCropScale(1);
        setCropPosition({ x: 0, y: 0 });
    };

    const drawPreview = () => {
        if (!canvasRef.current || !imageRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Image with transform
        const img = imageRef.current;
        const size = 300;
        const centerX = size / 2;
        const centerY = size / 2;

        ctx.save();

        // 1. Clip Circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.clip();

        // 2. Draw Image
        const imgRatio = img.width / img.height;
        let drawWidth = size * cropScale;
        let drawHeight = size * cropScale;

        if (imgRatio > 1) {
            drawHeight = drawWidth / imgRatio;
        } else {
            drawWidth = drawHeight * imgRatio;
        }

        ctx.translate(centerX + cropPosition.x, centerY + cropPosition.y);
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

        ctx.restore();
    };

    useEffect(() => {
        if (step === 'crop' && imageRef.current) {
            // Initial draw when image loads
            drawPreview();
        }
    }, [step, cropScale, cropPosition]);

    const handleGenerate = async () => {
        setIsGenerating(true);

        // Simulate API call for now
        setTimeout(() => {
            // Dummy results (In real app, we would send the cropped image blobs to Gemini)
            const dummyStyles = [
                'Original', 'Vintage', 'Sketch', 'Cartoon',
                'Pop Art', 'Neon', 'Watercolor', 'Pixel'
            ];
            setIsGenerating(false);
            setStep('result');
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden flex shadow-2xl">

                {/* Sidebar Steps */}
                <div className="w-64 bg-slate-800 border-r border-slate-700 p-6 flex flex-col hidden md:flex">
                    <h2 className="text-xl font-black text-white mb-8 bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent"> Emoji Maker</h2>
                    <div className="space-y-6">
                        <div className={`flex items-center gap-3 ${step === 'select' ? 'text-white' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'select' ? 'bg-violet-600' : 'bg-slate-700'}`}>1</div>
                            <span className="font-bold">사진 선택</span>
                        </div>
                        <div className={`flex items-center gap-3 ${step === 'crop' ? 'text-white' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'crop' ? 'bg-violet-600' : 'bg-slate-700'}`}>2</div>
                            <span className="font-bold">영역 선택</span>
                        </div>
                        <div className={`flex items-center gap-3 ${step === 'result' ? 'text-white' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'result' ? 'bg-violet-600' : 'bg-slate-700'}`}>3</div>
                            <span className="font-bold">이모지 생성</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-slate-900 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full z-10 transition-colors">
                        <X size={20} />
                    </button>

                    {/* STEP 1: Select Photo */}
                    {step === 'select' && (
                        <div className="flex-1 p-8 overflow-y-auto">
                            <h3 className="text-2xl font-bold text-white mb-6">어떤 사진으로 만들까요?</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {photos.map(photo => (
                                    <button
                                        key={photo.id}
                                        onClick={() => handleSelectPhoto(photo)}
                                        className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-pink-500 transition-all group relative"
                                    >
                                        <img src={photo.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="font-bold text-white text-sm">선택하기</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Crop */}
                    {step === 'crop' && selectedPhoto && (
                        <div className="flex-1 flex flex-col p-8 items-center justify-center">
                            <h3 className="text-xl font-bold text-white mb-4">이모지로 쓸 부분을 원 안에 맞춰주세요</h3>

                            <div className="relative w-[300px] h-[300px] rounded-full overflow-hidden border-4 border-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.3)] mb-8 bg-slate-800">
                                {/* Hidden source image for canvas to draw */}
                                <img
                                    ref={imageRef}
                                    src={selectedPhoto.coverUrl}
                                    className="hidden"
                                    crossOrigin="anonymous"
                                    onLoad={drawPreview}
                                />
                                <canvas
                                    ref={canvasRef}
                                    width={300}
                                    height={300}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Controls */}
                            <div className="w-full max-w-sm space-y-4 bg-slate-800 p-6 rounded-2xl">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 mb-2 block">확대 / 축소</label>
                                    <input
                                        type="range"
                                        min="1" max="3" step="0.1"
                                        value={cropScale}
                                        onChange={e => setCropScale(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button
                                        onClick={() => setStep('select')}
                                        className="py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
                                    >
                                        다른 사진 선택
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        className="py-3 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Sparkles size={18} />
                                        이모지 생성
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Loading / Result */}
                    {step === 'result' && (
                        <div className="flex-1 flex flex-col p-8 items-center justify-center">
                            {isGenerating ? (
                                <div className="text-center">
                                    <div className="w-20 h-20 mb-6 relative mx-auto">
                                        <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-t-pink-500 rounded-full animate-spin"></div>
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-2">AI가 이모지를 만드는 중...</h3>
                                    <p className="text-slate-400">약 5~10초 정도 소요됩니다.</p>
                                </div>
                            ) : (
                                <div className="text-center w-full max-w-3xl">
                                    <div className="mb-8">
                                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in">
                                            <Check size={32} className="text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-white">나만의 이모지 완성! 🎉</h3>
                                        <p className="text-slate-400 mt-2">마음에 드는 스타일을 선택해서 다운로드하세요.</p>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                        {/* Mock Results */}
                                        {[...Array(8)].map((_, i) => (
                                            <div key={i} className="aspect-square bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 hover:border-pink-500 transition-colors group cursor-pointer relative overflow-hidden">
                                                {/* We would show generated images here */}
                                                <span className="text-4xl">😎</span>
                                                <p className="absolute bottom-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold">Style {i + 1}</p>

                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Download className="text-white" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-4 justify-center">
                                        <button
                                            onClick={() => setStep('crop')}
                                            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
                                        >
                                            <RefreshCw size={18} />
                                            다시 만들기
                                        </button>
                                        <button className="px-8 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 flex items-center gap-2 transition-transform hover:-translate-y-1">
                                            <Download size={18} />
                                            전체 다운로드
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
