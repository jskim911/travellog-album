import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Calendar, DollarSign, Tag, FileText, Check, Loader2 } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900">
                        {expenseToEdit ? '지출 내역 수정' : '비용 추가'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Scanning Section */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
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
                        className="w-full py-3 bg-white border-2 border-dashed border-violet-200 hover:border-violet-400 hover:bg-violet-50 text-violet-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
                    >
                        {isScanning ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>영수증 분석 중...</span>
                            </>
                        ) : receiptFile || existingReceiptUrl ? (
                            <>
                                <Check size={20} className="text-green-500" />
                                <span className={isAiSuccess ? "text-green-600 font-bold" : "text-slate-600"}>
                                    {receiptFile
                                        ? (isAiSuccess ? `AI 입력 완료 (${receiptFile.name})` : `영수증 변경됨 (${receiptFile.name})`)
                                        : '기존 영수증 유지됨'
                                    }
                                </span>
                            </>
                        ) : (
                            <>
                                <Camera size={20} className="group-hover:scale-110 transition-transform" />
                                <span>영수증 스캔하기 (AI)</span>
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-2">
                        영수증을 찍으면 날짜, 금액, 상호명을 자동으로 입력합니다.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Amount & Currency */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">금액</label>
                        <div className="flex gap-2">
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value as Currency)}
                                className="px-3 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border-none outline-none focus:ring-2 focus:ring-violet-200"
                            >
                                <option value="KRW">KRW</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="JPY">JPY</option>
                                <option value="CNY">CNY</option>
                            </select>
                            <div className="flex-1 relative">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-lg font-bold text-slate-900 placeholder-slate-300 border-none outline-none focus:ring-2 focus:ring-violet-200 transition-all"
                                    required
                                />
                                <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">내용 (상호명)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="예: 스타벅스 커피"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-300 border-none outline-none focus:ring-2 focus:ring-violet-200 transition-all"
                                required
                            />
                            <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    {/* Date & Category Row */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">날짜</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border-none outline-none focus:ring-2 focus:ring-violet-200"
                                    required
                                />
                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">카테고리</label>
                            <div className="relative">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border-none outline-none focus:ring-2 focus:ring-violet-200 appearance-none"
                                >
                                    {categories.map(c => (
                                        <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                                    ))}
                                </select>
                                <Tag size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-violet-200 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Check size={20} />
                        )}
                        <span>
                            {expenseToEdit ? '수정 완료' : (tripId ? '이 여행 경비로 저장' : '공통 경비로 저장')}
                        </span>
                    </button>
                </form>
            </div>
        </div>
    );
};
