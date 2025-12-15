# Technical Requirements Document (TRD)
# 여행 앨범 앱 개선 프로젝트

## 📋 문서 정보
- **프로젝트명**: TravelLog Album Enhancement
- **버전**: 1.0 (Released)
- **작성일**: 2025-12-15
- **상태**: Final

---

## 🏗️ 시스템 아키텍처

### 전체 구조
```
┌─────────────────┐       ┌─────────────────┐
│   Vercel        │       │   GitHub        │
│   (Hosting)     │◄──────┤   (Repository)  │
└────────┬────────┘       └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Frontend      │       ┌─────────────────┐
│   (React +      │──────▶│   Gemini API    │
│   Vite + TS)    │       │   2.0 Flash Exp │
└────────┬────────┘       └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Firebase      │
│   - Auth        │
│   - Firestore   │
│   - Storage     │
└─────────────────┘
```

---

## 💻 기술 스택

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Framer Motion (Animations)
- **Icons**: Lucide React
- **PDF Generation**: html2canvas, jsPDF

### Backend (Firebase)
- **Authentication**: Email/Password Provider
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage

### AI Engine
- **Model**: Google Gemini 2.0 Flash Exp
- **Client**: `google-generative-ai` SDK
- **Role**: Image Analysis, Captioning, Emoji Style Prompting

---

## 🗄️ 데이터베이스 스키마 (Firestore)

### 1. `users`
사용자 승인 관리의 핵심 컬렉션입니다.
```typescript
interface User {
  uid: string;           // Firebase Auth UID
  email: string;
  displayName: string;
  status: 'pending' | 'approved' | 'rejected'; // 승인 상태
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;   // Admin UID
  lastLoginAt: Timestamp;
}
```

### 2. `photos`
이미지와 AI 분석 메타데이터를 저장합니다.
```typescript
interface Photo {
  id: string;
  userId: string;
  url: string;           // Storage URL
  location: string;      // AI가 분석한 위치
  caption: string;       // 선택된 캡션
  date: Timestamp;
}
```

---

## 🧩 주요 기능 구현 상세

### 1. 보안 및 승인 로직 (Auth Flow)
- **회원가입**: `createUserWithEmailAndPassword` 성공 직후 `status: 'pending'`으로 DB 저장.
- **자동 로그인 방지**: 회원가입 직후 `auth.signOut()`을 호출하여 세션을 강제 종료.
- **로그인 차단**: 앱 진입 시(`App.tsx`) `userStatus !== 'approved'`인 경우 기능을 비활성화하거나 대기 화면 표시.

### 2. PDF 생성 (Advanced Capture)
기존 `html2canvas`의 스크롤 짤림 문제를 해결하기 위해 **Clone & Expand** 기법을 사용합니다.
1. 타겟 Element(`storyboard-content`)를 `cloneNode(true)`로 복제.
2. 복제된 노드를 `position: fixed`, `z-index: -9999`로 화면 밖(또는 뒤)에 배치.
3. 복제본의 크기를 `scrollHeight`, `scrollWidth`로 강제 확장하여 모든 콘텐츠가 보이도록 설정.
4. `html2canvas`로 복제본을 캡처하여 고해상도 이미지 생성.
5. `jsPDF`로 이미지 삽입 및 저장.

### 3. AI 이모지 생성 (Simulation)
현재는 클라이언트 측 시뮬레이션 방식을 사용합니다.
1. **Face Detection**: (Future) 얼굴 위치 인식. 현재는 중앙 크롭 방식.
2. **Circular Crop**: HTML5 Canvas API를 사용하여 이미지를 원형으로 마스킹(`globalCompositeOperation = 'destination-in'`).
3. **Style Filters**: Canvas Filter(`sepia`, `contrast`, `saturate`)를 조합하여 CSS 필터 효과 적용.
4. **Sticker Mode**: 결과물을 PNG(투명 배경)로 `toDataURL()` 변환하여 다운로드.

---

## 🚀 배포 정보 (Deployment)

### Vercel Integration
- GitHub 저장소 (`main` branch)와 Vercel 프로젝트가 연동되어 있습니다.
- **Push to Main**: 코드가 `main` 브랜치에 푸시되면 Vercel이 자동으로 빌드(`npm run build`) 및 배포를 수행합니다.
- **Environment Variables**: Vercel 대시보드에서 Firebase 및 Gemini API Key를 관리합니다.

### Build Command
```bash
npm run build
# Output: /dist directory
```

---

## 🔧 유지보수 가이드

### 관리자 권한 부여
현재는 Firestore 콘솔에서 수동으로 최초 관리자를 설정하거나, 코드상에서 특정 UID를 관리자로 지정해야 할 수 있습니다. (향후 Admin Claim 적용 권장)

### 데이터 백업
Firebase Console의 Export 기능을 사용하여 주기적으로 데이터를 백업할 것을 권장합니다.

---

## 🔒 보안 체크리스트 (Completed)
- [x] Firebase Security Rules 적용 (본인 데이터만 접근 가능)
- [x] 관리자 전용 기능 분리
- [x] .env 파일을 통한 API Key 관리
- [x] CORS 정책 준수 (Proxy 사용 고려)

This document represents the final technical state of version 1.0.
