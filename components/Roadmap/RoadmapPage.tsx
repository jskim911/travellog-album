import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Map, FileText } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { Itinerary } from '../../types';
import { ItinerarySection } from './ItinerarySection';
import { ExpenseSection } from './ExpenseSection';
import { MaterialSection } from './MaterialSection';

interface RoadmapPageProps {
    isSmartphoneMode?: boolean;
    selectedTripId: string | null;
    onSelectTrip: (id: string | null) => void;
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({
    isSmartphoneMode = false,
    selectedTripId,
    onSelectTrip
}) => {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'materials'>('itinerary');
    const [allTrips, setAllTrips] = useState<Itinerary[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch All Itineraries & Auto-select Logic
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'itineraries'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const trips = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
                        endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
                    } as Itinerary;
                });

                // Sort by startDate descending (newest first)
                trips.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
                setAllTrips(trips);

                // AUTO SELECT LOGIC:
                // If no trip is selected, automatically select the most recent one.
                if (!selectedTripId && trips.length > 0) {
                    onSelectTrip(trips[0].id);
                }
            } else {
                setAllTrips([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching itineraries:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, selectedTripId, onSelectTrip]);

    const selectedTrip = (allTrips && Array.isArray(allTrips)) ? allTrips.find(t => t.id === selectedTripId) || null : null;

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
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'itinerary' ? (
                            <ItinerarySection
                                selectedTripId={selectedTripId}
                                selectedTrip={selectedTrip}
                                onSelectTrip={onSelectTrip}
                                isSmartphoneMode={isSmartphoneMode}
                                allTrips={allTrips}
                            />
                        ) : activeTab === 'expenses' ? (
                            <ExpenseSection
                                selectedTripId={selectedTripId}
                                selectedTrip={selectedTrip}
                                isCompact={isSmartphoneMode}
                            />
                        ) : (
                            <MaterialSection
                                selectedTripId={selectedTripId}
                                isSmartphoneMode={isSmartphoneMode}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
