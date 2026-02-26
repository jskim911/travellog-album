import React, { useState, useEffect, useRef } from 'react';
import { Plus, PieChart, Trash2, Download, Calendar, Users, Pencil, FileImage, Maximize2, X } from 'lucide-react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../src/hooks/useAuth';
import { Expense, ExpenseCategory, Itinerary } from '../../types';
import { ExpenseInputModal } from './ExpenseInputModal';

interface ExpenseSectionProps {
    selectedTripId: string | null;
    selectedTrip: Itinerary | null;
    allTrips: Itinerary[];
    isCompact?: boolean;
}

export const ExpenseSection: React.FC<ExpenseSectionProps> = ({ selectedTripId, selectedTrip, allTrips, isCompact = false }) => {
    const { user, loading: authLoading } = useAuth();
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]); // Filtered
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
    const printRef = React.useRef<HTMLDivElement>(null);

    // Trip Info for PDF and Header
    const participantCount = Math.max(1, Number(selectedTrip?.participantCount || 1));
    const currentTrip = selectedTrip;

    // Stats
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalIndividualAmount, setTotalIndividualAmount] = useState(0);
    const [categoryStats, setCategoryStats] = useState<{ category: ExpenseCategory, amount: number, percentage: number }[]>([]);

    // 1. Fetch All Expenses for User
    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const qExpenses = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid)
        );

        const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
            const fetchedExpenses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date),
            })) as Expense[];

            fetchedExpenses.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateB - dateA;
                const createdA = a.createdAt ? (a.createdAt as any).seconds : 0;
                const createdB = b.createdAt ? (b.createdAt as any).seconds : 0;
                return createdB - createdA;
            });

            setAllExpenses(fetchedExpenses);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching expenses:", error);
            setLoading(false);
        });

        return () => unsubscribeExpenses();
    }, [user, authLoading]);

    // 2. Filter Expenses & Stats
    useEffect(() => {
        if (selectedTripId) {
            const filtered = allExpenses.filter(e => e.itineraryId === selectedTripId);
            setExpenses(filtered);
            calculateStats(filtered);
        } else {
            setExpenses(allExpenses);
            calculateStats(allExpenses);
        }
    }, [selectedTripId, allExpenses, allTrips, selectedTrip]);

    // 3. Subscribe logic removed (Props used instead)

    const calculateStats = (data: Expense[]) => {
        const total = data.reduce((sum, item) => sum + (Number(item.amountKRW) || Number(item.amount) || 0), 0);
        setTotalAmount(total);

        // Smart Per-person Calculation
        const individualTotal = data.reduce((sum, item) => {
            const amount = Number(item.amountKRW) || Number(item.amount) || 0;

            // 1. If we are in a selected trip view, use selectedTrip info for faster/consistent response
            let pCount = 1;
            if (selectedTripId && item.itineraryId === selectedTripId && selectedTrip) {
                pCount = Math.max(1, Number(selectedTrip.participantCount || 1));
            } else {
                // 2. Otherwise find the trip in allTrips (for mixed view or legacy)
                const trip = allTrips.find(t => t.id === item.itineraryId);
                pCount = Math.max(1, Number(trip?.participantCount || 1));
            }

            return sum + (amount / pCount);
        }, 0);
        setTotalIndividualAmount(individualTotal);

        const catMap: Record<string, number> = {};
        data.forEach(item => {
            const amountToSum = Number(item.amountKRW) || Number(item.amount) || 0;
            catMap[item.category] = (catMap[item.category] || 0) + amountToSum;
        });

        const stats = Object.entries(catMap).map(([cat, amt]) => ({
            category: cat as ExpenseCategory,
            amount: amt,
            percentage: total > 0 ? (amt / total) * 100 : 0
        })).sort((a, b) => b.amount - a.amount);

        setCategoryStats(stats);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('정말 이 내역을 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'expenses', id));
        } catch (e) {
            console.error("Failed to delete", e);
            alert("삭제 실패");
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setEditingExpense(null), 300);
    };

    const formatCurrency = (amount: number, currency: string = 'KRW') => {
        try {
            return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(amount);
        } catch {
            return `${currency} ${amount.toLocaleString()}`;
        }
    };

    const getCategoryIcon = (cat: ExpenseCategory) => {
        switch (cat) {
            case 'food': return '🍽️';
            case 'transport': return '🚌';
            case 'accommodation': return '🏨';
            case 'shopping': return '🛍️';
            case 'activity': return '🎫';
            case 'flight': return '✈️';
            case 'golf': return '⛳';
            default: return '🎸';
        }
    };

    const getCategoryName = (cat: ExpenseCategory) => {
        const map: Record<string, string> = {
            food: '식비',
            transport: '교통',
            accommodation: '숙박',
            shopping: '쇼핑',
            activity: '활동',
            flight: '항공',
            golf: '골프',
            other: '기타'
        };
        return map[cat] || '기타';
    };

    const handleDownloadPdf = async () => {
        if (!printRef.current) return;

        try {
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`travel_expenses_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('PDF 저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Action Bar */}
            {!isCompact && (
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-all shadow-md active:scale-95"
                        >
                            <Plus size={16} />
                            지출 추가
                        </button>
                    </div>
                    <button
                        onClick={handleDownloadPdf}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold text-sm transition-all"
                    >
                        <Download size={16} />
                        PDF
                    </button>
                </div>
            )}

            <div ref={printRef} className={`space-y-6 ${isCompact ? 'p-3' : 'p-5'} bg-white rounded-2xl border border-slate-100 shadow-sm`}>

                {/* Trip Header + Summary - Compact */}
                <div className={`${isCompact ? 'pb-3' : 'pb-4'} border-b border-slate-100`}>
                    {currentTrip ? (
                        <>
                            <h1 className={`${isCompact ? 'text-lg mb-1' : 'text-2xl mb-2'} font-black text-slate-900 tracking-tight truncate`} translate="no">
                                {currentTrip.tripName}
                            </h1>
                            {!isCompact && (
                                <div className="flex flex-wrap items-center gap-3 text-slate-400 text-xs font-medium mb-4">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(currentTrip.startDate).toLocaleDateString()} ~ {new Date(currentTrip.endDate).toLocaleDateString()}
                                    </span>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <span>{currentTrip.routes.length}일</span>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <span className="flex items-center gap-1"><Users size={12} />{participantCount}명</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <h1 className={`${isCompact ? 'text-lg' : 'text-2xl'} font-black text-slate-900 tracking-tight`}>
                            전체 지출 내역
                        </h1>
                    )}

                    {/* Summary Stat Bar */}
                    <div className={`flex items-center ${isCompact ? 'gap-2 mb-2' : 'gap-0'} bg-slate-50 rounded-xl overflow-hidden ${isCompact ? 'px-1' : ''}`}>
                        {isCompact ? (
                            <div className="flex flex-col items-center justify-center flex-1 py-3 px-4 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                    {selectedTripId ? '총 지출 / 1인당' : '전체 총액 / 개인별 합산'}
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                                    <span className={`${isCompact ? 'text-lg' : 'text-xl sm:text-2xl'} font-black text-slate-900 leading-none`}>
                                        {formatCurrency(totalAmount)}
                                    </span>
                                    <span className="text-slate-300">/</span>
                                    <span className={`${isCompact ? 'text-lg' : 'text-xl sm:text-2xl'} font-black text-violet-600 leading-none`}>
                                        {formatCurrency(totalIndividualAmount)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 divide-x divide-slate-200 w-full">
                                <div className="text-center py-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">총 지출</p>
                                    <p className="text-xl font-black text-slate-900 tabular-nums" translate="no">{formatCurrency(totalAmount)}</p>
                                </div>
                                <div className="text-center py-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        {selectedTripId ? `${expenses.length}건 · ${participantCount}명` : `${expenses.length}건 · 혼합`}
                                    </p>
                                    <p className="text-xl font-black text-slate-400">{expenses.length > 0 ? `${expenses.length}건` : '-'}</p>
                                </div>
                                <div className="text-center py-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">1인당</p>
                                    <p className="text-xl font-black text-violet-600 tabular-nums" translate="no">{formatCurrency(totalIndividualAmount)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Breakdown - Simple Bars */}
                {!isCompact && categoryStats.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                            <PieChart size={14} />
                            카테고리별 지출
                        </h3>
                        <div className="space-y-2">
                            {categoryStats.map((stat) => (
                                <div key={stat.category} className="flex items-center gap-3">
                                    <span className="w-6 text-center text-sm">{getCategoryIcon(stat.category)}</span>
                                    <span className="text-xs font-bold text-slate-600 w-10">{getCategoryName(stat.category)}</span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-violet-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${stat.percentage}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-black text-slate-700 w-20 text-right tabular-nums" translate="no">
                                        {formatCurrency(stat.amount)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(stat.percentage)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Expense List */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className={`${isCompact ? 'text-sm' : 'text-base'} font-bold text-slate-900 flex items-center gap-2`}>
                            지출 내역
                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs font-bold">
                                {expenses.length}
                            </span>
                        </h3>
                        {isCompact && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-50 text-violet-600 hover:bg-violet-100 rounded-lg font-bold transition-all"
                            >
                                <Plus size={14} />
                                추가
                            </button>
                        )}
                    </div>

                    <div className="rounded-xl overflow-hidden border border-slate-100">
                        {loading ? (
                            <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-3">
                                <div className="w-6 h-6 border-3 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                                <span className="text-xs">불러오는 중...</span>
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="p-10 text-center">
                                <div className="text-3xl mb-2">💰</div>
                                <p className="text-sm text-slate-400 mb-3">
                                    {selectedTripId ? '이 여행의 지출 내역이 없어요' : '아직 지출 내역이 없어요'}
                                </p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-violet-600 font-bold text-sm hover:underline"
                                >
                                    첫 지출 등록하기 →
                                </button>
                            </div>
                        ) : (
                            expenses.map((expense) => (
                                <div key={expense.id} className={`flex items-center justify-between ${isCompact ? 'p-2.5 gap-2' : 'px-4 py-3 gap-3'} border-b border-slate-50 last:border-0 hover:bg-slate-25 transition-colors group`}>
                                    {/* Left: Icon + Info */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`${isCompact ? 'w-8 h-8 text-base' : 'w-10 h-10 text-lg'} bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            {getCategoryIcon(expense.category)}
                                        </div>
                                        <div className="min-w-0 flex-1 flex items-center gap-2">
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`font-bold text-slate-800 ${isCompact ? 'text-[12px]' : 'text-sm md:text-base'} line-clamp-1 leading-tight mb-0.5`} translate="no">
                                                    {expense.description}
                                                </h4>
                                                <div className={`flex items-center flex-wrap gap-x-1 gap-y-0 ${isCompact ? 'text-[9px]' : 'text-[10px] md:text-xs'} text-slate-400 font-medium`}>
                                                    <span className="whitespace-nowrap">{new Date(expense.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                                                    <span className="opacity-30">·</span>
                                                    <span className="whitespace-nowrap">{getCategoryName(expense.category)}</span>
                                                    {expense.isOCR && <span className="text-[8px] font-black text-violet-500 bg-violet-50 px-1 rounded flex-shrink-0 uppercase ml-0.5">AI</span>}
                                                </div>
                                            </div>
                                            {expense.receiptUrl && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedReceiptUrl(expense.receiptUrl || null);
                                                    }}
                                                    className={`${isCompact ? 'p-1' : 'p-1.5'} bg-violet-50 text-violet-500 rounded-lg hover:bg-violet-100 transition-colors flex-shrink-0`}
                                                    title="영수증 보기"
                                                >
                                                    <FileImage size={isCompact ? 12 : 14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Amount + Actions */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className={`font-black text-slate-900 ${isCompact ? 'text-[11px]' : 'text-[13px]'} tabular-nums`} translate="no">
                                                {formatCurrency(expense.amount, expense.currency)}
                                            </span>
                                            {expense.currency !== 'KRW' && expense.amountKRW && (
                                                <span className={`${isCompact ? 'text-[8px]' : 'text-[10px]'} font-bold text-indigo-500 tabular-nums`} translate="no">
                                                    (₩ {expense.amountKRW.toLocaleString()})
                                                </span>
                                            )}
                                        </div>
                                        <div className={`${isCompact ? 'flex' : 'hidden md:flex'} items-center gap-0.5 ${isCompact ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                            <button
                                                onClick={() => handleEdit(expense)}
                                                className={`${isCompact ? 'p-1' : 'p-1.5'} text-slate-300 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-all`}
                                            >
                                                <Pencil size={isCompact ? 12 : 14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className={`${isCompact ? 'p-1' : 'p-1.5'} text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all`}
                                            >
                                                <Trash2 size={isCompact ? 12 : 14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

            <ExpenseInputModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                tripId={selectedTripId}
                expenseToEdit={editingExpense}
            />
            {/* Receipt Viewer Modal */}
            {
                selectedReceiptUrl && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setSelectedReceiptUrl(null)}
                    >
                        <div className="relative max-w-4xl w-full max-h-full flex flex-col items-center">
                            <button
                                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                                onClick={() => setSelectedReceiptUrl(null)}
                            >
                                <X size={24} />
                            </button>
                            <img
                                src={selectedReceiptUrl}
                                alt="영수증"
                                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-300"
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div className="mt-4 flex gap-4">
                                <a
                                    href={selectedReceiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold backdrop-blur-md transition-all flex items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Maximize2 size={16} />
                                    <span>원본 보기</span>
                                </a>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
