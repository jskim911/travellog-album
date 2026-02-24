import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plane } from 'lucide-react';

interface WelcomeBannerProps {
    userName: string;
    appName?: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
    userName,
    appName = "TravelLog"
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full mb-8"
        >
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-400 p-8 sm:p-10 shadow-xl shadow-indigo-200">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <Plane size={200} className="rotate-12" />
                </div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white/90 text-sm font-bold mb-4"
                        >
                            <Sparkles size={14} className="text-yellow-300" />
                            <span>환영합니다</span>
                        </motion.div>

                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight break-keep">
                            <span className="text-indigo-100">{userName}</span>님, <br className="sm:hidden" />
                            {appName}에서 <br />
                            소중한 순간을 기록하세요
                        </h2>

                        <p className="mt-4 text-white/80 text-base sm:text-lg max-w-xl font-medium leading-relaxed">
                            당신의 여행 이야기가 기록될 준비가 되었습니다. <br />
                            오늘 어떤 멋진 장소를 다녀오셨나요?
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[100px] shadow-lg">
                            <span className="text-2xl mb-1">📸</span>
                            <span className="text-xs text-white/70 font-bold uppercase tracking-wider">Moments</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[100px] shadow-lg">
                            <span className="text-2xl mb-1">🗺️</span>
                            <span className="text-xs text-white/70 font-bold uppercase tracking-wider">Places</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
