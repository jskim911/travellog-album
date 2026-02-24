import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Check, Loader2 } from 'lucide-react';
import { Expense, ExpenseCategory, Currency } from '../../types';
import { extractReceiptData } from '../../src/utils/gemini';
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

    const [isScanning, setIsScanning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAiSuccess, setIsAiSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && expenseToEdit) {
            setDate(new Date(expenseToEdit.date).toISOString().split('T')[0]);
            setDescription(expenseToEdit.description);
            setAmount(expenseToEdit.amount.toString());
            setCurrency(expenseToEdit.currency);
            setCategory(expenseToEdit.category);
            setExistingReceiptUrl(expenseToEdit.receiptUrl || null);
            setIsAiSuccess(expenseToEdit.isOCR || false);
        } else if (isOpen && !expenseToEdit) {
            // Reset for new entry
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setAmount('');
            setCurrency('KRW');
            setCategory('food');
            setReceiptFile(null);
            setExistingReceiptUrl(null);
            setIsAiSuccess(false);
        }
    }, [isOpen, expenseToEdit]);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setReceiptFile(file);
        setIsScanning(true);
        setIsAiSuccess(false); // Reset AI success status

        try {
            const data = await extractReceiptData(file);

            // Check if valid data returned
            if (!data.total && data.merchantName === "알 수 없음") {
                throw new Error("데이터 추출 실패");
            }

            // Auto-fill form
            setDescription(data.merchantName);
            setAmount(data.total.toString());
            setDate(data.date);
            setCurrency(data.currency as Currency || 'KRW');
            setIsAiSuccess(true); // Mark AI as successful

        } catch (error) {
            console.error('Receipt scanning failed:', error);
            // Don't alert aggressively, just let user valid
            // But user wants to know why it failed.
            alert('AI가 영수증 내용을 인식하지 못했습니다. 직접 내용을 입력해주세요.');
            // Only file is attached
        } finally {
            setIsScanning(false);
        }
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

            const expenseData = {
                userId: user.uid,
                itineraryId: tripId,
                date: new Date(date),
                description,
                amount: Number(amount),
                currency,
                category,
                receiptUrl,
                isOCR: isAiSuccess,
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
        { value: 'other', label: '기타', icon: '🎸' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
                    <h2 className="text-lg font-black text-slate-900">
                        {expenseToEdit ? '✏️ 지출 수정' : '💸 지출 추가'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {/* AI Scan Button - Compact */}
                    <div className="px-5 pt-4 pb-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                            className="w-full py-2.5 bg-violet-50 border border-violet-200 hover:border-violet-400 hover:bg-violet-100 text-violet-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>AI 분석 중...</span>
                                </>
                            ) : receiptFile || existingReceiptUrl ? (
                                <>
                                    <Check size={16} className="text-green-500" />
                                    <span className={isAiSuccess ? "text-green-600" : "text-slate-600"}>
                                        {receiptFile
                                            ? (isAiSuccess ? 'AI 입력 완료 ✓' : '영수증 첨부됨')
                                            : '기존 영수증 유지'}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Camera size={16} />
                                    <span>📷 영수증 스캔 (AI 자동입력)</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-5 pb-5 pt-2 space-y-4">
                        {/* Amount - Large & Prominent */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">금액</label>
                            <div className="flex gap-2">
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as Currency)}
                                    className="px-3 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                                >
                                    <option value="KRW">₩ KRW</option>
                                    <option value="USD">$ USD</option>
                                    <option value="EUR">€ EUR</option>
                                    <option value="JPY">¥ JPY</option>
                                    <option value="CNY">¥ CNY</option>
                                </select>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="flex-1 px-4 py-3 bg-slate-50 rounded-xl text-xl font-black text-slate-900 placeholder-slate-300 border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all"
                                    required
                                />
                            </div>
                        </div>

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

                        {/* Category Chips */}
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
                                    >
                                        <span className="text-lg">{c.icon}</span>
                                        <span className="truncate w-full text-center text-[11px]">{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3.5 mt-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-lg shadow-violet-200 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Check size={18} />
                            )}
                            <span>
                                {expenseToEdit ? '수정 완료' : '저장'}
                            </span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
