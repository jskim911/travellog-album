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
/**
 * HTML 요소를 PDF로 변환 (스크롤 영역 포함 전체 캡처)
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

    // 1. 캡처를 위한 복제본 생성
    const clone = element.cloneNode(true) as HTMLElement;

    // 2. 복제본 스타일 강제 조정 (전체 내용 표시)
    const originalWidth = element.scrollWidth;
    const originalHeight = element.scrollHeight;

    clone.style.width = `${originalWidth}px`;
    clone.style.height = `${originalHeight}px`;
    clone.style.position = 'fixed';
    clone.style.top = '0'; // 화면 밖으로 보내면 렌더링 안될 수 있으므로 0,0에 두고 z-index로 숨김
    clone.style.left = '0';
    clone.style.zIndex = '-9999'; // 사용자에게 안 보이게 뒤로 숨김
    clone.style.overflow = 'visible'; // 스크롤바 제거
    clone.style.transform = 'none'; // 스케일링 제거
    clone.style.margin = '0';
    clone.style.maxHeight = 'none';
    clone.style.maxWidth = 'none';

    // 3. 복제본을 body에 추가
    document.body.appendChild(clone);

    // 이미지 로딩 대기 (필요 시)
    const images = clone.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    }));

    try {
        // 4. 복제본 캡처
        const canvas = await html2canvas(clone, {
            scale: 2, // 고해상도
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 15000,
            width: originalWidth,
            height: originalHeight,
            windowWidth: originalWidth,
            windowHeight: originalHeight,
            scrollX: 0,
            scrollY: 0
        });

        const imgData = canvas.toDataURL('image/jpeg', quality);

        // 5. PDF 생성
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: format
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // 이미지 비율 유지하며 PDF에 맞춤 (가로 기준 or 세로 기준)
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

        // 중앙 정렬 좌표 계산
        const finalImgWidth = imgWidth * ratio;
        const finalImgHeight = imgHeight * ratio;
        const imgX = (pdfWidth - finalImgWidth) / 2;
        const imgY = (pdfHeight - finalImgHeight) / 2; // 세로 중앙 정렬 (선택 사항, 상단 정렬 원하면 0)

        // 상단 정렬을 원하시면 imgY를 0이나 적절한 마진값으로 변경하세요.
        // 여기서는 상단 여백을 조금 주고 시작하는게 보통 보기 좋음.
        const marginY = 10;

        // 페이지보다 이미지가 길면 페이지 나누기 로직이 필요하지만, 
        // 현재는 '한 장에 욱여넣기' 또는 '긴 이미지 하나로' 처리 중.
        // 사용자가 "짤렸다"고 했으므로, 비율 맞춰서 한 장에 다 넣는 것이 1차적인 해결책.
        // 만약 내용이 너무 길어서 작게 보인다면 페이지 나눔(generateMultiPagePDF)을 고려해야 함.
        // 일단은 '짤리는 것' 방지를 위해 비율대로 축소하여 전체를 보여줌.

        pdf.addImage(imgData, 'JPEG', imgX, 10, finalImgWidth, finalImgHeight);

        // Blob 반환
        return pdf.output('blob');
    } catch (error) {
        console.error('PDF 생성 실패:', error);
        throw new Error('PDF 생성 중 오류가 발생했습니다.');
    } finally {
        // 6. 복제본 제거
        document.body.removeChild(clone);
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
