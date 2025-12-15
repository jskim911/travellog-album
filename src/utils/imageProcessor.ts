// Image processing utilities using HTML5 Canvas
// This acts as our "Local AI" styling engine

export type EmojiStyle = 'original' | 'grayscale' | 'sepia' | 'pixel' | 'blur' | 'brightness' | 'contrast' | 'invert' | '3d-avatar';

export const applyStyle = async (
    imageUrl: string,
    style: EmojiStyle,
    width: number = 300,
    height: number = 300
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Draw original image resized
            ctx.drawImage(img, 0, 0, width, height);

            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;

            switch (style) {
                case 'grayscale':
                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        data[i] = avg;     // R
                        data[i + 1] = avg;   // G
                        data[i + 2] = avg;   // B
                    }
                    ctx.putImageData(imageData, 0, 0);
                    break;

                case 'sepia':
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i + 1], b = data[i + 2];
                        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                    }
                    ctx.putImageData(imageData, 0, 0);
                    break;

                case 'invert':
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = 255 - data[i];
                        data[i + 1] = 255 - data[i + 1];
                        data[i + 2] = 255 - data[i + 2];
                    }
                    ctx.putImageData(imageData, 0, 0);
                    break;

                case 'brightness':
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.min(255, data[i] + 40);
                        data[i + 1] = Math.min(255, data[i + 1] + 40);
                        data[i + 2] = Math.min(255, data[i + 2] + 40);
                    }
                    ctx.putImageData(imageData, 0, 0);
                    break;

                case 'contrast':
                    const factor = (259 * (128 + 255)) / (255 * (259 - 128));
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = factor * (data[i] - 128) + 128;
                        data[i + 1] = factor * (data[i + 1] - 128) + 128;
                        data[i + 2] = factor * (data[i + 2] - 128) + 128;
                    }
                    ctx.putImageData(imageData, 0, 0);
                    break;

                case 'pixel':
                    const sampleSize = 10;
                    for (let y = 0; y < height; y += sampleSize) {
                        for (let x = 0; x < width; x += sampleSize) {
                            const p = (x + y * width) * 4;
                            ctx.fillStyle = `rgba(${data[p]}, ${data[p + 1]}, ${data[p + 2]}, ${data[p + 3] / 255})`;
                            ctx.fillRect(x, y, sampleSize, sampleSize);
                        }
                    }
                    break;

                case 'blur':
                    ctx.filter = 'blur(5px)';
                    ctx.drawImage(img, 0, 0, width, height);
                    ctx.filter = 'none';
                    break;
            }

            resolve(canvas.toDataURL());
        };

        img.onerror = (e) => reject(e);
    });
};

export const cropImage = async (
    imageUrl: string,
    cropX: number,
    cropY: number,
    cropWidth: number,
    cropHeight: number,
    outputWidth: number = 256,
    outputHeight: number = 256
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = outputWidth;
            canvas.height = outputHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('No context'));
                return;
            }

            // Draw cropped area
            ctx.drawImage(
                img,
                cropX, cropY, cropWidth, cropHeight, // Source
                0, 0, outputWidth, outputHeight      // Destination
            );

            // Circular Mask
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = outputWidth;
            outputCanvas.height = outputHeight;
            const outCtx = outputCanvas.getContext('2d');
            if (!outCtx) return;

            outCtx.beginPath();
            outCtx.arc(outputWidth / 2, outputHeight / 2, outputWidth / 2, 0, Math.PI * 2);
            outCtx.clip();
            outCtx.drawImage(canvas, 0, 0);

            resolve(outputCanvas.toDataURL());
        };
        img.onerror = reject;
    });
};

/**
 * Applies a simulated "3D Avatar / Cartoon" look and overlays an emotion emoji
 */
export const applyAvatarEffect = async (
    imageUrl: string,
    emotionEmoji: string, // e.g. "😊"
    filterColor: string = 'rgba(255, 200, 0, 0.2)'
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        img.onload = () => {
            const width = 400; // Standardize/upscale size for better quality
            const height = 400;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Optional: Circular Crop for "Headshot" feel if it's a sticker
            // ctx.beginPath();
            // ctx.arc(width/2, height/2, width/2, 0, Math.PI*2);
            // ctx.clip();

            // 1. Draw Image with "Soft" effect
            ctx.filter = 'saturate(1.3) contrast(1.1)';

            // If we want a "Sticker" cutout effect, we would need complex semantic segmentation (AI).
            // Since we are doing this locally with Canvas, we will keep the square/circle shape 
            // but can support transparent backgrounds if the input was already transparent.
            // For now, we draw the image as is.
            ctx.drawImage(img, 0, 0, width, height);
            ctx.filter = 'none';

            // 2. Overlay Color Tint (Only if not fully transparent)
            if (filterColor !== 'transparent') {
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = filterColor;
                ctx.fillRect(0, 0, width, height);
                ctx.globalCompositeOperation = 'source-over';

                // 3. Vignette (Only for card style)
                const gradient = ctx.createRadialGradient(width / 2, height / 2, width / 3, width / 2, height / 2, width / 1.5);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            }

            // 4. Overlay Emoji (Sticker Badge)
            ctx.font = '80px Arial';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(emotionEmoji, width - 20, height - 20);

            // 5. Add "Gloss" highlight (Subtle 3D effect)
            ctx.beginPath();
            ctx.ellipse(width * 0.7, height * 0.2, width * 0.15, height * 0.1, Math.PI / -4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
    });
};
