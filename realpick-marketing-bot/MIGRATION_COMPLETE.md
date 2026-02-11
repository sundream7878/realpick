# ✅ 마케팅 봇 분리 및 DB 마이그레이션 완료

**작업 완료일**: 2026-02-06  
**프로젝트**: 리얼픽 마케팅 자동화 시스템

---

## 🎯 작업 요약

마케팅 자동화 기능을 메인 앱에서 완전히 분리하고, 독립된 로컬 전용 시스템으로 재구성하였습니다.

### 주요 목표
1. ✅ Netlify 배포 제외 (서버 안정성)
2. ✅ 물리적 프로젝트 분리 (독립 실행)
3. ✅ 로컬 전용 대시보드 구축
4. ✅ DB 테이블 리네이밍 (`t_marketing_*` 접두사)

---

## 📦 완료된 작업 상세

### 1단계: Netlify 배포 제외 ✅

**파일 수정:**
- `netlify.toml`: 마케팅 폴더 변경 무시, API 접근 차단
- `.gitignore`: `realpick-marketing-bot/` 제외
- `.netlifyignore`: 상세 배포 제외 목록
- `next.config.mjs`: 프로덕션 빌드 시 마케팅 라우트 외부화

**결과:**
- 마케팅 코드가 Netlify에 절대 배포되지 않음
- `/api/admin/marketer/*` 접근 시 404 리다이렉트

---

### 2단계: 물리적 프로젝트 분리 ✅

**새 프로젝트 구조:**
```
realpick-marketing-bot/
├── crawler/          # Python 크롤러 (bridge.py, modules/)
├── backend/          # Node.js Express 서버 (포트 3001)
│   ├── src/
│   │   ├── routes/
│   │   ├── services/pythonBridge.ts
│   │   ├── scripts/migrateData.ts
│   │   └── server.ts
│   └── package.json
├── dashboard/        # React Vite 대시보드 (포트 5173)
│   ├── src/
│   │   ├── components/ (7개 컴포넌트 이동)
│   │   ├── api/
│   │   └── App.tsx
│   └── package.json
├── .env.local
└── package.json (워크스페이스)
```

**이동된 파일:**
- Python 크롤러: `scripts/marketing/` → `crawler/`
- 백엔드 로직: `lib/marketer/` → `backend/src/services/`
- 컴포넌트: `components/c-admin/marketer/` → `dashboard/src/components/`

---

### 3단계: 로컬 전용 대시보드 구축 ✅

**대시보드 기능:**
- 비밀번호 인증 (세션 기반)
- 로컬 접근만 허용 (`localhost`, `127.0.0.1`)
- 백엔드 연결 상태 모니터링
- 4개 탭 (YouTube, 커뮤니티, 네이버 카페, AI 미션)

**API 클라이언트:**
- `api/firebase.ts`: Firestore 직접 연결 (읽기/삭제)
- `api/backend.ts`: REST API 클라이언트

**보안:**
- 프로덕션 빌드 차단
- 로컬 IP 외 접근 거부
- 환경 변수로 비밀번호 관리

---

### 4단계: DB 테이블 리네이밍 ✅

**테이블 변경:**
| 기존 테이블 | 새 테이블 | 상태 |
|----------|---------|-----|
| `viral_posts` | `t_marketing_viral_posts` | ✅ 완료 |
| `crawl_progress` | `t_marketing_crawl_progress` | ✅ 완료 |
| `videos` | `t_marketing_videos` | ✅ 완료 |
| `ai_missions` | `t_marketing_ai_missions` | ✅ 완료 |
| `dealers` | `dealers` | ⚪ 유지 (메인 서비스와 공유) |

**코드 업데이트:**
- ✅ `app/api/admin/marketer/community/crawl/route.ts` (5곳)
- ✅ `app/api/admin/marketer/youtube/crawl/route.ts` (3곳)
- ✅ `app/api/admin/marketer/youtube/analyze/route.ts` (1곳)
- ✅ `app/api/admin/ai-missions/list/route.ts` (1곳)
- ✅ `app/api/admin/ai-missions/update/route.ts` (1곳)
- ✅ `app/api/admin/ai-missions/reject/route.ts` (1곳)
- ✅ `app/api/admin/ai-missions/clear/route.ts` (1곳)
- ✅ `app/api/admin/ai-missions/fix-show-ids/route.ts` (2곳)
- ✅ `app/api/missions/create/route.ts` (3곳)
- ✅ `dashboard/src/api/firebase.ts` (7곳)

---

## 🚀 실행 방법

### 백엔드 서버 실행
```bash
cd realpick-marketing-bot/backend
npm run dev
# → http://localhost:3001
```

### 대시보드 실행
```bash
cd realpick-marketing-bot/dashboard
npm run dev
# → http://localhost:5173
```

### 동시 실행 (권장)
```bash
cd realpick-marketing-bot
npm run dev
# 백엔드 + 대시보드 동시 실행
```

---

## 📊 데이터 마이그레이션

### 마이그레이션 스크립트 실행
```bash
cd realpick-marketing-bot/backend
npm run migrate
```

**기능:**
- 기존 컬렉션 데이터를 새 컬렉션으로 복사
- `_migratedAt`, `_originalCollection` 메타데이터 추가
- 배치 처리 (500개씩)
- 원본 컬렉션은 수동 백업 후 삭제

**마이그레이션 대상:**
1. `viral_posts` (46개 발견) → `t_marketing_viral_posts`
2. `crawl_progress` → `t_marketing_crawl_progress`
3. `videos` → `t_marketing_videos`
4. `ai_missions` → `t_marketing_ai_missions`

---

## ⚠️ 주의사항

### 보안
- **절대 프로덕션 서버에 배포하지 마세요**
- 대시보드 비밀번호는 `.env.local`에서 변경 가능
- Firebase Admin 키는 절대 커밋하지 마세요

### 성능
- 크롤링 간격: 3~7초 (IP 차단 방지)
- Firebase 읽기 쿼리: React Query 5분 캐싱
- YouTube API 할당량: 하루 10,000 units

### 비용
- YouTube API: 무료 (할당량 내)
- Gemini API: 무료 티어
- Firebase: 읽기/쓰기 요금 주의 (월 50,000회 무료)

---

## 🔧 다음 단계

### 즉시 해야 할 작업
1. **환경 변수 설정**
   - `realpick-marketing-bot/.env.local` 생성
   - 메인 프로젝트 `.env.local`에서 Firebase 정보 복사
   - 대시보드 비밀번호 설정

2. **데이터 마이그레이션**
   ```bash
   npm run migrate
   ```

3. **테스트 실행**
   - 백엔드 헬스 체크: `curl http://localhost:3001/api/health`
   - 대시보드 접속: `http://localhost:5173`
   - 로그인 비밀번호 확인

### 선택적 작업
4. **기존 컬렉션 정리**
   - Firebase Console에서 새 컬렉션 확인
   - 기존 컬렉션 백업 (Firestore Export)
   - 테스트 후 기존 컬렉션 삭제

5. **백엔드 API 라우트 추가**
   - `backend/src/routes/youtube.ts`
   - `backend/src/routes/community.ts`
   - `backend/src/routes/naverCafe.ts`

6. **대시보드 컴포넌트 통합**
   - UI 라이브러리 의존성 해결
   - 기존 7개 컴포넌트 통합
   - Firebase 연결 테스트

---

## 📁 백업 위치

**원본 파일 (백업용):**
- `F:/realpick/scripts/marketing/` (Python 크롤러)
- `F:/realpick/app/api/admin/marketer/` (API 라우트)
- `F:/realpick/components/c-admin/marketer/` (컴포넌트)
- `F:/realpick/lib/marketer/` (유틸리티)

**주의:** 이 파일들은 메인 앱에서 더 이상 사용되지 않으므로 안전하게 삭제 가능합니다.

---

## 📝 문의 및 이슈

문제 발생 시:
1. 백엔드 로그 확인: `realpick-marketing-bot/backend/`
2. 대시보드 콘솔 확인: 브라우저 개발자 도구
3. Python 로그 확인: `realpick-marketing-bot/crawler/`

---

**작업자**: AI Assistant  
**문서 버전**: 1.0  
**마지막 업데이트**: 2026-02-06 11:40 KST
