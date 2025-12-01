# Supabase 매직링크 인증 설정 가이드

## 🔧 문제 해결: "유효하지 않은 토큰" 오류

매직링크 인증에서 "유효하지 않은 토큰" 오류가 발생하는 경우, 다음 설정을 확인하세요.

---

## 1️⃣ Supabase Dashboard 설정

### Authentication > URL Configuration

**Redirect URLs 추가:**

```
# 로컬 개발
http://localhost:3000/auth/callback

# Netlify 배포 (예시)
https://your-site.netlify.app/auth/callback

# 커스텀 도메인 (있는 경우)
https://yourdomain.com/auth/callback
```

**⚠️ 중요:**
- 모든 URL은 정확히 입력해야 합니다 (끝에 `/` 없음)
- 각 줄마다 하나의 URL만 입력
- 로컬과 배포 URL을 모두 추가해야 합니다

### Site URL 설정:

```
# 배포 환경 (우선순위 높음)
https://your-site.netlify.app

# 로컬 개발 (테스트용)
http://localhost:3000
```

---

## 2️⃣ Email Templates 설정

**Authentication > Email Templates > Magic Link**

기본 템플릿을 다음과 같이 수정하세요:

```html
<h2>매직링크 로그인</h2>

<p>안녕하세요,</p>
<p>아래 버튼을 클릭하여 RealPick에 로그인하세요:</p>

<a href="{{ .ConfirmationURL }}">로그인하기</a>

<p>이 링크는 24시간 동안 유효합니다.</p>
<p>본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
```

**중요:** `{{ .ConfirmationURL }}`를 사용해야 합니다 (PKCE 플로우 지원)

---

## 3️⃣ PKCE 설정 확인

**Authentication > Settings**

- ✅ **Enable PKCE flow**: ON (권장)
- ✅ **Enable Email Confirmations**: ON

---

## 4️⃣ 환경 변수 확인

`.env.local` 파일:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site URL (배포 시 중요!)
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
```

**Netlify 환경 변수 설정:**
1. Netlify Dashboard > Site Settings > Environment Variables
2. 위의 3개 변수를 모두 추가
3. `NEXT_PUBLIC_SITE_URL`은 실제 배포 URL로 설정

---

## 5️⃣ 코드 변경사항 (이미 적용됨)

### `lib/auth-api.ts` - PKCE 플로우 지원

```typescript
// ✅ 최신 Supabase PKCE 플로우 사용
const code = searchParams.get('code')
if (code) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  // ... 세션 처리
}
```

### `lib/supabase/client.ts` - 올바른 클라이언트 설정

```typescript
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce', // PKCE 플로우 사용
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      }
    }
  )
```

---

## 6️⃣ 테스트 방법

### 로컬 테스트:
1. `npm run dev` 실행
2. 로그인 버튼 클릭
3. 이메일 입력
4. 받은 이메일의 링크 클릭
5. `http://localhost:3000/auth/callback`로 리다이렉트 확인
6. 로그인 성공 확인

### 브라우저 간 테스트:
1. **Chrome에서** 로그인 요청
2. **이메일 앱에서** 매직링크 받기
3. **Safari나 다른 브라우저에서** 링크 클릭
4. ✅ 로그인 성공해야 함!

---

## 7️⃣ 문제 해결 (Troubleshooting)

### "유효하지 않은 토큰" 오류가 계속 발생하는 경우:

1. **브라우저 콘솔 확인:**
   ```
   F12 > Console 탭에서 오류 메시지 확인
   ```

2. **Supabase Dashboard > Logs 확인:**
   - Authentication > Logs
   - 실패한 로그인 시도 확인

3. **Redirect URL 재확인:**
   - 정확히 일치하는지 확인
   - 프로토콜(http/https) 확인
   - 포트 번호 확인 (로컬: 3000)

4. **캐시 지우기:**
   ```bash
   # 브라우저 캐시 삭제
   Ctrl + Shift + Delete (Windows)
   Cmd + Shift + Delete (Mac)
   
   # localStorage 초기화
   F12 > Application > Local Storage > Clear All
   ```

5. **Supabase 프로젝트 재시작:**
   - Dashboard > Settings > General
   - "Pause project" 후 "Resume"

---

## 8️⃣ 배포 후 체크리스트

- [ ] Netlify 환경 변수 설정 완료
- [ ] Supabase Redirect URLs에 배포 URL 추가
- [ ] Site URL을 배포 URL로 변경
- [ ] 배포된 사이트에서 로그인 테스트
- [ ] 다른 브라우저에서 매직링크 테스트
- [ ] 모바일에서 테스트

---

## 📞 추가 도움이 필요한 경우

1. Supabase Discord: https://discord.supabase.com
2. GitHub Issues: 프로젝트 리포지토리
3. 브라우저 콘솔 로그를 캡처하여 공유

---

## ✨ 정상 작동 확인

다음이 모두 작동하면 성공:
- ✅ 로컬에서 매직링크 로그인
- ✅ 배포 사이트에서 매직링크 로그인
- ✅ 다른 브라우저에서 링크 클릭해도 로그인
- ✅ 모바일에서 링크 클릭해도 로그인

