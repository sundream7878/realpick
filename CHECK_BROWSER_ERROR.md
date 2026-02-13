# 브라우저 에러 확인 방법

## ✅ API는 정상 작동 중입니다!
테스트 결과: `http://localhost:3000/api/missions/all` → **200 OK**

---

## 🔍 브라우저에서 정확한 에러 확인하기

### 1. 브라우저 개발자 도구 열기
```
F12 키 또는 우클릭 → 검사
```

### 2. Console 탭 확인
다음과 같은 에러 메시지를 찾아보세요:
- `unexpected token '<', "<!DOCTYPE"...is not valid JSON`
- `Failed to fetch`
- `CORS error`
- `Network error`

**스크린샷을 찍거나 에러 메시지를 복사해주세요!**

### 3. Network 탭 확인
1. Network 탭 클릭
2. XHR 필터 선택
3. 페이지 새로고침 (F5)
4. `missions/all` 요청 클릭
5. **Response 탭** 확인

**Response가 HTML인지 JSON인지 확인해주세요!**

---

## 🔧 가능한 원인

### 1. 메인 Next.js 서버가 실행되지 않음
```bash
# 새 터미널에서
cd f:\realpick
npm run dev
```

### 2. 환경 변수 문제
`realpick-marketing-bot/.env.local` 확인:
```env
VITE_API_URL=http://localhost:3000
```

### 3. 브라우저 캐시
```
Ctrl + Shift + Delete → 캐시 삭제
또는 Ctrl + F5 (강력 새로고침)
```

---

## 🚨 다음 정보를 알려주세요

1. **브라우저 Console 탭의 에러 메시지** (전체 복사)
2. **Network 탭에서 `missions/all` 요청의 Response** (HTML인지 JSON인지)
3. **메인 Next.js 서버 (localhost:3000)가 실행 중인지** 확인

이 정보가 있으면 정확한 해결책을 드릴 수 있습니다!
