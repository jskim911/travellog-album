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
    const [headerActionsEl, setHeaderActionsEl] = useState<HTMLDivElement | null>(null);

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

                // Auto-clear logic: if the selectedTripId is invalid for this user
                if (selectedTripId && trips.length > 0) {
                    const isIdValid = trips.some(t => t.id === selectedTripId);
                    if (!isIdValid) {
                        onSelectTrip(null);
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
        <div className={`max-w-6xl mx-auto ${isSmartphoneMode ? 'px-0 py-4 pb-24' : 'px-4 py-8'}`}>
            {/* Header removed for PC view to maximize space */}

            {/* Content Area */}
            <div className={`bg-white min-h-[600px] ${isSmartphoneMode ? 'p-0 rounded-none border-y border-slate-100 shadow-none' : 'p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm'}`}>
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
                                headerActionsEl={headerActionsEl}
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
