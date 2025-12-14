import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * PDF 생성 유틸리티
 */

export interface PDFOptions {
    format?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
    quality?: number;
}

/**
 * HTML 요소를 PDF로 변환
 */
export const generatePDFFromElement = async (
    element: HTMLElement,
    fileName: string = 'document.pdf',
    options: PDFOptions = {}
): Promise<Blob> => {
    const {
        format = 'a4',
        orientation = 'portrait',
        quality = 0.95
    } = options;

    try {
        // HTML을 Canvas로 변환
        const canvas = await html2canvas(element, {
            scale: 2, // 고해상도
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 0,
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/jpeg', quality);

        // PDF 생성
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: format
        });

        // A4 크기 계산
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;

        pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

        // Blob 반환
        return pdf.output('blob');
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        throw new Error('PDF 생성 중 오류가 발생했습니다.');
    }
};

/**
 * 여러 페이지를 PDF로 생성
 */
export const generateMultiPagePDF = async (
    elements: HTMLElement[],
    fileName: string = 'document.pdf',
    options: PDFOptions = {}
): Promise<Blob> => {
    const {
        format = 'a4',
        orientation = 'portrait',
        quality = 0.95
    } = options;

    try {
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: format
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < elements.length; i++) {
            if (i > 0) {
                pdf.addPage();
            }

            const canvas = await html2canvas(elements[i], {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/jpeg', quality);
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 0;

            pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        }

        return pdf.output('blob');
    } catch (error) {
        console.error('다중 페이지 PDF 생성 실패:', error);
        throw new Error('PDF 생성 중 오류가 발생했습니다.');
    }
};

/**
 * PDF 다운로드
 */
export const downloadPDF = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * 스토리보드 PDF 생성 (간편 함수)
 */
export const generateStoryboardPDF = async (
    title: string,
    date: string,
    photos: Array<{ url: string; caption?: string; location?: string }>,
    layout: 'grid' | 'timeline' | 'magazine' = 'grid'
): Promise<Blob> => {
    // 임시 컨테이너 생성
    const container = document.createElement('div');
    container.style.width = '794px'; // A4 width in pixels at 96dpi
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(container);

    // 제목
    const titleEl = document.createElement('h1');
    titleEl.textContent = title;
    titleEl.style.fontSize = '32px';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.marginBottom = '16px';
    titleEl.style.color = '#1a1a1a';
    container.appendChild(titleEl);

    // 날짜
    const dateEl = document.createElement('p');
    dateEl.textContent = date;
    dateEl.style.fontSize = '14px';
    dateEl.style.color = '#666';
    dateEl.style.marginBottom = '32px';
    container.appendChild(dateEl);

    // 레이아웃에 따라 사진 배치
    const gridEl = document.createElement('div');
    gridEl.style.display = 'grid';

    if (layout === 'grid') {
        gridEl.style.gridTemplateColumns = 'repeat(2, 1fr)';
        gridEl.style.gap = '16px';
    } else if (layout === 'timeline') {
        gridEl.style.gridTemplateColumns = '1fr';
        gridEl.style.gap = '24px';
    } else {
        gridEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
        gridEl.style.gap = '12px';
    }

    for (const photo of photos.slice(0, 8)) {
        const photoEl = document.createElement('div');

        const img = document.createElement('img');
        img.src = photo.url;
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '8px';
        img.crossOrigin = 'anonymous';
        photoEl.appendChild(img);

        if (photo.caption) {
            const caption = document.createElement('p');
            caption.textContent = photo.caption;
            caption.style.fontSize = '12px';
            caption.style.marginTop = '8px';
            caption.style.color = '#333';
            photoEl.appendChild(caption);
        }

        gridEl.appendChild(photoEl);
    }

    container.appendChild(gridEl);

    // 이미지 로딩 대기
    await new Promise(resolve => setTimeout(resolve, 1000));

    // PDF 생성
    const blob = await generatePDFFromElement(container);

    // 임시 컨테이너 제거
    document.body.removeChild(container);

    return blob;
};
