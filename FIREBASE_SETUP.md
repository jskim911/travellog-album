# Firebase 설정 가이드

## Firestore Database 구조

### Collections

#### 1. `users`
사용자 정보 및 승인 상태 관리

```javascript
{
  uid: "user123",
  email: "user@example.com",
  displayName: "홍길동",
  status: "pending" | "approved" | "rejected",
  createdAt: Timestamp,
  approvedAt: Timestamp (optional),
  approvedBy: "admin_uid" (optional),
  lastLoginAt: Timestamp (optional)
}
```

**인덱스**:
- `status` (ascending)
- `createdAt` (descending)

---

#### 2. `photos`
사용자 업로드 사진

```javascript
{
  id: "photo123",
  userId: "user123",
  url: "https://storage.googleapis.com/.../photo.jpg",
  thumbnailUrl: "https://storage.googleapis.com/.../thumb.jpg",
  location: "제주도",
  caption: "아름다운 한라산",
  aiSuggestions: ["문구1", "문구2", ...],
  date: Timestamp,
  uploadedAt: Timestamp,
  metadata: {
    originalName: "IMG_1234.jpg",
    size: 2048576,
    mimeType: "image/jpeg",
    width: 3024,
    height: 4032
  },
  expiresAt: Timestamp // uploadedAt + 30일
}
```

**인덱스**:
- `userId` + `uploadedAt` (descending)
- `userId` + `location`
- `expiresAt` (ascending) - 자동 삭제용

---

#### 3. `itineraries`
여행 일정

```javascript
{
  id: "itinerary123",
  userId: "user123",
  tripName: "제주도 여행",
  startDate: Timestamp,
  endDate: Timestamp,
  routes: [
    {
      id: "route1",
      day: 1,
      departure: "공항",
      destination: "호텔",
      visitedPlaces: [
        {
          name: "성산일출봉",
          address: "제주특별자치도 서귀포시...",
          visitTime: "10:00"
        }
      ],
      restaurants: [
        {
          name: "맛집",
          address: "...",
          cuisine: "한식"
        }
      ],
      notes: "날씨 좋음"
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: Timestamp
}
```

**인덱스**:
- `userId` + `startDate` (descending)

---

#### 4. `expenses`
여행 경비

```javascript
{
  id: "expense123",
  userId: "user123",
  itineraryId: "itinerary123" (optional),
  date: Timestamp,
  category: "food" | "transport" | "accommodation" | "activity" | "shopping" | "other",
  amount: 50000,
  currency: "KRW",
  description: "점심 식사",
  receiptUrl: "https://storage.googleapis.com/.../receipt.jpg" (optional),
  isOCR: true,
  createdAt: Timestamp,
  expiresAt: Timestamp
}
```

**인덱스**:
- `userId` + `date` (descending)
- `userId` + `category`

---

#### 5. `storyboards`
사진 스토리보드

```javascript
{
  id: "storyboard123",
  userId: "user123",
  title: "제주 여행 Day 1",
  date: Timestamp,
  photoIds: ["photo1", "photo2", ...],
  layout: "grid" | "timeline" | "magazine",
  content: [
    {
      photoId: "photo1",
      position: 0,
      caption: "아침 일출",
      location: "성산일출봉"
    }
  ],
  pdfUrl: "https://storage.googleapis.com/.../storyboard.pdf" (optional),
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: Timestamp
}
```

**인덱스**:
- `userId` + `createdAt` (descending)

---

#### 6. `emojis`
AI 생성 이모지

```javascript
{
  id: "emoji123",
  userId: "user123",
  sourcePhotoId: "photo123",
  emojis: [
    "https://storage.googleapis.com/.../emoji1.png",
    "https://storage.googleapis.com/.../emoji2.png",
    // ... 8개
  ],
  collectionUrl: "https://storage.googleapis.com/.../emoji_collection.png",
  createdAt: Timestamp,
  expiresAt: Timestamp
}
```

**인덱스**:
- `userId` + `createdAt` (descending)

---

#### 7. `adminSettings`
관리자 설정

```javascript
// Document ID: "config"
{
  id: "config",
  adminEmails: ["admin@example.com", "admin2@example.com"],
  dataRetentionDays: 30,
  maxUploadSize: 10485760, // 10MB in bytes
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"]
}
```

---

## Firebase Storage 구조

```
/photos/{userId}/{photoId}.jpg          - 원본 사진
/thumbnails/{userId}/{photoId}.jpg      - 썸네일
/receipts/{userId}/{receiptId}.jpg      - 영수증
/emojis/{userId}/{emojiId}.png          - 개별 이모지
/emojis/{userId}/collection_{setId}.png - 이모지 컬렉션
/pdfs/{userId}/storyboard_{id}.pdf      - 스토리보드 PDF
/pdfs/{userId}/expense_report_{id}.pdf  - 비용 리포트 PDF
```

---

## 초기 설정 단계

### 1. Firestore Rules 배포
```bash
firebase deploy --only firestore:rules
```

### 2. Storage Rules 배포
```bash
firebase deploy --only storage
```

### 3. 관리자 설정 문서 생성
Firebase Console → Firestore Database → `adminSettings` 컬렉션 생성 → `config` 문서 추가:

```json
{
  "adminEmails": ["your-email@gmail.com"],
  "dataRetentionDays": 30,
  "maxUploadSize": 10485760,
  "allowedImageTypes": ["image/jpeg", "image/png", "image/webp"]
}
```

### 4. 인덱스 생성
Firebase Console → Firestore Database → Indexes

필수 복합 인덱스:
- `photos`: `userId` (Ascending) + `uploadedAt` (Descending)
- `expenses`: `userId` (Ascending) + `date` (Descending)
- `itineraries`: `userId` (Ascending) + `startDate` (Descending)

---

## Cloud Functions (TASK-007)

### 필요한 Functions

#### 1. `deleteExpiredData`
매일 자정 실행, 30일 지난 데이터 자동 삭제

```typescript
export const deleteExpiredData = functions.pubsub
  .schedule('0 0 * * *') // 매일 자정
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    // photos, expenses, storyboards, emojis 컬렉션에서
    // expiresAt < now 인 문서 삭제
  });
```

#### 2. `deleteUserData`
사용자 삭제 시 연관 데이터 모두 삭제

```typescript
export const deleteUserData = functions.auth.user()
  .onDelete(async (user) => {
    // 해당 userId로 등록된 모든 데이터 삭제
    // photos, expenses, itineraries, storyboards, emojis
  });
```

---

## 환경 변수 (.env.local)

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

---

**생성일**: 2025-12-14  
**다음 작업**: Cloud Functions 설정 (TASK-007)
