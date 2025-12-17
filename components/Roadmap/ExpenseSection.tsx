import React, { useState, useEffect, useRef } from 'react';
import { Plus, Receipt, PieChart, TrendingUp, Trash2, Download, Calendar, Users, Calculator, FileText, Pencil } from 'lucide-react';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../../src/hooks/useAuth';
import { Expense, ExpenseCategory, Itinerary } from '../../types';
import { ExpenseInputModal } from './ExpenseInputModal';

interface ExpenseSectionProps {
    selectedTripId: string | null;
    isCompact?: boolean;
}

export const ExpenseSection: React.FC<ExpenseSectionProps> = ({ selectedTripId, isCompact = false }) => {
    const { user, loading: authLoading } = useAuth();
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]); // Filtered
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const printRef = React.useRef<HTMLDivElement>(null);

    // Trip Info for PDF and Header
    const [currentTrip, setCurrentTrip] = useState<Itinerary | null>(null);
    const [participantCount, setParticipantCount] = useState(1);

    // Stats
    const [totalAmount, setTotalAmount] = useState(0);
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

    // 2. Filter Expenses & Fetch Trip Info when selectedTripId changes
    useEffect(() => {
        // Filter logic
        if (selectedTripId) {
            const filtered = allExpenses.filter(e => e.itineraryId === selectedTripId);
            setExpenses(filtered);
            calculateStats(filtered);

            // Fetch specific trip info
            const fetchTrip = async () => {
                try {
                    const docRef = doc(db, 'itineraries', selectedTripId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setCurrentTrip({
                            id: docSnap.id,
                            ...data,
                            startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
                            endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
                        } as Itinerary);
                    } else {
                        setCurrentTrip(null);
                    }
                } catch (err) {
                    console.error("Error fetching trip details", err);
                }
            };
            fetchTrip();
        } else {
            // Show ALL/Global expenses logic?
            // If no trip selected, let's show all expenses but indicate it's "All"
            setExpenses(allExpenses);
            calculateStats(allExpenses);
            setCurrentTrip(null);
        }
    }, [selectedTripId, allExpenses]);

    const calculateStats = (data: Expense[]) => {
        const total = data.reduce((sum, item) => sum + item.amount, 0);
        setTotalAmount(total);

        const catMap: Record<string, number> = {};
        data.forEach(item => {
            catMap[item.category] = (catMap[item.category] || 0) + item.amount;
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
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                        <Users size={16} />
                        <span>여행 인원</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setParticipantCount(prev => Math.max(1, prev - 1))}
                            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition-colors"
                        >
                            -
                        </button>
                        <span className="w-8 text-center font-bold text-slate-800">{participantCount}</span>
                        <button
                            onClick={() => setParticipantCount(prev => prev + 1)}
                            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md"
                >
                    <Download size={16} />
                    PDF로 저장
                </button>
            </div>

            <div ref={printRef} className="space-y-8 p-4 sm:p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">

                {/* PDF Report Header */}
                <div className="border-b-2 border-slate-100 pb-6 mb-8">
                    {currentTrip ? (
                        <>
                            <h1 className={`${isCompact ? 'text-xl' : 'text-4xl'} font-black text-slate-900 mb-3 tracking-tight`}>
                                {currentTrip.tripName}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium mb-6 text-sm sm:text-base">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={16} />
                                    <span>
                                        {new Date(currentTrip.startDate).toLocaleDateString()} - {new Date(currentTrip.endDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span>{currentTrip.routes.length} Days</span>
                            </div>
                        </>
                    ) : (
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-6 tracking-tight">
                            전체 지출 내역
                        </h1>
                    )}

                    {/* Summary Box */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 gap-6 sm:gap-0">
                            {/* Total */}
                            <div className={`text-center ${isCompact ? 'sm:text-left sm:pr-0' : 'sm:text-left sm:pr-6'}`}>
                                <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">총 지출 금액</p>
                                <p className={`${isCompact ? 'text-xl' : 'text-3xl'} font-black text-slate-900 break-words`}>{formatCurrency(totalAmount)}</p>
                            </div>

                            {/* Participant */}
                            <div className="text-center sm:px-6 pt-4 sm:pt-0">
                                <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200 mb-1">
                                    <Users size={14} className="text-slate-400" />
                                    <span className="text-sm font-bold text-slate-700">{participantCount}명</span>
                                </div>
                                <p className="text-xs text-slate-400">여행 참가 인원</p>
                            </div>

                            {/* Per Person */}
                            <div className="text-center sm:text-right sm:pl-6 pt-4 sm:pt-0">
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center justify-center sm:justify-end gap-1">
                                    <Calculator size={12} />
                                    1인당 비용
                                </p>
                                <p className={`${isCompact ? 'text-xl' : 'text-3xl'} font-black text-violet-600 break-words`}>
                                    {formatCurrency(totalAmount / participantCount)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {!isCompact && (
                    <>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 px-1 flex items-center gap-2">
                            <PieChart size={18} className="text-slate-400" />
                            지출 상세 분석
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Total Expense Card */}
                            <div className={`p-4 sm:p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg relative overflow-hidden group ${isCompact ? 'py-3 px-4' : ''}`}>
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
                                    <p className="text-emerald-100 text-xs sm:text-sm font-medium mb-1">총 지출</p>
                                    <h3 className={`${isCompact ? 'text-2xl' : 'text-4xl'} font-black tracking-tight break-words`}>
                                        {formatCurrency(totalAmount)}
                                    </h3>
                                    {!isCompact && (
                                        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100 bg-white/10 w-fit px-2 py-1 rounded-full relative z-10">
                                            <TrendingUp size={12} />
                                            <span>{expenses.length}건의 지출 내역</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Category Stats Card */}
                            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-slate-500 text-sm font-bold">카테고리별 지출</p>
                                    <PieChart size={18} className="text-slate-400" />
                                </div>
                                <div className="space-y-3 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                                    {categoryStats.length > 0 ? categoryStats.map((stat) => (
                                        <div key={stat.category} className="space-y-1">
                                            <div className="flex justify-between text-xs sm:text-sm">
                                                <span className="text-slate-600 font-medium flex items-center gap-1.5">
                                                    <span>{getCategoryIcon(stat.category)}</span>
                                                    {getCategoryName(stat.category)}
                                                </span>
                                                <span className="font-bold text-slate-800">{Math.round(stat.percentage)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${stat.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="h-full flex items-center justify-center">
                                            <p className="text-xs text-slate-400">데이터가 없습니다.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Card */}
                            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center gap-3 hover:border-emerald-200 transition-colors">
                                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-1">
                                    <Receipt size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">새로운 지출 추가</h4>
                                    <p className="text-xs text-slate-500 mt-1">영수증 스캔으로 간편하게</p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform active:scale-95"
                                >
                                    지출 입력하기
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Expense List */}
                <div>
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className={`${isCompact ? 'text-base' : 'text-xl'} font-bold text-slate-900 flex items-center gap-2`}>
                            {selectedTripId ? '이 여행의 지출 내역' : '전체 지출 내역'}
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] sm:text-xs font-normal">{expenses.length}</span>
                        </h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                            <Plus size={16} />
                            수동 입력
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
                                <span className="text-xs">데이터를 불러오는 중입니다...</span>
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Receipt size={48} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm">
                                    {selectedTripId ? '이 여행에 등록된 지출 내역이 없습니다.' : '아직 지출 내역이 없습니다.'}
                                </p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                                >
                                    첫 지출 등록하기
                                </button>
                            </div>
                        ) : (
                            expenses.map((expense) => (
                                <div key={expense.id} className={`flex ${isCompact ? 'flex-col' : 'flex-col sm:flex-row sm:items-center'} justify-between ${isCompact ? 'p-2.5 gap-2' : 'p-3 sm:p-4 gap-3 sm:gap-4'} border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group`}>
                                    <div className={`flex items-center ${isCompact ? 'gap-2.5' : 'gap-3 sm:gap-4'}`}>
                                        <div className={`${isCompact ? 'w-9 h-9 text-lg' : 'w-10 h-10 sm:w-12 sm:h-12 text-xl sm:text-2xl'} bg-slate-100 rounded-full flex items-center justify-center shadow-sm border border-slate-200 flex-shrink-0`}>
                                            {getCategoryIcon(expense.category)}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className={`font-bold text-slate-800 ${isCompact ? 'text-[11px] mb-0.5' : 'text-base'} line-clamp-1 break-all`}>{expense.description}</h4>
                                            <div className={`flex items-center ${isCompact ? 'gap-1 text-[10px]' : 'gap-2 text-xs'} text-slate-500 flex-wrap`}>
                                                <span className="font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded whitespace-nowrap">
                                                    {new Date(expense.date).toLocaleDateString()}
                                                </span>
                                                <span className="text-slate-300">|</span>
                                                <span className="whitespace-nowrap">{getCategoryName(expense.category)}</span>
                                                {expense.isOCR && <span className="text-blue-500">AI</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`flex items-center justify-between ${isCompact ? 'pl-[2.8rem] -mt-1 w-full' : 'sm:justify-end w-full sm:w-auto pl-0'}`}>
                                        <span className={`font-black text-slate-900 ${isCompact ? 'text-sm' : 'text-xl'} truncate text-right mr-3`}>
                                            {formatCurrency(expense.amount, expense.currency)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEdit(expense)}
                                                className={`${isCompact ? 'p-1' : 'p-1.5 sm:p-2'} text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all`}
                                            >
                                                <Pencil size={isCompact ? 14 : 16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className={`${isCompact ? 'p-1' : 'p-1.5 sm:p-2'} text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all`}
                                            >
                                                <Trash2 size={isCompact ? 14 : 16} />
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
        </div >
    );
};
