# TASK Document
# 여행 앨범 앱 개선 프로젝트 - 개발 작업 목록

## 📋 문서 정보
- **프로젝트명**: TravelLog Album Enhancement
- **버전**: 2.0
- **작성일**: 2025-12-14

---

## 🎯 Phase 1: 기반 구조 및 인증 시스템 (Week 1-2)

### 1.1 프로젝트 초기 설정
- [ ] **TASK-001**: 기존 프로젝트 구조 분석 및 백업
  - 현재 코드베이스 리뷰
  - Git 브랜치 생성 (`feature/v2-enhancement`)
  - 기존 기능 목록 작성

- [ ] **TASK-002**: 필요한 패키지 설치
  ```bash
  npm install @google/generative-ai
  npm install browser-image-compression
  npm install react-image-crop
  npm install jspdf html2canvas
  npm install date-fns
  npm install react-dropzone
  npm install lucide-react
  ```

- [ ] **TASK-003**: TypeScript 타입 정의 업데이트
  - `types.ts` 파일에 새로운 인터페이스 추가
  - User, Photo, Itinerary, Expense, Storyboard, EmojiSet 타입 정의

- [ ] **TASK-004**: 환경 변수 설정
  - `.env.local` 파일에 Gemini API 키 추가
  - Firebase 설정 확인

### 1.2 Firebase 설정 업데이트
- [ ] **TASK-005**: Firestore 데이터베이스 구조 생성
  - Collections 생성: users, photos, itineraries, expenses, storyboards, emojis
  - 인덱스 설정

- [ ] **TASK-006**: Firebase Security Rules 작성
  - Firestore rules 업데이트
  - Storage rules 업데이트
  - 테스트 케이스 작성

- [ ] **TASK-007**: Firebase Functions 설정
  - Functions 프로젝트 초기화
  - 자동 삭제 함수 작성 (`deleteExpiredData`)
  - 사용자 삭제 트리거 함수 작성 (`deleteUserData`)

### 1.3 인증 시스템 개선
- [ ] **TASK-008**: 회원가입 모달 컴포넌트 생성
  - `components/SignupModal.tsx` 생성
  - 이름, 이메일 입력 폼
  - 승인 요청 제출 로직

- [ ] **TASK-009**: 로그인 모달 개선
  - 기존 `LoginModal.tsx` 수정
  - 회원가입 버튼 추가
  - UI/UX 개선

- [ ] **TASK-010**: 사용자 승인 상태 관리
  - Firestore에 사용자 상태 저장 (pending/approved/rejected)
  - 승인되지 않은 사용자 접근 제한

- [ ] **TASK-011**: 관리자 패널 생성
  - `components/AdminPanel.tsx` 생성
  - 승인 대기 중인 사용자 목록 표시
  - 승인/거부 기능 구현

- [ ] **TASK-012**: 환영 배너 컴포넌트
  - `components/WelcomeBanner.tsx` 생성
  - "{이름}님 여행앱에 오신 것을 환영합니다!" 메시지
  - 애니메이션 효과 추가

### 1.4 레이아웃 재구성
- [ ] **TASK-013**: 무비메이커 기능 제거
  - `VideoCreatorModal.tsx` 삭제
  - 관련 코드 정리
  - 라우팅 업데이트

- [ ] **TASK-014**: 새로운 네비게이션 구조
  - 메인 네비게이션 메뉴 재설계
  - 갤러리, 스토리보드, 로드맵, 이모지 메뉴 추가

- [ ] **TASK-015**: 반응형 레이아웃 개선
  - 모바일, 태블릿, 데스크톱 대응
  - CSS Grid/Flexbox 최적화

---

## 🖼️ Phase 2: 사진 관리 기능 (Week 2-3)

### 2.1 Gemini AI 통합
- [ ] **TASK-016**: Gemini API 유틸리티 함수 작성
  - `src/utils/gemini.ts` 업데이트
  - Gemini 2.5 Flash 모델 초기화
  - 에러 핸들링 및 재시도 로직

- [ ] **TASK-017**: 사진 분석 함수 구현
  - `analyzePhoto()` 함수 작성
  - 장소 인식 기능
  - 이미지 메타데이터 추출

- [ ] **TASK-018**: 소감 문구 추천 함수
  - `generateCaptionSuggestions()` 함수 작성
  - 10개 문구 생성
  - 다양한 톤 (행복, 평화, 설렘 등)

### 2.2 사진 업로드 개선
- [ ] **TASK-019**: 이미지 최적화 유틸리티
  - `src/utils/imageOptimization.ts` 생성
  - 원본 압축 (최대 2MB)
  - 썸네일 생성 (200KB)
  - WebP 변환

- [ ] **TASK-020**: 업로드 컴포넌트 개선
  - `components/UploadSection.tsx` 수정
  - 드래그 앤 드롭 기능
  - 다중 파일 업로드
  - 업로드 진행률 표시

- [ ] **TASK-021**: AI 추천 UI 컴포넌트
  - `components/AISuggestions.tsx` 생성
  - 10개 추천 문구 표시
  - 선택 및 직접 입력 옵션
  - 로딩 상태 표시

- [ ] **TASK-022**: 사진 메타데이터 저장
  - Firestore에 사진 정보 저장
  - expiresAt 필드 설정 (30일 후)
  - Storage URL 저장

### 2.3 갤러리 기능 개선
- [ ] **TASK-023**: 갤러리 페이지 재설계
  - `pages/GalleryPage.tsx` 생성
  - 그리드 레이아웃
  - 무한 스크롤 또는 페이지네이션

- [ ] **TASK-024**: 날짜별 카테고리 뷰
  - 날짜별 그룹핑 로직
  - 섹션 헤더 (예: "2024년 12월 14일")
  - 접기/펼치기 기능

- [ ] **TASK-025**: 장소별 카테고리 뷰
  - 장소별 그룹핑 로직
  - 장소 필터링 기능
  - 검색 기능

- [ ] **TASK-026**: 사진 카드 컴포넌트
  - `components/PhotoCard.tsx` 생성
  - 썸네일 표시
  - 호버 시 정보 표시
  - 선택 체크박스

- [ ] **TASK-027**: 멀티 선택 기능
  - 체크박스 선택 로직
  - 전체 선택/해제
  - 선택된 항목 카운트 표시

- [ ] **TASK-028**: 삭제 기능
  - 단일 삭제
  - 멀티 삭제
  - 확인 모달
  - Firestore 및 Storage에서 삭제

- [ ] **TASK-029**: 다운로드 기능
  - 단일 다운로드
  - 멀티 다운로드 (ZIP 파일)
  - 다운로드 진행률 표시

---

## 📖 Phase 3: 스토리보드 기능 (Week 3-4)

### 3.1 스토리보드 생성
- [ ] **TASK-030**: 스토리보드 페이지 생성
  - `pages/StoryboardPage.tsx` 생성
  - 날짜 선택 UI
  - 사진 미리보기

- [ ] **TASK-031**: AI 레이아웃 추천
  - `suggestStoryboardLayout()` 함수 구현
  - 사진 순서 최적화
  - 레이아웃 타입 추천 (grid/timeline/magazine)

- [ ] **TASK-032**: 스토리보드 에디터 컴포넌트
  - `components/StoryboardEditor.tsx` 생성
  - 드래그 앤 드롭으로 사진 재배치
  - 캡션 편집
  - 레이아웃 변경

- [ ] **TASK-033**: 스토리보드 템플릿
  - Grid 레이아웃 템플릿
  - Timeline 레이아웃 템플릿
  - Magazine 레이아웃 템플릿
  - 커스텀 CSS 스타일

### 3.2 PDF 내보내기
- [ ] **TASK-034**: PDF 생성 유틸리티
  - `src/utils/pdfGenerator.ts` 생성
  - jsPDF + html2canvas 통합
  - 고품질 렌더링 설정

- [ ] **TASK-035**: 스토리보드 PDF 내보내기
  - `generateStoryboardPDF()` 함수 구현
  - A4 사이즈 최적화
  - 다중 페이지 지원

- [ ] **TASK-036**: PDF 미리보기
  - 내보내기 전 미리보기 모달
  - 페이지 레이아웃 확인
  - 다운로드 버튼

- [ ] **TASK-037**: Firestore에 스토리보드 저장
  - 생성된 스토리보드 메타데이터 저장
  - PDF URL 저장 (선택사항)
  - 수정 기능

---

## 🗺️ Phase 4: 여행 로드맵 및 비용 관리 (Week 4-6)

### 4.1 여행 일정 입력
- [ ] **TASK-038**: 로드맵 페이지 생성
  - `pages/ItineraryPage.tsx` 생성
  - 탭 구조 (일정/비용)

- [ ] **TASK-039**: 루트 입력 폼
  - `components/RouteInput.tsx` 생성
  - 여행 구간 입력
  - 출발지/목적지 입력
  - 날짜 선택

- [ ] **TASK-040**: 방문 장소 입력
  - 장소 추가/삭제
  - 장소명, 주소, 방문 시간
  - 자동완성 (Google Places API 선택사항)

- [ ] **TASK-041**: 식당 정보 입력
  - 식당 추가/삭제
  - 식당명, 주소, 요리 종류
  - 메모 필드

### 4.2 로드맵 시각화
- [ ] **TASK-042**: 로드맵 시각화 컴포넌트
  - `components/MapVisualization.tsx` 생성
  - 타임라인 뷰 또는 맵 뷰
  - 루트 표시

- [ ] **TASK-043**: 인터랙티브 맵 (선택사항)
  - Google Maps API 통합
  - 마커 표시 (장소, 식당)
  - 경로 그리기

- [ ] **TASK-044**: 테이블 뷰
  - 일정 테이블 형태로 표시
  - 정렬 및 필터링
  - 인쇄 친화적 레이아웃

### 4.3 비용 관리
- [ ] **TASK-045**: 비용 입력 폼
  - `components/ExpenseInput.tsx` 생성
  - 날짜, 카테고리, 금액, 설명 입력
  - 통화 선택

- [ ] **TASK-046**: 영수증 OCR 기능
  - `extractReceiptData()` 함수 구현
  - Gemini Vision API로 영수증 분석
  - 자동 필드 채우기

- [ ] **TASK-047**: 영수증 이미지 업로드
  - 이미지 업로드 UI
  - Storage에 저장
  - 썸네일 생성

- [ ] **TASK-048**: 수동 비용 입력
  - 영수증 없는 경우 직접 입력
  - 폼 검증

- [ ] **TASK-049**: 비용 추적 대시보드
  - `components/ExpenseTracker.tsx` 생성
  - 총 비용 표시
  - 카테고리별 차트 (pie/bar chart)
  - 일별 지출 그래프

- [ ] **TASK-050**: 실시간 비용 계산
  - 비용 추가 시 자동 합산
  - 카테고리별 합계
  - 예산 대비 지출 (선택사항)

### 4.4 비용 리포트 PDF
- [ ] **TASK-051**: 비용 리포트 생성
  - `generateExpenseReport()` 함수 구현
  - 항목별 지출 내역 테이블
  - 영수증 이미지 포함

- [ ] **TASK-052**: 비용 리포트 내보내기
  - PDF 다운로드 버튼
  - 날짜 범위 선택
  - 카테고리 필터링

---

## 🎨 Phase 5: 이모지 생성 기능 (Week 6-7)

### 5.1 이모지 선택 및 편집
- [ ] **TASK-053**: 이모지 생성 페이지
  - `pages/EmojiGeneratorPage.tsx` 생성
  - 갤러리에서 사진 선택

- [ ] **TASK-054**: 원형 크롭 도구
  - `components/CircleCrop.tsx` 생성
  - react-image-crop 라이브러리 사용
  - 원형 마스크 오버레이
  - 크기 및 위치 조정

- [ ] **TASK-055**: 크롭 미리보기
  - 실시간 미리보기
  - 확대/축소 기능
  - 초기화 버튼

### 5.2 AI 이모지 생성
- [ ] **TASK-056**: 이모지 생성 함수
  - `generateEmojis()` 함수 구현
  - Gemini 이미지 생성 API 사용
  - 8가지 스타일 프롬프트 작성

- [ ] **TASK-057**: 이모지 스타일 정의
  - 기본 원형
  - 빈티지 필터
  - 팝아트
  - 수채화
  - 네온 효과
  - 흑백 고대비
  - 파스텔 톤
  - 만화 스타일

- [ ] **TASK-058**: 이모지 그리드 표시
  - `components/EmojiGrid.tsx` 생성
  - 8개 이모지 표시
  - 로딩 상태
  - 에러 처리

- [ ] **TASK-059**: 이모지 컬렉션 생성
  - 8개 이모지를 하나의 이미지로 합치기
  - Canvas API 사용
  - 그리드 레이아웃

### 5.3 이모지 관리
- [ ] **TASK-060**: 재생성 기능
  - 재생성 버튼
  - 개별 이모지 재생성
  - 전체 재생성

- [ ] **TASK-061**: 이모지 다운로드
  - 개별 다운로드
  - 전체 다운로드 (ZIP)
  - PNG 투명 배경

- [ ] **TASK-062**: Firestore에 이모지 저장
  - 생성된 이모지 URL 저장
  - 메타데이터 저장
  - expiresAt 설정

---

## 🎨 Phase 6: UI/UX 개선 및 최적화 (Week 7-8)

### 6.1 디자인 시스템
- [ ] **TASK-063**: 디자인 토큰 정의
  - `src/styles/tokens.css` 생성
  - 색상 팔레트
  - 타이포그래피
  - 간격, 그림자, 애니메이션

- [ ] **TASK-064**: 공통 컴포넌트 라이브러리
  - Button, Input, Modal, Card 등
  - 일관된 스타일 적용
  - 재사용 가능한 컴포넌트

- [ ] **TASK-065**: 반응형 디자인 개선
  - 모바일 최적화
  - 터치 제스처 지원
  - 적응형 레이아웃

### 6.2 성능 최적화
- [ ] **TASK-066**: 이미지 레이지 로딩
  - Intersection Observer 구현
  - 스켈레톤 로딩 UI
  - Progressive image loading

- [ ] **TASK-067**: 코드 스플리팅
  - React.lazy() 적용
  - 라우트 기반 분할
  - 번들 크기 최적화

- [ ] **TASK-068**: 캐싱 전략
  - React Query 또는 SWR 도입
  - Firestore 오프라인 지속성
  - Service Worker (PWA)

- [ ] **TASK-069**: 성능 모니터링
  - Lighthouse 점수 측정
  - Core Web Vitals 최적화
  - 번들 분석

### 6.3 접근성
- [ ] **TASK-070**: ARIA 레이블 추가
  - 스크린 리더 지원
  - 키보드 네비게이션
  - 포커스 관리

- [ ] **TASK-071**: 색상 대비 개선
  - WCAG AA 준수
  - 다크 모드 지원 (선택사항)

---

## 🔧 Phase 7: 관리자 기능 및 자동화 (Week 8-9)

### 7.1 관리자 대시보드
- [ ] **TASK-072**: 관리자 전용 라우트
  - 관리자 권한 체크
  - 접근 제어

- [ ] **TASK-073**: 사용자 관리
  - 전체 사용자 목록
  - 승인/거부 기능
  - 사용자 삭제

- [ ] **TASK-074**: 통계 대시보드
  - 총 사용자 수
  - 총 사진 수
  - 스토리지 사용량
  - 활성 사용자 추적

### 7.2 자동 삭제 시스템
- [ ] **TASK-075**: Cloud Functions 배포
  - Firebase Functions 초기화
  - `deleteExpiredData` 함수 배포
  - 스케줄러 설정 (매일 자정)

- [ ] **TASK-076**: 사용자 삭제 트리거
  - `deleteUserData` 함수 배포
  - 연관 데이터 삭제 로직
  - Storage 파일 삭제

- [ ] **TASK-077**: 만료 알림 (선택사항)
  - 만료 7일 전 이메일 알림
  - 사용자 대시보드에 알림 표시

---

## 🧪 Phase 8: 테스트 및 QA (Week 9-10)

### 8.1 단위 테스트
- [ ] **TASK-078**: 유틸리티 함수 테스트
  - 이미지 최적화 함수
  - PDF 생성 함수
  - Gemini API 함수 (모킹)

- [ ] **TASK-079**: 컴포넌트 테스트
  - React Testing Library
  - 주요 컴포넌트 렌더링 테스트
  - 사용자 인터랙션 테스트

### 8.2 통합 테스트
- [ ] **TASK-080**: Firebase Emulator 설정
  - Auth, Firestore, Storage 에뮬레이터
  - 테스트 데이터 시드

- [ ] **TASK-081**: E2E 플로우 테스트
  - 회원가입 → 승인 → 로그인
  - 사진 업로드 → 갤러리 → 스토리보드
  - 비용 입력 → 리포트 생성

### 8.3 수동 QA
- [ ] **TASK-082**: 기능 테스트
  - 모든 기능 체크리스트 작성
  - 각 기능 수동 테스트
  - 버그 리포트 작성

- [ ] **TASK-083**: 크로스 브라우저 테스트
  - Chrome, Firefox, Safari, Edge
  - 모바일 브라우저 (iOS, Android)

- [ ] **TASK-084**: 성능 테스트
  - 대용량 사진 업로드
  - 많은 데이터 로딩
  - 동시 사용자 시뮬레이션

---

## 🚀 Phase 9: 배포 및 문서화 (Week 10)

### 9.1 배포 준비
- [ ] **TASK-085**: 프로덕션 빌드
  - 환경 변수 설정
  - 빌드 최적화
  - 번들 크기 확인

- [ ] **TASK-086**: Firebase Hosting 배포
  - `firebase deploy --only hosting`
  - 커스텀 도메인 설정 (선택사항)
  - SSL 인증서 확인

- [ ] **TASK-087**: Cloud Functions 배포
  - `firebase deploy --only functions`
  - 함수 로그 확인
  - 스케줄러 동작 확인

### 9.2 문서화
- [ ] **TASK-088**: 사용자 가이드 작성
  - 회원가입 방법
  - 주요 기능 사용법
  - FAQ

- [ ] **TASK-089**: 관리자 가이드 작성
  - 사용자 승인 방법
  - 관리자 대시보드 사용법
  - 문제 해결 가이드

- [ ] **TASK-090**: 개발자 문서 작성
  - 코드 구조 설명
  - API 문서
  - 배포 가이드

### 9.3 모니터링 설정
- [ ] **TASK-091**: Firebase Analytics 설정
  - 주요 이벤트 추적
  - 사용자 행동 분석

- [ ] **TASK-092**: 에러 트래킹
  - Firebase Crashlytics
  - 에러 알림 설정

---

## 📊 우선순위 및 의존성

### 🔴 High Priority (필수)
- TASK-001 ~ TASK-015: 기반 구조 및 인증
- TASK-016 ~ TASK-029: 사진 관리 핵심 기능
- TASK-075 ~ TASK-077: 자동 삭제 시스템

### 🟡 Medium Priority (중요)
- TASK-030 ~ TASK-037: 스토리보드
- TASK-038 ~ TASK-052: 로드맵 및 비용 관리
- TASK-063 ~ TASK-071: UI/UX 개선

### 🟢 Low Priority (부가 기능)
- TASK-053 ~ TASK-062: 이모지 생성
- TASK-072 ~ TASK-074: 관리자 대시보드
- TASK-078 ~ TASK-084: 테스트

---

## 📅 예상 일정

| Phase | 기간 | 주요 작업 |
|-------|------|-----------|
| Phase 1 | Week 1-2 | 기반 구조 및 인증 시스템 |
| Phase 2 | Week 2-3 | 사진 관리 기능 |
| Phase 3 | Week 3-4 | 스토리보드 기능 |
| Phase 4 | Week 4-6 | 로드맵 및 비용 관리 |
| Phase 5 | Week 6-7 | 이모지 생성 |
| Phase 6 | Week 7-8 | UI/UX 개선 |
| Phase 7 | Week 8-9 | 관리자 기능 |
| Phase 8 | Week 9-10 | 테스트 및 QA |
| Phase 9 | Week 10 | 배포 및 문서화 |

**총 예상 기간**: 10주 (약 2.5개월)

---

## ✅ 완료 기준

각 태스크는 다음 조건을 만족해야 완료로 간주:
1. 코드 작성 완료
2. 로컬 테스트 통과
3. 코드 리뷰 완료 (해당 시)
4. 문서화 완료
5. Git 커밋 및 푸시

---

## 🔄 진행 상황 추적

- **TODO**: 시작 전
- **IN PROGRESS**: 진행 중
- **REVIEW**: 리뷰 중
- **DONE**: 완료
- **BLOCKED**: 차단됨 (의존성 대기)

---

## 📝 참고사항

- 각 Phase는 순차적으로 진행하되, 독립적인 작업은 병렬 진행 가능
- Gemini API 사용량 모니터링 필요 (무료 티어 제한)
- Firebase 무료 플랜 한도 확인 필요
- 정기적인 백업 및 버전 관리 필수
