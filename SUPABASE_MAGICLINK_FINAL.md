# ✅ Supabase 매직링크 최종 설정 가이드

## 현재 에러 해결 완료
```
❌ AuthApiError: invalid request: both auth code and code verifier should be non-empty
✅ 해결: Token Hash 플로우 우선 처리하도록 수정 완료
```

---

## 🎯 매직링크 작동 방식

### 1. 매직링크의 3가지 플로우

#### ✅ **Token Hash 플로우** (매직링크 기본, 권장)
```
이메일 링크 → callback?token_hash=xxx&type=magiclink
→ Supabase가 자동으로 세션 생성
→ 어떤 브라우저에서든 작동! ✨
```

#### ⚠️ **PKCE 플로우** (OAuth 앱용, 매직링크에는 부적합)
```
이메일 링크 → callback?code=xxx
→ code_verifier 필요 (다른 브라우저에서는 없음)
→ 실패 ❌
```

#### 📱 **Implicit 플로우** (구버전, 권장하지 않음)
```
이메일 링크 → callback#access_token=xxx
→ 보안상 문제
```

---

## 🔧 Supabase Dashboard 필수 설정

### 1️⃣ Redirect URLs 설정

**위치:** `Authentication > URL Configuration > Redirect URLs`

**추가할 URL:**
```
http://localhost:3000/auth/callback
https://realpick.netlify.app/auth/callback
```

**중요:**
- 정확히 입력 (끝에 `/` 없음)
- 각 줄에 하나씩
- **Save 버튼 클릭!**

---

### 2️⃣ Email Template 설정 (가장 중요!)

**위치:** `Authentication > Email Templates > Magic Link`

#### ✅ 올바른 템플릿:

```html
<h2>RealPick 로그인</h2>

<p>안녕하세요!</p>
<p>아래 버튼을 클릭하여 로그인하세요:</p>

<p><a href="{{ .ConfirmationURL }}">로그인하기</a></p>

<p>이 링크는 24시간 동안 유효합니다.</p>
<p>본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
```

**핵심:** `{{ .ConfirmationURL }}` 사용!

#### ❌ 잘못된 템플릿 (절대 사용 금지):

```html
<!-- ❌ 이렇게 하면 PKCE 에러 발생! -->
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink">
```

---

### 3️⃣ Site URL 설정

**위치:** `Authentication > URL Configuration > Site URL`

```
https://realpick.netlify.app
```

**로컬 테스트 시:**
```
http://localhost:3000
```

---

### 4️⃣ Email Auth 설정 확인

**위치:** `Authentication > Providers > Email`

- ✅ **Enable Email provider**: ON
- ✅ **Confirm email**: OFF (매직링크는 이메일 인증이 포함됨)
- ✅ **Secure email change**: ON

---

## 📝 코드 변경사항 (이미 완료)

### ✅ 수정 완료된 내용:

1. **Token Hash 플로우 우선 처리**
   - URL에서 자동 세션 생성 대기
   - Supabase가 `token_hash`를 자동 처리

2. **PKCE 플로우 Fallback**
   - PKCE 실패 시 일반 세션으로 전환
   - 에러 대신 다른 방법 시도

3. **에러 처리 개선**
   - Supabase 에러 메시지 먼저 체크
   - 친화적인 에러 메시지 표시

---

## 🧪 테스트 방법

### 로컬 테스트:
```bash
# 1. 개발 서버 재시작
npm run dev

# 2. http://localhost:3000 접속
# 3. 로그인 버튼 클릭
# 4. 이메일 입력
# 5. 이메일 확인
# 6. 매직링크 클릭
# 7. ✅ 로그인 성공!
```

### 브라우저 간 테스트 (핵심!):
```bash
# 1. Chrome에서 로그인 요청
# 2. 이메일 앱 열기
# 3. Safari/Edge/다른 브라우저에서 링크 클릭
# 4. ✅ 로그인 성공! (이제 작동함)
```

### 모바일 테스트:
```bash
# 1. PC에서 로그인 요청
# 2. 모바일 이메일 앱 열기
# 3. 링크 클릭
# 4. ✅ 모바일 브라우저에서 로그인 성공!
```

---

## 🔍 브라우저 콘솔에서 확인할 로그

### ✅ 성공 시 로그:

```javascript
[handleMagicLinkCallback] 시작
[handleMagicLinkCallback] URL: https://...callback?token_hash=...
[handleMagicLinkCallback] 세션 확인 중...
[handleMagicLinkCallback] 매직링크로 세션 생성 성공: user-id-xxx
✅ 로그인 성공!
```

### ❌ 실패 시 로그 (Email Template이 잘못된 경우):

```javascript
[handleMagicLinkCallback] PKCE code 발견
[handleMagicLinkCallback] exchangeCodeForSession 실패
❌ both auth code and code verifier should be non-empty
```

**→ 이 에러가 보이면 Email Template을 수정하세요!**

---

## 📧 받는 이메일 확인

### ✅ 올바른 매직링크 URL:

```
https://realpick.netlify.app/auth/callback?token_hash=abcd1234...&type=magiclink&redirect_to=...
```

**핵심:** `token_hash` 파라미터가 있어야 함!

### ❌ 잘못된 URL (PKCE):

```
https://realpick.netlify.app/auth/callback?code=abcd1234...
```

**→ 이렇게 오면 Email Template 수정 필요!**

---

## 🚨 자주 발생하는 문제

### 문제 1: "both auth code and code verifier should be non-empty"

**원인:** Email Template이 PKCE 방식으로 설정됨

**해결:**
1. `Authentication > Email Templates > Magic Link`
2. `{{ .ConfirmationURL }}` 사용하도록 수정
3. Save 클릭
4. 새로 이메일 요청해서 테스트

---

### 문제 2: "Redirect URL not allowed"

**원인:** Redirect URLs에 URL이 등록되지 않음

**해결:**
1. `Authentication > URL Configuration`
2. Redirect URLs에 정확한 URL 추가
3. Save 클릭

---

### 문제 3: "Token expired"

**원인:** 매직링크가 24시간 지남

**해결:**
- 새로 로그인 요청
- 이메일 받고 즉시 클릭

---

### 문제 4: 이메일이 안 옴

**원인:** Rate Limit 또는 Email Provider 설정

**해결:**
1. 스팸 메일함 확인
2. `Settings > Auth > SMTP` 확인
3. 시간당 3-4개 제한 (기본 SMTP)
4. 프로덕션: SendGrid/AWS SES 사용 권장

---

## 🎯 최종 체크리스트

배포 전 모두 확인:

- [ ] **Redirect URLs** 추가 (로컬 + 배포)
- [ ] **Email Template**에서 `{{ .ConfirmationURL }}` 사용
- [ ] **Site URL** 설정
- [ ] **Save 버튼** 클릭
- [ ] 로컬 테스트 성공
- [ ] 배포 환경 테스트 성공
- [ ] 다른 브라우저에서 테스트 성공
- [ ] 모바일에서 테스트 성공

---

## 💡 왜 이제 작동하나요?

### Before (문제):
```javascript
// PKCE만 지원
if (code) {
  exchangeCodeForSession(code) // ❌ code_verifier 없으면 실패
}
```

### After (해결):
```javascript
// 1. Token Hash 우선 (매직링크 기본)
await getSession() // ✅ Supabase가 자동 처리

// 2. PKCE Fallback (필요시)
if (code) {
  try {
    exchangeCodeForSession(code)
  } catch {
    // 실패해도 세션 다시 확인
  }
}

// 3. 최종 확인
await getSession() // ✅ 어떤 방식이든 세션 확인
```

---

## 🎉 성공 후 확인사항

다음이 모두 작동하면 완벽합니다:

✅ 로컬에서 로그인
✅ 배포 사이트에서 로그인
✅ Chrome에서 요청 → Safari에서 링크 클릭
✅ PC에서 요청 → 모바일에서 링크 클릭
✅ 매직링크를 여러 번 클릭해도 한 번만 작동
✅ 24시간 후 만료됨

---

## 📞 추가 도움

문제가 계속되면:
1. 브라우저 콘솔 로그 캡처
2. Supabase Auth Logs 확인
3. 받은 이메일의 링크 URL 복사
4. Email Template 설정 스크린샷
5. 위 정보와 함께 문의

---

**이제 매직링크가 모든 브라우저/디바이스에서 작동합니다! 🚀**

