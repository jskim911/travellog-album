/**
 * Emoji Me - 3D Sticker Pack Generator
 * Design: Polaroid style with Gallery Selection Overlay
 * Output: 3D Pixar-style rendered characters (simulated locally)
 */
import React, { useState, ChangeEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, Download, X, Image as ImageIcon } from 'lucide-react';
import { generateEmojiImage } from '../../src/utils/gemini';
import { Album } from '../../types';

// 이모지 카테고리 데이터 정의
type EmojiDef = { name: string; emoji: string; prompt: string; color: string };

const EMOJI_CATEGORIES: Record<string, EmojiDef[]> = {
    "Classic": [
        { name: 'Happy', emoji: '😊', prompt: 'smiling happily', color: 'rgba(255, 223, 0, 0.3)' },
        { name: 'Laughing', emoji: '😂', prompt: 'laughing, tears of joy', color: 'rgba(135, 206, 235, 0.3)' },
        { name: 'Surprised', emoji: '😲', prompt: 'wide eyes, jaw dropped', color: 'rgba(255, 165, 0, 0.3)' },
        { name: 'Sad', emoji: '😢', prompt: 'crying, sad expression', color: 'rgba(100, 149, 237, 0.3)' },
        { name: 'Angry', emoji: '😠', prompt: 'angry face, eyebrows furrowed', color: 'rgba(255, 69, 0, 0.3)' },
        { name: 'Thumbs Up', emoji: '👍', prompt: 'giving a thumbs up', color: 'rgba(50, 205, 50, 0.3)' },
    ],
    "Fun": [
        { name: 'Wink', emoji: '😉', prompt: 'winking one eye playfully', color: 'rgba(147, 112, 219, 0.3)' },
        { name: 'Cool', emoji: '😎', prompt: 'wearing cool sunglasses', color: 'rgba(0, 255, 127, 0.3)' },
        { name: 'Silly', emoji: '🤪', prompt: 'making a silly face, tongue out', color: 'rgba(255, 105, 180, 0.3)' },
        { name: 'Nerd', emoji: '🤓', prompt: 'wearing nerd glasses', color: 'rgba(70, 130, 180, 0.3)' },
        { name: 'Party', emoji: '🥳', prompt: 'party face with hat and blower', color: 'rgba(255, 215, 0, 0.3)' },
        { name: 'Mind Blown', emoji: '🤯', prompt: 'exploding head gesture', color: 'rgba(255, 99, 71, 0.3)' },
    ],
    "Love": [
        { name: 'In Love', emoji: '😍', prompt: 'eyes shaped like hearts', color: 'rgba(255, 20, 147, 0.3)' },
        { name: 'Kiss', emoji: '😘', prompt: 'blowing a kiss', color: 'rgba(255, 182, 193, 0.3)' },
        { name: 'Love You', emoji: '🥰', prompt: 'smiling with hearts around', color: 'rgba(255, 105, 180, 0.3)' },
        { name: 'Heart Hands', emoji: '🫶', prompt: 'making heart shape with hands', color: 'rgba(250, 128, 114, 0.3)' },
    ],
    "Vibes": [
        { name: 'Star', emoji: '🤩', prompt: 'starry eyes, excited', color: 'rgba(255, 215, 0, 0.3)' },
        { name: 'Thinking', emoji: '🤔', prompt: 'thinking pose, hand on chin', color: 'rgba(210, 180, 140, 0.3)' },
        { name: 'Sleepy', emoji: '😴', prompt: 'sleeping, zzz', color: 'rgba(176, 196, 222, 0.3)' },
        { name: 'Money', emoji: '🤑', prompt: 'money signs in eyes', color: 'rgba(50, 205, 50, 0.3)' },
    ]
};

interface GeneratedEmoji {
    status: 'pending' | 'done' | 'error';
    url?: string;
    error?: string;
}

interface EmojiGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    photos: Album[];
}

export const EmojiGeneratorModal: React.FC<EmojiGeneratorModalProps> = ({ isOpen, onClose, photos }) => {
    // ... existing states ...
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedEmojis, setGeneratedEmojis] = useState<Record<string, GeneratedEmoji>>({});
    const [appState, setAppState] = useState<'upload' | 'preview' | 'generating' | 'results'>('upload');

    // Gallery & Selection States
    const [showGalleryPicker, setShowGalleryPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Emoji Selection Logic
    const [selectedCategory, setSelectedCategory] = useState<string>('Classic');
    const [selectedEmotions, setSelectedEmotions] = useState<EmojiDef[]>([]);

    // Reset when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setAppState('upload');
            setUploadedImage(null);
            setGeneratedEmojis({});
            setShowGalleryPicker(false);
            // Default select first 6 classics
            setSelectedEmotions(EMOJI_CATEGORIES['Classic'].slice(0, 6));
        }
    }, [isOpen]);

    // Toggle Emoji Selection
    const toggleEmotion = (emotion: EmojiDef) => {
        setSelectedEmotions(prev => {
            const exists = prev.find(e => e.name === emotion.name);
            if (exists) {
                return prev.filter(e => e.name !== emotion.name);
            } else {
                if (prev.length >= 6) return prev; // Max 6 for layout
                return [...prev, emotion];
            }
        });
    };

    if (!isOpen) return null;

    // ... (Handlers: handleFileUpload, handleGallerySelect, triggerFileUpload, handleReset - Keep same as before) ...
    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('preview');
                setGeneratedEmojis({});
                setShowGalleryPicker(false);
            };
            reader.readAsDataURL(file);
        }
    };
    const handleGallerySelect = (photoUrl: string) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            setUploadedImage(canvas.toDataURL('image/png'));
            setAppState('preview');
            setGeneratedEmojis({});
            setShowGalleryPicker(false);
        };
        img.onerror = () => {
            setUploadedImage(photoUrl);
            setAppState('preview');
            setShowGalleryPicker(false);
        };
        img.src = photoUrl;
    };
    const triggerFileUpload = () => fileInputRef.current?.click();
    const handleReset = () => {
        setUploadedImage(null);
        setAppState('upload');
        setGeneratedEmojis({});
        setShowGalleryPicker(false);
        setSelectedEmotions(EMOJI_CATEGORIES['Classic'].slice(0, 6));
    };


    // 3D Emojis Generation (Updated to use selectedEmotions)
    const handleMakeEmojis = async () => {
        if (!uploadedImage) return;

        if (selectedEmotions.length === 0) {
            alert("Please select at least one emoji!");
            return;
        }

        setAppState('generating');

        const initialEmojis: Record<string, GeneratedEmoji> = {};
        selectedEmotions.forEach(emotion => {
            initialEmojis[emotion.name] = { status: 'pending' };
        });
        setGeneratedEmojis(initialEmojis);

        const queue = [...selectedEmotions];
        const concurrencyLimit = 2;

        const processEmotion = async (emotion: EmojiDef) => {
            try {
                const prompt = `Create a 3D sticker: ${emotion.prompt}`;
                const resultUrl = await generateEmojiImage(
                    uploadedImage,
                    prompt,
                    emotion.emoji,
                    emotion.color
                );

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

    // Download Handler (Updated to iterate selectedEmotions)
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
        for (const em of selectedEmotions) {
            const g = generatedEmojis[em.name];
            if (g?.status === 'done' && g.url) {
                const r = Math.floor(idx / 3);
                const c = idx % 3;
                const x = padding + c * (cardW + padding);
                const y = padding + r * (cardH + padding);

                ctx.fillStyle = '#ffffff';
                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 20;
                ctx.fillRect(x, y, cardW, cardH);
                ctx.shadowBlur = 0;

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

    // Download Single Emoji
    const handleDownloadSingle = (url: string, name: string) => {
        const link = document.createElement('a');
        link.download = `emoji-${name}.png`;
        link.href = url;
        link.click();
    };

    // UI RENDER START ------------------------------------------
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition z-50 group">
                <X className="w-6 h-6 text-neutral-400 group-hover:text-white" />
            </button>

            <div className="w-full h-full flex flex-col items-center justify-center overflow-y-auto">
                {/* Header */}
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6 z-10 flex-shrink-0">
                    <h1 className="text-6xl sm:text-7xl font-caveat text-yellow-400 mb-2">Emoji Me</h1>
                    <p className="text-xl font-permanent-marker text-neutral-300 tracking-wider">TURN YOUR FACE INTO 3D STICKERS</p>
                </motion.div>

                <div className="w-full max-w-6xl px-4 z-10 flex flex-col items-center justify-center min-h-[500px]">
                    <AnimatePresence mode="wait">

                        {/* 1. UPLOAD UI (Keep Existing) */}
                        {appState === 'upload' && (
                            <motion.div key="upload" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative flex flex-col items-center w-full">
                                {!showGalleryPicker ? (
                                    <div onClick={() => setShowGalleryPicker(true)} className="cursor-pointer group block">
                                        <div className="bg-white p-6 pb-20 shadow-2xl transform transition-transform duration-300 hover:rotate-2 hover:scale-105 w-[340px]">
                                            <div className="bg-neutral-900 aspect-square flex flex-col items-center justify-center mb-4">
                                                <ImageIcon className="w-16 h-16 text-neutral-600 mb-4" />
                                                <span className="text-neutral-500 font-permanent-marker text-xl">Select Photo</span>
                                            </div>
                                            <div className="absolute bottom-8 left-0 w-full text-center">
                                                <span className="text-black font-permanent-marker text-2xl">From Gallery</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full max-w-4xl bg-neutral-800/90 rounded-2xl p-6 border border-neutral-700 backdrop-blur-xl animate-in zoom-in-95">
                                        {/* Gallery Picker Content (Keep largely same, simplified here for brevity but logic exists above) */}
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-2xl font-permanent-marker text-white">Select a Photo</h2>
                                            <div className="flex gap-3">
                                                <button onClick={triggerFileUpload} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg flex items-center gap-2 text-sm font-bold"><Camera size={16} /> Upload PC</button>
                                                <button onClick={() => setShowGalleryPicker(false)} className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg"><X size={20} className="text-white" /></button>
                                            </div>
                                        </div>
                                        {photos.length === 0 ? (
                                            <div className="text-center py-20 text-neutral-500"><p>No photos.</p><button onClick={triggerFileUpload} className="text-yellow-400">Upload instead</button></div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
                                                {photos.map(p => (
                                                    <button key={p.id} onClick={() => handleGallerySelect(p.coverUrl)} className="aspect-square relative group overflow-hidden rounded-lg border-2 border-transparent hover:border-yellow-400">
                                                        <img src={p.coverUrl} className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                                    </div>
                                )}
                            </motion.div>
                        )}


                        {/* 2. PREVIEW & SELECTION (New UI) */}
                        {appState === 'preview' && uploadedImage && (
                            <motion.div key="preview" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="flex flex-col lg:flex-row items-center lg:items-start gap-10 w-full max-w-5xl">

                                {/* Left: Source Image */}
                                <div className="flex flex-col items-center">
                                    <div className="bg-white p-4 pb-16 shadow-2xl w-[280px] rotate-[-2deg]">
                                        <img src={uploadedImage} className="w-full aspect-square object-cover bg-neutral-100" />
                                        <div className="absolute bottom-6 left-0 w-full text-center">
                                            <span className="text-black font-permanent-marker text-xl">My Face</span>
                                        </div>
                                    </div>
                                    <button onClick={handleReset} className="mt-4 text-neutral-400 hover:text-white font-permanent-marker text-sm underline">Change Photo</button>
                                </div>

                                {/* Right: Emoji Selection Panel */}
                                <div className="flex-1 w-full bg-neutral-900/50 backdrop-blur-md rounded-2xl border border-neutral-700 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-permanent-marker text-white">Choose Emojis <span className="text-yellow-400 text-lg ml-2">({selectedEmotions.length}/6)</span></h2>
                                        <button
                                            onClick={handleMakeEmojis}
                                            disabled={selectedEmotions.length === 0}
                                            className="px-6 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold font-permanent-marker rounded shadow-lg transform active:scale-95 transition-all"
                                        >
                                            GENERATE ✨
                                        </button>
                                    </div>

                                    {/* Category Tabs */}
                                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                        {Object.keys(EMOJI_CATEGORIES).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Emoji Grid */}
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {EMOJI_CATEGORIES[selectedCategory].map(item => {
                                            const isSelected = selectedEmotions.some(e => e.name === item.name);
                                            return (
                                                <button
                                                    key={item.name}
                                                    onClick={() => toggleEmotion(item)}
                                                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all border-2 relative
                                                        ${isSelected
                                                            ? 'bg-yellow-400/20 border-yellow-400 scale-105'
                                                            : 'bg-neutral-800 border-transparent hover:bg-neutral-700'
                                                        }`}
                                                >
                                                    <span className="text-3xl mb-1">{item.emoji}</span>
                                                    <span className={`text-[10px] font-bold ${isSelected ? 'text-yellow-400' : 'text-neutral-500'}`}>{item.name}</span>
                                                    {isSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <p className="mt-4 text-xs text-neutral-500 text-center">Select up to 6 emojis to generate your sticker pack.</p>
                                </div>
                            </motion.div>
                        )}


                        {/* 3. RESULTS (Updated to map selectedEmotions) */}
                        {(appState === 'generating' || appState === 'results') && (
                            <motion.div key="results" className="w-full flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center mb-12">
                                    {selectedEmotions.map((emotion, index) => {
                                        const item = generatedEmojis[emotion.name];
                                        const rotateDeg = (index % 3 === 0 ? -2 : index % 3 === 1 ? 2 : -1) * (index > 2 ? -1 : 1);

                                        return (
                                            <motion.div
                                                key={emotion.name}
                                                initial={{ opacity: 0, y: 50, rotate: 0 }}
                                                animate={{ opacity: 1, y: 0, rotate: rotateDeg }}
                                                transition={{ delay: index * 0.15, type: 'spring' }}
                                                className="bg-white p-5 pb-16 shadow-2xl w-[300px] hover:z-10 hover:scale-105 transition-transform duration-300 transform group relative"
                                            >
                                                <div className="bg-neutral-100 aspect-square w-full relative overflow-hidden flex items-center justify-center group-hover:bg-neutral-50 transition-colors">
                                                    {item?.status === 'pending' && <div className="flex flex-col items-center text-neutral-400"><Loader2 className="w-8 h-8 animate-spin mb-2" /><span className="text-sm">Creating...</span></div>}
                                                    {item?.status === 'error' && <div className="text-red-400">Failed</div>}
                                                    {item?.status === 'done' && item.url && <img src={item.url} className="w-full h-full object-cover" />}

                                                    {/* Individual Download Button Overlay */}
                                                    {item?.status === 'done' && item.url && (
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDownloadSingle(item.url!, emotion.name); }}
                                                                className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full shadow-lg backdrop-blur-sm"
                                                                title="Download Sticker"
                                                            >
                                                                <Download size={20} />
                                                            </button>
                                                        </div>
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
                                        <button onClick={handleReset} className="px-8 py-3 bg-transparent border-2 border-white rounded-none font-permanent-marker text-white text-lg hover:bg-white hover:text-black uppercase">Start Over</button>
                                        <button onClick={handleDownloadPack} className="px-8 py-3 bg-yellow-400 border-2 border-yellow-400 rounded-none font-permanent-marker text-black text-lg hover:bg-yellow-300 uppercase shadow-lg flex items-center gap-2"><Download className="w-5 h-5" /> Download Pack</button>
                                    </div>
                                )}
                            </motion.div>
                        )}


                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
