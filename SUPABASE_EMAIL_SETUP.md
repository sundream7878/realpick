# Supabase 이메일 인증코드 설정 가이드

이메일 인증코드가 도착하지 않는 문제를 해결하기 위한 가이드입니다.

> ⚠️ **중요**: Supabase는 기본적으로 **Magic Link**를 보냅니다. **6자리 숫자 코드**를 이메일에 포함시키려면 [SUPABASE_OTP_EMAIL_SETUP.md](./SUPABASE_OTP_EMAIL_SETUP.md)를 참고하세요.

## 🔍 문제 진단

### 1. Supabase 대시보드에서 확인

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** → **Users** 클릭
4. 이메일로 인증코드를 요청한 사용자를 찾아 클릭
5. **"View OTP"** 또는 **"OTP Code"** 버튼 클릭하여 코드 확인

> 💡 **개발 환경 팁**: 개발 중에는 Supabase 대시보드에서 직접 OTP 코드를 확인할 수 있습니다.

### 2. 이메일 템플릿 확인

1. Supabase 대시보드에서 **Authentication** → **Email Templates** 클릭
2. **"Magic Link"** 또는 **"OTP"** 템플릿 확인
3. 이메일 템플릿이 활성화되어 있는지 확인

### 3. 이메일 설정 확인

1. Supabase 대시보드에서 **Settings** → **Auth** 클릭
2. **"Email Auth"** 섹션 확인:
   - ✅ "Enable Email Signup" 활성화되어 있는지 확인
   - ✅ "Enable Email Confirmations" 설정 확인 (필요시 비활성화 가능)
   - ✅ "Enable Email OTP" 활성화되어 있는지 확인

### 4. Rate Limiting 확인

Supabase 무료 플랜에서는 이메일 전송에 제한이 있을 수 있습니다:
- 시간당 이메일 전송 제한
- 일일 이메일 전송 제한

**해결 방법**:
- 잠시 기다린 후 다시 시도
- Supabase Pro 플랜으로 업그레이드
- 커스텀 SMTP 설정 (아래 참조)

## 🔧 해결 방법

### 방법 1: 개발 환경에서 OTP 코드 확인 (권장)

개발 중에는 Supabase 대시보드에서 직접 OTP 코드를 확인할 수 있습니다:

1. Supabase 대시보드 → **Authentication** → **Users**
2. 해당 이메일로 가입한 사용자 찾기
3. 사용자 클릭 → **"View OTP"** 또는 **"OTP Code"** 버튼 클릭
4. 표시된 6자리 코드를 앱에 입력

### 방법 2: 커스텀 SMTP 설정

실제 이메일 전송을 위해 커스텀 SMTP를 설정할 수 있습니다:

1. Supabase 대시보드 → **Settings** → **Auth**
2. **"SMTP Settings"** 섹션으로 스크롤
3. SMTP 서비스 제공업체 선택 (Gmail, SendGrid, Mailgun 등)
4. SMTP 설정 정보 입력:
   - **Host**: SMTP 서버 주소
   - **Port**: SMTP 포트 (보통 587 또는 465)
   - **Username**: SMTP 사용자명
   - **Password**: SMTP 비밀번호
   - **Sender email**: 발신자 이메일 주소
   - **Sender name**: 발신자 이름

**Gmail 설정 예시**:
- Host: `smtp.gmail.com`
- Port: `587`
- Username: Gmail 주소
- Password: Gmail 앱 비밀번호 (일반 비밀번호 아님)

### 방법 3: 이메일 템플릿 커스터마이징

1. Supabase 대시보드 → **Authentication** → **Email Templates**
2. **"Magic Link"** 또는 **"OTP"** 템플릿 선택
3. 템플릿 내용 수정 가능
4. **"Save"** 클릭

## 📧 이메일이 스팸으로 분류되는 경우

다음 사항을 확인하세요:

1. **스팸 메일함 확인**: 받은편지함과 스팸 메일함 모두 확인
2. **이메일 필터 설정**: 이메일 서비스의 필터 설정 확인
3. **도메인 신뢰도**: Supabase 기본 이메일은 일부 서비스에서 스팸으로 분류될 수 있음
   - 해결: 커스텀 SMTP 사용 (위 방법 2 참조)

## 🐛 디버깅

### 브라우저 콘솔 확인

개발자 도구(F12) → Console 탭에서 다음 메시지 확인:
- `인증코드 전송 성공: [이메일]`
- `인증코드 전송 실패: [에러 메시지]`

### Supabase 로그 확인

1. Supabase 대시보드 → **Logs** → **Auth Logs**
2. 최근 인증 요청 확인
3. 에러 메시지 확인

## ✅ 체크리스트

- [ ] Supabase 대시보드에서 OTP 코드 확인 가능한지 테스트
- [ ] 이메일 템플릿이 활성화되어 있는지 확인
- [ ] Email Auth 설정이 올바른지 확인
- [ ] 스팸 메일함 확인
- [ ] Rate limiting에 걸리지 않았는지 확인
- [ ] (선택) 커스텀 SMTP 설정

## 📚 참고 자료

- [Supabase Email Auth 문서](https://supabase.com/docs/guides/auth/auth-email)
- [Supabase SMTP 설정](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Rate Limits](https://supabase.com/docs/guides/platform/rate-limits)

## 💡 개발 팁

개발 중에는 다음 방법을 사용하세요:

1. **Supabase 대시보드에서 OTP 확인**: 가장 빠른 방법
2. **테스트 이메일 사용**: 실제 이메일 대신 테스트용 이메일 사용
3. **로컬 개발용 Mock**: 개발 환경에서만 Mock 데이터 사용 (프로덕션에서는 제거)

