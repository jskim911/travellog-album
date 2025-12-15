/**
 * 이모지 생성기 통합 예시
 * 
 * 이 파일은 EmojiGenerator 컴포넌트를 기존 갤러리에 통합하는 방법을 보여줍니다.
 */

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import EmojiGenerator from './components/EmojiGenerator';
import { generateEmojiImage } from './src/utils/gemini';

interface Photo {
    id: string;
    url: string;
    location?: string;
    timestamp: number;
}

const GalleryWithEmojiIntegration: React.FC = () => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedPhotoForEmoji, setSelectedPhotoForEmoji] = useState<string | null>(null);
    const [showEmojiGenerator, setShowEmojiGenerator] = useState(false);

    // 갤러리에서 이모지 생성 버튼 클릭 시
    const handleCreateEmoji = (photoUrl: string) => {
        setSelectedPhotoForEmoji(photoUrl);
        setShowEmojiGenerator(true);
    };

    // 이모지 생성기 닫기
    const handleCloseEmojiGenerator = () => {
        setShowEmojiGenerator(false);
        setSelectedPhotoForEmoji(null);
    };

    return (
        <div className="gallery-container">
            {/* 갤러리 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                        <img
                            src={photo.url}
                            alt={photo.location || 'Photo'}
                            className="w-full h-64 object-cover rounded-lg"
                        />

                        {/* 호버 시 이모지 생성 버튼 표시 */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <button
                                onClick={() => handleCreateEmoji(photo.url)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
                            >
                                <Sparkles className="w-5 h-5" />
                                이모지 만들기
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 이모지 생성기 모달 */}
            {showEmojiGenerator && selectedPhotoForEmoji && (
                <EmojiGenerator
                    selectedImage={selectedPhotoForEmoji}
                    onClose={handleCloseEmojiGenerator}
                    onGenerate={generateEmojiImage}
                />
            )}
        </div>
    );
};

export default GalleryWithEmojiIntegration;

/**
 * 사용 방법:
 * 
 * 1. 기존 App.tsx 또는 GallerySection.tsx에서 import
 * 2. 갤러리 컴포넌트를 이 예시로 교체하거나 통합
 * 3. 각 사진 카드에 "이모지 만들기" 버튼 추가
 * 4. 버튼 클릭 시 EmojiGenerator 모달 표시
 * 
 * 커스터마이징:
 * - 버튼 스타일 변경
 * - 모달 애니메이션 추가
 * - 이모지 생성 완료 후 콜백 추가
 * - 생성된 이모지를 갤러리에 저장
 */
