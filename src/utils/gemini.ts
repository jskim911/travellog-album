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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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