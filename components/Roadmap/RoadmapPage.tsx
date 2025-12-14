import React, { useState } from 'react';
import { Calendar, DollarSign, Map, Receipt } from 'lucide-react';
import { ItinerarySection } from './ItinerarySection';
import { ExpenseSection } from './ExpenseSection';

export const RoadmapPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses'>('itinerary');

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                    <Map className="text-violet-600" />
                    여행 로드맵
                </h1>
                <p className="text-slate-500">여행 일정과 경비를 스마트하게 관리하세요.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-8 w-full sm:w-fit">
                <button
                    onClick={() => setActiveTab('itinerary')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'itinerary'
                            ? 'bg-white text-violet-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Calendar size={18} />
                    여행 일정
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses'
                            ? 'bg-white text-emerald-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <DollarSign size={18} />
                    비용 관리
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[600px] p-6 sm:p-8">
                {activeTab === 'itinerary' ? (
                    <ItinerarySection />
                ) : (
                    <ExpenseSection />
                )}
            </div>
        </div>
    );
};
