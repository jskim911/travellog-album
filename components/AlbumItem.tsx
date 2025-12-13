import React, { useState } from 'react';
import { MapPin, Calendar, Image as ImageIcon, Star, Trash2, CheckCircle2, Circle, Edit2, Check, X as XIcon } from 'lucide-react';
import { Album } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AlbumItemProps {
  album: Album;
  onDelete?: (id: string, photoUrl: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (album: Album) => void;
}

export const AlbumItem: React.FC<AlbumItemProps> = ({
  album,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(album.title);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleCancelEdit = () => {
    setEditedTitle(album.title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      onClick={() => isSelectionMode && onToggleSelect && onToggleSelect(album)}
      className={`
        group relative rounded-xl overflow-hidden shadow-sm transition-all duration-300
        ${isSelectionMode ? 'cursor-pointer' : 'hover:shadow-xl hover:-translate-y-1'}
        ${isSelected ? 'ring-2 sm:ring-4 ring-violet-500 ring-offset-1 sm:ring-offset-2' : ''}
      `}
    >
      {/* Image */}
      <img
        src={album.coverUrl}
        alt={album.title}
        className={`w-full h-auto object-cover transform transition-transform duration-700
          ${isSelectionMode && !isSelected ? 'grayscale opacity-70 scale-100' : 'group-hover:scale-105'}
        `}
      />



      {/* Overlay Gradient (Always present but stronger at bottom) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

      {/* Top Right Delete Button (Hide in selection mode) */}
      {!isSelectionMode && onDelete && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(album.id, album.coverUrl);
            }}
            className="bg-red-500/80 hover:bg-red-600 text-white p-1 sm:p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
            title="삭제"
          >
            <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      )}

      {/* Content Overlay with Editable Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        {isEditingTitle ? (
          <div className="flex items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2 py-1 text-xs sm:text-sm font-bold bg-white/90 text-slate-900 rounded border-2 border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-300"
              autoFocus
              disabled={isSaving}
            />
            <button
              onClick={handleSaveTitle}
              disabled={isSaving}
              className="p-1 bg-green-500 hover:bg-green-600 text-white rounded transition-all disabled:opacity-50"
              title="저장"
            >
              <Check size={14} className="sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="p-1 bg-red-500 hover:bg-red-600 text-white rounded transition-all disabled:opacity-50"
              title="취소"
            >
              <XIcon size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group/title">
            <h3 className="flex-1 text-sm sm:text-lg font-bold text-white leading-tight drop-shadow-sm line-clamp-2">
              {album.title}
            </h3>
            {!isSelectionMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
                className="opacity-0 group-hover/title:opacity-100 p-1 bg-white/20 hover:bg-white/30 text-white rounded transition-all"
                title="제목 수정"
              >
                <Edit2 size={12} className="sm:w-3.5 sm:h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};