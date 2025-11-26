# Supabase 6자리 인증코드 이메일 설정 가이드

Supabase에서 6자리 숫자 인증코드를 이메일로 받기 위한 설정 가이드입니다.

## 🔍 문제 상황

Supabase의 기본 `signInWithOtp`는 **Magic Link**를 보냅니다. 6자리 숫자 코드를 받으려면 이메일 템플릿을 수정해야 합니다.

## ✅ 해결 방법

### 방법 1: Supabase 대시보드에서 OTP 코드 확인 (개발 중 권장)

개발 중에는 Supabase 대시보드에서 직접 6자리 OTP 코드를 확인할 수 있습니다:

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** → **Users** 클릭
4. 해당 이메일로 가입한 사용자 찾기 (이메일 주소로 검색)
5. 사용자 행을 클릭하여 상세 정보 열기
6. **"OTP Code"** 또는 **"View OTP"** 버튼 클릭
7. 표시된 **6자리 숫자 코드**를 앱에 입력

> 💡 **팁**: 개발 중에는 이 방법이 가장 빠르고 확실합니다!

### 방법 2: 이메일 템플릿 수정하여 6자리 코드 포함

이메일에 6자리 코드를 포함시키려면 이메일 템플릿을 수정해야 합니다:

#### 2-1. Magic Link 템플릿 수정

1. Supabase 대시보드 → **Authentication** → **Email Templates** 클릭
2. **"Magic Link"** 탭 선택
3. **Subject** 필드 수정 (선택사항):
   ```
   RealPick 인증코드
   ```

4. **Body** 섹션에서 **"Source"** 탭 클릭
5. 다음 템플릿으로 수정:

```html
<h2>RealPick 인증코드</h2>
<p>안녕하세요!</p>
<p>RealPick 로그인을 위한 인증코드입니다:</p>
<h1 style="font-size: 32px; letter-spacing: 8px; text-align: center; margin: 20px 0; color: #e11d48;">
  {{ .Token }}
</h1>
<p>위 6자리 코드를 앱에 입력해주세요.</p>
<p>이 코드는 1시간 동안 유효합니다.</p>
<p>만약 이 요청을 하지 않으셨다면, 이 이메일을 무시하셔도 됩니다.</p>
```

6. **"Preview"** 탭에서 미리보기 확인
7. **"Save"** 버튼 클릭

#### 2-2. OTP 템플릿 확인 (있는 경우)

일부 Supabase 프로젝트에는 별도의 "OTP" 템플릿이 있을 수 있습니다:

1. **Email Templates** 페이지에서 **"OTP"** 탭 확인
2. 있다면 위와 동일하게 수정
3. 없다면 Magic Link 템플릿을 수정하면 됩니다

### 방법 3: 커스텀 SMTP 설정 (프로덕션 권장)

프로덕션 환경에서는 커스텀 SMTP를 설정하여 더 나은 이메일 전송을 할 수 있습니다:

1. Supabase 대시보드 → **Settings** → **Auth**
2. **"SMTP Settings"** 섹션으로 스크롤
3. **"Enable Custom SMTP"** 활성화
4. SMTP 정보 입력:
   - **Host**: `smtp.gmail.com` (Gmail의 경우)
   - **Port**: `587`
   - **Username**: Gmail 주소
   - **Password**: Gmail 앱 비밀번호 (일반 비밀번호 아님)
   - **Sender email**: 발신자 이메일
   - **Sender name**: RealPick

> ⚠️ **주의**: Gmail 앱 비밀번호는 Google 계정 설정에서 별도로 생성해야 합니다.

## 📝 이메일 템플릿 변수

Supabase 이메일 템플릿에서 사용할 수 있는 변수:

- `{{ .Token }}`: 6자리 OTP 코드 (Magic Link의 경우 토큰)
- `{{ .SiteURL }}`: 사이트 URL
- `{{ .Email }}`: 사용자 이메일
- `{{ .RedirectTo }}`: 리다이렉트 URL (있는 경우)

## 🔧 코드 수정 (필요한 경우)

현재 코드는 이미 올바르게 설정되어 있습니다. `signInWithOtp`를 사용하면 Supabase가 자동으로 OTP를 생성하고, 이메일 템플릿에 `{{ .Token }}`이 있으면 코드가 표시됩니다.

## ✅ 확인 방법

1. **이메일 템플릿 수정 후**:
   - 앱에서 인증코드 요청
   - 이메일 확인 (받은편지함 또는 스팸)
   - 6자리 코드가 이메일에 표시되는지 확인

2. **대시보드에서 확인**:
   - Authentication → Users → 해당 사용자
   - OTP Code 버튼으로 코드 확인

## 🐛 문제 해결

### 이메일에 코드가 표시되지 않는 경우

1. **템플릿 저장 확인**: "Save" 버튼을 클릭했는지 확인
2. **변수 확인**: `{{ .Token }}`이 정확히 입력되었는지 확인 (대소문자 구분)
3. **캐시 확인**: 브라우저 캐시를 지우고 다시 시도
4. **스팸 확인**: 스팸 메일함도 확인

### 여전히 Magic Link만 오는 경우

1. **템플릿 확인**: Magic Link 템플릿이 수정되었는지 확인
2. **다른 템플릿 확인**: "OTP" 또는 "Email OTP" 템플릿이 있는지 확인
3. **Supabase 버전 확인**: 일부 구버전에서는 지원하지 않을 수 있음

## 💡 개발 팁

개발 중에는 **Supabase 대시보드에서 직접 OTP 코드를 확인**하는 것이 가장 빠릅니다:
- 이메일 전송 대기 시간 없음
- Rate limit 걱정 없음
- 즉시 코드 확인 가능

## 📚 참고 자료

- [Supabase Email Templates 문서](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase OTP 인증 가이드](https://supabase.com/docs/guides/auth/auth-otp)







