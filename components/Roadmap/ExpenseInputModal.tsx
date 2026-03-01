import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Check, Loader2 } from 'lucide-react';
import { Expense, ExpenseCategory, Currency } from '../../types';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../src/hooks/useAuth';

interface ExpenseInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string | null;
    expenseToEdit?: Expense | null;
}

export const ExpenseInputModal: React.FC<ExpenseInputModalProps> = ({ isOpen, onClose, tripId, expenseToEdit }) => {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>('KRW');
    const [category, setCategory] = useState<ExpenseCategory>('food');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
    const [exchangeRate, setExchangeRate] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && expenseToEdit) {
            setDate(new Date(expenseToEdit.date).toISOString().split('T')[0]);
            setDescription(expenseToEdit.description);
            setCurrency(expenseToEdit.currency as Currency);
            setCategory(expenseToEdit.category);
            setExistingReceiptUrl(expenseToEdit.receiptUrl || null);

            setAmount(expenseToEdit.amount.toString());
            setExchangeRate(expenseToEdit.exchangeRate?.toString() || '1');
        } else if (isOpen && !expenseToEdit) {
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setCurrency('KRW');
            setCategory('food');
            setReceiptFile(null);
            setExistingReceiptUrl(null);

            setAmount('');
            setExchangeRate('1');
        }
    }, [isOpen, expenseToEdit, currency]);

    const calculateConvertedAmount = () => {
        const a = parseFloat(amount.replace(/,/g, '') || '0');
        const r = parseFloat(exchangeRate.replace(/,/g, '') || '1');
        if (!isNaN(a) && !isNaN(r)) {
            return Math.round(a * r).toLocaleString();
        }
        return '0';
    };

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setReceiptFile(file);
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);

        try {
            let receiptUrl = existingReceiptUrl || '';
            if (receiptFile) {
                const storageRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${receiptFile.name}`);
                const snapshot = await uploadBytes(storageRef, receiptFile);
                receiptUrl = await getDownloadURL(snapshot.ref);
            }

            const rawAmount = amount || '0';
            const rawRate = exchangeRate || '1';
            const numAmount = parseFloat(rawAmount.replace(/,/g, '')) || 0;
            const numRate = currency === 'KRW' ? 1 : (parseFloat(rawRate.replace(/,/g, '')) || 1);

            const expenseData = {
                userId: user.uid,
                itineraryId: tripId,
                date: new Date(date),
                description,
                amount: numAmount,
                currency,
                exchangeRate: numRate,
                amountKRW: Math.round(numAmount * numRate),
                category,
                receiptUrl,
                isOCR: false,
            };

            if (expenseToEdit) {
                await updateDoc(doc(db, 'expenses', expenseToEdit.id), {
                    ...expenseData,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'expenses'), {
                    ...expenseData,
                    createdAt: serverTimestamp(),
                });
            }

            onClose();
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('저장에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories: { value: ExpenseCategory, label: string, icon: string }[] = [
        { value: 'food', label: '식비', icon: '🍽️' },
        { value: 'transport', label: '교통', icon: '🚌' },
        { value: 'accommodation', label: '숙박', icon: '🏨' },
        { value: 'shopping', label: '쇼핑', icon: '🛍️' },
        { value: 'activity', label: '관광/활동', icon: '🎫' },
        { value: 'flight', label: '항공', icon: '✈️' },
        { value: 'golf', label: '골프', icon: '⛳' },
        { value: 'other', label: '기타', icon: '🎸' }
    ];

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 max-h-[85dvh] flex flex-col">
                <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-white z-10">
                        <h2 className="text-lg font-black text-slate-900" translate="no">
                            {expenseToEdit ? '✏️ 지출 수정' : '💸 지출 추가'}
                        </h2>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-6">
                        {/* Receipt Attachment */}
                        <div className="pb-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                {receiptFile || existingReceiptUrl ? (
                                    <>
                                        <Check size={16} className="text-green-500" />
                                        <span>{receiptFile ? '영수증 사진 변경' : '영수증 조회/변경'}</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={16} />
                                        <span>영수증 사진 첨부</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">금액</label>
                            <div className="flex gap-2">
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as Currency)}
                                    className="px-3 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                                    translate="no"
                                >
                                    <option value="KRW">₩ KRW</option>
                                    <option value="USD">$ USD</option>
                                    <option value="EUR">€ EUR</option>
                                    <option value="JPY">¥ JPY</option>
                                    <option value="CNY">¥ CNY</option>
                                    <option value="THB">฿ THB</option>
                                </select>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    onBlur={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                    placeholder="0"
                                    className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-xl font-black text-slate-900 placeholder-slate-300 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all duration-300 focus:scale-[1.02] focus:relative focus:z-50 focus:shadow-2xl tabular-nums"
                                    required
                                />
                            </div>
                        </div>

                        {/* Exchange Rate Logic */}
                        {currency !== 'KRW' && (
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-end gap-4">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black text-indigo-400 mb-1.5 uppercase tracking-widest">적용 환율 (1 {currency}당 KRW)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={exchangeRate}
                                            onChange={(e) => setExchangeRate(e.target.value)}
                                            onBlur={(e) => setExchangeRate(e.target.value.replace(/[^0-9.]/g, ''))}
                                            className="w-full px-3 py-2 bg-white rounded-lg text-sm font-bold text-slate-900 border border-indigo-100 outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-300 focus:scale-[1.02] focus:relative focus:z-50 focus:shadow-2xl tabular-nums"
                                            placeholder="환율 입력"
                                            required={currency !== 'KRW'}
                                        />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-indigo-400 mb-1 uppercase tracking-widest">원화 환산 금액</p>
                                        <p className="text-lg font-black text-indigo-600 tabular-nums">
                                            ₩ {calculateConvertedAmount()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">내용</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="예: 스타벅스, 택시비, 호텔"
                                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-300 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all"
                                required
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">날짜</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">카테고리</label>
                            <div className="grid grid-cols-4 gap-2">
                                {categories.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setCategory(c.value)}
                                        className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-xs font-bold transition-all border-2 ${category === c.value
                                            ? 'bg-violet-50 border-violet-400 text-violet-700 shadow-sm'
                                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                                            }`}
                                        translate="no"
                                    >
                                        <span className="text-lg">{c.icon}</span>
                                        <span className="truncate w-full text-center text-[11px] font-bold">{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sticky Footer */}
                    <div className="p-5 border-t border-slate-100 bg-white flex-shrink-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-5">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black shadow-lg shadow-violet-200 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Check size={18} />
                            )}
                            <span className="font-black">
                                {expenseToEdit ? '수정 완료' : '저장하기'}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
