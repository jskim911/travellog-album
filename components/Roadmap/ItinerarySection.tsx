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
    allTrips: Itinerary[];
    selectedTrip: Itinerary | null;
    onBack?: () => void;
}

export const ItinerarySection: React.FC<ItinerarySectionProps> = ({ selectedTripId, onSelectTrip, isSmartphoneMode = false, allTrips = [], selectedTrip, onBack }) => {
    const { user } = useAuth();


    // View State
    const [isCreating, setIsCreating] = useState(false);
    const [selectedDayDayIndex, setSelectedDayIndex] = useState(0);

    // Derived State
    const currentTrip = selectedTrip;
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

    // Draft Routes for Creation
    const [draftRoutes, setDraftRoutes] = useState<Route[]>([]);

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
    const [pendingEditTripId, setPendingEditTripId] = useState<string | null>(null);
    const [editPlaceMemo, setEditPlaceMemo] = useState('');

    // Refs for Auto-jump Date Inputs
    const createStartYearRef = React.useRef<HTMLInputElement>(null);
    const createStartMonthRef = React.useRef<HTMLInputElement>(null);
    const createStartDayRef = React.useRef<HTMLInputElement>(null);
    const createEndYearRef = React.useRef<HTMLInputElement>(null);
    const createEndMonthRef = React.useRef<HTMLInputElement>(null);
    const createEndDayRef = React.useRef<HTMLInputElement>(null);

    const editStartYearRef = React.useRef<HTMLInputElement>(null);
    const editStartMonthRef = React.useRef<HTMLInputElement>(null);
    const editStartDayRef = React.useRef<HTMLInputElement>(null);
    const editEndYearRef = React.useRef<HTMLInputElement>(null);
    const editEndMonthRef = React.useRef<HTMLInputElement>(null);
    const editEndDayRef = React.useRef<HTMLInputElement>(null);

    // Helper to handle date part changes
    const handleDatePartChange = (
        type: 'start' | 'end',
        part: 'year' | 'month' | 'day',
        value: string,
        isEdit: boolean = false
    ) => {
        const setDate = isEdit
            ? (type === 'start' ? setEditTripStart : setEditTripEnd)
            : (type === 'start' ? setNewTripStartDate : setNewTripEndDate);

        const currentDate = isEdit
            ? (type === 'start' ? editTripStart : editTripEnd)
            : (type === 'start' ? newTripStartDate : newTripEndDate);

        let [y, m, d] = (currentDate || '--').split('-');
        if (part === 'year') y = value;
        if (part === 'month') m = value;
        if (part === 'day') d = value;

        setDate(`${y}-${m}-${d}`);

        // Auto-jump logic
        if (part === 'year' && value.length === 4) {
            const nextRef = isEdit
                ? (type === 'start' ? editStartMonthRef : editEndMonthRef)
                : (type === 'start' ? createStartMonthRef : createEndMonthRef);
            nextRef.current?.focus();
        } else if (part === 'month' && value.length === 2) {
            const nextRef = isEdit
                ? (type === 'start' ? editStartDayRef : editEndDayRef)
                : (type === 'start' ? createStartDayRef : createEndDayRef);
            nextRef.current?.focus();
        }
    };

    const formatTimeInput = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        const hh = numbers.slice(0, 2);
        const mm = numbers.slice(2, 4);
        return `${hh}:${mm}`;
    };

    const getDayShortDate = (dayIndex: number, specificStartDate?: string) => {
        const startStr = specificStartDate || (currentTrip?.startDate);
        if (!startStr) return '';
        const date = new Date(startStr);
        if (isNaN(date.getTime())) return '';
        date.setDate(date.getDate() + dayIndex);
        return `${date.getMonth() + 1}.${date.getDate()}`;
    };

    // Fetch Logic
    // Fetch Logic Removed (Lifted to Parent)

    // Calculate Draft Routes based on Dates
    useEffect(() => {
        if (!isCreating || !newTripStartDate || !newTripEndDate) return;

        const start = new Date(newTripStartDate);
        const end = new Date(newTripEndDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
            setDraftRoutes([]);
            return;
        }

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Only reset if the count changed or title change? 
        // Actually, just maintain the count. If count didn't change, keep existing data.
        if (draftRoutes.length !== diffDays) {
            const newDraft = Array.from({ length: diffDays }, (_, i) => {
                const existing = draftRoutes[i];
                return existing || {
                    id: `draft_${Date.now()}_${i}`,
                    day: i + 1,
                    departure: '',
                    destination: '',
                    visitedPlaces: [{ name: '', visitTime: '', address: '' }], // 기본 하나 제공
                    restaurants: [],
                    notes: ''
                };
            });
            setDraftRoutes(newDraft);
        }
    }, [newTripStartDate, newTripEndDate, isCreating]);

    // Reset day index when trip changes
    useEffect(() => {
        setSelectedDayIndex(0);
        setIsAddingPlace(false);
        setEditingPlaceIndex(null);

        // 만약 수정을 대기 중인 상태라면 기본 초기화를 수행하지 않음
        if (pendingEditTripId) return;

        setIsEditingTripInfo(false);
    }, [selectedTripId]); // pendingEditTripId는 의존성에서 제외하여 연쇄 실행 방지

    // 수정 버튼 클릭 후 데이터가 준비되면 편집 모드 활성화
    useEffect(() => {
        if (pendingEditTripId && currentTrip && currentTrip.id === pendingEditTripId) {
            startEditingTripInfo(currentTrip);
            setPendingEditTripId(null);
        } else if (!selectedTripId) {
            // 목록으로 돌아왔을 때 대기 중인 수정 예약이 있다면 초기화
            setPendingEditTripId(null);
        }
    }, [currentTrip, pendingEditTripId, selectedTripId]);


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

            const newTrip = {
                userId: user.uid,
                tripName: newTripTitle,
                startDate: start,
                endDate: end,
                routes: draftRoutes,
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

    const startEditingTripInfo = (specificTrip?: Itinerary) => {
        const tripToEdit = specificTrip || currentTrip;
        if (!tripToEdit) return;
        setEditTripTitle(tripToEdit.tripName);
        const formatDate = (date: any) => {
            const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        setEditTripStart(formatDate(tripToEdit.startDate));
        setEditTripEnd(formatDate(tripToEdit.endDate));
        setEditTripParticipantCount(tripToEdit.participantCount || 1);
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

    const getDayOnlyDay = (dayIndex: number) => {
        if (!currentTrip) return '';
        const date = new Date(currentTrip.startDate);
        date.setDate(date.getDate() + dayIndex);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return days[date.getDay()];
    };



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
                                className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-violet-200 font-bold transition-all duration-300 focus:scale-110 focus:relative focus:z-50 focus:shadow-2xl"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">시작일</label>
                                <div className="flex gap-1 items-center bg-slate-50 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-violet-200 transition-all">
                                    <input
                                        ref={createStartYearRef}
                                        placeholder="2024"
                                        maxLength={4}
                                        value={newTripStartDate.split('-')[0] || ''}
                                        onChange={e => handleDatePartChange('start', 'year', e.target.value.replace(/\D/g, ''))}
                                        className="w-12 bg-transparent border-none p-1 text-center text-sm font-bold focus:ring-0 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                    />
                                    <span className="text-slate-300">.</span>
                                    <input
                                        ref={createStartMonthRef}
                                        placeholder="01"
                                        maxLength={2}
                                        value={newTripStartDate.split('-')[1] || ''}
                                        onChange={e => handleDatePartChange('start', 'month', e.target.value.replace(/\D/g, ''))}
                                        className="w-8 bg-transparent border-none p-1 text-center text-sm font-bold focus:ring-0 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                    />
                                    <span className="text-slate-300">.</span>
                                    <input
                                        ref={createStartDayRef}
                                        placeholder="01"
                                        maxLength={2}
                                        value={newTripStartDate.split('-')[2] || ''}
                                        onChange={e => handleDatePartChange('start', 'day', e.target.value.replace(/\D/g, ''))}
                                        className="w-8 bg-transparent border-none p-1 text-center text-sm font-bold focus:ring-0 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 mb-1">종료일</label>
                                <div className="flex gap-1 items-center bg-slate-50 rounded-xl p-1.5 focus-within:ring-2 focus-within:ring-violet-200 transition-all">
                                    <input
                                        ref={createEndYearRef}
                                        placeholder="2024"
                                        maxLength={4}
                                        value={newTripEndDate.split('-')[0] || ''}
                                        onChange={e => handleDatePartChange('end', 'year', e.target.value.replace(/\D/g, ''))}
                                        className="w-12 bg-transparent border-none p-1 text-center text-sm font-bold focus:ring-0 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                    />
                                    <span className="text-slate-300">.</span>
                                    <input
                                        ref={createEndMonthRef}
                                        placeholder="01"
                                        maxLength={2}
                                        value={newTripEndDate.split('-')[1] || ''}
                                        onChange={e => handleDatePartChange('end', 'month', e.target.value.replace(/\D/g, ''))}
                                        className="w-8 bg-transparent border-none p-1 text-center text-sm font-bold focus:ring-0 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                    />
                                    <span className="text-slate-300">.</span>
                                    <input
                                        ref={createEndDayRef}
                                        placeholder="01"
                                        maxLength={2}
                                        value={newTripEndDate.split('-')[2] || ''}
                                        onChange={e => handleDatePartChange('end', 'day', e.target.value.replace(/\D/g, ''))}
                                        className="w-8 bg-transparent border-none p-1 text-center text-sm font-bold focus:ring-0 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                    />
                                </div>
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

                        {/* Dynamic Daily Plan Inputs */}
                        {draftRoutes.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <Clock size={16} className="text-violet-500" />
                                    일차별 상세 계획
                                </h4>
                                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                                    {draftRoutes.map((route, rIdx) => (
                                        <div key={route.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="w-6 h-6 bg-violet-600 text-white text-[10px] font-black rounded-lg flex items-center justify-center">
                                                    {route.day}
                                                </span>
                                                <span className="text-xs font-black text-slate-700">
                                                    {route.day}일차 ({getDayShortDate(rIdx, newTripStartDate)}) 계획
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {route.visitedPlaces.map((place, pIdx) => (
                                                    <div key={pIdx} className="grid grid-cols-12 gap-2">
                                                        <div className="col-span-3">
                                                            <input
                                                                placeholder="14:30"
                                                                value={place.visitTime || ''}
                                                                onChange={(e) => {
                                                                    const newRoutes = [...draftRoutes];
                                                                    newRoutes[rIdx].visitedPlaces[pIdx].visitTime = formatTimeInput(e.target.value);
                                                                    setDraftRoutes(newRoutes);
                                                                }}
                                                                className="w-full p-2 bg-white rounded-lg border-none text-[10px] font-bold focus:ring-2 focus:ring-violet-200 text-center transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                                            />
                                                        </div>
                                                        <div className="col-span-4">
                                                            <input
                                                                placeholder="장소명"
                                                                value={place.name}
                                                                onChange={(e) => {
                                                                    const newRoutes = [...draftRoutes];
                                                                    newRoutes[rIdx].visitedPlaces[pIdx].name = e.target.value;
                                                                    setDraftRoutes(newRoutes);
                                                                }}
                                                                className="w-full p-2 bg-white rounded-lg border-none text-[10px] font-bold focus:ring-2 focus:ring-violet-200 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                                            />
                                                        </div>
                                                        <div className="col-span-12 sm:col-span-5">
                                                            <input
                                                                placeholder="메모"
                                                                value={place.address}
                                                                onChange={(e) => {
                                                                    const newRoutes = [...draftRoutes];
                                                                    newRoutes[rIdx].visitedPlaces[pIdx].address = e.target.value;
                                                                    setDraftRoutes(newRoutes);
                                                                }}
                                                                className="w-full p-2 bg-white rounded-lg border-none text-[10px] font-bold focus:ring-2 focus:ring-violet-200 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newRoutes = [...draftRoutes];
                                                        newRoutes[rIdx].visitedPlaces.push({ name: '', visitTime: '', address: '' });
                                                        setDraftRoutes(newRoutes);
                                                    }}
                                                    className="w-full py-2 bg-white border border-dashed border-slate-200 text-slate-400 text-[10px] font-bold rounded-lg hover:border-violet-200 hover:text-violet-500 transition-all"
                                                >
                                                    + 장소 추가
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                if (allTrips.length === 0 && onBack) {
                                    onBack();
                                } else {
                                    setIsCreating(false);
                                }
                            }}
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
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingEditTripId(trip.id);
                                            handleSelectTrip(trip.id);
                                        }}
                                        className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-all"
                                        title="정보 수정"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTrip(trip);
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        title="삭제"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="pl-2 mt-4 flex items-center text-sm text-slate-500 font-medium">
                                <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-600 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors text-xs">
                                    {trip.routes.length} Days
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div >
        );
    }

    // VIEW: DETAIL MODE (fallback to list if currentTrip is gone)
    if (!currentTrip) {
        return <div className="p-8 text-center"><button onClick={() => onSelectTrip(null)} className="text-violet-600 font-bold hover:underline">목록으로 돌아가기</button></div>;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area: Grid Layout to prevent overlapping */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 mb-10 pb-8 border-b border-slate-100">
                <div className="flex items-start gap-4 min-w-0">
                    <button
                        onClick={() => onSelectTrip(null)}
                        className="mt-1 p-2.5 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-2xl transition-all flex-shrink-0"
                        title="목록으로"
                    >
                        <ArrowLeft size={22} />
                    </button>

                    <div className="flex-1 min-w-0 group cursor-pointer" onClick={startEditingTripInfo}>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h2 className={`${isSmartphoneMode ? 'text-2xl' : 'text-4xl'} font-extrabold text-slate-900 tracking-tight transition-colors group-hover:text-violet-600 break-all`}>
                                {currentTrip.tripName}
                            </h2>
                            <span className="p-1.5 bg-slate-50 text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                                <Edit2 size={18} />
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-slate-500 text-sm sm:text-base font-medium">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                <CalendarIcon size={14} className="text-violet-400" />
                                <span>{new Date(currentTrip.startDate).toLocaleDateString()} - {new Date(currentTrip.endDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5">
                                    <Clock size={14} className="text-slate-400" />
                                    {currentTrip.routes.length} Days
                                </span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="flex items-center gap-1.5">
                                    <LayoutList size={14} className="text-slate-400" />
                                    {currentTrip.participantCount || 1}명 참여
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-3 self-start lg:self-center bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100/50">
                    <button
                        onClick={() => setShowVisualMap(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-violet-600 hover:border-violet-200 hover:shadow-md rounded-xl font-bold transition-all shadow-sm group"
                    >
                        <MapIcon size={18} className="transition-transform group-hover:rotate-12" />
                        <span className="text-sm">로드맵 보기</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button
                        onClick={() => handleDeleteTrip(currentTrip)}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all hover:rotate-12"
                        title="이 여행 삭제"
                    >
                        <Trash2 size={22} />
                    </button>
                </div>
            </div>

            <div className={`flex flex-col ${isSmartphoneMode ? 'gap-6' : 'lg:flex-row gap-10'} items-start`}>
                {/* Left: Day Selector (Sidebar Style) */}
                <div className={`${isSmartphoneMode ? 'w-full' : 'lg:w-[18rem]'} flex-shrink-0 sticky top-4`}>
                    <div className={`flex ${isSmartphoneMode ? 'overflow-x-auto gap-2.5 pb-2' : 'lg:flex-col gap-3 pb-0'} scrollbar-hide`}>
                        {currentTrip.routes.map((route, index) => (
                            <button
                                key={route.id}
                                onClick={() => setSelectedDayIndex(index)}
                                className={`
                  flex-shrink-0 flex items-center justify-between transition-all text-left px-5 py-4 rounded-[1.25rem] border group
                  ${selectedDayDayIndex === index
                                        ? 'bg-violet-600 border-violet-600 text-white shadow-xl shadow-violet-200 scale-[1.02]'
                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'
                                    }
                `}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className={`text-[11px] font-black uppercase tracking-wider mb-0.5 ${selectedDayDayIndex === index ? 'text-violet-200' : 'text-slate-400'}`}>
                                        Day {index + 1}
                                    </span>
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <span className={`font-black text-base truncate ${selectedDayDayIndex === index ? 'text-white' : 'text-slate-800'}`}>
                                            {getDayShortDate(index)}
                                        </span>
                                        <span className={`text-xs font-bold whitespace-nowrap opacity-60`}>
                                            ({getDayOnlyDay(index)})
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className={`transition-transform duration-300 ${selectedDayDayIndex === index ? 'translate-x-1 opacity-100' : 'opacity-0 -translate-x-2'}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Timeline Content (Main Body) */}
                <div className="flex-1 w-full bg-slate-50/50 rounded-[2.5rem] p-6 sm:p-10 border border-slate-100 min-h-[600px] shadow-inner">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs rounded-lg">
                                Day {selectedDayDayIndex + 1} ({getDayShortDate(selectedDayDayIndex)})
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

                    {/* Places Grid: 2 columns for better width */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                    {editingPlaceIndex === idx ? (
                                        <div className="bg-white p-4 rounded-xl border-2 border-amber-200 shadow-md">
                                            <div className="space-y-3">
                                                <input
                                                    autoFocus
                                                    value={editPlaceName}
                                                    onChange={e => setEditPlaceName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdatePlace(idx)}
                                                    placeholder="장소명"
                                                    className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-amber-200 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        placeholder="14:30"
                                                        value={editPlaceTime}
                                                        onChange={e => setEditPlaceTime(formatTimeInput(e.target.value))}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdatePlace(idx)}
                                                        className="flex-1 px-3 py-2 bg-slate-50 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-amber-200 text-center transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                                    />
                                                    <input
                                                        value={editPlaceMemo}
                                                        onChange={e => setEditPlaceMemo(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdatePlace(idx)}
                                                        placeholder="메모 (선택)"
                                                        className="flex-[2] px-3 py-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-amber-200 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
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
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-violet-200 transition-all h-full flex flex-col relative">
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

                                            {/* Place Name: Robust wrapping for premium visibility */}
                                            <h4 className={`${isSmartphoneMode ? 'text-base' : 'text-xl'} font-black text-slate-800 mb-2 leading-snug break-all`}>
                                                {place.name}
                                            </h4>

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
                                        onKeyDown={(e) => e.key === 'Enter' && newPlaceName && handleAddPlace()}
                                        placeholder="장소명 (예: 에펠탑)"
                                        className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-violet-200 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                    />
                                    <div className="flex flex-col gap-2">
                                        <input
                                            placeholder="14:30"
                                            value={newPlaceTime}
                                            onChange={e => setNewPlaceTime(formatTimeInput(e.target.value))}
                                            onKeyDown={(e) => e.key === 'Enter' && newPlaceName && handleAddPlace()}
                                            className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm font-bold focus:ring-2 focus:ring-violet-200 text-center transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
                                        />
                                        <input
                                            value={newPlaceMemo}
                                            onChange={e => setNewPlaceMemo(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && newPlaceName && handleAddPlace()}
                                            placeholder="메모 (선택)"
                                            className="w-full px-3 py-2 bg-slate-50 rounded-lg border-none text-sm focus:ring-2 focus:ring-violet-200 transition-all duration-300 focus:scale-130 focus:relative focus:z-50 focus:shadow-2xl"
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

            {/* Premium Center Modal for Trip Info Edit */}
            {isEditingTripInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setIsEditingTripInfo(false)}
                    />

                    <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 overflow-hidden animate-in zoom-in-95 duration-300 border border-white">
                        <div className="p-8 sm:p-10">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                                        <Edit2 size={20} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900">여행 정보 수정</h3>
                                </div>
                                <button
                                    onClick={() => setIsEditingTripInfo(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-2 ml-1">여행 제목</label>
                                    <input
                                        value={editTripTitle}
                                        onChange={e => setEditTripTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateTripInfo()}
                                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-violet-200 font-bold text-slate-800 text-lg transition-all duration-300 focus:scale-[1.02] placeholder:text-slate-300"
                                        placeholder="여행 제목을 입력하세요"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-black text-slate-700 mb-2 ml-1">시작일</label>
                                        <div className="flex gap-1 items-center bg-slate-50 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-violet-200 transition-all">
                                            <input
                                                ref={editStartYearRef}
                                                placeholder="2024"
                                                maxLength={4}
                                                value={editTripStart.split('-')[0] || ''}
                                                onChange={e => handleDatePartChange('start', 'year', e.target.value.replace(/\D/g, ''), true)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTripInfo()}
                                                className="w-12 bg-transparent border-none p-0 text-center text-base font-black text-slate-800 focus:ring-0 transition-all duration-300 focus:scale-125 focus:relative focus:z-10"
                                            />
                                            <span className="text-slate-300">.</span>
                                            <input
                                                ref={editStartMonthRef}
                                                placeholder="01"
                                                maxLength={2}
                                                value={editTripStart.split('-')[1] || ''}
                                                onChange={e => handleDatePartChange('start', 'month', e.target.value.replace(/\D/g, ''), true)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTripInfo()}
                                                className="w-8 bg-transparent border-none p-0 text-center text-base font-black text-slate-800 focus:ring-0 transition-all duration-300 focus:scale-125 focus:relative focus:z-10"
                                            />
                                            <span className="text-slate-300">.</span>
                                            <input
                                                ref={editStartDayRef}
                                                placeholder="01"
                                                maxLength={2}
                                                value={editTripStart.split('-')[2] || ''}
                                                onChange={e => handleDatePartChange('start', 'day', e.target.value.replace(/\D/g, ''), true)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTripInfo()}
                                                className="w-8 bg-transparent border-none p-0 text-center text-base font-black text-slate-800 focus:ring-0 transition-all duration-300 focus:scale-125 focus:relative focus:z-10"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-black text-slate-700 mb-2 ml-1">종료일</label>
                                        <div className="flex gap-1 items-center bg-slate-50 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-violet-200 transition-all">
                                            <input
                                                ref={editEndYearRef}
                                                placeholder="2024"
                                                maxLength={4}
                                                value={editTripEnd.split('-')[0] || ''}
                                                onChange={e => handleDatePartChange('end', 'year', e.target.value.replace(/\D/g, ''), true)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTripInfo()}
                                                className="w-12 bg-transparent border-none p-0 text-center text-base font-black text-slate-800 focus:ring-0 transition-all duration-300 focus:scale-125 focus:relative focus:z-10"
                                            />
                                            <span className="text-slate-300">.</span>
                                            <input
                                                ref={editEndMonthRef}
                                                placeholder="01"
                                                maxLength={2}
                                                value={editTripEnd.split('-')[1] || ''}
                                                onChange={e => handleDatePartChange('end', 'month', e.target.value.replace(/\D/g, ''), true)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTripInfo()}
                                                className="w-8 bg-transparent border-none p-0 text-center text-base font-black text-slate-800 focus:ring-0 transition-all duration-300 focus:scale-125 focus:relative focus:z-10"
                                            />
                                            <span className="text-slate-300">.</span>
                                            <input
                                                ref={editEndDayRef}
                                                placeholder="01"
                                                maxLength={2}
                                                value={editTripEnd.split('-')[2] || ''}
                                                onChange={e => handleDatePartChange('end', 'day', e.target.value.replace(/\D/g, ''), true)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTripInfo()}
                                                className="w-8 bg-transparent border-none p-0 text-center text-base font-black text-slate-800 focus:ring-0 transition-all duration-300 focus:scale-125 focus:relative focus:z-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-2 ml-1">여행 인원</label>
                                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => setEditTripParticipantCount(Math.max(1, editTripParticipantCount - 1))}
                                            className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm hover:shadow-md text-slate-600 hover:text-red-500 transition-all"
                                        >
                                            <span className="text-2xl font-black">-</span>
                                        </button>
                                        <div className="flex-1 text-center">
                                            <span className="text-xl font-black text-slate-900">{editTripParticipantCount}</span>
                                            <span className="text-sm font-bold text-slate-500 ml-1">명</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditTripParticipantCount(editTripParticipantCount + 1)}
                                            className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm hover:shadow-md text-slate-600 hover:text-violet-600 transition-all"
                                        >
                                            <span className="text-2xl font-black">+</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-10">
                                <button
                                    onClick={() => setIsEditingTripInfo(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleUpdateTripInfo}
                                    className="flex-[2] py-4 bg-violet-600 text-white font-black rounded-2xl hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all"
                                >
                                    변경사항 저장하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
