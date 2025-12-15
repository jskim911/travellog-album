/**
 * Emoji Me - 3D Sticker Pack Generator
 * Design: Polaroid style (Requested Design Support)
 * Output: 3D Pixar-style rendered characters based on user's photo
 */
import React, { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, Download, RotateCcw } from 'lucide-react';
import { generateEmojiImage } from '../src/utils/gemini';

// 6개의 3D 감정 이모지 설정
const EMOTIONS = [
    { name: 'Happy', emoji: '😊', prompt: 'smiling happily, friendly expression' },
    { name: 'Love', emoji: '😍', prompt: 'eyes shaped like hearts, looking full of love' },
    { name: 'Surprised', emoji: '😲', prompt: 'wide eyes, jaw dropped in cute surprise' },
    { name: 'Wink', emoji: '😉', prompt: 'winking one eye playfully' },
    { name: 'Laughing', emoji: '😂', prompt: 'laughing vertically with tears of joy' },
    { name: 'Cool', emoji: '😎', prompt: 'wearing cool sunglasses, confident smirk' },
];

interface GeneratedEmoji {
    status: 'pending' | 'done' | 'error';
    url?: string;
    error?: string;
}

interface EmojiGeneratorProps {
    onClose?: () => void;
}

const EmojiGenerator: React.FC<EmojiGeneratorProps> = ({ onClose }) => {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedEmojis, setGeneratedEmojis] = useState<Record<string, GeneratedEmoji>>({});
    const [appState, setAppState] = useState<'upload' | 'preview' | 'generating' | 'results'>('upload');

    // 이미지 업로드
    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('preview');
                setGeneratedEmojis({});
            };
            reader.readAsDataURL(file);
        }
    };

    // 3D 이모지 생성 시작
    const handleMakeEmojis = async () => {
        if (!uploadedImage) return;

        setAppState('generating');

        // 초기 상태 설정
        const initialEmojis: Record<string, GeneratedEmoji> = {};
        EMOTIONS.forEach(emotion => {
            initialEmojis[emotion.name] = { status: 'pending' };
        });
        setGeneratedEmojis(initialEmojis);

        // 2개씩 병렬 처리
        const queue = [...EMOTIONS];
        const concurrencyLimit = 2;

        const processEmotion = async (emotion: typeof EMOTIONS[0]) => {
            try {
                const prompt = `
          Create a 3D Pixar-style digital sticker based on this person's facial structure.
          
          Requirements:
          1. STYLE: High-quality 3D render, cute, cartoonish but recognizable.
          2. SKELETON: Keep the person's face shape, hair style, and key features (glasses, beard, etc.).
          3. EMOTION: ${emotion.prompt} (${emotion.emoji}).
          4. BACKGROUND: Simple soft gradient color matching the emotion.
          5. OUTPUT: A clean, isolated 3D character headshot.
          
          Make it look like a collectionable 3D toy or sticker, NOT a realistic photo filter.
        `;

                const resultUrl = await generateEmojiImage(uploadedImage, prompt);

                setGeneratedEmojis(prev => ({
                    ...prev,
                    [emotion.name]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                setGeneratedEmojis(prev => ({
                    ...prev,
                    [emotion.name]: { status: 'error', error: 'Failed' },
                }));
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (queue.length > 0) {
                const emotion = queue.shift();
                if (emotion) await processEmotion(emotion);
            }
        });

        await Promise.all(workers);
        setAppState('results');
    };

    // 스티커 팩 다운로드
    const handleDownloadPack = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cardW = 400, cardH = 480;
        const padding = 40;
        canvas.width = (cardW + padding) * 3 + padding;
        canvas.height = (cardH + padding) * 2 + padding;

        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.src = src;
        });

        let idx = 0;
        for (const em of EMOTIONS) {
            const g = generatedEmojis[em.name];
            if (g?.status === 'done' && g.url) {
                const r = Math.floor(idx / 3);
                const c = idx % 3;
                const x = padding + c * (cardW + padding);
                const y = padding + r * (cardH + padding);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, cardW, cardH);

                try {
                    const img = await loadImage(g.url);
                    ctx.drawImage(img, x + 20, y + 20, 360, 360);
                } catch (e) { console.error(e); }

                ctx.fillStyle = '#000000';
                ctx.font = 'bold 40px "Permanent Marker", cursive';
                ctx.textAlign = 'center';
                ctx.fillText(em.name, x + cardW / 2, y + 440);

                idx++;
            }
        }

        const link = document.createElement('a');
        link.download = 'emoji-me-pack.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const handleReset = () => {
        setUploadedImage(null);
        setAppState('upload');
        setGeneratedEmojis({});
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-900 text-white overflow-hidden font-sans">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition z-50"
                >
                    <RotateCcw className="w-6 h-6 text-neutral-400" />
                </button>
            )}

            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center mb-8 z-10"
            >
                <h1 className="text-7xl font-caveat text-yellow-400 mb-2">Emoji Me</h1>
                <p className="text-xl font-permanent-marker text-neutral-300 tracking-wider">
                    TURN YOUR FACE INTO A 3D STICKER PACK
                </p>
            </motion.div>

            {/* Content */}
            <div className="w-full max-w-6xl px-4 z-10 flex flex-col items-center min-h-[600px] justify-center">
                <AnimatePresence mode="wait">

                    {/* UPLOAD STATE */}
                    {appState === 'upload' && (
                        <motion.div
                            key="upload"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative"
                        >
                            <label className="cursor-pointer group block">
                                <div className="bg-white p-6 pb-20 shadow-2xl transform transition-transform duration-300 hover:rotate-2 hover:scale-105 w-[340px]">
                                    <div className="bg-neutral-900 aspect-square flex flex-col items-center justify-center mb-4">
                                        <Camera className="w-16 h-16 text-neutral-600 mb-4" />
                                        <span className="text-neutral-500 font-permanent-marker text-xl">Upload Photo</span>
                                    </div>
                                    <div className="absolute bottom-8 left-0 w-full text-center">
                                        <span className="text-black font-permanent-marker text-2xl">Click to start</span>
                                    </div>
                                </div>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </motion.div>
                    )}

                    {/* PREVIEW STATE */}
                    {appState === 'preview' && uploadedImage && (
                        <motion.div
                            key="preview"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="flex flex-col items-center gap-10"
                        >
                            <div className="bg-white p-6 pb-20 shadow-2xl w-[340px]">
                                <img src={uploadedImage} alt="Selfie" className="w-full aspect-square object-cover bg-neutral-100" />
                                <div className="absolute bottom-8 left-0 w-full text-center">
                                    <span className="text-black font-permanent-marker text-2xl">Your Selfie</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleReset}
                                    className="px-8 py-3 bg-transparent border-2 border-white rounded-none font-permanent-marker text-white text-lg hover:bg-white hover:text-black transition-colors uppercase tracking-wide"
                                >
                                    Different Photo
                                </button>
                                <button
                                    onClick={handleMakeEmojis}
                                    className="px-8 py-3 bg-yellow-400 border-2 border-yellow-400 rounded-none font-permanent-marker text-black text-lg hover:bg-yellow-300 transition-colors uppercase tracking-wide shadow-lg"
                                >
                                    Make Emojis
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* RESULTS STATE */}
                    {(appState === 'generating' || appState === 'results') && (
                        <motion.div
                            key="results"
                            className="w-full flex flex-col items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center mb-12">
                                {EMOTIONS.map((emotion, index) => {
                                    const item = generatedEmojis[emotion.name];
                                    const rotateDeg = (index % 3 === 0 ? -2 : index % 3 === 1 ? 2 : -1) * (index > 2 ? -1 : 1);

                                    return (
                                        <motion.div
                                            key={emotion.name}
                                            initial={{ opacity: 0, y: 50, rotate: 0 }}
                                            animate={{ opacity: 1, y: 0, rotate: rotateDeg }}
                                            transition={{ delay: index * 0.15, type: 'spring' }}
                                            className="bg-white p-5 pb-16 shadow-2xl w-[300px] hover:z-10 hover:scale-110 transition-transform duration-300"
                                        >
                                            <div className="bg-neutral-100 aspect-square w-full relative overflow-hidden flex items-center justify-center">
                                                {item?.status === 'pending' && (
                                                    <div className="flex flex-col items-center text-neutral-400">
                                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                                        <span className="text-sm font-permanent-marker">Creating...</span>
                                                    </div>
                                                )}
                                                {item?.status === 'error' && (
                                                    <div className="text-red-400 font-permanent-marker text-sm">Failed</div>
                                                )}
                                                {item?.status === 'done' && item.url && (
                                                    <img src={item.url} alt={emotion.name} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="absolute bottom-5 left-0 w-full text-center">
                                                <span className="text-black font-permanent-marker text-2xl">{emotion.name}</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {appState === 'results' && (
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleReset}
                                        className="px-8 py-3 bg-transparent border-2 border-white rounded-none font-permanent-marker text-white text-lg hover:bg-white hover:text-black transition-colors uppercase tracking-wide"
                                    >
                                        Start Over
                                    </button>
                                    <button
                                        onClick={handleDownloadPack}
                                        className="px-8 py-3 bg-yellow-400 border-2 border-yellow-400 rounded-none font-permanent-marker text-black text-lg hover:bg-yellow-300 transition-colors uppercase tracking-wide shadow-lg flex items-center gap-2"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download Pack
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};

export default EmojiGenerator;
