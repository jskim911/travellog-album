import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Check } from 'lucide-react';

interface AISuggestionsProps {
    suggestions: string[];
    onSelect: (caption: string) => void;
    onRegenerate?: () => void;
    loading?: boolean;
    selectedCaption?: string;
}

export const AISuggestions: React.FC<AISuggestionsProps> = ({
    suggestions,
    onSelect,
    onRegenerate,
    loading = false,
    selectedCaption = ''
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (suggestions.length === 0 && !loading) {
        return null;
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">AI 추천 소감</h4>
                        <p className="text-xs text-slate-500">마음에 드는 문구를 선택하세요</p>
                    </div>
                </div>

                {onRegenerate && !loading && (
                    <button
                        onClick={onRegenerate}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                        disabled={loading}
                    >
                        <RefreshCw size={14} />
                        재생성
                    </button>
                )}
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="h-12 bg-slate-100 rounded-xl animate-pulse"
                            style={{ animationDelay: `${i * 100}ms` }}
                        />
                    ))}
                </div>
            ) : (
                /* Suggestions Grid */
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                    {suggestions.map((suggestion, index) => {
                        const isSelected = selectedCaption === suggestion;

                        return (
                            <button
                                key={index}
                                onClick={() => onSelect(suggestion)}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className={`
                  relative group text-left px-4 py-3 rounded-xl border-2 transition-all duration-200
                  ${isSelected
                                        ? 'border-violet-500 bg-violet-50 shadow-md'
                                        : hoveredIndex === index
                                            ? 'border-violet-300 bg-violet-50/50 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-violet-200'
                                    }
                `}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Number Badge */}
                                    <div className={`
                    flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${isSelected
                                            ? 'bg-violet-600 text-white'
                                            : 'bg-slate-100 text-slate-500 group-hover:bg-violet-100 group-hover:text-violet-600'
                                        }
                  `}>
                                        {isSelected ? <Check size={14} /> : index + 1}
                                    </div>

                                    {/* Suggestion Text */}
                                    <p className={`
                    flex-1 text-sm leading-relaxed transition-colors
                    ${isSelected
                                            ? 'text-violet-900 font-medium'
                                            : 'text-slate-700 group-hover:text-slate-900'
                                        }
                  `}>
                                        {suggestion}
                                    </p>
                                </div>

                                {/* Selected Indicator */}
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-2 h-2 bg-violet-600 rounded-full animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Footer Note */}
            {!loading && suggestions.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="w-1 h-1 bg-blue-500 rounded-full" />
                    <p className="text-xs text-blue-700">
                        선택 후 직접 수정도 가능합니다
                    </p>
                </div>
            )}
        </div>
    );
};
