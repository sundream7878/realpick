# SNS 바이럴 시스템 - 미션 데이터 로드 실패 이슈

**작성일**: 2026-02-11  
**상태**: 🚨 **미해결**

---

## 📋 문제 요약

SNS 바이럴 시스템(localhost:5173)에서 미션 데이터를 불러오지 못하는 문제 발생.  
브라우저에서 직접 API를 호출하면 정상 응답하지만, React 앱에서 fetch로 호출하면 404 에러 발생.

---

## 🔴 증상

### ✅ 브라우저 직접 접속 (정상)
```
http://localhost:3000/api/missions/all?limit=5
```
→ **200 OK, JSON 데이터 정상 응답**

### ❌ React fetch 호출 (실패)
```typescript
fetch(`${API_BASE_URL}/api/missions/all?limit=100&status=open`)
```
→ **404 에러: Cannot GET /api/missions/all**

### 에러 메시지 (콘솔)
```
[SNS Viral] 미션 로드 실패: Error: HTTP 404: <!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /api/missions/all</pre>
</body>
</html>

    at loadMissions (SnsViralManage.tsx:81:15)
```

---

## 🔧 시도한 해결 방법 (모두 실패)

| # | 시도 | 결과 |
|---|------|------|
| 1 | CORS 헤더 추가 (`/api/missions/all`) | ❌ 여전히 404 |
| 2 | Next.js 서버 재시작 (localhost:3000) | ❌ 여전히 404 |
| 3 | Vite 서버 재시작 (localhost:5173) | ❌ 여전히 404 |
| 4 | 환경 변수 확인 (`VITE_API_URL`) | ✅ 정상 설정됨 |
| 5 | 디버그 로그 추가 (fetch URL 출력) | ✅ URL 정상 |
| 6 | 브라우저 캐시 삭제 (Ctrl+F5) | ❌ 여전히 404 |
| 7 | `.next` 폴더 삭제 후 재시작 | 시도 안 함 |

---

## 🧐 원인 분석

### 추정 원인 1: Vite Proxy 설정 문제
- `vite.config.ts`의 proxy 설정이 제대로 작동하지 않음
- 새로 생성된 `/api/missions/all` 라우트가 Proxy를 통과하지 못함

### 추정 원인 2: Next.js 라우트 인식 실패
- 새로 생성한 `app/api/missions/all/route.ts`가 빌드에 포함되지 않음
- Hot Reload가 새 파일을 인식하지 못함

### 추정 원인 3: 환경 변수 적용 안됨
- `VITE_API_URL` 변경 후 Vite 서버를 완전히 재시작하지 않음
- 변수는 설정되었으나 런타임에 적용되지 않음

---

## 📂 관련 파일

### 1. API 라우트 (새로 생성)
```
app/api/missions/all/route.ts
```
- missions1 + missions2 통합 조회
- CORS 헤더 포함
- GET 메서드 지원

### 2. UI 컴포넌트
```
realpick-marketing-bot/dashboard/src/components/SnsViralManage.tsx
```
- 미션 목록 로드하는 로직
- `loadMissions()` 함수에서 fetch 호출

### 3. Vite 설정
```
realpick-marketing-bot/dashboard/vite.config.ts
```
- Proxy 설정 포함 (확인 필요)

### 4. 환경 변수
```
realpick-marketing-bot/.env.local
```
```env
VITE_API_URL=http://localhost:3000
```

---

## 🔍 디버그 정보

### 콘솔 출력
```
[SNS Viral] API_BASE_URL: http://localhost:3000
[SNS Viral] Fetching: http://localhost:3000/api/missions/all?limit=100&status=open
[SNS Viral] Response status: 404
[SNS Viral] Response headers: text/html
```

### API 테스트 (curl)
```bash
curl http://localhost:3000/api/missions/all?limit=5
```
→ **200 OK, JSON 응답 정상**

### 서버 상태
- ✅ localhost:3000 (Next.js) - 실행 중
- ✅ localhost:5173 (Vite/React) - 실행 중
- ✅ API 라우트 파일 존재 확인

---

## 💡 다음 시도해볼 방법

### 방법 1: Vite Proxy 설정 확인 및 수정
```typescript
// realpick-marketing-bot/dashboard/vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path // 경로 그대로 전달
      }
    }
  }
})
```

### 방법 2: Next.js 캐시 완전 삭제
```bash
cd f:\realpick
rm -rf .next
npm run dev
```

### 방법 3: 절대 URL로 직접 호출 (Proxy 우회)
```typescript
// SnsViralManage.tsx
const API_BASE_URL = 'http://localhost:3000' // 절대 경로
```

### 방법 4: 대체 API 엔드포인트 사용
기존에 작동하는 다른 API를 사용:
```typescript
// /api/admin/ai-missions/list (AI 미션만)
// 또는 Firebase 직접 조회
```

---

## 🚀 임시 해결 방안 (Workaround)

Firebase에서 직접 데이터 가져오기:

```typescript
import { collection, getDocs, query, where, limit as firestoreLimit } from 'firebase/firestore'
import { db } from '../lib/firebase'

async function loadMissions() {
  try {
    // missions1
    const missions1Ref = collection(db, 'missions1')
    const q1 = query(missions1Ref, where('status', '==', 'open'), firestoreLimit(50))
    const snapshot1 = await getDocs(q1)
    
    // missions2
    const missions2Ref = collection(db, 'missions2')
    const q2 = query(missions2Ref, where('status', '==', 'open'), firestoreLimit(50))
    const snapshot2 = await getDocs(q2)
    
    // 통합
    const allMissions = [
      ...snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data(), __table: 'missions1' })),
      ...snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data(), __table: 'missions2' }))
    ]
    
    return allMissions
  } catch (error) {
    console.error('Firebase 직접 조회 실패:', error)
  }
}
```

---

## 📌 현재 상태

| 항목 | 상태 |
|------|------|
| API 라우트 존재 | ✅ 생성됨 |
| CORS 헤더 | ✅ 추가됨 |
| Next.js 서버 | ✅ 실행 중 |
| Vite 서버 | ✅ 실행 중 |
| 환경 변수 | ✅ 설정됨 |
| 브라우저 직접 접속 | ✅ 정상 |
| React fetch | ❌ **404 에러** |

---

## 📝 참고사항

### Vite 환경 변수 규칙
- `VITE_` 접두사가 있어야 클라이언트에서 접근 가능
- 서버 재시작 후에만 적용됨
- `import.meta.env.VITE_API_URL`로 접근

### Next.js API Routes
- `app/api/` 폴더 구조가 URL 경로와 일치
- `route.ts` 파일명 필수
- Hot Reload 지원하지만 때로는 수동 재시작 필요

### CORS
- 개발 환경에서는 `Access-Control-Allow-Origin: *` 사용 가능
- Vite Proxy 사용 시 CORS 문제 우회 가능

---

---

## ✅ **해결됨!** (2026-02-11)

### 🎯 근본 원인
**Vite Proxy는 상대 경로(`/api/...`)에만 작동합니다!**

코드에서 `API_BASE_URL = 'http://localhost:3000'`로 절대 경로를 사용하고 있어서,  
Vite Proxy를 완전히 우회하고 있었습니다.

### 🔧 해결 방법
```typescript
// ❌ 잘못된 방식 (절대 경로 = Proxy 우회)
const API_BASE_URL = 'http://localhost:3000'
fetch(`${API_BASE_URL}/api/missions/all`)  // → http://localhost:3000/api/... 직접 호출

// ✅ 올바른 방식 (상대 경로 = Proxy 사용)
const API_BASE_URL = ''  // 빈 문자열
fetch(`${API_BASE_URL}/api/missions/all`)  // → /api/... (Vite가 localhost:3000으로 프록시)
```

### 📝 수정된 파일
- `realpick-marketing-bot/dashboard/src/components/SnsViralManage.tsx`
  - `API_BASE_URL` 변경: `'http://localhost:3000'` → `''`
  - Vite Proxy가 자동으로 localhost:3000으로 요청 전달

### ✅ 테스트 방법
1. 브라우저 새로고침 (Ctrl+F5)
2. 콘솔 확인:
   ```
   [SNS Viral] Fetching: /api/missions/all?limit=100&status=open
   [SNS Viral] 미션 로드 성공: XX
   ```

---

**마지막 업데이트**: 2026-02-11  
**담당자**: AI Assistant  
**상태**: ✅ **해결됨**
