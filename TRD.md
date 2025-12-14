# Technical Requirements Document (TRD)
# 여행 앨범 앱 개선 프로젝트

## 📋 문서 정보
- **프로젝트명**: TravelLog Album Enhancement
- **버전**: 2.0
- **작성일**: 2025-12-14
- **상태**: Draft

---

## 🏗️ 시스템 아키텍처

### 전체 구조
```
┌─────────────────┐
│   Frontend      │
│   (React +      │
│   TypeScript)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Firebase      │
│   - Auth        │
│   - Firestore   │
│   - Storage     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Gemini API    │
│   2.5 Flash     │
└─────────────────┘
```

---

## 💻 기술 스택

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript 5+
- **Build Tool**: Vite
- **Styling**: CSS Modules / Styled Components
- **State Management**: React Context API + Hooks
- **Routing**: React Router v6
- **UI Components**: Custom components with modern design

### Backend Services
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **AI**: Google Gemini 2.5 Flash API

### Additional Libraries
- **Image Processing**: 
  - `browser-image-compression` (클라이언트 측 압축)
  - `react-image-crop` (이미지 크롭)
- **PDF Generation**: 
  - `jsPDF` + `html2canvas`
- **Date Handling**: 
  - `date-fns`
- **File Upload**: 
  - `react-dropzone`
- **Icons**: 
  - `lucide-react` or `react-icons`

---

## 🗄️ 데이터베이스 설계

### Firestore Collections

#### 1. `users`
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;
  displayName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;            // Admin UID
  lastLoginAt?: Timestamp;
}
```

#### 2. `photos`
```typescript
interface Photo {
  id: string;
  userId: string;
  url: string;                    // Storage URL
  thumbnailUrl: string;           // 최적화된 썸네일
  location: string;
  caption: string;                // 사용자가 선택한 소감
  aiSuggestions?: string[];       // AI 추천 문구 10개
  date: Timestamp;
  uploadedAt: Timestamp;
  metadata: {
    originalName: string;
    size: number;
    mimeType: string;
    width: number;
    height: number;
  };
  expiresAt: Timestamp;           // 30일 후 자동 삭제
}
```

#### 3. `itineraries`
```typescript
interface Itinerary {
  id: string;
  userId: string;
  tripName: string;
  startDate: Timestamp;
  endDate: Timestamp;
  routes: Route[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

interface Route {
  id: string;
  day: number;
  departure: string;
  destination: string;
  visitedPlaces: Place[];
  restaurants: Restaurant[];
  notes?: string;
}

interface Place {
  name: string;
  address?: string;
  visitTime?: string;
}

interface Restaurant {
  name: string;
  address?: string;
  cuisine?: string;
}
```

#### 4. `expenses`
```typescript
interface Expense {
  id: string;
  userId: string;
  itineraryId?: string;
  date: Timestamp;
  category: 'food' | 'transport' | 'accommodation' | 'activity' | 'shopping' | 'other';
  amount: number;
  currency: string;               // 'KRW', 'USD', etc.
  description: string;
  receiptUrl?: string;            // 영수증 이미지
  isOCR: boolean;                 // OCR로 추출되었는지
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

#### 5. `storyboards`
```typescript
interface Storyboard {
  id: string;
  userId: string;
  title: string;
  date: Timestamp;                // 여행 날짜
  photoIds: string[];             // 포함된 사진들
  layout: 'grid' | 'timeline' | 'magazine';
  content: StoryboardContent[];
  pdfUrl?: string;                // 생성된 PDF
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

interface StoryboardContent {
  photoId: string;
  position: number;
  caption?: string;
  location?: string;
}
```

#### 6. `emojis`
```typescript
interface EmojiSet {
  id: string;
  userId: string;
  sourcePhotoId: string;
  emojis: string[];               // 8개 이모지 URL
  collectionUrl: string;          // 8개 합친 이미지
  createdAt: Timestamp;
  expiresAt: Timestamp;
}
```

#### 7. `admin_settings`
```typescript
interface AdminSettings {
  id: string;
  adminEmails: string[];          // 관리자 이메일 목록
  dataRetentionDays: number;      // 기본 30일
  maxUploadSize: number;          // MB 단위
  allowedImageTypes: string[];
}
```

---

## 🔐 인증 및 권한

### Firebase Authentication
- **Provider**: Email/Password
- **Custom Claims**: 
  - `admin: boolean` (관리자 여부)
  - `approved: boolean` (승인 여부)

### Security Rules

#### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId || 
                      request.auth.token.admin == true;
    }
    
    // Photos collection
    match /photos/{photoId} {
      allow read: if request.auth != null && 
                    resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                      request.resource.data.userId == request.auth.uid &&
                      request.auth.token.approved == true;
      allow update, delete: if request.auth != null && 
                              resource.data.userId == request.auth.uid;
    }
    
    // Similar rules for other collections
    match /itineraries/{itineraryId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    match /storyboards/{storyboardId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    match /emojis/{emojiId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    // Admin settings
    match /admin_settings/{settingId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

#### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
                     request.auth.uid == userId &&
                     request.resource.size < 10 * 1024 * 1024 && // 10MB limit
                     request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 🤖 AI 통합 (Gemini 2.5 Flash)

### API 설정
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
```

### 주요 AI 기능

#### 1. 사진 분석 및 문구 추천
```typescript
async function generateCaptionSuggestions(imageUrl: string, location?: string) {
  const prompt = `
    이 여행 사진을 분석하고, 여행자가 사용할 수 있는 감성적인 소감 문구를 10개 추천해주세요.
    ${location ? `장소: ${location}` : ''}
    
    각 문구는:
    - 20-50자 이내
    - 감성적이고 개인적인 느낌
    - 다양한 톤 (행복, 평화, 설렘, 감동 등)
    
    JSON 배열 형태로 반환: ["문구1", "문구2", ...]
  `;
  
  const result = await model.generateContent([prompt, imageUrl]);
  return JSON.parse(result.response.text());
}
```

#### 2. 영수증 OCR
```typescript
async function extractReceiptData(receiptImageUrl: string) {
  const prompt = `
    이 영수증 이미지에서 다음 정보를 추출해주세요:
    - 상호명
    - 날짜
    - 항목별 내역
    - 총 금액
    
    JSON 형태로 반환:
    {
      "merchantName": "상호명",
      "date": "YYYY-MM-DD",
      "items": [{"name": "항목", "price": 금액}],
      "total": 총금액,
      "currency": "KRW"
    }
  `;
  
  const result = await model.generateContent([prompt, receiptImageUrl]);
  return JSON.parse(result.response.text());
}
```

#### 3. 스토리보드 레이아웃 추천
```typescript
async function suggestStoryboardLayout(photos: Photo[]) {
  const prompt = `
    ${photos.length}장의 여행 사진으로 스토리보드를 만들려고 합니다.
    사진 정보: ${JSON.stringify(photos.map(p => ({
      location: p.location,
      caption: p.caption,
      date: p.date
    })))}
    
    최적의 레이아웃과 순서를 추천해주세요.
    JSON 형태로 반환:
    {
      "layout": "grid" | "timeline" | "magazine",
      "photoOrder": [photoId 순서],
      "sections": [{"title": "섹션명", "photoIds": [...]}]
    }
  `;
  
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}
```

#### 4. 이모지 생성
```typescript
async function generateEmojis(imageUrl: string) {
  const prompt = `
    이 사진을 기반으로 8가지 다른 스타일의 이모지를 생성해주세요:
    1. 기본 원형 이모지
    2. 빈티지 필터
    3. 팝아트 스타일
    4. 수채화 스타일
    5. 네온 효과
    6. 흑백 고대비
    7. 파스텔 톤
    8. 만화 스타일
    
    각 이모지는 원형으로 크롭되고 투명 배경이어야 합니다.
  `;
  
  // Gemini의 이미지 생성 기능 사용
  // 또는 외부 이미지 생성 API 연동
}
```

---

## 📦 이미지 최적화

### 클라이언트 측 압축
```typescript
import imageCompression from 'browser-image-compression';

async function optimizeImage(file: File) {
  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp'
  };
  
  const compressedFile = await imageCompression(file, options);
  
  // 썸네일 생성
  const thumbnailOptions = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 400,
    useWebWorker: true,
    fileType: 'image/webp'
  };
  
  const thumbnail = await imageCompression(file, thumbnailOptions);
  
  return { original: compressedFile, thumbnail };
}
```

---

## 📄 PDF 생성

### 스토리보드 PDF
```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function generateStoryboardPDF(storyboardElement: HTMLElement) {
  const canvas = await html2canvas(storyboardElement, {
    scale: 2,
    useCORS: true,
    logging: false
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  return pdf;
}
```

### 비용 리포트 PDF
```typescript
async function generateExpenseReport(expenses: Expense[]) {
  const pdf = new jsPDF();
  
  // 제목
  pdf.setFontSize(20);
  pdf.text('여행 비용 리포트', 20, 20);
  
  // 총 비용
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  pdf.setFontSize(14);
  pdf.text(`총 지출: ${total.toLocaleString()}원`, 20, 35);
  
  // 항목별 테이블
  let y = 50;
  expenses.forEach((expense, index) => {
    pdf.setFontSize(10);
    pdf.text(`${expense.date} - ${expense.description}: ${expense.amount.toLocaleString()}원`, 20, y);
    
    // 영수증 이미지 추가
    if (expense.receiptUrl) {
      // 이미지 로드 및 추가
    }
    
    y += 10;
  });
  
  return pdf;
}
```

---

## 🔄 자동 삭제 시스템

### Cloud Functions (Firebase Functions)
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// 매일 자정 실행
export const deleteExpiredData = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const db = admin.firestore();
    
    // 만료된 사진 삭제
    const expiredPhotos = await db.collection('photos')
      .where('expiresAt', '<=', now)
      .get();
    
    const batch = db.batch();
    const storage = admin.storage();
    
    for (const doc of expiredPhotos.docs) {
      const photo = doc.data();
      
      // Storage에서 이미지 삭제
      await storage.bucket().file(photo.url).delete();
      await storage.bucket().file(photo.thumbnailUrl).delete();
      
      // Firestore에서 문서 삭제
      batch.delete(doc.ref);
    }
    
    await batch.commit();
    
    // 다른 컬렉션도 동일하게 처리
    // expenses, storyboards, emojis, itineraries
  });

// 사용자 삭제 시 모든 데이터 삭제
export const deleteUserData = functions.auth.user().onDelete(async (user) => {
  const db = admin.firestore();
  const userId = user.uid;
  
  const collections = ['photos', 'expenses', 'storyboards', 'emojis', 'itineraries'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName)
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  
  // Storage 폴더 삭제
  await admin.storage().bucket().deleteFiles({
    prefix: `users/${userId}/`
  });
});
```

---

## 🎨 프론트엔드 구조

### 컴포넌트 계층
```
App
├── AuthProvider
├── Router
│   ├── LoginPage
│   │   └── LoginModal
│   │   └── SignupModal
│   ├── DashboardPage
│   │   └── WelcomeBanner
│   │   └── RecentTrips
│   ├── GalleryPage
│   │   └── PhotoGrid
│   │   └── PhotoCard
│   │   └── MultiSelectToolbar
│   ├── UploadPage
│   │   └── DropZone
│   │   └── AIsuggestions
│   ├── StoryboardPage
│   │   └── StoryboardEditor
│   │   └── PDFExport
│   ├── ItineraryPage
│   │   └── RouteInput
│   │   └── MapVisualization
│   │   └── ExpenseTracker
│   └── EmojiGeneratorPage
│       └── PhotoSelector
│       └── CircleCrop
│       └── EmojiGrid
└── AdminPanel (관리자만)
    └── PendingApprovals
```

### 상태 관리
```typescript
// Context API 사용
interface AppState {
  user: User | null;
  photos: Photo[];
  itineraries: Itinerary[];
  expenses: Expense[];
  loading: boolean;
  error: string | null;
}

// Custom Hooks
useAuth()
usePhotos()
useItineraries()
useExpenses()
useStoryboards()
useEmojis()
```

---

## 🚀 배포 및 호스팅

### Firebase Hosting
```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

### 환경 변수
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

---

## 📊 성능 최적화

### 이미지 로딩
- Lazy loading (Intersection Observer)
- Progressive image loading
- WebP 포맷 사용
- CDN 캐싱

### 코드 스플리팅
```typescript
// Route-based code splitting
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const StoryboardPage = lazy(() => import('./pages/StoryboardPage'));
```

### 캐싱 전략
- Service Worker (PWA)
- Firebase Firestore 오프라인 지속성
- React Query / SWR for data caching

---

## 🧪 테스트 전략

### Unit Tests
- Jest + React Testing Library
- 주요 유틸리티 함수 테스트
- 컴포넌트 렌더링 테스트

### Integration Tests
- Firebase Emulator Suite
- E2E 플로우 테스트

### Performance Tests
- Lighthouse CI
- Bundle size monitoring

---

## 📈 모니터링

### Firebase Analytics
- 사용자 행동 추적
- 페이지 뷰
- 이벤트 로깅

### Error Tracking
- Firebase Crashlytics
- Console error logging

---

## 🔧 개발 환경 설정

### 필수 도구
- Node.js 18+
- npm or yarn
- Firebase CLI
- Git

### 로컬 개발
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Start Firebase emulators
firebase emulators:start
```

---

## 📝 API 레이트 리밋

### Gemini API
- 무료 티어: 60 requests/minute
- 대용량 처리 시 배치 처리 구현

### Firebase
- Firestore: 읽기/쓰기 제한 모니터링
- Storage: 다운로드 대역폭 제한

---

## 🔐 보안 체크리스트

- [ ] API 키 환경 변수로 관리
- [ ] Firebase Security Rules 설정
- [ ] XSS 방어 (DOMPurify)
- [ ] CSRF 토큰
- [ ] 파일 업로드 검증
- [ ] Rate limiting
- [ ] HTTPS 강제
- [ ] 민감 데이터 암호화
