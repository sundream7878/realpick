# 🚨 긴급: 매직링크 "유효하지 않은 토큰" 에러 해결

## 현재 에러
```
token is invalid or has expired
[handleMagicLinkCallback] 유효한 인증 정보를 찾을 수 없습니다.
```

---

## ⚡ 즉시 해야 할 작업 (5분 소요)

### 1단계: Supabase Dashboard 접속

1. https://app.supabase.com 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** 클릭

---

### 2단계: Redirect URLs 설정 (가장 중요!)

**Authentication > URL Configuration**

#### ✅ Redirect URLs에 다음을 추가:

```
http://localhost:3000/auth/callback
https://realpick.netlify.app/auth/callback
```

**⚠️ 주의사항:**
- 정확히 위의 URL을 **복사 붙여넣기** 하세요
- 끝에 `/` 없어야 합니다
- 각각 **새 줄에 하나씩** 입력
- **Save** 버튼 꼭 클릭!

#### 📸 설정 예시:
```
┌─────────────────────────────────────────────┐
│ Redirect URLs                                │
│                                              │
│ http://localhost:3000/auth/callback         │
│ https://realpick.netlify.app/auth/callback  │
│                                              │
│ [+ Add URL]                      [Save]     │
└─────────────────────────────────────────────┘
```

---

### 3단계: Site URL 설정

**Authentication > URL Configuration**

#### Site URL을 다음으로 설정:

```
https://realpick.netlify.app
```

**또는** 로컬 테스트용:
```
http://localhost:3000
```

**⚠️ 배포 환경에서는 반드시 실제 도메인으로 설정!**

---

### 4단계: Email Settings 확인

**Authentication > Email Templates > Magic Link**

#### 이메일 템플릿 확인:

**현재 템플릿이 이렇게 되어 있나요?**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink">
  로그인하기
</a>
```

**⚠️ 위처럼 되어 있다면 잘못된 것!**

**✅ 다음과 같이 변경하세요:**
```html
<h2>매직링크 로그인</h2>

<p>안녕하세요,</p>
<p>아래 버튼을 클릭하여 RealPick에 로그인하세요:</p>

<a href="{{ .ConfirmationURL }}">로그인하기</a>

<p>이 링크는 24시간 동안 유효합니다.</p>
```

**핵심:** `{{ .ConfirmationURL }}` 사용!

---

### 5단계: PKCE 플로우 활성화

**Authentication > Settings > General**

#### 다음 설정 확인:

- ✅ **Enable email confirmations**: ON
- ✅ **Secure email change**: ON  
- ✅ **Enable email OTP**: OFF (매직링크 사용 시)

---

## 🧪 설정 완료 후 테스트

### 테스트 1: 로컬 환경
```bash
# 1. 개발 서버 재시작
npm run dev

# 2. 브라우저에서 http://localhost:3000 접속
# 3. 로그인 버튼 클릭
# 4. 이메일 입력
# 5. 이메일 확인
# 6. 매직링크 클릭
# 7. ✅ 로그인 성공!
```

### 테스트 2: 배포 환경
```bash
# 1. https://realpick.netlify.app 접속
# 2. 로그인 시도
# 3. 이메일에서 링크 클릭
# 4. ✅ 로그인 성공!
```

### 테스트 3: 다른 브라우저
```bash
# 1. Chrome에서 로그인 요청
# 2. Safari에서 이메일 링크 클릭
# 3. ✅ 로그인 성공! (이전에는 실패했음)
```

---

## 🔍 여전히 안 되는 경우

### A. 브라우저 콘솔 확인

1. **F12** 눌러서 개발자 도구 열기
2. **Console** 탭 선택
3. 다음 메시지 확인:

```javascript
[handleMagicLinkCallback] 시작
[handleMagicLinkCallback] URL: https://...
```

**에러가 보이나요?** 스크린샷 찍어서 확인!

---

### B. Supabase Logs 확인

1. **Supabase Dashboard**
2. **Logs > Auth Logs**
3. 최근 로그인 시도 확인

**실패한 로그가 보이나요?** 에러 메시지 확인!

---

### C. 일반적인 문제들

#### ❌ 문제 1: "Redirect URL not allowed"
```
해결: Redirect URLs에 정확한 URL 추가
     (위의 2단계 다시 확인)
```

#### ❌ 문제 2: "Token expired"
```
해결: 매직링크는 24시간만 유효
     새로 로그인 시도
```

#### ❌ 문제 3: "Invalid email"
```
해결: 이메일 주소 오타 확인
     다시 로그인 시도
```

#### ❌ 문제 4: 이메일이 안 옴
```
해결: 
1. 스팸 메일함 확인
2. Supabase > Settings > Email Provider 확인
3. Rate Limit 초과 여부 확인
```

---

## 📧 이메일이 안 오는 경우

### Supabase Email Provider 확인

**Settings > Auth > Email Provider**

#### Option 1: Supabase 기본 메일 (개발용)
```
- 시간당 3-4개 제한
- 프로덕션에서는 사용 불가
```

#### Option 2: 커스텀 SMTP (프로덕션용)
```
Gmail, SendGrid, AWS SES 등 설정 필요
```

---

## ✅ 모든 설정 체크리스트

배포 전에 다음을 모두 확인하세요:

- [ ] Redirect URLs에 로컬 URL 추가 (`http://localhost:3000/auth/callback`)
- [ ] Redirect URLs에 배포 URL 추가 (`https://realpick.netlify.app/auth/callback`)
- [ ] Site URL을 배포 URL로 설정
- [ ] Email Template에서 `{{ .ConfirmationURL }}` 사용
- [ ] Enable email confirmations ON
- [ ] Save 버튼 클릭 완료
- [ ] 로컬에서 테스트 성공
- [ ] 배포 환경에서 테스트 성공
- [ ] 다른 브라우저에서 테스트 성공

---

## 🎯 설정이 제대로 되었는지 확인하는 방법

### 올바른 매직링크 URL 형식:

#### ✅ PKCE 플로우 (현재 사용):
```
https://realpick.netlify.app/auth/callback?code=abc123...
```

#### ❌ 잘못된 형식 (implicit 플로우):
```
https://realpick.netlify.app/auth/callback#access_token=abc123...
```

**이메일에서 받은 링크를 클릭하면 어떤 형식으로 리다이렉트되나요?**

---

## 🆘 그래도 안 되면?

### 1. 캐시 완전 삭제
```
F12 > Application > Storage > Clear site data
```

### 2. Supabase 프로젝트 설정 리셋
```
1. Dashboard > Settings > General
2. Pause project
3. 1분 대기
4. Resume project
```

### 3. 새 프로젝트로 테스트
```
1. 새 Supabase 프로젝트 생성
2. 위의 설정 처음부터 다시
3. 테스트
```

---

## 📞 추가 지원

문제가 계속되면:
1. 브라우저 콘솔 로그 캡처
2. Supabase Auth Logs 캡처
3. 받은 이메일의 링크 URL 복사
4. 위 정보와 함께 문의

---

## 💡 성공했을 때 보이는 로그

```javascript
[handleMagicLinkCallback] 시작
[handleMagicLinkCallback] URL: https://realpick.netlify.app/auth/callback?code=...
[handleMagicLinkCallback] PKCE code 발견, exchangeCodeForSession 시도
[handleMagicLinkCallback] 세션 생성 성공: user-id-here
✅ 로그인 성공!
```

이렇게 보이면 성공입니다! 🎉

