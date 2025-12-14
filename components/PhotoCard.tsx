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
            <div className="relative aspect-square overflow-hidden bg-slate-100">
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

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                {isEditingTitle ? (
                    <div className="flex items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle();
                                if (e.key === 'Escape') {
                                    setEditedTitle(album.title);
                                    setIsEditingTitle(false);
                                }
                            }}
                            className="flex-1 px-3 py-1.5 text-sm font-bold bg-slate-50 border-2 border-violet-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
                            autoFocus
                            disabled={isSaving}
                        />
                        <button
                            onClick={handleSaveTitle}
                            disabled={isSaving}
                            className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all disabled:opacity-50"
                        >
                            <Check size={16} />
                        </button>
                        <button
                            onClick={() => {
                                setEditedTitle(album.title);
                                setIsEditingTitle(false);
                            }}
                            disabled={isSaving}
                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all disabled:opacity-50"
                        >
                            <XIcon size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-start justify-between gap-2 mb-3 group/title">
                        <h3 className="flex-1 text-sm font-bold text-slate-900 leading-tight line-clamp-2">
                            {album.title}
                        </h3>
                        {!isSelectionMode && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditingTitle(true);
                                }}
                                className="opacity-0 group-hover/title:opacity-100 p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-all"
                                title="제목 수정"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Description */}
                {showMetadata && album.description && (
                    <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                        {album.description}
                    </p>
                )}

                {/* Metadata */}
                {showMetadata && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin size={14} className="text-violet-500 flex-shrink-0" />
                            <span className="font-medium truncate">{album.location || '위치 정보 없음'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar size={14} className="text-blue-500 flex-shrink-0" />
                            <span>{album.date}</span>
                        </div>
                    </div>
                )}

                {/* Footer Actions (Optional) */}
                {!isSelectionMode && isHovered && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
                                <Heart size={14} />
                                <span>0</span>
                            </button>
                            <button className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors">
                                <MessageCircle size={14} />
                                <span>0</span>
                            </button>
                        </div>
                        <button className="text-xs text-slate-400 hover:text-slate-600 font-medium">
                            자세히 보기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
