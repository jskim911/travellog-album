import React from 'react';
import { Plus, Receipt, PieChart, TrendingUp } from 'lucide-react';

export const ExpenseSection: React.FC = () => {
    return (
        <div className="space-y-8">
            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg">
                    <p className="text-emerald-100 text-sm font-medium mb-1">총 지출</p>
                    <h3 className="text-3xl font-black">₩ 1,250,000</h3>
                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-100 bg-white/10 w-fit px-2 py-1 rounded-full">
                        <TrendingUp size={12} />
                        <span>예산 내 사용 중</span>
                    </div>
                </div>

                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-slate-500 text-sm font-medium">카테고리별</p>
                        <PieChart size={18} className="text-slate-400" />
                    </div>
                    <div className="space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">식비</span>
                            <span className="font-bold text-slate-800">45%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[45%]" />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                        <Receipt size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">영수증 스캔</h4>
                        <p className="text-xs text-slate-500 mt-1">AI로 자동 입력해보세요</p>
                    </div>
                    <button className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors">
                        스캔하기
                    </button>
                </div>
            </div>

            {/* Expense List */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900">지출 내역</h3>
                    <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        <Plus size={16} />
                        수동 입력
                    </button>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 border-b border-slate-200 last:border-0 hover:bg-white transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm border border-slate-100">
                                    🍽️
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">맛있는 점심</h4>
                                    <p className="text-xs text-slate-500">2024. 12. 14 • 식비</p>
                                </div>
                            </div>
                            <span className="font-bold text-slate-900">- ₩ 15,000</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
