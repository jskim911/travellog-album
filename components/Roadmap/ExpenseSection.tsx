import React, { useState, useEffect } from 'react';
import { Plus, Receipt, PieChart, TrendingUp, Trash2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { Expense, ExpenseCategory } from '../../types';
import { ExpenseInputModal } from './ExpenseInputModal';

export const ExpenseSection: React.FC = () => {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Stats
    const [totalAmount, setTotalAmount] = useState(0);
    const [categoryStats, setCategoryStats] = useState<{ category: ExpenseCategory, amount: number, percentage: number }[]>([]);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedExpenses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Expense[];

            setExpenses(fetchedExpenses);
            calculateStats(fetchedExpenses);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const calculateStats = (data: Expense[]) => {
        // 1. Total Amount (Note: Ignoring currency conversion for MVP)
        const total = data.reduce((sum, item) => sum + item.amount, 0);
        setTotalAmount(total);

        // 2. Category Stats
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Expense Card */}
                <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <p className="text-emerald-100 text-sm font-medium mb-1 relative z-10">총 지출</p>
                    <h3 className="text-3xl font-black relative z-10 tracking-tight">
                        {formatCurrency(totalAmount)}
                    </h3>
                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100 bg-white/10 w-fit px-2 py-1 rounded-full relative z-10">
                        <TrendingUp size={12} />
                        <span>{expenses.length}건의 지출 내역</span>
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

            {/* Expense List */}
            <div>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        최근 지출 내역
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-normal">{expenses.length}</span>
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
                            <p className="text-sm">아직 지출 내역이 없습니다.</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                            >
                                첫 지출 등록하기
                            </button>
                        </div>
                    ) : (
                        expenses.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-2xl shadow-sm border border-slate-200 group-hover:scale-110 transition-transform">
                                        {getCategoryIcon(expense.category)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{expense.description}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <span className="font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                {new Date(expense.date).toLocaleDateString()}
                                            </span>
                                            <span>•</span>
                                            <span>{getCategoryName(expense.category)}</span>
                                            {expense.isOCR && (
                                                <span className="flex items-center gap-0.5 text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded" title="AI 스캔됨">
                                                    <Receipt size={10} />
                                                    AI
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-black text-slate-900 text-lg">{formatCurrency(expense.amount, expense.currency)}</span>
                                    <button
                                        onClick={() => handleDelete(expense.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                        title="삭제"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <ExpenseInputModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};
