/**
 * 이미지 URL을 Base64 데이터 URI로 변환합니다.
 * CORS 문제가 발생할 경우 원래 URL을 반환하거나 실패할 수 있습니다.
 */
export const convertImageToBase64 = async (url: string): Promise<string> => {
    try {
        // 1. Try direct fetch
        const response = await fetch(url, { mode: 'cors' });
        const blob = await response.blob();
        return await blobToBase64(blob);
    } catch (error) {
        console.warn('Direct fetch failed, trying proxy...', error);
        try {
            // 2. Try with CORS Proxy
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            return await blobToBase64(blob);
        } catch (proxyError) {
            console.error('Proxy fetch failed:', proxyError);
            throw proxyError;
        }
    }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};
