import React, { useState } from 'react';
import { MapPin, Calendar, Trash2, Download, Check, Eye, Edit2, X as XIcon, Camera, Sparkles } from 'lucide-react';
import { Album } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoCardProps {
    album: Album;
    onDelete?: (id: string, photoUrl: string) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (album: Album) => void;
    showMetadata?: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
    album,
    onDelete,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    showMetadata = true
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(album.title);
    const [isSaving, setIsSaving] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleSaveTitle = async () => {
        if (editedTitle.trim() === album.title || !editedTitle.trim()) {
            setIsEditingTitle(false);
            setEditedTitle(album.title);
            return;
        }

        setIsSaving(true);
        try {
            const docRef = doc(db, 'photos', album.id);
            await updateDoc(docRef, {
                title: editedTitle.trim()
            });
            setIsEditingTitle(false);
        } catch (error) {
            console.error('Failed to update title:', error);
            alert('제목 수정에 실패했습니다.');
            setEditedTitle(album.title);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            layout
            onClick={() => isSelectionMode && onToggleSelect && onToggleSelect(album)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={!isSelectionMode ? { y: -8 } : {}}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`
                group relative rounded-[2rem] overflow-hidden transition-all duration-500
                ${isSelectionMode ? 'cursor-pointer' : 'shadow-md hover:shadow-2xl'}
                ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-4 scale-[0.98]' : ''}
                bg-white border border-slate-200/60
            `}
        >
            {/* Selection Checkbox (Top Left) */}
            {isSelectionMode && (
                <div className="absolute top-4 left-4 z-20">
                    <motion.div
                        initial={false}
                        animate={isSelected ? { scale: 1.1, backgroundColor: '#4f46e5' } : { scale: 1, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                        className={`
                            w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-lg
                            ${isSelected ? 'text-white' : 'text-slate-300 border-2 border-white'}
                        `}
                    >
                        {isSelected && <Check size={18} className="font-bold" />}
                    </motion.div>
                </div>
            )}

            {/* Image Container */}
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-50">
                <img
                    src={album.coverUrl}
                    alt={album.title}
                    onError={() => setImageError(true)}
                    className={`
                        w-full h-full object-cover transition-all duration-700
                        ${isSelectionMode && !isSelected ? 'grayscale opacity-50' : 'group-hover:scale-110'}
                        ${imageError ? 'opacity-0' : 'opacity-100'}
                    `}
                    loading="lazy"
                />

                {/* Image Error Placeholder */}
                {imageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                        <div className="text-center">
                            <Camera size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Image Load Failed</p>
                        </div>
                    </div>
                )}

                {/* Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Floating Meta (Top Right/Left) */}
                <AnimatePresence>
                    {!isSelectionMode && isHovered && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-4 right-4 flex gap-2 z-10"
                        >
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(album.id, album.coverUrl);
                                    }}
                                    className="p-2.5 bg-red-500/90 backdrop-blur-md text-white rounded-full transition-all shadow-lg hover:bg-red-600 hover:rotate-12"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(album.coverUrl, '_blank');
                                }}
                                className="p-2.5 bg-white/90 backdrop-blur-md text-slate-700 rounded-full transition-all shadow-lg hover:bg-white hover:scale-110"
                            >
                                <Download size={16} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Content Area */}
            <div className="p-4 sm:p-5">
                {/* Metadata Row (Merged one line) */}
                {showMetadata && (
                    <div className="flex items-center gap-3 mb-3 text-[10px] font-bold text-slate-400">
                        <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-indigo-400" />
                            <span className="truncate max-w-[80px] uppercase tracking-wider">{album.location || "Earth"}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <div className="flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{album.date}</span>
                        </div>
                    </div>
                )}

                {/* Title Section */}
                <div className="relative group/title">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                                className="w-full text-base font-bold text-slate-800 bg-slate-50 border-b-2 border-indigo-400 outline-none py-1"
                            />
                            <button onClick={handleSaveTitle} disabled={isSaving} className="text-emerald-500">
                                <Check size={18} />
                            </button>
                            <button onClick={() => setIsEditingTitle(false)} className="text-slate-400">
                                <XIcon size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm sm:text-base font-black text-slate-800 line-clamp-1 leading-snug group-hover:text-indigo-600 transition-colors">
                                {album.description || album.title || "Untitled Memory"}
                            </h3>
                            {!isSelectionMode && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditingTitle(true);
                                    }}
                                    className="p-1.5 text-slate-200 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Edit2 size={12} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
