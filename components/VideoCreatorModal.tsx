import React, { useState, useRef, useEffect } from 'react';
import { X, Video, Download, Music, Loader2, PlayCircle, PauseCircle } from 'lucide-react';
import { Album } from '../types';

interface VideoCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedAlbums: Album[];
}

const MUSIC_OPTIONS = [
    { id: 'upbeat', label: '신나는 여행 (Upbeat)', url: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_febc508520.mp3?filename=uplifting-future-bass-113068.mp3' },
    { id: 'chill', label: '편안한 휴식 (Chill)', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3' },
    { id: 'piano', label: '감성 피아노 (Piano)', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Touching%20Moments%20One%20-%20Pulse.mp3' },
    { id: 'cinematic', label: '웅장한 영화처럼 (Cinematic)', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Impact%20Prelude.mp3' },
    { id: 'acoustic', label: '어쿠스틱 감성 (Acoustic)', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Meditation%20Impromptu%2002.mp3' },
    { id: 'jazz', label: '부드러운 재즈 (Jazz)', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/George%20Street%20Shuffle.mp3' },
    { id: 'ambient', label: '몽환적인 분위기 (Ambient)', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Sky%20of%20our%20Ancestors.mp3' },
    { id: 'happy', label: '행복한 순간 (Happy)', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wholesome.mp3' },
    { id: 'nature', label: '자연의 소리 (Healing)', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Healing.mp3' },
    { id: 'summer', label: '여름 바캉스 (Fun)', url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3' },
];

export const VideoCreatorModal: React.FC<VideoCreatorModalProps> = ({ isOpen, onClose, selectedAlbums }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
    const [selectedMusic, setSelectedMusic] = useState(MUSIC_OPTIONS[0]);
    const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
    const [previewingId, setPreviewingId] = useState<string | null>(null);

    // Stop preview when modal closes
    useEffect(() => {
        if (!isOpen && previewAudio) {
            previewAudio.pause();
            setPreviewingId(null);
        }
    }, [isOpen, previewAudio]);

    const togglePreview = (e: React.MouseEvent, music: { id: string, url: string }) => {
        e.stopPropagation();
        if (previewingId === music.id) {
            previewAudio?.pause();
            setPreviewingId(null);
        } else {
            previewAudio?.pause();
            const audio = new Audio(music.url);
            audio.volume = 0.5;
            audio.onended = () => setPreviewingId(null);
            audio.play().catch(err => console.error("Preview error", err));
            setPreviewAudio(audio);
            setPreviewingId(music.id);
        }
    };

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setResultVideoUrl(null);
            setProgress(0);
            setIsProcessing(false);
        }
    }, [isOpen]);

    const loadImage = async (url: string): Promise<HTMLImageElement> => {
        try {
            // Fetch as blob via proxy to avoid Tainted Canvas issues completely
            const proxiedUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
            const response = await fetch(proxiedUrl);
            if (!response.ok) throw new Error("Fetch failed");
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = (e) => reject(e);
                img.src = objectUrl;
            });
        } catch (e) {
            console.error("Image load failed", e);
            throw e;
        }
    };

    const createVideo = async () => {
        if (!canvasRef.current || selectedAlbums.length === 0) return;

        setIsProcessing(true);
        setProgress(0);
        setResultVideoUrl(null);
        chunksRef.current = [];

        try {
            // 1. Load all images
            const images: HTMLImageElement[] = [];
            for (let i = 0; i < selectedAlbums.length; i++) {
                try {
                    // Use a proxy or ensure CORS is set. Assuming CORS is fine for now or handled by browser cache sometimes.
                    // Note: Firebase Storage needs CORS configuration for this to work perfectly.
                    const img = await loadImage(selectedAlbums[i].coverUrl);
                    images.push(img);
                    setProgress(((i + 1) / selectedAlbums.length) * 30);
                } catch (e) {
                    console.error("Failed to load image", e);
                }
            }

            if (images.length === 0) throw new Error("No images loaded");

            // 2. Setup Audio
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            const dest = audioContext.createMediaStreamDestination();

            try {
                // Fetch audio data directly using Web Audio API to avoid HTMLAudioElement CORS/Source restrictions
                // This is much more robust for mixing audio into MediaRecorder
                const isCustom = selectedMusic.url.startsWith("blob:");
                const proxiedAudioUrl = isCustom
                    ? selectedMusic.url
                    : "https://corsproxy.io/?" + encodeURIComponent(selectedMusic.url);

                const response = await fetch(proxiedAudioUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const audioSource = audioContext.createBufferSource();
                audioSource.buffer = audioBuffer;
                audioSource.loop = true; // Loop music if video is longer
                audioSource.connect(dest);
                audioSource.connect(audioContext.destination); // Play to speakers (user hears music during creation)
                audioSource.start(0);
            } catch (audioError) {
                console.warn("Audio setup failed (fetch/decode):", audioError);
                alert("배경음악을 불러오지 못했습니다. 소리 없는 영상으로 만들어집니다.");
                // Continue without audio setup
            }

            // 3. Setup Canvas & Recorder
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d')!;
            const canvasStream = canvas.captureStream(30); // 30 FPS

            // Combine audio and video
            const combinedTracks = [
                ...canvasStream.getVideoTracks(),
                ...dest.stream.getAudioTracks()
            ];
            const combinedStream = new MediaStream(combinedTracks);

            // Determine supported MIME type
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm'; // Fallback
            }
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4'; // Safari fallback
                else mimeType = ''; // Browser default
            }

            const mediaRecorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
                const url = URL.createObjectURL(blob);
                setResultVideoUrl(url);
                setIsProcessing(false);
                // Stop all tracks
                combinedStream.getTracks().forEach(track => track.stop());
                audioContext.close();
            };

            mediaRecorder.start(1000); // Request data every 1 second to ensure chunks are generated

            // 4. Animation Loop
            const DURATION_PER_IMAGE = 3000; // 3 seconds
            const FADE_DURATION = 800;
            const TOTAL_DURATION = images.length * DURATION_PER_IMAGE;
            let startTime = performance.now();

            const draw = (timestamp: number) => {
                const elapsed = timestamp - startTime;

                if (elapsed >= TOTAL_DURATION) {
                    mediaRecorder.stop();
                    return;
                }

                let currentIndex = Math.floor(elapsed / DURATION_PER_IMAGE);
                // Safety clamp to prevent out of bounds if elapsed is slightly larger than expected before the stop check
                currentIndex = Math.min(currentIndex, images.length - 1);

                const nextIndex = (currentIndex + 1) % images.length;
                const imageTime = elapsed % DURATION_PER_IMAGE;

                // Draw current image
                const currentImg = images[currentIndex];
                if (!currentImg) return; // Safeguard

                // Calculate aspect ratio fit
                const scale = Math.max(canvas.width / currentImg.width, canvas.height / currentImg.height);
                const x = (canvas.width - currentImg.width * scale) / 2;
                const y = (canvas.height - currentImg.height * scale) / 2;

                ctx.globalAlpha = 1;
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Slight zoom effect
                const zoom = 1 + (imageTime / DURATION_PER_IMAGE) * 0.05;

                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.scale(zoom, zoom);
                ctx.translate(-canvas.width / 2, -canvas.height / 2);
                ctx.drawImage(currentImg, x, y, currentImg.width * scale, currentImg.height * scale);
                ctx.restore();

                // Crossfade to next if close to end ? 
                // For simplicity, let's just do hard cuts or simple fades.
                // Let's do a simple fade in/out is tricky with sequential drawing.
                // We implemented zoom above.

                // Progress bar update
                setProgress(30 + (elapsed / TOTAL_DURATION) * 70);

                requestAnimationFrame(draw);
            };

            requestAnimationFrame(draw);

        } catch (error) {
            console.error(error);
            setIsProcessing(false);
            alert("비디오 생성 중 오류가 발생했습니다. 상세 정보: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600">
                            <Video size={18} />
                        </div>
                        <h2 className="text-xl font-bold text-zinc-900">AI 여행 무비 메이커</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {!resultVideoUrl ? (
                        <div className="space-y-6">
                            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                                <h3 className="text-sm font-semibold text-zinc-700 mb-3">선택된 추억들 ({selectedAlbums.length})</h3>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                    {selectedAlbums.map((album, idx) => (
                                        <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-zinc-200">
                                            <img src={album.coverUrl} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/10" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                                    <Music size={16} /> 배경 음악 선택
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {MUSIC_OPTIONS.map((music) => (
                                        <div
                                            key={music.id}
                                            onClick={() => setSelectedMusic(music)}
                                            className={`
                        p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all
                        ${selectedMusic.id === music.id
                                                    ? 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500'
                                                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                                                }
                      `}
                                        >
                                            <span className="font-medium text-sm">{music.label}</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => togglePreview(e, music)}
                                                    className="p-1 hover:bg-black/5 rounded-full text-zinc-500 hover:text-violet-600 transition-colors"
                                                >
                                                    {previewingId === music.id ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Custom Music Upload */}
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`
                                            p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all border-dashed
                                            ${selectedMusic.id === 'custom'
                                                ? 'border-violet-500 bg-violet-50 text-violet-700 ring-1 ring-violet-500'
                                                : 'border-zinc-300 hover:border-violet-400 hover:bg-zinc-50 text-zinc-600'
                                            }
                                        `}
                                    >
                                        <span className="font-medium text-sm flex items-center gap-2">
                                            {selectedMusic.id === 'custom' ? `🎵 ${selectedMusic.label}` : '+ 내 음악 업로드 (MP3)'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {selectedMusic.id === 'custom' && (
                                                <button
                                                    onClick={(e) => togglePreview(e, selectedMusic)}
                                                    className="p-1 hover:bg-black/5 rounded-full text-zinc-500 hover:text-violet-600 transition-colors"
                                                >
                                                    {previewingId === 'custom' ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                                                </button>
                                            )}
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const url = URL.createObjectURL(file);
                                                        setSelectedMusic({ id: 'custom', label: file.name, url });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Hidden Canvas */}
                            {/* Hidden Canvas */}
                            {/* Hidden Canvas - On-screen but invisible (opacity 0) is SAFEST for captureStream */}
                            <canvas
                                ref={canvasRef}
                                width={1280}
                                height={720}
                                className="fixed top-0 left-0 pointer-events-none opacity-0"
                                style={{ zIndex: -1, visibility: 'visible' }}
                            />

                            <div className="pt-4">
                                {isProcessing ? (
                                    <div className="space-y-3">
                                        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-violet-600 transition-all duration-300 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <p className="text-center text-sm text-zinc-500 font-medium animate-pulse">
                                            여행의 순간들을 엮는 중... {Math.round(progress)}%
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={createVideo}
                                        className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                                    >
                                        <Video size={20} />
                                        <span>추억 비디오 만들기</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 text-center animate-in zoom-in-50 duration-300">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Video size={32} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-zinc-900">비디오가 완성되었습니다!</h3>
                                <p className="text-zinc-500 mt-1">당신의 여행 기록이 멋진 영상으로 다시 태어났어요.</p>
                            </div>

                            <div className="rounded-xl overflow-hidden border border-zinc-200 shadow-sm bg-black">
                                <video
                                    src={resultVideoUrl}
                                    controls
                                    className="w-full aspect-video"
                                />
                            </div>

                            <a
                                href={resultVideoUrl}
                                download="my-travel-log-movie.webm"
                                className="block w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={20} />
                                <span>비디오 저장하기</span>
                            </a>

                            <button
                                onClick={() => setResultVideoUrl(null)}
                                className="text-zinc-500 text-sm hover:underline"
                            >
                                다시 만들기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
