import React, { useState } from 'react';
import { MapPin, Calendar, Star, Trash2, Download, Heart, MessageCircle, Eye, Edit2, Check, X as XIcon } from 'lucide-react';
import { Album } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

    const renderRating = (rating?: number) => {
        if (!rating) return null;
        return (
            <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                        key={i}
                        size={12}
                        className={`${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div
            onClick={() => isSelectionMode && onToggleSelect && onToggleSelect(album)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
        group relative rounded-2xl overflow-hidden shadow-md transition-all duration-300
        ${isSelectionMode ? 'cursor-pointer' : 'hover:shadow-2xl hover:-translate-y-2'}
        ${isSelected ? 'ring-4 ring-violet-500 ring-offset-2 scale-95' : ''}
        bg-white
      `}
        >
            {/* Selection Checkbox (Top Left) */}
            {isSelectionMode && (
                <div className="absolute top-3 left-3 z-20">
                    <div className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-all
            ${isSelected
                            ? 'bg-violet-600 shadow-lg'
                            : 'bg-white/90 backdrop-blur-sm border-2 border-white'
                        }
          `}>
                        {isSelected && <Check size={16} className="text-white" />}
                    </div>
                </div>
            )}

            {/* Image Container */}
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                    src={album.coverUrl}
                    alt={album.title}
                    onError={() => setImageError(true)}
                    className={`
            w-full h-full object-cover transition-all duration-700
            ${isSelectionMode && !isSelected ? 'grayscale opacity-70' : 'group-hover:scale-110'}
            ${imageError ? 'opacity-0' : 'opacity-100'}
          `}
                />

                {/* Image Error Placeholder */}
                {imageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                        <div className="text-center">
                            <Eye size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-xs text-slate-400">이미지 로드 실패</p>
                        </div>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Quick Actions (Hover) */}
                {!isSelectionMode && isHovered && (
                    <div className="absolute top-3 right-3 flex gap-2 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(album.id, album.coverUrl);
                                }}
                                className="p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full transition-all shadow-lg hover:scale-110"
                                title="삭제"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(album.coverUrl, '_blank');
                            }}
                            className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full transition-all shadow-lg hover:scale-110"
                            title="다운로드"
                        >
                            <Download size={14} />
                        </button>
                    </div>
                )}

                {/* Rating Badge (Top Left) */}
                {!isSelectionMode && album.rating && album.rating > 0 && (
                    <div className="absolute top-3 left-3 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full shadow-md">
                        {renderRating(album.rating)}
                    </div>
                )}
            </div>

            {/* Content - One Line Layout */}
            <div className="px-3 py-2.5 bg-white">
                <div className="flex items-center gap-2">
                    {/* 1. Description/Title (Takes maximum space) */}
                    <p className="text-sm font-bold text-slate-800 leading-none truncate flex-1 min-w-0" title={album.description || album.title}>
                        {album.description || album.title || "제목 없음"}
                    </p>

                    {/* 2. Metadata (Location & Date on the right) */}
                    {showMetadata && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
                            {album.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin size={11} className="text-violet-500 flex-shrink-0" />
                                    <span className="truncate max-w-[60px] sm:max-w-[80px] text-[11px] leading-none">{album.location}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-0.5">
                                {/* Date (Text only to save space, or minimal icon) */}
                                <span className="text-[10px] sm:text-[11px] text-slate-400 leading-none tracking-tight">{album.date}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
