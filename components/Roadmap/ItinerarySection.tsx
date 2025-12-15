import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar as CalendarIcon, Clock, ChevronRight, MoreHorizontal, Trash2, PenTool, Map as MapIcon } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { Itinerary, Route, Place } from '../../types';
import { RoadmapVisualizationModal } from './RoadmapVisualizationModal';

export const ItinerarySection: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [currentTrip, setCurrentTrip] = useState<Itinerary | null>(null);
    const [selectedDayDayIndex, setSelectedDayIndex] = useState(0);

    // New Trip Form State
    const [isCreating, setIsCreating] = useState(false);
    const [newTripTitle, setNewTripTitle] = useState('');
    const [newTripStartDate, setNewTripStartDate] = useState('');
    const [newTripEndDate, setNewTripEndDate] = useState('');

    // Place Input State
    const [isAddingPlace, setIsAddingPlace] = useState(false);
    const [newPlaceName, setNewPlaceName] = useState('');
    const [newPlaceTime, setNewPlaceTime] = useState('');
    const [newPlaceMemo, setNewPlaceMemo] = useState('');

    // Visualization Modal State
    const [showVisualMap, setShowVisualMap] = useState(false);

    // Edit State
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

                setCurrentTrip(trips[0]);
            } else {
                setCurrentTrip(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching itinerary:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);

    const handleCreateTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            const start = new Date(newTripStartDate);
            const end = new Date(newTripEndDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            // Initialize empty routes for each day
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
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                expiresAt: new Date(end.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 days retention
            };

            await addDoc(collection(db, 'itineraries'), newTrip);
            setIsCreating(false);
        } catch (error) {
            console.error("Error creating trip:", error);
            alert("여행 생성 실패");
        }
    };

    const handleAddPlace = async () => {
        if (!currentTrip || !newPlaceName) return;

        try {
            const updatedRoutes = [...currentTrip.routes];

            // Ensure the route exists for the selected index
            if (!updatedRoutes[selectedDayDayIndex]) {
                console.error("Route index out of bounds");
                return;
            }

            const currentRoute = updatedRoutes[selectedDayDayIndex];

            const newPlace: Place = {
                name: newPlaceName,
                visitTime: newPlaceTime,
                address: newPlaceMemo // Using address field for memo temp
            };

            // Add to visitedPlaces and sort by time if provided
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
            alert("일정 추가 실패: " + error);
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

    const startEditing = (index: number, place: Place) => {
        setEditingPlaceIndex(index);
        setEditPlaceName(place.name);
        setEditPlaceTime(place.visitTime || '');
        setEditPlaceMemo(place.address || ''); // Using address as memo
    };

    const cancelEditing = () => {
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

            // Update the specific place
            currentRoute.visitedPlaces[placeIndex] = {
                name: editPlaceName,
                visitTime: editPlaceTime,
                address: editPlaceMemo
            };

            // Resort by time
            currentRoute.visitedPlaces.sort((a, b) => (a.visitTime || '').localeCompare(b.visitTime || ''));

            await updateDoc(doc(db, 'itineraries', currentTrip.id), {
                routes: updatedRoutes,
                updatedAt: serverTimestamp()
            });

            cancelEditing();
        } catch (error) {
            console.error("Error updating place:", error);
            alert("수정 실패");
        }
    };

    const handleDeleteTrip = async () => {
        if (!currentTrip) return;
        if (!confirm(`'${currentTrip.tripName}' 전체를 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'itineraries', currentTrip.id));
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    // Helper to get display date for a day index
    const getDayDate = (dayIndex: number) => {
        if (!currentTrip) return '';
        const date = new Date(currentTrip.startDate);
        date.setDate(date.getDate() + dayIndex);
        return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

    // VIEW 1: No Trip -> Create Form
    if (!currentTrip) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center text-violet-500 mb-6">
                    <CalendarIcon size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">여행 계획이 없습니다</h2>
                <p className="text-slate-500 mb-8 max-w-sm">
                    새로운 여행을 계획해보세요! 날짜별로 상세한 일정을 정리할 수 있습니다.
                </p>

                {!isCreating ? (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                    >
                        + 새 여행 일정 만들기
                    </button>
                ) : (
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
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-md"
                            >
                                생성하기
                            </button>
                        </div>
                    </form>
                )}
            </div>
        );
    }

    // VIEW 2: Trip Detail -> Day Planner
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-100">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                        {currentTrip.tripName}
                    </h2>
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <CalendarIcon size={14} />
                        <span>
                            {new Date(currentTrip.startDate).toLocaleDateString()} - {new Date(currentTrip.endDate).toLocaleDateString()}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full mx-1" />
                        <span>{currentTrip.routes.length} Days</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowVisualMap(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-violet-600 hover:border-violet-200 rounded-xl font-bold transition-all shadow-sm"
                    >
                        <MapIcon size={18} />
                        <span className="hidden sm:inline">로드맵 보기</span>
                    </button>
                    <button
                        onClick={handleDeleteTrip}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="여행 삭제"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div >

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Day Selector (Vertical on Desktop) */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="flex overflow-x-auto lg:flex-col gap-2 pb-2 lg:pb-0 scrollbar-hide">
                        {currentTrip.routes.map((route, index) => (
                            <button
                                key={route.id}
                                onClick={() => setSelectedDayIndex(index)}
                                className={`
                  flex-shrink-0 flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left group
                  ${selectedDayDayIndex === index
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-100'}
                `}
                            >
                                <div>
                                    <span className={`text-xs font-bold block mb-0.5 ${selectedDayDayIndex === index ? 'text-violet-200' : 'text-slate-400'}`}>
                                        Day {index + 1}
                                    </span>
                                    <span className="font-bold text-sm">
                                        {getDayDate(index).split('(')[0]} {/* Remove weekday for compactness if needed */}
                                    </span>
                                </div>
                                <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedDayDayIndex === index ? 'text-white' : 'text-slate-400'}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Timeline Content */}
                <div className="flex-1 bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 min-h-[500px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-sm rounded-lg">
                                Day {selectedDayDayIndex + 1}
                            </span>
                            <span className="text-base text-slate-500 font-normal">
                                {getDayDate(selectedDayDayIndex)}
                            </span>
                        </h3>
                        <button
                            onClick={() => setIsAddingPlace(true)}
                            className="px-4 py-2 bg-white border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-700 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            <Plus size={16} />
                            일정 추가
                        </button>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4 relative pl-4 sm:pl-6">
                        {/* Timeline Line */}
                        <div className="absolute left-[23px] sm:left-[31px] top-4 bottom-4 w-0.5 bg-slate-200" />

                        {!currentTrip.routes[selectedDayDayIndex]?.visitedPlaces || currentTrip.routes[selectedDayDayIndex].visitedPlaces.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 relative z-10 bg-slate-50">
                                <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">등록된 일정이 없습니다.</p>
                                <button onClick={() => setIsAddingPlace(true)} className="text-violet-600 font-bold text-sm mt-2 hover:underline">
                                    첫 번째 장소 추가하기
                                </button>
                            </div>
                        ) : (
                            currentTrip.routes[selectedDayDayIndex].visitedPlaces.map((place, idx) => (
                                <div key={idx} className="relative z-10 pl-8 group">
                                    {/* Dot */}
                                    <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-slate-50 ring-1 ring-slate-200 ${editingPlaceIndex === idx ? 'bg-amber-400' : 'bg-violet-500'}`}></div>

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
                                                        onClick={cancelEditing}
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
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    {place.visitTime && (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 mb-1">
                                                            <Clock size={12} />
                                                            {place.visitTime}
                                                        </div>
                                                    )}
                                                    <h4 className="font-bold text-slate-800 text-lg">{place.name}</h4>
                                                    {place.address && (
                                                        <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{place.address}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditing(idx, place)}
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
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        {/* Add Place Inline Form */}
                        {isAddingPlace && (
                            <div className="relative z-10 pl-8 animate-in fade-in slide-in-from-left-2">
                                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-slate-50 bg-slate-300"></div>
                                <div className="bg-white p-4 rounded-xl border-2 border-violet-100 shadow-lg">
                                    <h4 className="text-sm font-bold text-slate-800 mb-3">새 일정 추가</h4>
                                    <div className="space-y-3">
                                        <input
                                            autoFocus
                                            value={newPlaceName}
                                            onChange={e => setNewPlaceName(e.target.value)}
                                            placeholder="장소명 (예: 에펠탑)"
                                            className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-violet-200"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="time"
                                                value={newPlaceTime}
                                                onChange={e => setNewPlaceTime(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-200"
                                            />
                                            <input
                                                value={newPlaceMemo}
                                                onChange={e => setNewPlaceMemo(e.target.value)}
                                                placeholder="메모 (선택)"
                                                className="flex-[2] px-3 py-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-200"
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
