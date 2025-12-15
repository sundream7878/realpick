# Supabase 이메일 템플릿 설정 가이드

리얼픽 브랜드 색상을 적용한 OTP 인증 이메일 템플릿 설정 방법입니다.

---

## 📧 이메일 템플릿 업데이트 방법

### 1. Supabase Dashboard 접속

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** 클릭
4. **Email Templates** 탭 클릭

---

### 2. Magic Link 템플릿 수정

**Magic Link** 템플릿을 선택하고 아래 내용으로 교체합니다.

#### HTML 버전 (Subject)
```
[리얼픽] 로그인 인증 코드
```

#### HTML 버전 (Body)

`docs/SUPABASE_EMAIL_TEMPLATE.html` 파일의 전체 내용을 복사하여 붙여넣습니다.

**중요 포인트:**
- `{{ .Token }}` 변수는 Supabase가 자동으로 6자리 인증 코드로 교체합니다
- 로고 이미지를 사용하려면 공개 URL로 변경 필요 (예: `https://your-domain.netlify.app/favicon-32x32.png`)

---

### 3. 텍스트 전용 버전 (Text Version)

네이버 메일 등 HTML을 지원하지 않는 이메일 클라이언트를 위한 텍스트 버전:

```text
==================================================
리얼픽 (RealPick)
LOGIN VERIFICATION CODE
==================================================

안녕하세요,

리얼픽에 로그인하기 위한 인증 코드입니다.
아래 6자리 코드를 입력해 주세요.

--------------------------------------------------
인증 코드: {{ .Token }}
--------------------------------------------------

이 코드는 발송 시간으로부터 10분 동안 유효합니다.
시간이 지나면 다시 새로운 코드를 요청해 주세요.

⚠️ 주의사항:
당신이 직접 요청한 것이 아니라면 이 코드를 
공유하지 마세요. 리얼픽 팀은 이메일로 
인증 코드를 요청하지 않습니다.

--------------------------------------------------
© 리얼픽. All rights reserved.
이 이메일은 로그인 인증을 위해 발송되었습니다.
==================================================
```

---

### 4. 설정 확인

#### OTP 설정 확인
- **Authentication** → **Settings**
- **Email Auth** 섹션에서 다음 항목 확인:
  - ✅ Enable email provider
  - ✅ Enable email confirmations (개발 환경에서는 OFF 가능)
  - OTP expiry: `3600` (1시간 = 60분, 기본값)

#### Rate Limit 설정
과도한 이메일 발송 방지:
- **Settings** → **Rate Limits**
- Email sending rate limit: 적절한 값 설정 (예: 시간당 10회)

---

## 🎨 디자인 특징

### 사용된 색상 (p-profile 테마)
- **Primary Gradient**: `#2C2745` → `#3E757B` (Deep purple to Teal)
- **Text**: `#1F2937` (Dark gray)
- **Secondary Text**: `#6B7280` (Medium gray)
- **Warning**: `#F59E0B` (Amber)

### 네이버 메일 호환성
1. **테이블 기반 레이아웃**: `<table>` 태그 사용으로 모든 메일 클라이언트 호환
2. **인라인 스타일**: 모든 스타일을 `style` 속성에 직접 작성
3. **그라데이션 폴백**: 그라데이션을 지원하지 않는 클라이언트를 위한 대체 배경색
4. **텍스트 버전 제공**: HTML을 렌더링하지 못하는 경우 텍스트 버전 표시

---

## 🧪 테스트 방법

### 1. 로컬 테스트
```bash
# 웹사이트에서 로그인 시도
# 이메일 주소 입력
# 이메일 확인
```

### 2. 여러 이메일 클라이언트 테스트
- ✅ Gmail (데스크톱/모바일)
- ✅ 네이버 메일 (데스크톱/모바일)
- ✅ Daum 메일
- ✅ Outlook
- ✅ Apple Mail (iOS/macOS)

### 3. 스팸 폴더 확인
첫 발송 시 스팸으로 분류될 수 있으니 스팸 폴더도 확인하세요.

---

## 🔧 트러블슈팅

### 문제 1: 이메일이 텍스트로만 표시됨
**원인**: HTML 템플릿이 설정되지 않았거나, 텍스트 버전만 설정됨
**해결**: HTML Body 필드에 템플릿을 제대로 붙여넣었는지 확인

### 문제 2: 그라데이션이 보이지 않음
**원인**: 일부 이메일 클라이언트는 CSS 그라데이션을 지원하지 않음
**해결**: 정상입니다. 대체 배경색이 표시됩니다.

### 문제 3: 로고 이미지가 보이지 않음
**원인**: 이미지 URL이 공개 접근 가능하지 않음
**해결**: Netlify 등에 배포된 공개 URL 사용
```html
<img src="https://your-app.netlify.app/favicon-32x32.png" alt="리얼픽" />
```

### 문제 4: 이메일이 도착하지 않음
**원인**: SMTP 설정 미완료 또는 Rate Limit 초과
**해결**: 
1. `docs/SUPABASE_AUTH_EMAIL_SETUP.md` 참고하여 SMTP 설정
2. Supabase Logs에서 에러 확인

---

## 📝 참고 사항

### Supabase 이메일 템플릿 변수
- `{{ .Token }}`: 6자리 OTP 코드
- `{{ .TokenHash }}`: 토큰 해시 (Magic Link용)
- `{{ .SiteURL }}`: 프로젝트 URL
- `{{ .ConfirmationURL }}`: 확인 링크 (Magic Link용)

### 이메일 발신자 정보 변경
**Authentication** → **Settings** → **SMTP Settings**에서:
- **Sender Name**: `리얼픽` 또는 `RealPick`
- **Sender Email**: 도메인 인증된 이메일 권장

---

## ✅ 체크리스트

설정 완료 후 확인:

- [ ] HTML 템플릿 업데이트 완료
- [ ] 텍스트 버전 업데이트 완료
- [ ] Subject 라인 변경 완료
- [ ] SMTP 설정 완료 (docs/SUPABASE_AUTH_EMAIL_SETUP.md 참고)
- [ ] Gmail에서 테스트 완료
- [ ] 네이버 메일에서 테스트 완료
- [ ] 로고 이미지 URL 공개 접근 가능 확인 (선택사항)
- [ ] Rate Limit 설정 완료

---

## 🎯 다음 단계

1. Supabase Dashboard에서 템플릿 설정
2. 테스트 이메일 발송
3. 여러 이메일 클라이언트에서 확인
4. 필요시 템플릿 미세 조정
5. 프로덕션 배포

---

궁금한 점이 있으면 Supabase 공식 문서를 참고하세요:
- [Supabase Auth Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

