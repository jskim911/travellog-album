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
        if (!roadmapRef.current) return;
        try {
            const canvas = await html2canvas(roadmapRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
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

    const handlePDFDownload = async () => {
        if (!roadmapRef.current) return;
        setIsGenerating(true);
        try {
            // 로드맵은 가로로 긴 형태이므로 landscape 설정
            const blob = await generatePDFFromElement(roadmapRef.current, `${itinerary.tripName}_roadmap.pdf`, {
                format: 'a4',
                orientation: 'landscape'
            });
            downloadPDF(blob, `${itinerary.tripName}_roadmap.pdf`);
        } catch (error) {
            console.error("PDF Download failed:", error);
            alert("PDF 저장 중 오류가 발생했습니다.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">{itinerary.tripName} 로드맵</h2>
                        <p className="text-slate-500 text-sm mt-1">전체 여행 일정을 한눈에 확인하세요.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePDFDownload}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white hover:bg-violet-700 rounded-xl font-bold transition-all text-sm disabled:opacity-70"
                        >
                            {isGenerating ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Download size={18} />
                            )}
                            PDF 저장
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-xl font-bold transition-all text-sm"
                        >
                            <Download size={18} />
                            이미지 저장
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-auto bg-slate-50 p-8" ref={roadmapRef}>
                    <div className="min-w-max mx-auto">
                        <div className="flex gap-8 relative">
                            {/* Connecting Line (Absolute) */}
                            <div className="absolute top-[60px] left-0 right-0 h-1 bg-violet-100 -z-0 rounded-full" />

                            {itinerary.routes.map((route, index) => (
                                <div key={route.id} className="w-72 flex-shrink-0 flex flex-col gap-6 relative z-10 group">

                                    {/* Day Header */}
                                    <div className="flex flex-col items-center">
                                        <div className="px-5 py-2 bg-violet-600 text-white font-bold rounded-full shadow-lg shadow-violet-200 mb-4 z-10 border-4 border-slate-50">
                                            Day {index + 1}
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-slate-800 text-lg">
                                                {new Date(new Date(itinerary.startDate).setDate(new Date(itinerary.startDate).getDate() + index)).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mt-1">
                                                {new Date(new Date(itinerary.startDate).setDate(new Date(itinerary.startDate).getDate() + index)).toLocaleDateString('en-US', { weekday: 'long' })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Places List */}
                                    <div className="space-y-3">
                                        {route.visitedPlaces && route.visitedPlaces.length > 0 ? (
                                            route.visitedPlaces.map((place, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-300 transition-all relative overflow-hidden group/card"
                                                >
                                                    {/* Connector Line to prev/next handled by CSS if needed, or simple stacking */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-violet-100 group-hover/card:bg-violet-400 transition-colors" />

                                                    <div className="pl-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                                                                {place.visitTime || 'Time --:--'}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-bold text-slate-800 leading-tight">
                                                            {place.name}
                                                        </h4>
                                                        {place.address && (
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                                {place.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center">
                                                <MapPin className="mx-auto text-slate-300 mb-2" size={24} />
                                                <p className="text-xs text-slate-400 font-medium">일정 없음</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-100 text-center text-xs text-slate-400">
                    TravelLog Album • Generated on {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};
