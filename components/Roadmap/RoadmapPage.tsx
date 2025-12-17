import React, { useState } from 'react';
import { Calendar, DollarSign, Map, Receipt, FileText } from 'lucide-react';
import { ItinerarySection } from './ItinerarySection';
import { ExpenseSection } from './ExpenseSection';
import { MaterialSection } from './MaterialSection';

interface RoadmapPageProps {
    isSmartphoneMode?: boolean;
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({ isSmartphoneMode = false }) => {
    const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'materials'>('itinerary');
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

    return (
        <div className={`max-w-6xl mx-auto px-4 py-8 ${isSmartphoneMode ? '' : ''}`}>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 mb-1 flex items-center gap-2">
                    <Map className="text-violet-600 w-6 h-6 sm:w-8 sm:h-8" />
                    여행 로드맵
                </h1>
                <p className="text-xs text-slate-500">여행 일정과 경비를 스마트하게 관리하세요.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6 w-full sm:w-fit overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab('itinerary')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg text-[10px] sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'itinerary'
                        ? 'bg-white text-violet-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
                    여행 일정
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg text-[10px] sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'expenses'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <DollarSign size={16} className="sm:w-[18px] sm:h-[18px]" />
                    비용 관리
                </button>
                <button
                    onClick={() => setActiveTab('materials')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg text-[10px] sm:text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'materials'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                    자료 보관함
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] p-6 sm:p-8">
                {activeTab === 'itinerary' ? (
                    <ItinerarySection
                        selectedTripId={selectedTripId}
                        onSelectTrip={setSelectedTripId}
                    />
                ) : activeTab === 'expenses' ? (
                    <ExpenseSection
                        selectedTripId={selectedTripId}
                        isCompact={isSmartphoneMode}
                    />
                ) : (
                    <MaterialSection
                        selectedTripId={selectedTripId}
                    />
                )}
            </div>
        </div>
    );
};
