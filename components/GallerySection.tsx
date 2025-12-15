import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Album } from '../types';
import { PhotoCard } from './PhotoCard';

interface GallerySectionProps {
    title: string;
    subtitle?: string;
    albums: Album[];
    onDelete?: (id: string, photoUrl: string) => void;
    isSelectionMode?: boolean;
    selectedIds: Set<string>;
    onToggleSelect?: (album: Album) => void;
    defaultExpanded?: boolean;
    icon?: React.ReactNode;
}

export const GallerySection: React.FC<GallerySectionProps> = ({
    title,
    subtitle,
    albums,
    onDelete,
    isSelectionMode,
    selectedIds,
    onToggleSelect,
    defaultExpanded = true,
    icon
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (albums.length === 0) return null;

    return (
        <div className="mb-8">
            {/* Section Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full group mb-4 text-left"
            >
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 hover:border-violet-300 transition-all">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-xl flex items-center justify-center text-white shadow-md">
                                {icon}
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                                {title}
                                <span className="text-sm font-normal text-slate-500">
                                    ({albums.length}장)
                                </span>
                            </h2>
                            {subtitle && (
                                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className={`
            p-2 rounded-lg transition-all
            ${isExpanded ? 'bg-violet-100' : 'bg-slate-100 group-hover:bg-slate-200'}
          `}>
                        {isExpanded ? (
                            <ChevronUp size={20} className="text-violet-600" />
                        ) : (
                            <ChevronDown size={20} className="text-slate-500" />
                        )}
                    </div>
                </div>
            </button>

            {/* Photos Grid */}
            {isExpanded && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    {albums.map((album) => (
                        <PhotoCard
                            key={album.id}
                            album={album}
                            onDelete={onDelete}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedIds.has(album.id)}
                            onToggleSelect={onToggleSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
