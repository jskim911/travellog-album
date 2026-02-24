import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MapPin, Camera, Plane } from 'lucide-react';

const SLIDE_IMAGES = [
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop", // Lake/Mountain
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop", // Beach
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop", // Kyoto
    "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?q=80&w=2070&auto=format&fit=crop", // London
    "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1972&auto=format&fit=crop"  // Italy
];

const FEATURES = [
    { icon: <MapPin size={16} />, text: "위치 기반 자동 분류" },
    { icon: <Sparkles size={16} />, text: "AI 영감 캡션 생성" },
    { icon: <Camera size={16} />, text: "고화질 무제한 업로드" }
];

export const HeroBanner: React.FC = () => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % SLIDE_IMAGES.length);
        }, 5000); // 5 seconds interval
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full overflow-hidden rounded-[2.5rem] shadow-2xl h-[400px] sm:h-[450px]">
            {/* Background Image Slide */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0"
                >
                    <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${SLIDE_IMAGES[currentImageIndex]})` }}
                    />
                    {/* Enhanced Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-violet-900/60 to-transparent" />
                </motion.div>
            </AnimatePresence>

            {/* Content Section */}
            <div className="absolute inset-0 z-10 p-8 sm:p-12 flex flex-col justify-between">
                <div className="max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6"
                    >
                        <Sparkles size={14} className="text-yellow-300" />
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Premium Travel Log</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-4xl lg:text-5xl font-black text-white mb-4 leading-[1.1] tracking-tight break-keep"
                    >
                        여행의 흔적을 <br />
                        <span className="text-sky-300">작품</span>으로 만드세요
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-white/80 text-lg font-medium max-w-sm leading-relaxed"
                    >
                        단순한 사진 저장을 넘어, <br />
                        여행의 가치를 담는 특별한 공간입니다.
                    </motion.p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                    {FEATURES.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-white/90 font-bold text-sm bg-black/20 backdrop-blur-md border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors group">
                            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-sky-300 group-hover:scale-110 transition-transform">
                                {item.icon}
                            </div>
                            <span>{item.text}</span>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Slider Indicators */}
            <div className="absolute bottom-12 right-12 z-20 flex gap-1.5">
                {SLIDE_IMAGES.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentImageIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${currentImageIndex === i ? 'bg-white w-6' : 'bg-white/30'}`}
                    />
                ))}
            </div>
        </div>
    );
};
