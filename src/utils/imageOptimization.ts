import imageCompression from 'browser-image-compression';

export interface OptimizedImages {
    original: File;
    thumbnail: File;
}

/**
 * Optimizes an image file by compressing and creating a thumbnail
 * @param file - Original image file
 * @returns Object containing optimized original and thumbnail
 */
export async function optimizeImage(file: File): Promise<OptimizedImages> {
    try {
        // Options for the main image (max 2MB)
        const mainOptions = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp' as const
        };

        // Options for thumbnail (max 200KB)
        const thumbnailOptions = {
            maxSizeMB: 0.2,
            maxWidthOrHeight: 400,
            useWebWorker: true,
            fileType: 'image/webp' as const
        };

        // Compress both versions in parallel
        const [compressedOriginal, compressedThumbnail] = await Promise.all([
            imageCompression(file, mainOptions),
            imageCompression(file, thumbnailOptions)
        ]);

        // Create new File objects with proper names
        const originalFile = new File(
            [compressedOriginal],
            file.name.replace(/\.[^/.]+$/, '.webp'),
            { type: 'image/webp' }
        );

        const thumbnailFile = new File(
            [compressedThumbnail],
            `thumb_${file.name.replace(/\.[^/.]+$/, '.webp')}`,
            { type: 'image/webp' }
        );

        return {
            original: originalFile,
            thumbnail: thumbnailFile
        };
    } catch (error) {
        console.error('Image optimization error:', error);
        throw new Error('이미지 최적화 중 오류가 발생했습니다.');
    }
}

/**
 * Gets image dimensions from a file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.width,
                height: img.height
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('이미지를 로드할 수 없습니다.'));
        };

        img.src = url;
    });
}

/**
 * Validates if a file is an allowed image type
 */
export function isValidImageType(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    return allowedTypes.includes(file.type);
}

/**
 * Validates if a file size is within the limit (10MB)
 */
export function isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
}
