import React from 'react';
import { MapPin, Calendar, Image as ImageIcon, Star, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { Album } from '../types';

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
  return (
    <div
      onClick={() => isSelectionMode && onToggleSelect && onToggleSelect(album)}
      className={`
        group relative mb-6 break-inside-avoid rounded-xl overflow-hidden shadow-sm transition-all duration-300
        ${isSelectionMode ? 'cursor-pointer' : 'hover:shadow-xl hover:-translate-y-1'}
        ${isSelected ? 'ring-4 ring-violet-500 ring-offset-2' : ''}
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
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(album.id, album.coverUrl);
            }}
            className="bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm"
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        <h3 className="text-lg font-bold text-white mb-1 leading-tight drop-shadow-sm">
          {album.title}
        </h3>
      </div>
    </div>
  );
};