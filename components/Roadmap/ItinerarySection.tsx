import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar as CalendarIcon, Clock, ChevronRight, MoreHorizontal, Trash2, PenTool, Map as MapIcon, ArrowLeft, LayoutList, Edit2, Save, X } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { Itinerary, Route, Place } from '../../types';
import { RoadmapVisualizationModal } from './RoadmapVisualizationModal';

interface ItinerarySectionProps {
    selectedTripId: string | null;
    onSelectTrip: (tripId: string | null) => void;
    isSmartphoneMode?: boolean;
}

export const ItinerarySection: React.FC<ItinerarySectionProps> = ({ selectedTripId, onSelectTrip, isSmartphoneMode = false }) => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data State
    const [allTrips, setAllTrips] = useState<Itinerary[]>([]);

    // View State
    const [isCreating, setIsCreating] = useState(false);
    const [selectedDayDayIndex, setSelectedDayIndex] = useState(0);

    // Derived State
    const currentTrip = allTrips.find(t => t.id === selectedTripId) || null;
    const viewMode = isCreating ? 'create' : (selectedTripId ? 'detail' : 'list');

    // New Trip Form State
    const [newTripTitle, setNewTripTitle] = useState('');
    const [newTripStartDate, setNewTripStartDate] = useState('');
    const [newTripEndDate, setNewTripEndDate] = useState('');

    // Trip Info Edit State
    const [isEditingTripInfo, setIsEditingTripInfo] = useState(false);
    const [editTripTitle, setEditTripTitle] = useState('');
    const [editTripStart, setEditTripStart] = useState('');
    const [editTripEnd, setEditTripEnd] = useState('');
    const [editTripParticipantCount, setEditTripParticipantCount] = useState(1);

    // New Trip Form State - Participant Count
    const [newTripParticipantCount, setNewTripParticipantCount] = useState(1);

    // Place Input State
    const [isAddingPlace, setIsAddingPlace] = useState(false);
    const [newPlaceName, setNewPlaceName] = useState('');
    const [newPlaceTime, setNewPlaceTime] = useState('');
    const [newPlaceMemo, setNewPlaceMemo] = useState('');

    // Visualization Modal State
    const [showVisualMap, setShowVisualMap] = useState(false);

    // Edit Place State
    const [editingPlaceIndex, setEditingPlaceIndex] = useState<number | null>(null);
    const [editPlaceName, setEditPlaceName] = useState('');
    const [editPlaceTime, setEditPlaceTime] = useState('');
    const [editPlaceMemo, setEditPlaceMemo] = useState('');

    // Fetch Logic
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

                // Sort in memory (descending by startDate)
                trips.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
                setAllTrips(trips);
            } else {
                setAllTrips([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching itinerary:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);

    // Reset day index when trip changes
    useEffect(() => {
        setSelectedDayIndex(0);
        setIsEditingTripInfo(false);
        setIsAddingPlace(false);
        setEditingPlaceIndex(null);
    }, [selectedTripId]);


    // Handlers
    const handleSelectTrip = (tripId: string) => {
        onSelectTrip(tripId);
    };

    const handleCreateTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const start = new Date(newTripStartDate);
            const end = new Date(newTripEndDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            const routes: Route[] = Array.from({ length: diffDays }, (_, i) => ({
                id: `route_${Date.now()}_${i}`,
                day: i + 1,
                departure: '',
                destination: '',
                visitedPlaces: [],
                restaurants: []
            }));

            const newTrip = {
                userId: user.uid,
                tripName: newTripTitle,
                startDate: start,
                endDate: end,
                routes,
                participantCount: newTripParticipantCount,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                expiresAt: new Date(end.getTime() + 30 * 24 * 60 * 60 * 1000)
            };

            const docRef = await addDoc(collection(db, 'itineraries'), newTrip);

            setIsCreating(false);
            onSelectTrip(docRef.id);

            // Reset Form
            setNewTripTitle('');
            setNewTripStartDate('');
            setNewTripEndDate('');
            setNewTripParticipantCount(1);
        } catch (error) {
            console.error("Error creating trip:", error);
            alert("여행 생성 실패");
        }
    };

    const handleUpdateTripInfo = async () => {
        if (!currentTrip || !editTripTitle || !editTripStart || !editTripEnd) return;

        try {
            const start = new Date(editTripStart);
            const end = new Date(editTripEnd);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            let updatedRoutes = [...currentTrip.routes];

            if (diffDays !== currentTrip.routes.length) {
                if (!confirm('여행 기간이 변경되었습니다. 일정이 초기화되거나 잘릴 수 있습니다. 계속하시겠습니까?')) return;

                // Resize routes array
                if (diffDays > updatedRoutes.length) {
                    // Add days
                    const addedDays = diffDays - updatedRoutes.length;
                    for (let i = 0; i < addedDays; i++) {
                        updatedRoutes.push({
                            id: `route_${Date.now()}_${updatedRoutes.length + i}`,
                            day: updatedRoutes.length + i + 1,
                            departure: '',
                            destination: '',
                            visitedPlaces: [],
                            restaurants: []
                        });
                    }
                } else {
                    // Trim days
                    updatedRoutes = updatedRoutes.slice(0, diffDays);
                }
            }

            await updateDoc(doc(db, 'itineraries', currentTrip.id), {
                tripName: editTripTitle,
                startDate: start,
                endDate: end,
                routes: updatedRoutes,
                participantCount: editTripParticipantCount,
                updatedAt: serverTimestamp()
            });

            setIsEditingTripInfo(false);
        } catch (error) {
            console.error("Error updating trip info:", error);
            alert("수정 실패");
        }
    };

    const startEditingTripInfo = () => {
        if (!currentTrip) return;
        setEditTripTitle(currentTrip.tripName);
        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        setEditTripStart(formatDate(currentTrip.startDate));
        setEditTripEnd(formatDate(currentTrip.endDate));
        setEditTripParticipantCount(currentTrip.participantCount || 1);
        setIsEditingTripInfo(true);
    };

    const handleDeleteTrip = async (trip: Itinerary) => {
        if (!confirm(`'${trip.tripName}' 전체를 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'itineraries', trip.id));
            if (trip.id === selectedTripId) {
                onSelectTrip(null);
            }
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    // Place Handlers
    const handleAddPlace = async () => {
        if (!currentTrip || !newPlaceName) return;

        try {
            const updatedRoutes = [...currentTrip.routes];
            if (!updatedRoutes[selectedDayDayIndex]) return;

            const currentRoute = updatedRoutes[selectedDayDayIndex];
            const newPlace: Place = {
                name: newPlaceName,
                visitTime: newPlaceTime,
                address: newPlaceMemo
            };

            if (!currentRoute.visitedPlaces) currentRoute.visitedPlaces = [];
            currentRoute.visitedPlaces.push(newPlace);
            currentRoute.visitedPlaces.sort((a, b) => (a.visitTime || '').localeCompare(b.visitTime || ''));

            await updateDoc(doc(db, 'itineraries', currentTrip.id), {
                routes: updatedRoutes,
                updatedAt: serverTimestamp()
            });

            setNewPlaceName('');
            setNewPlaceTime('');
            setNewPlaceMemo('');
            setIsAddingPlace(false);
        } catch (error) {
            console.error("Error adding place:", error);
            alert("일정 추가 실패");
        }
    };

    const handleDeletePlace = async (routeIndex: number, placeIndex: number) => {
        if (!currentTrip) return;
        if (!confirm('이 일정을 삭제하시겠습니까?')) return;

        try {
            const updatedRoutes = [...currentTrip.routes];
            updatedRoutes[routeIndex].visitedPlaces.splice(placeIndex, 1);

            await updateDoc(doc(db, 'itineraries', currentTrip.id), {
                routes: updatedRoutes,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error deleting place:", error);
        }
    };

    const startEditingPlace = (index: number, place: Place) => {
        setEditingPlaceIndex(index);
        setEditPlaceName(place.name);
        setEditPlaceTime(place.visitTime || '');
        setEditPlaceMemo(place.address || '');
    };

    const cancelEditingPlace = () => {
        setEditingPlaceIndex(null);
        setEditPlaceName('');
        setEditPlaceTime('');
        setEditPlaceMemo('');
    };

    const handleUpdatePlace = async (placeIndex: number) => {
        if (!currentTrip || !editPlaceName) return;

        try {
            const updatedRoutes = [...currentTrip.routes];
            const currentRoute = updatedRoutes[selectedDayDayIndex];

            currentRoute.visitedPlaces[placeIndex] = {
                name: editPlaceName,
                visitTime: editPlaceTime,
                address: editPlaceMemo
            };
            currentRoute.visitedPlaces.sort((a, b) => (a.visitTime || '').localeCompare(b.visitTime || ''));

            await updateDoc(doc(db, 'itineraries', currentTrip.id), {
                routes: updatedRoutes,
                updatedAt: serverTimestamp()
            });

            cancelEditingPlace();
        } catch (error) {
            console.error("Error updating place:", error);
            alert("수정 실패");
        }
    };

    const getDayDate = (dayIndex: number) => {
        if (!currentTrip) return '';
        const date = new Date(currentTrip.startDate);
        date.setDate(date.getDate() + dayIndex);
        return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    // VIEW: CREATE MODE
    if (viewMode === 'create') {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center text-violet-500 mb-6">
                    <CalendarIcon size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">새로운 여행 계획하기</h2>
                <p className="text-slate-500 mb-8 max-w-sm">
                    언제 어디로 떠나시나요? 날짜별로 상세한 일정을 정리해보세요.
                </p>

                <form onSubmit={handleCreateTrip} className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-xl text-left">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">여행 기본 정보</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">여행 제목</label>
                            <input
                                required
                                type="text"
                                value={newTripTitle}
                                onChange={e => setNewTripTitle(e.target.value)}
                                placeholder="예: 겨울 제주도 힐링 여행"
                                className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-violet-200 font-bold"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">시작일</label>
                                <input
                                    required
                                    type="date"
                                    value={newTripStartDate}
                                    onChange={e => setNewTripStartDate(e.target.value)}
                                    className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-violet-200 text-sm font-medium"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">종료일</label>
                                <input
                                    required
                                    type="date"
                                    value={newTripEndDate}
                                    onChange={e => setNewTripEndDate(e.target.value)}
                                    className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-violet-200 text-sm font-medium"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">여행 인원</label>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setNewTripParticipantCount(Math.max(1, newTripParticipantCount - 1))}
                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    -
                                </button>
                                <span className="flex-1 text-center font-bold text-slate-800">{newTripParticipantCount}명</span>
                                <button
                                    type="button"
                                    onClick={() => setNewTripParticipantCount(newTripParticipantCount + 1)}
                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                        {allTrips.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                            >
                                취소
                            </button>
                        )}
                        <button
                            type="submit"
                            className="flex-[2] py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-md"
                        >
                            생성하기
                        </button>
                    </div>
                </form >
            </div >
        );
    }

    // VIEW: LIST MODE
    if (viewMode === 'list') {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                    <h2 className={`${isSmartphoneMode ? 'text-xl' : 'text-3xl'} font-black text-slate-900`}>내 여행 목록</h2>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-full shadow-lg transition-all"
                    >
                        <Plus size={20} />
                        새 여행 만들기
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allTrips.map(trip => (
                        <div
                            key={trip.id}
                            onClick={() => handleSelectTrip(trip.id)}
                            className="group relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-violet-200 shadow-sm hover:shadow-xl transition-all cursor-pointer overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-2 h-full bg-violet-500 group-hover:bg-violet-600 transition-colors" />
                            <div className="flex justify-between items-start mb-4 pl-2">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-violet-700 transition-colors mb-2 line-clamp-1">{trip.tripName}</h3>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                        <CalendarIcon size={14} />
                                        <span>
                                            {new Date(trip.startDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTrip(trip);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <div className="pl-2 mt-4 flex items-center text-sm text-slate-500 font-medium">
                                <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors text-xs">
                                    {trip.routes.length} Days
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // VIEW: DETAIL MODE (fallback to list if currentTrip is gone)
    if (!currentTrip) {
        return <div className="p-8 text-center"><button onClick={() => onSelectTrip(null)} className="text-violet-600 font-bold hover:underline">목록으로 돌아가기</button></div>;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between mb-8 pb-6 border-b border-slate-100 gap-4">
                <div className="flex items-start gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => onSelectTrip(null)}
                        className="mt-1.5 p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-full transition-all"
                        title="목록으로"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex-1 relative">
                        {isEditingTripInfo ? (
                            <div className="bg-white p-4 rounded-xl border border-violet-200 shadow-xl animate-in fade-in zoom-in-95 absolute top-0 left-0 z-50 min-w-[320px]">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-800">여행 정보 수정</h4>
                                    <button onClick={() => setIsEditingTripInfo(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">여행 제목</label>
                                        <input
                                            value={editTripTitle}
                                            onChange={e => setEditTripTitle(e.target.value)}
                                            className="w-full p-2 bg-slate-50 rounded-lg border-none font-bold text-slate-800 focus:ring-2 focus:ring-violet-200"
                                            placeholder="여행 제목"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">시작일</label>
                                            <input
                                                type="date"
                                                value={editTripStart}
                                                onChange={e => setEditTripStart(e.target.value)}
                                                className="w-full p-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-200"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">종료일</label>
                                            <input
                                                type="date"
                                                value={editTripEnd}
                                                onChange={e => setEditTripEnd(e.target.value)}
                                                className="w-full p-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-200"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">여행 인원</label>
                                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setEditTripParticipantCount(Math.max(1, editTripParticipantCount - 1))}
                                                className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 font-bold"
                                            >
                                                -
                                            </button>
                                            <span className="flex-1 text-center text-sm font-bold text-slate-800">{editTripParticipantCount}명</span>
                                            <button
                                                type="button"
                                                onClick={() => setEditTripParticipantCount(editTripParticipantCount + 1)}
                                                className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button onClick={() => setIsEditingTripInfo(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg">취소</button>
                                        <button onClick={handleUpdateTripInfo} className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm">저장하기</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="group min-w-0">
                                <h2 className={`${isSmartphoneMode ? 'text-xl' : 'text-3xl'} font-black text-slate-900 tracking-tight mb-2 flex items-center gap-2 cursor-pointer line-clamp-1 break-all`} onClick={startEditingTripInfo} title="클릭하여 수정">
                                    {currentTrip.tripName}
                                    {!isSmartphoneMode && (
                                        <span className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-violet-500 transition-all">
                                            <Edit2 size={20} />
                                        </span>
                                    )}
                                </h2>
                                {!isSmartphoneMode && (
                                    <div className="flex items-center gap-2 text-slate-500 text-base font-medium">
                                        <CalendarIcon size={14} />
                                        <span>{new Date(currentTrip.startDate).toLocaleDateString()} - {new Date(currentTrip.endDate).toLocaleDateString()}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full mx-1" />
                                        <span>{currentTrip.routes.length} Days</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full mx-1" />
                                        <span>{currentTrip.participantCount || 1}명</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 self-start sm:self-center">
                    <button
                        onClick={() => setShowVisualMap(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-violet-600 hover:border-violet-200 rounded-xl font-bold transition-all shadow-sm"
                    >
                        <MapIcon size={16} />
                        <span className="hidden sm:inline text-xs">로드맵 보기</span>
                    </button>
                    <button
                        onClick={() => handleDeleteTrip(currentTrip)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="이 여행 삭제"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div >

            <div className={`flex flex-col ${isSmartphoneMode ? 'gap-4' : 'lg:flex-row gap-8'}`}>
                {/* Left: Day Selector */}
                <div className={`${isSmartphoneMode ? 'w-full' : 'lg:w-64'} flex-shrink-0`}>
                    <div className={`flex ${isSmartphoneMode ? 'overflow-x-auto gap-2 pb-2' : 'lg:flex-col gap-2 pb-0'} scrollbar-hide`}>
                        {currentTrip.routes.map((route, index) => (
                            <button
                                key={route.id}
                                onClick={() => setSelectedDayIndex(index)}
                                className={`
                  flex-shrink-0 flex items-center justify-between transition-all text-left group
                  ${isSmartphoneMode
                                        ? `px-3 py-2 rounded-lg border ${selectedDayDayIndex === index ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`
                                        : `px-4 py-3 rounded-xl border ${selectedDayDayIndex === index ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-100'}`
                                    }
                `}
                            >
                                <div className={`${isSmartphoneMode ? 'flex items-center gap-1.5' : ''}`}>
                                    <span className={`font-bold block ${isSmartphoneMode ? 'text-xs text-center w-full' : 'text-xs mb-0.5'} ${selectedDayDayIndex === index ? 'text-violet-200' : 'text-slate-400'}`}>
                                        {isSmartphoneMode ? `${getDayDate(index).split('(')[0].replace(/(\d{4})\.\s/, '')}`.trim() : `Day ${index + 1}`}
                                    </span>
                                    {!isSmartphoneMode && (
                                        <span className={`font-bold ${isSmartphoneMode ? 'hidden' : 'text-lg block'} ${selectedDayDayIndex === index ? 'text-white' : 'text-slate-800'}`}>
                                            {getDayDate(index).split('(')[0]}
                                        </span>
                                    )}
                                </div>
                                {!isSmartphoneMode && (
                                    <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedDayDayIndex === index ? 'text-white' : 'text-slate-400'}`} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Timeline Content */}
                <div className="flex-1 bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 min-h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs rounded-lg">
                                Day {selectedDayDayIndex + 1}
                            </span>
                            <span className="text-xs sm:text-base text-slate-500 font-normal">
                                {getDayDate(selectedDayDayIndex)}
                            </span>
                        </h3>
                        <button
                            onClick={() => setIsAddingPlace(true)}
                            className="px-4 py-2 bg-white border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            <Plus size={16} />
                            {isSmartphoneMode ? '추가' : '일정 추가'}
                        </button>
                    </div>

                    {/* Places Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* No Timeline Line anymore */}

                        {!currentTrip.routes[selectedDayDayIndex]?.visitedPlaces || currentTrip.routes[selectedDayDayIndex].visitedPlaces.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">등록된 일정이 없습니다.</p>
                                <button onClick={() => setIsAddingPlace(true)} className="text-violet-600 font-bold text-sm mt-2 hover:underline">
                                    첫 번째 장소 추가하기
                                </button>
                            </div>
                        ) : (
                            currentTrip.routes[selectedDayDayIndex].visitedPlaces.map((place, idx) => (
                                <div key={idx} className="group relative">
                                    {/* No Dot */}

                                    {editingPlaceIndex === idx ? (
                                        // Edit Mode Form
                                        <div className="bg-white p-4 rounded-xl border-2 border-amber-200 shadow-md">
                                            <div className="space-y-3">
                                                <input
                                                    autoFocus
                                                    value={editPlaceName}
                                                    onChange={e => setEditPlaceName(e.target.value)}
                                                    placeholder="장소명"
                                                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-amber-200"
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        type="time"
                                                        value={editPlaceTime}
                                                        onChange={e => setEditPlaceTime(e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-amber-200"
                                                    />
                                                    <input
                                                        value={editPlaceMemo}
                                                        onChange={e => setEditPlaceMemo(e.target.value)}
                                                        placeholder="메모 (선택)"
                                                        className="flex-[2] px-3 py-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-amber-200"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button
                                                        onClick={cancelEditingPlace}
                                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                                                    >
                                                        취소
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdatePlace(idx)}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg"
                                                    >
                                                        저장
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // View Mode
                                        // View Mode
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all h-full flex flex-col relative">
                                            {/* Time & Actions Header */}
                                            <div className="flex items-start justify-between mb-2">
                                                {place.visitTime ? (
                                                    <div className="flex items-center gap-1.5 font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg text-xs">
                                                        <Clock size={14} />
                                                        {place.visitTime}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-400 px-2 py-1 bg-slate-50 rounded-lg">시간 미정</div>
                                                )}

                                                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditingPlace(idx, place)}
                                                        className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                                                        title="수정"
                                                    >
                                                        <PenTool size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePlace(selectedDayDayIndex, idx)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="삭제"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Place Name */}
                                            <h4 className={`${isSmartphoneMode ? 'text-sm' : 'text-lg'} font-bold text-slate-800 mb-1 line-clamp-1`}>
                                                {place.name}
                                            </h4>

                                            {/* Address/Memo */}
                                            {place.address && !isSmartphoneMode && (
                                                <p className="text-xs text-slate-500 line-clamp-2 mt-auto">
                                                    {place.address}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        {/* Add Place Card Form */}
                        {isAddingPlace && (
                            <div className="bg-white p-4 rounded-xl border-2 border-violet-100 shadow-lg animate-in fade-in zoom-in-95 duration-300">
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Plus size={16} className="text-violet-600" />
                                    새 일정 추가
                                </h4>
                                <div className="space-y-3">
                                    <input
                                        autoFocus
                                        value={newPlaceName}
                                        onChange={e => setNewPlaceName(e.target.value)}
                                        placeholder="장소명 (예: 에펠탑)"
                                        className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-violet-200"
                                    />
                                    <div className="flex flex-col gap-2">
                                        <input
                                            type="time"
                                            value={newPlaceTime}
                                            onChange={e => setNewPlaceTime(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-200"
                                        />
                                        <input
                                            value={newPlaceMemo}
                                            onChange={e => setNewPlaceMemo(e.target.value)}
                                            placeholder="메모 (선택)"
                                            className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-200"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button
                                            onClick={() => setIsAddingPlace(false)}
                                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleAddPlace}
                                            disabled={!newPlaceName}
                                            className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50"
                                        >
                                            추가완료
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <RoadmapVisualizationModal
                isOpen={showVisualMap}
                onClose={() => setShowVisualMap(false)}
                itinerary={currentTrip}
            />
        </div>
    );
};
