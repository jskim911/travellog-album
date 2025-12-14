import React, { useState } from 'react';
import { MapPin, Calendar, ArrowRight, Plus } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface RouteData {
    from: string;
    to: string;
    startDate: string;
    endDate: string;
}

export const RouteInput: React.FC = () => {
    const [routes, setRoutes] = useState<RouteData[]>([
        { from: '', to: '', startDate: '', endDate: '' }
    ]);

    const addRoute = () => {
        setRoutes([...routes, { from: '', to: '', startDate: '', endDate: '' }]);
    };

    const updateRoute = (index: number, field: keyof RouteData, value: string) => {
        const newRoutes = [...routes];
        newRoutes[index] = { ...newRoutes[index], [field]: value };
        setRoutes(newRoutes);
    };

    return (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MapPin className="text-violet-500" />
                여행 루트 설정
            </h3>

            <div className="space-y-4">
                {routes.map((route, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="w-full sm:w-auto flex items-center gap-3 flex-1">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-400 mb-1">출발지</label>
                                <input
                                    type="text"
                                    value={route.from}
                                    onChange={(e) => updateRoute(index, 'from', e.target.value)}
                                    className="w-full text-sm font-bold text-slate-900 border-b-2 border-slate-100 focus:border-violet-500 outline-none transition-colors bg-transparent placeholder-slate-300"
                                    placeholder="예: 서울"
                                />
                            </div>
                            <ArrowRight size={20} className="text-slate-300" />
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-400 mb-1">도착지</label>
                                <input
                                    type="text"
                                    value={route.to}
                                    onChange={(e) => updateRoute(index, 'to', e.target.value)}
                                    className="w-full text-sm font-bold text-slate-900 border-b-2 border-slate-100 focus:border-violet-500 outline-none transition-colors bg-transparent placeholder-slate-300"
                                    placeholder="예: 파리"
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-auto h-px sm:h-12 bg-slate-100 mx-2" />

                        <div className="w-full sm:w-auto flex items-center gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">가는 날</label>
                                <input
                                    type="date"
                                    value={route.startDate}
                                    onChange={(e) => updateRoute(index, 'startDate', e.target.value)}
                                    className="text-sm font-medium text-slate-600 bg-slate-50 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-violet-200"
                                />
                            </div>
                            <span className="text-slate-300">-</span>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">오는 날</label>
                                <input
                                    type="date"
                                    value={route.endDate}
                                    onChange={(e) => updateRoute(index, 'endDate', e.target.value)}
                                    className="text-sm font-medium text-slate-600 bg-slate-50 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-violet-200"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addRoute}
                className="mt-4 px-4 py-2 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors flex items-center gap-2"
            >
                <Plus size={16} />
                구간 추가하기
            </button>
        </div>
    );
};
