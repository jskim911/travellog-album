# ✈️ TravelLog Album v2.0

> **당신의 여행을 기록하고, 계획하고, 기억하는 가장 완벽한 방법**  
> AI와 함께하는 스마트한 여행 앨범 & 플래너

<div align="center">
  <h3>📸 Gallery · 🗺️ Roadmap · 💸 Expense · 🤖 AI Storyboard · 😊 Custom Emoji</h3>
</div>

## ✨ 주요 기능 (Key Features)

### 1. 📸 스마트 갤러리 (Smart Gallery)
- **고화질 사진 업로드**: 드래그 앤 드롭으로 대량의 사진을 클라우드에 안전하게 저장합니다.
- **AI 위치/캡션 분석**: (Gemini Vision) 사진을 올리면 AI가 자동으로 위치와 설명을 제안합니다.
- **필터링 & 정렬**: 날짜별, 장소별로 사진을 쉽게 찾아볼 수 있습니다.

### 2. 🗺️ 여행 로드맵 & 일정 (Trajectory & Itinerary)
- **Day-by-Day 일정 관리**: 여행 기간에 맞춰 일별 코스를 계획합니다.
- **타임라인 뷰**: 방문할 장소와 시간을 직관적인 타임라인으로 관리합니다.

### 3. 💸 스마트 비용 정산 (AI Expense Manager)
- **영수증 스캔 (OCR)**: 영수증 사진을 찍으면 AI가 상호명, 금액, 날짜를 자동으로 입력합니다.
- **지출 대시보드**: 카테고리별(식비, 교통 등) 지출 통계를 실시간 그래프로 확인합니다.

### 4. 🤖 AI 스토리보드 (AI Storyboard)
- **자동 추억 생성**: 선택한 사진들로 감성적인 여행 스토리보드를 자동으로 구성합니다.
- **PDF 내보내기**: 만들어진 스토리보드를 고화질 PDF로 저장하여 공유하거나 인쇄할 수 있습니다.

### 5. 😊 나만의 이모지 만들기 (Custom Emoji)
- **커스텀 이모지**: 여행 사진 속 내 얼굴로 나만의 이모지 팩을 만듭니다.
- **AI 스타일 변환**: 팝아트, 만화, 스케치 등 다양한 스타일로 자동 변환됩니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend (Serverless)**: Firebase (Firestore, Storage, Auth)
- **AI**: Google Gemini API (gemini-2.0-flash-exp)
- **Utilities**: jsPDF, html2canvas, react-chartjs-2

---

## 🚀 시작하기 (Getting Started)

### 사전 요구사항
- Node.js 18+ installed

### 설치 및 실행

1. **저장소 클론**
   ```bash
   git clone [repository-url]
   cd travellog-album
   ```

2. **패키지 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   `.env.local` 파일을 생성하고 다음 키를 입력하세요:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *Firebase 설정은 `src/firebase.ts` 및 프로젝트 설정이 필요합니다.*

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```

---

## 📝 라이선스
MIT License
