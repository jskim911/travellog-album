import { GoogleGenerativeAI } from "@google/generative-ai";

const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || "";
};

const genAI = new GoogleGenerativeAI(getApiKey());

/**
 * Converts a File object to a base64 string.
 */
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes the photo using Gemini to generate a sentimental travel caption.
 */
export interface AIAnalysisResult {
  title: string;
  impression: string;
  rating: number;
}

/**
 * Analyzes the photo using Gemini to generate a title, short impression, and rating.
 */
export const analyzePhotoAndGenerateCaption = async (file: File): Promise<AIAnalysisResult> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const base64Data = await fileToGenerativePart(file);

    const prompt = `
        이 사진을 픽셀 단위로 자세히 관찰하고, 다른 사진과 구별되는 이 사진만의 '고유한 시각적 특징'(구체적인 피사체, 독특한 색감, 빛의 방향, 배경의 디테일 등)을 찾아내어 분석해줘.
        
        다음 요구사항을 엄격히 지켜서 JSON 형식으로 응답해줘:
        1. title: "여행의 추억" 같은 뻔한 제목 금지. 사진 속 구체적인 소재(사물, 날씨, 색깔)를 포함한 창의적인 제목 (예: "비 갠 후의 무지개", "빨간 지붕 카페").
        2. rating: 구도, 초점, 색감을 고려한 1~5점 별점.

        응답 형식 (JSON):
        {
          "title": "구체적인 제목",
          "rating": 5
        }
      `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean up markdown if present (e.g. ```json ... ```)
    const cleanText = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanText);
      return {
        title: parsed.title || "무제",
        impression: "", // User requested to remove impression
        rating: parsed.rating || 3
      };
    } catch (e) {
      console.error("JSON Parse Error", e);
      return {
        title: "여행의 순간",
        impression: "",
        rating: 4
      };
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    const fallbacks = ["여행의 기록", "소중한 순간", "다시 가고픈 곳"];
    return {
      title: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      impression: "",
      rating: 3
    };
  }
};

/**
 * Generates 10 caption suggestions for a travel photo
 */
export const generateCaptionSuggestions = async (
  file: File,
  location?: string
): Promise<string[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const base64Data = await fileToGenerativePart(file);

    const prompt = `
      이 여행 사진을 분석하고, 여행자가 사용할 수 있는 감성적인 소감 문구를 정확히 10개 추천해주세요.
      ${location ? `장소: ${location}` : ''}
      
      각 문구는:
      - 20-50자 이내
      - 감성적이고 개인적인 느낌
      - 다양한 톤 (행복, 평화, 설렘, 감동, 그리움, 여유 등)
      - 구체적이고 진솔한 표현
      
      JSON 배열 형태로만 반환해주세요:
      ["문구1", "문구2", "문구3", "문구4", "문구5", "문구6", "문구7", "문구8", "문구9", "문구10"]
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed) && parsed.length === 10) {
        return parsed;
      }
      // If not exactly 10, return fallback
      return getFallbackCaptions();
    } catch (e) {
      console.error("JSON Parse Error for captions:", e);
      return getFallbackCaptions();
    }
  } catch (error) {
    console.error("Gemini API Error (captions):", error);
    return getFallbackCaptions();
  }
};

/**
 * Fallback captions when AI fails
 */
const getFallbackCaptions = (): string[] => {
  return [
    "이 순간이 영원하길",
    "다시 돌아오고 싶은 곳",
    "마음이 편안해지는 풍경",
    "잊지 못할 추억",
    "여행의 설렘이 가득한 순간",
    "시간이 멈춘 듯한 평화",
    "새로운 발견의 기쁨",
    "함께여서 더 특별한 순간",
    "일상을 벗어난 자유",
    "소중한 기억 하나 더"
  ];
};

/**
 * Extracts receipt data using OCR
 */
export interface ReceiptData {
  merchantName: string;
  date: string;
  items: Array<{ name: string; price: number }>;
  total: number;
  currency: string;
}

export const extractReceiptData = async (file: File): Promise<ReceiptData> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const base64Data = await fileToGenerativePart(file);

    const prompt = `
      이 영수증 이미지에서 다음 정보를 추출해주세요:
      - 상호명 (가게 이름)
      - 날짜 (YYYY-MM-DD 형식)
      - 항목별 내역 (상품명과 가격)
      - 총 금액
      - 통화 (KRW, USD 등)
      
      JSON 형태로만 반환해주세요:
      {
        "merchantName": "상호명",
        "date": "YYYY-MM-DD",
        "items": [{"name": "항목1", "price": 10000}, {"name": "항목2", "price": 5000}],
        "total": 15000,
        "currency": "KRW"
      }
      
      만약 정보를 찾을 수 없으면 빈 문자열이나 0을 사용하세요.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanText);
      return {
        merchantName: parsed.merchantName || "알 수 없음",
        date: parsed.date || new Date().toISOString().split('T')[0],
        items: parsed.items || [],
        total: parsed.total || 0,
        currency: parsed.currency || "KRW"
      };
    } catch (e) {
      console.error("JSON Parse Error for receipt:", e);
      throw new Error("영수증 데이터를 추출할 수 없습니다.");
    }
  } catch (error) {
    console.error("Gemini API Error (receipt):", error);
    throw new Error("영수증 분석 중 오류가 발생했습니다.");
  }
};