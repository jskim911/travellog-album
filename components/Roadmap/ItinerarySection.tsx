import React, { useState } from 'react';
import { Plus, MapPin, Calendar as CalendarIcon, Clock } from 'lucide-react';

export const ItinerarySection: React.FC = () => {
    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">상세 일정</h2>
                    <p className="text-sm text-slate-500 mt-1">날짜별 여행 코스를 계획해보세요.</p>
                </div>
                <button className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2">
                    <Plus size={16} />
                    새 일정 추가
                </button>
            </div>

            {/* Timeline Placeholder */}
            <div className="relative pl-8 border-l-2 border-slate-100 space-y-8">
                {[1, 2, 3].map((day) => (
                    <div key={day} className="relative">
                        {/* Day Marker */}
                        <div className="absolute -left-[41px] top-0 w-5 h-5 bg-violet-100 border-4 border-white ring-2 ring-violet-500 rounded-full" />

                        <div className="mb-4">
                            <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-md">
                                Day {day}
                            </span>
                            <h3 className="text-lg font-bold text-slate-800 mt-1">2024. 12. {14 + day}</h3>
                        </div>

                        {/* Activities */}
                        <div className="space-y-3">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-violet-200 transition-colors cursor-pointer group">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-white rounded-lg text-slate-400 group-hover:text-violet-500 transition-colors">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                <Clock size={12} /> 10:00 AM
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-800">랜드마크 방문</h4>
                                        <p className="text-sm text-slate-500 mt-1">여행의 시작</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
