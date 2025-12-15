/**
 * Emoji Me - 3D Sticker Pack Generator
 * Polaroid-style design with realistic 3D emoji generation
 */
import React, { useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Download, Loader2 } from 'lucide-react';
import { generateEmojiImage } from '../src/utils/gemini';

// 6개의 감정 이모지 (실물 모양 3D 스타일)
const EMOTIONS = [
    { name: 'Happy', emoji: '😊', description: 'Smiling with joy' },
    { name: 'Love', emoji: '😍', description: 'Heart eyes with love' },
    { name: 'Surprised', emoji: '😲', description: 'Wide-eyed surprise' },
    { name: 'Wink', emoji: '😉', description: 'Playful wink' },
    { name: 'Laughing', emoji: '😂', description: 'Tears of joy' },
    { name: 'Cool', emoji: '😎', description: 'Cool with sunglasses' },
];

type ImageStatus = 'pending' | 'done' | 'error';

interface GeneratedEmoji {
    status: ImageStatus;
    url?: string;
    error?: string;
}

const EmojiMeApp: React.FC = () => {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedEmojis, setGeneratedEmojis] = useState<Record<string, GeneratedEmoji>>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [appState, setAppState] = useState<'upload' | 'preview' | 'generating' | 'results'>('upload');

    // 이미지 업로드 핸들러
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

    // 이모지 생성 핸들러
    const handleMakeEmojis = async () => {
        if (!uploadedImage) return;

        setIsGenerating(true);
        setAppState('generating');

        // 초기 상태 설정
        const initialEmojis: Record<string, GeneratedEmoji> = {};
        EMOTIONS.forEach(emotion => {
            initialEmojis[emotion.name] = { status: 'pending' };
        });
        setGeneratedEmojis(initialEmojis);

        // 동시 생성 제한 (2개씩)
        const concurrencyLimit = 2;
        const queue = [...EMOTIONS];

        const processEmotion = async (emotion: typeof EMOTIONS[0]) => {
            try {
                // 실물 모양 3D 이모지 프롬프트
                const prompt = `Create a highly realistic 3D character emoji based on this person's face.
Style: Pixar/Disney 3D animation style with realistic features
Emotion: ${emotion.description} (${emotion.emoji})
Requirements:
- Keep the person's actual facial features (glasses, hair, face shape)
- Make it look like a real 3D rendered character
- Expression should clearly show "${emotion.name}" emotion
- Clean, professional 3D render quality
- Soft, pleasant lighting
- Simple gradient or solid color background that matches the emotion
- The character should look friendly and approachable`;

                const resultUrl = await generateEmojiImage(uploadedImage, prompt);

                setGeneratedEmojis(prev => ({
                    ...prev,
                    [emotion.name]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '생성 실패';
                setGeneratedEmojis(prev => ({
                    ...prev,
                    [emotion.name]: { status: 'error', error: errorMessage },
                }));
                console.error(`Failed to generate ${emotion.name}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (queue.length > 0) {
                const emotion = queue.shift();
                if (emotion) {
                    await processEmotion(emotion);
                }
            }
        });

        await Promise.all(workers);
        setIsGenerating(false);
        setAppState('results');
    };

    // 스티커 팩 다운로드
    const handleDownloadPack = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Polaroid 스타일 레이아웃 (3x2 그리드)
        const polaroidWidth = 400;
        const polaroidHeight = 480;
        const imageSize = 360;
        const padding = 30;
        const cols = 3;
        const rows = 2;

        canvas.width = (polaroidWidth + padding) * cols + padding;
        canvas.height = (polaroidHeight + padding) * rows + padding;

        // 배경
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const loadImage = (src: string): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        };

        let index = 0;
        for (const emotion of EMOTIONS) {
            const emoji = generatedEmojis[emotion.name];
            if (emoji?.status === 'done' && emoji.url) {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const x = padding + col * (polaroidWidth + padding);
                const y = padding + row * (polaroidHeight + padding);

                try {
                    // Polaroid 배경
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, y, polaroidWidth, polaroidHeight);

                    // 이미지
                    const img = await loadImage(emoji.url);
                    const imgX = x + (polaroidWidth - imageSize) / 2;
                    const imgY = y + 20;
                    ctx.drawImage(img, imgX, imgY, imageSize, imageSize);

                    // 캡션
                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 32px "Permanent Marker", cursive';
                    ctx.textAlign = 'center';
                    ctx.fillText(emotion.name, x + polaroidWidth / 2, y + polaroidHeight - 30);
                } catch (error) {
                    console.error(`Failed to load ${emotion.name}:`, error);
                }
                index++;
            }
        }

        // 다운로드
        canvas.toBlob(blob => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'emoji-me-sticker-pack.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        });
    };

    // 다시 시작
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedEmojis({});
        setAppState('upload');
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* 배경 그리드 */}
            <div className="absolute inset-0 bg-grid-white/[0.02]" />

            {/* 헤더 */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8 z-10"
            >
                <h1 className="text-7xl md:text-8xl font-caveat font-bold text-yellow-400 mb-2">
                    Emoji Me
                </h1>
                <p className="text-xl md:text-2xl font-permanent-marker text-neutral-300 tracking-wide">
                    Turn your face into a 3D Sticker Pack.
                </p>
            </motion.div>

            {/* 메인 컨텐츠 */}
            <div className="z-10 w-full max-w-6xl">
                <AnimatePresence mode="wait">
                    {/* 업로드 상태 */}
                    {appState === 'upload' && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex justify-center"
                        >
                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer group"
                            >
                                {/* Polaroid 카드 */}
                                <div className="bg-white rounded-lg p-6 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:rotate-2 w-80 md:w-96">
                                    <div className="bg-neutral-800 rounded aspect-square flex flex-col items-center justify-center mb-4">
                                        <Camera className="w-16 h-16 text-neutral-600 mb-4" />
                                        <p className="text-neutral-500 font-permanent-marker text-lg">
                                            Upload Photo
                                        </p>
                                    </div>
                                    <p className="text-center text-black font-permanent-marker text-2xl">
                                        Click to start
                                    </p>
                                </div>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </motion.div>
                    )}

                    {/* 미리보기 상태 */}
                    {appState === 'preview' && uploadedImage && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center gap-6"
                        >
                            {/* Polaroid 카드 */}
                            <div className="bg-white rounded-lg p-6 shadow-2xl w-80 md:w-96">
                                <img
                                    src={uploadedImage}
                                    alt="Your Selfie"
                                    className="w-full aspect-square object-cover rounded mb-4"
                                />
                                <p className="text-center text-black font-permanent-marker text-2xl">
                                    Your Selfie
                                </p>
                            </div>

                            {/* 버튼 */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleReset}
                                    className="font-permanent-marker text-xl px-8 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/80 rounded-sm hover:bg-white hover:text-black transition-all transform hover:scale-105 hover:rotate-2"
                                >
                                    Different Photo
                                </button>
                                <button
                                    onClick={handleMakeEmojis}
                                    className="font-permanent-marker text-xl px-8 py-3 bg-yellow-400 text-black rounded-sm hover:bg-yellow-300 transition-all transform hover:scale-105 hover:-rotate-2 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]"
                                >
                                    Make Emojis
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* 생성 중 / 결과 상태 */}
                    {(appState === 'generating' || appState === 'results') && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-8"
                        >
                            {/* Polaroid 그리드 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
                                {EMOTIONS.map((emotion, index) => {
                                    const emoji = generatedEmojis[emotion.name];
                                    const rotation = (index % 3 - 1) * 3; // -3, 0, 3 degrees

                                    return (
                                        <motion.div
                                            key={emotion.name}
                                            initial={{ opacity: 0, y: 50, rotate: 0 }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                rotate: rotation,
                                            }}
                                            transition={{
                                                delay: index * 0.15,
                                                type: 'spring',
                                                stiffness: 100,
                                            }}
                                            className="relative"
                                        >
                                            {/* Polaroid 카드 */}
                                            <div className="bg-white rounded-lg p-6 shadow-2xl w-72 transform transition-all duration-300 hover:scale-105 hover:z-10">
                                                <div className="bg-neutral-100 rounded aspect-square flex items-center justify-center mb-4 overflow-hidden relative">
                                                    {emoji?.status === 'pending' && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-200">
                                                            <Loader2 className="w-12 h-12 text-neutral-600 animate-spin mb-2" />
                                                            <p className="text-neutral-600 font-permanent-marker text-sm">
                                                                Creating...
                                                            </p>
                                                        </div>
                                                    )}

                                                    {emoji?.status === 'done' && emoji.url && (
                                                        <img
                                                            src={emoji.url}
                                                            alt={emotion.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}

                                                    {emoji?.status === 'error' && (
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-100">
                                                            <p className="text-red-600 font-permanent-marker text-sm text-center px-4">
                                                                Failed to generate
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 캡션 */}
                                                <p className="text-center text-black font-permanent-marker text-2xl">
                                                    {emotion.name}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* 하단 버튼 */}
                            {appState === 'results' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.9 }}
                                    className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8"
                                >
                                    <button
                                        onClick={handleDownloadPack}
                                        className="font-permanent-marker text-xl px-8 py-4 bg-yellow-400 text-black rounded-sm hover:bg-yellow-300 transition-all transform hover:scale-105 hover:-rotate-2 shadow-[4px_4px_0px_2px_rgba(0,0,0,0.2)]"
                                    >
                                        Download Sticker Pack
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="font-permanent-marker text-xl px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/80 rounded-sm hover:bg-white hover:text-black transition-all transform hover:scale-105 hover:rotate-2"
                                    >
                                        Start Over
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 푸터 */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute bottom-4 text-neutral-500 text-sm z-10"
            >
                <p>Created with ❤️ using AI</p>
            </motion.div>
        </div>
    );
};

export default EmojiMeApp;
