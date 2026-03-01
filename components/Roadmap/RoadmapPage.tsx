import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Map, FileText, ArrowLeft } from 'lucide-react';
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
    onBack?: () => void;
    activeTab: 'itinerary' | 'expenses' | 'materials';
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({
    isSmartphoneMode = false,
    selectedTripId,
    onSelectTrip,
    onBack,
    activeTab
}) => {
    const { user, loading: authLoading } = useAuth();
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

                // Auto-select logic: if no trip is selected, or if the selectedTripId is invalid for this user
                if (trips.length > 0) {
                    const isIdValid = trips.some(t => t.id === selectedTripId);
                    if (!selectedTripId || !isIdValid) {
                        onSelectTrip(trips[0].id);
                    }
                }
            } else {
                setAllTrips([]);
                if (selectedTripId) onSelectTrip(null);
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
        <div className={`max-w-6xl mx-auto px-4 py-8 ${isSmartphoneMode ? 'pb-24' : ''}`}>
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 rounded-2xl transition-all shadow-sm group"
                        title="갤러리로 돌아가기"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                )}
                <div>
                    <h1 className="text-xl sm:text-3xl font-black text-slate-900 mb-1 flex items-center gap-2">
                        <Map className="text-violet-600 w-6 h-6 sm:w-8 sm:h-8" />
                        여행계획
                    </h1>
                    <p className="text-xs text-slate-500">여행 일정과 경비를 스마트하게 관리하세요.</p>
                </div>
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
                                onBack={onBack}
                            />
                        ) : activeTab === 'expenses' ? (
                            <ExpenseSection
                                selectedTripId={selectedTripId}
                                selectedTrip={selectedTrip}
                                allTrips={allTrips}
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
