# Supabase Auth 이메일 설정 가이드

OTP 로그인이 작동하지 않는 문제를 해결하는 가이드입니다.

---

## 🔍 문제 증상

```
AuthApiError: Error sending magic link email
Status: 500
Code: unexpected_failure
```

**원인**: Supabase Auth에 SMTP가 설정되어 있지 않아 인증 이메일을 보낼 수 없음

---

## ✅ 해결 방법

### 방법 1: Custom SMTP 설정 (권장)

#### 1-1. Supabase Dashboard 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Authentication** → **Settings** → **SMTP Settings**

#### 1-2. Gmail SMTP 입력

```
Enable Custom SMTP: ON

SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP Username: your-email@gmail.com
SMTP Password: [Gmail 앱 비밀번호]
Sender Email: your-email@gmail.com
Sender Name: 리얼픽
```

💡 **Gmail 앱 비밀번호**는 이전에 만든 16자리 비밀번호 사용

#### 1-3. 이메일 템플릿 커스터마이징

**리얼픽 브랜드 색상을 적용한 전문 템플릿을 사용하려면:**

📄 **`docs/SUPABASE_EMAIL_TEMPLATE_SETUP.md`** 문서를 참조하세요!

**간단한 템플릿 예시:**
```html
<h2>리얼픽 로그인</h2>
<p>안녕하세요,</p>
<p>로그인을 위한 6자리 인증 코드입니다:</p>
<h1 style="letter-spacing: 5px; color: #2C2745;">{{ .Token }}</h1>
<p>이 코드는 10분간 유효합니다.</p>
```

#### 1-4. 테스트

1. 웹사이트 로그인 시도
2. Gmail 확인
3. 6자리 코드 입력

---

### 방법 2: 개발 환경 우회 (임시)

개발 중이라면 Supabase의 **Disable Email Confirmations** 옵션 사용:

1. **Authentication** → **Settings**
2. **Enable email confirmations** 끄기
3. **Save**

⚠️ **주의**: 프로덕션에서는 절대 사용 금지!

---

### 방법 3: 다른 이메일 제공자 사용

Gmail 대신 다른 SMTP 서비스:

#### Resend (권장)
```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP Username: resend
SMTP Password: [Resend API Key]
```

#### SendGrid
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: [SendGrid API Key]
```

---

## 🔍 디버깅

### SMTP 설정 확인 체크리스트

```
□ Custom SMTP가 켜져 있는가?
□ Gmail 앱 비밀번호가 16자리인가?
□ 앱 비밀번호에 공백이 없는가?
□ Gmail 2단계 인증이 활성화되어 있는가?
□ SMTP Port가 587인가? (465 아님)
```

### 일반적인 에러

| 에러 | 원인 | 해결 |
|------|------|------|
| "Authentication failed" | 잘못된 비밀번호 | Gmail 앱 비밀번호 재생성 |
| "Connection timeout" | 잘못된 호스트/포트 | `smtp.gmail.com:587` 확인 |
| "Sender address rejected" | 발신자 이메일 불일치 | Username과 Sender Email 동일하게 |
| "Rate limit exceeded" | 발송 제한 초과 | 1시간 후 재시도 |

### Supabase 로그 확인

**Settings** → **Logs** → **Auth Logs**에서 에러 상세 확인

---

## 📧 이메일 템플릿 커스터마이징

### 🎨 리얼픽 브랜드 템플릿 사용

**리얼픽 디자인 시스템을 적용한 전문 이메일 템플릿:**

📄 **상세 가이드: `docs/SUPABASE_EMAIL_TEMPLATE_SETUP.md`**

이 문서에서 제공하는 템플릿은:
- ✅ p-profile과 동일한 색상 테마 (`#2C2745` → `#3E757B`)
- ✅ 네이버 메일 호환 (테이블 기반 레이아웃)
- ✅ 모든 이메일 클라이언트 지원
- ✅ 반응형 디자인
- ✅ 텍스트 전용 버전 포함

### 간단한 템플릿 (빠른 시작)

**Authentication** → **Email Templates** → **Magic Link**:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .code {
      background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%);
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 10px;
      border-radius: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h2 style="color: #2C2745;">리얼픽 로그인</h2>
  <p>안녕하세요,</p>
  <p>로그인을 위한 인증 코드입니다:</p>
  <div class="code">{{ .Token }}</div>
  <p>이 코드는 <strong style="color: #3E757B;">10분</strong>간 유효합니다.</p>
  <p>로그인을 시도하지 않으셨다면 이 이메일을 무시하세요.</p>
  <hr>
  <p style="color: #999; font-size: 12px;">
    이 이메일은 리얼픽에서 자동으로 발송되었습니다.
  </p>
</body>
</html>
```

---

## 🎯 확인 사항

### 설정 완료 체크리스트

- [ ] Supabase Dashboard → Authentication → Settings 접속
- [ ] Custom SMTP 켜기
- [ ] Gmail SMTP 정보 입력
- [ ] Gmail 앱 비밀번호 16자리 (공백 없이)
- [ ] Sender Email = SMTP Username
- [ ] Save 버튼 클릭
- [ ] 테스트 로그인 성공
- [ ] 이메일 수신 확인

---

## 💡 팁

### Gmail 발송 제한

- **일일 제한**: 500통
- **분당 제한**: 없음 (하지만 빠른 발송 시 차단 가능)

### 발송량 모니터링

**Authentication** → **Users** → **Email Rate Limiting**에서 확인

### 대안 서비스

발송량이 많아지면:
- **Resend**: 월 3,000통 무료
- **SendGrid**: 월 100통 무료
- **AWS SES**: 월 62,000통 무료 (EC2 사용 시)

---

## 🚨 트러블슈팅

### "SMTP connection failed"

1. Supabase Dashboard 로그 확인
2. Gmail "보안 수준이 낮은 앱 액세스" 확인 (필요 없음, 앱 비밀번호 사용)
3. 방화벽 확인

### "Email delivery failed"

1. Gmail 스팸함 확인
2. 수신자 이메일 주소 확인
3. Gmail 발송 제한 확인

### 여전히 안 되면?

**임시 우회 (개발 전용)**:
1. Supabase Dashboard → **Authentication** → **Settings**
2. **Enable email confirmations** 끄기
3. 로그인 시 이메일 없이 바로 인증

⚠️ 프로덕션에서는 반드시 이메일 인증 켜야 함!

---

## 📞 추가 도움

문제가 계속되면:
1. Supabase Dashboard → Auth Logs 캡처
2. 에러 메시지 복사
3. 설정 스크린샷

---

**설정 완료 후 로그인이 정상 작동할 것입니다!** 🎉

