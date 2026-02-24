import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Album } from '../types';
import { PhotoCard } from './PhotoCard';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div className="mb-12">
            {/* Section Header */}
            <motion.button
                layout
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full group mb-6 text-left focus:outline-none"
            >
                <div className={`
                    flex items-center justify-between p-5 rounded-[1.5rem] transition-all duration-500
                    ${isExpanded ? 'bg-white shadow-xl shadow-indigo-50 border-indigo-100 ring-1 ring-indigo-50' : 'bg-slate-50/50 hover:bg-white border-transparent hover:shadow-lg ring-1 ring-transparent hover:ring-slate-100'}
                    border
                `}>
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-sky-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                {icon}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                    {title}
                                </h2>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-slate-200">
                                    {albums.length} items
                                </span>
                            </div>
                            {subtitle && (
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className={`
                        w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                        ${isExpanded ? 'bg-indigo-600 text-white rotate-180' : 'bg-white text-slate-400 group-hover:text-indigo-500 shadow-sm'}
                    `}>
                        <ChevronDown size={22} strokeWidth={3} />
                    </div>
                </div>
            </motion.button>

            {/* Photos Grid */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.98 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.98 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-6 pb-4">
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
