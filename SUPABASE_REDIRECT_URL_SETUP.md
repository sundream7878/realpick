# Supabase 리다이렉트 URL 설정 가이드 (Netlify)

매직링크 인증을 위해 Supabase에 리다이렉트 URL을 등록해야 합니다.

## 📋 설정할 URL 목록

다음 URL들을 Supabase에 등록해야 합니다:

### 개발 환경
- `http://localhost:3000/auth/callback`

### 프로덕션 환경 (Netlify)
- `https://your-site-name.netlify.app/auth/callback`
- 커스텀 도메인을 사용하는 경우: `https://yourdomain.com/auth/callback`

---

## 🔧 Supabase 리다이렉트 URL 설정 방법

### 1단계: Supabase 대시보드 접속

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. RealPick 프로젝트 선택

### 2단계: Authentication 설정 열기

1. 좌측 메뉴에서 **Authentication** 클릭
2. 상단 탭에서 **URL Configuration** 클릭

### 3단계: 리다이렉트 URL 추가

**Site URL** 섹션:
- 기본 URL을 설정합니다 (예: `https://your-site-name.netlify.app`)

**Redirect URLs** 섹션:
- **Add URL** 버튼 클릭
- 다음 URL들을 하나씩 추가:

```
http://localhost:3000/auth/callback
https://your-site-name.netlify.app/auth/callback
```

**참고**: 
- Netlify 사이트 이름을 확인하려면 Netlify 대시보드 → Site settings → General에서 확인할 수 있습니다.
- 커스텀 도메인을 사용하는 경우 해당 도메인도 추가하세요.

### 4단계: 저장

- **Save** 버튼 클릭하여 설정 저장

---

## 🌐 Netlify 사이트 URL 확인 방법

### 방법 1: Netlify 대시보드에서 확인

1. [Netlify Dashboard](https://app.netlify.com)에 로그인
2. RealPick 사이트 선택
3. **Site settings** → **General** 탭
4. **Site details** 섹션에서 **Site URL** 확인
   - 예: `https://realpick-12345.netlify.app`

### 방법 2: 배포 후 자동 생성된 URL 확인

1. Netlify 대시보드에서 사이트 선택
2. 상단에 표시된 사이트 URL 확인
3. 또는 **Deploys** 탭에서 최근 배포의 URL 확인

---

## ✅ 설정 확인 체크리스트

- [ ] `http://localhost:3000/auth/callback` 추가됨
- [ ] `https://your-site-name.netlify.app/auth/callback` 추가됨
- [ ] 커스텀 도메인 사용 시 해당 URL도 추가됨
- [ ] Supabase에서 **Save** 버튼 클릭하여 저장 완료

---

## 🧪 테스트 방법

### 개발 환경 테스트

1. 로컬에서 `npm run dev` 실행
2. 브라우저에서 `http://localhost:3000` 접속
3. 로그인 모달에서 이메일 입력
4. 이메일로 전송된 매직링크 클릭
5. `http://localhost:3000/auth/callback`로 리다이렉트되는지 확인

### 프로덕션 환경 테스트

1. Netlify에 배포 완료 확인
2. 배포된 사이트 URL로 접속
3. 로그인 모달에서 이메일 입력
4. 이메일로 전송된 매직링크 클릭
5. `https://your-site-name.netlify.app/auth/callback`로 리다이렉트되는지 확인

---

## ⚠️ 주의사항

1. **와일드카드 사용 불가**
   - Supabase는 와일드카드(`*`)를 지원하지 않습니다
   - 각 URL을 정확히 입력해야 합니다

2. **프로토콜 확인**
   - `http://`와 `https://`는 다른 URL로 인식됩니다
   - 개발 환경: `http://localhost:3000`
   - 프로덕션: `https://your-site-name.netlify.app`

3. **경로 정확성**
   - 경로는 정확히 `/auth/callback`이어야 합니다
   - 대소문자도 구분됩니다

4. **여러 환경 사용 시**
   - 개발, 스테이징, 프로덕션 환경이 모두 다르다면 각각 추가해야 합니다

---

## 🔄 환경 변수 설정 (선택사항)

Netlify에서 `NEXT_PUBLIC_SITE_URL` 환경 변수를 설정하면 코드에서 자동으로 사용할 수 있습니다:

1. Netlify 대시보드 → **Site settings** → **Environment variables**
2. **Add variable** 클릭
3. 다음 추가:
   - **Key**: `NEXT_PUBLIC_SITE_URL`
   - **Value**: `https://your-site-name.netlify.app`
4. **Save** 클릭

이렇게 설정하면 `lib/auth-api.ts`에서 자동으로 프로덕션 URL을 사용합니다.

---

## 🐛 문제 해결

### "Invalid redirect URL" 오류가 발생하는 경우

1. Supabase 대시보드에서 리다이렉트 URL이 정확히 등록되었는지 확인
2. URL에 오타가 없는지 확인 (특히 `/auth/callback` 경로)
3. 프로토콜(`http://` vs `https://`)이 올바른지 확인
4. Netlify 사이트 URL이 변경되었는지 확인

### 매직링크 클릭 후 리다이렉트되지 않는 경우

1. 브라우저 콘솔에서 에러 메시지 확인
2. Supabase 대시보드 → Authentication → Logs에서 인증 로그 확인
3. 리다이렉트 URL이 정확히 등록되었는지 다시 확인

---

## 📝 예시 설정

### Supabase Redirect URLs 설정 예시

```
http://localhost:3000/auth/callback
https://realpick-abc123.netlify.app/auth/callback
https://realpick.com/auth/callback
```

### Netlify 환경 변수 설정 예시

```
NEXT_PUBLIC_SITE_URL=https://realpick-abc123.netlify.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

설정이 완료되면 매직링크 인증이 정상적으로 작동합니다! 🎉

