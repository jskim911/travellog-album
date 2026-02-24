import React, { useRef, useEffect } from 'react';
import { X, Calendar, Download, MapPin } from 'lucide-react';
import { Itinerary } from '../../types';
import html2canvas from 'html2canvas';
import { generatePDFFromElement, downloadPDF } from '../../src/utils/pdfGenerator';

interface RoadmapVisualizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    itinerary: Itinerary | null;
}

export const RoadmapVisualizationModal: React.FC<RoadmapVisualizationModalProps> = ({ isOpen, onClose, itinerary }) => {
    const roadmapRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);

    if (!isOpen || !itinerary) return null;

    const handleDownload = async () => {
        if (!roadmapRef.current || !itinerary) return;
        try {
            const contentWidth = roadmapRef.current.scrollWidth;
            const canvas = await html2canvas(roadmapRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                width: contentWidth,
                windowWidth: contentWidth,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.querySelector('[data-capture-area]') as HTMLElement;
                    if (el) {
                        el.style.paddingLeft = '24px';
                        el.style.paddingRight = '24px';
                        el.style.width = `${contentWidth}px`;
                    }
                }
            });
            const link = document.createElement('a');
            link.download = `${itinerary.tripName}_roadmap.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error("Download failed:", error);
            alert("이미지 저장 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-[95vw] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative" ref={roadmapRef} data-capture-area>
                {/* Close Button - Floating at top right */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-20"
                >
                    <X size={20} />
                </button>

                {/* Header - Centered & Premium */}
                <div className="flex flex-col items-center justify-center p-6 border-b border-slate-100 bg-white z-10 text-center">
                    <div className="mb-4">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900">{itinerary.tripName} 로드맵</h2>
                        <p className="text-slate-500 text-xs sm:text-sm mt-1">전체 여행 일정을 한눈에 확인하고 추억을 소장하세요.</p>
                    </div>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white hover:bg-violet-700 rounded-2xl font-black transition-all text-xs sm:text-sm shadow-lg shadow-violet-100 hover:shadow-violet-200 active:scale-95"
                    >
                        <Download size={18} />
                        로드맵 이미지 저장
                    </button>
                </div>

                {/* Content - Scrollable & Zero Dead-Space */}
                <div className="flex-1 overflow-auto bg-slate-50/30 px-2 py-4 custom-scrollbar" data-roadmap-content>
                    <div className="flex min-w-max justify-center p-1">
                        <div className="inline-flex gap-2 sm:gap-3 relative py-2">
                            {/* Connecting Line (Absolute) */}
                            <div className="absolute top-[52px] left-[60px] right-[60px] h-0.5 bg-violet-100/80 -z-0 hidden sm:block" />

                            {itinerary.routes.map((route, index) => (
                                <div key={route.id} className="min-w-[135px] max-w-[260px] w-fit flex-shrink-0 flex flex-col gap-4 relative z-10 group">
                                    {/* Day Header Wrapper */}
                                    <div className="flex flex-col items-center relative">
                                        {/* Day Pill - 배경색을 채워 라인을 자연스럽게 가림 */}
                                        <div className="px-5 py-2 bg-violet-600 text-white font-black rounded-full shadow-lg shadow-violet-100 mb-3 z-10 border-[3px] border-white transform transition-all duration-300 group-hover:scale-105">
                                            Day {index + 1}
                                        </div>
                                        <div className="text-center group-hover:translate-y-[-1px] transition-transform duration-300 px-2">
                                            <p className="font-black text-slate-800 text-base sm:text-lg leading-tight break-keep">
                                                {new Date(new Date(itinerary.startDate).setDate(new Date(itinerary.startDate).getDate() + index)).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 opacity-80">
                                                {new Date(new Date(itinerary.startDate).setDate(new Date(itinerary.startDate).getDate() + index)).toLocaleDateString('en-US', { weekday: 'long' })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Places List */}
                                    <div className="space-y-2 px-0.5">
                                        {route.visitedPlaces && route.visitedPlaces.length > 0 ? (
                                            route.visitedPlaces.map((place, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-6px_rgba(124,58,237,0.12)] hover:border-violet-200 transition-all duration-500 relative overflow-hidden group/card flex flex-col"
                                                >
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-50 group-hover/card:bg-violet-500 transition-all duration-500" />

                                                    <div className="pl-2">
                                                        <div className="flex items-center gap-2 mb-1 px-0.5">
                                                            <span className="text-[9px] font-black text-violet-500 bg-violet-50/50 px-1.5 py-0.5 rounded-md border border-violet-100/50">
                                                                {place.visitTime || '--:--'}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-black text-slate-800 leading-[1.3] text-[14px] sm:text-[15px] break-words">
                                                            {place.name}
                                                        </h4>
                                                        {place.address && (
                                                            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                                                                {place.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-5 border-2 border-dashed border-slate-100 rounded-2xl text-center bg-slate-50/30">
                                                <MapPin className="mx-auto text-slate-200 mb-1 opacity-50" size={16} />
                                                <p className="text-[10px] text-slate-300 font-bold">일정 없음</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer - Minimalized */}
                <div className="p-3 bg-white border-t border-slate-100 text-center text-[10px] text-slate-300 font-bold tracking-tight">
                    TravelLog Album • Generated on {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};
