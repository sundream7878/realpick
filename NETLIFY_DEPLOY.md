# Netlify 배포 가이드

RealPick 프로젝트를 Netlify에 배포하는 절차입니다.

## 📋 사전 준비사항

1. **Git 저장소 준비**
   - GitHub, GitLab, Bitbucket 등에 코드가 푸시되어 있어야 합니다
   - `.env.local` 파일은 `.gitignore`에 포함되어 있어야 합니다 (이미 설정됨)

2. **Supabase 프로젝트 준비**
   - Supabase 프로젝트가 생성되어 있어야 합니다
   - 환경 변수 값들을 준비해두세요

## 🚀 배포 절차

### 1단계: Netlify 계정 생성 및 로그인

1. [Netlify](https://www.netlify.com) 접속
2. "Sign up" 클릭하여 계정 생성 (GitHub 계정으로 로그인 권장)
3. 대시보드로 이동

### 2단계: 새 사이트 추가

1. Netlify 대시보드에서 **"Add new site"** → **"Import an existing project"** 클릭
2. Git 제공자 선택 (GitHub, GitLab, Bitbucket 등)
3. RealPick 저장소 선택
4. 브랜치 선택 (보통 `main` 또는 `master`)

### 3단계: 빌드 설정

Netlify가 자동으로 Next.js를 감지하지만, 다음 설정을 확인하세요:

- **Build command**: `npm run build`
- **Publish directory**: `.next` (또는 자동 감지)
- **Base directory**: (루트 디렉토리면 비워둠)

또는 `netlify.toml` 파일이 있으면 자동으로 설정을 읽습니다.

### 4단계: 환경 변수 설정

**중요**: Supabase 연결을 위해 환경 변수를 반드시 설정해야 합니다!

1. Netlify 대시보드에서 사이트 선택
2. **Site settings** → **Environment variables** 클릭
3. 다음 환경 변수들을 추가:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**환경 변수 값 확인 방법:**
- Supabase Dashboard → Settings → API
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`에 입력
- `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력

### 5단계: 배포 실행

1. 환경 변수 설정 후 **"Deploy site"** 클릭
2. 빌드가 시작되면 **"Deploys"** 탭에서 진행 상황 확인
3. 빌드 완료까지 약 3-5분 소요

### 6단계: 배포 확인

1. 빌드가 성공하면 사이트 URL이 생성됩니다
2. 생성된 URL로 접속하여 사이트가 정상 작동하는지 확인
3. Supabase 연결이 제대로 되는지 확인 (로그인 기능 테스트)

## 🔧 추가 설정 (선택사항)

### 커스텀 도메인 설정

1. Netlify 대시보드 → **Site settings** → **Domain management**
2. **Add custom domain** 클릭
3. 도메인 입력 및 DNS 설정

### 환경별 변수 설정

프로덕션과 스테이징 환경을 분리하려면:

1. **Site settings** → **Environment variables**
2. 각 환경(Production, Deploy preview, Branch deploys)별로 다른 값 설정 가능

## ⚠️ 주의사항

1. **환경 변수 보안**
   - `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트에 노출됩니다
   - 민감한 정보는 절대 `NEXT_PUBLIC_` 접두사를 사용하지 마세요

2. **빌드 시간**
   - 첫 배포는 시간이 오래 걸릴 수 있습니다
   - 이후 배포는 변경된 파일만 빌드하므로 더 빠릅니다

3. **Supabase RLS 정책**
   - 배포 후 Supabase의 Row Level Security 정책이 제대로 작동하는지 확인하세요

## 🔄 자동 배포 설정

Git 저장소에 푸시하면 자동으로 배포됩니다:

1. **Site settings** → **Build & deploy** → **Continuous Deployment**
2. 브랜치별 배포 설정 가능
3. Pull Request마다 미리보기 배포 가능

## 📝 배포 후 체크리스트

- [ ] 사이트가 정상적으로 로드되는지 확인
- [ ] 로그인 기능이 작동하는지 확인
- [ ] Supabase 연결이 정상인지 확인
- [ ] 미션 목록이 표시되는지 확인
- [ ] 투표 기능이 작동하는지 확인
- [ ] 모바일 반응형이 제대로 작동하는지 확인

## 🐛 문제 해결

### 빌드 실패 시

1. **Deploys** 탭에서 빌드 로그 확인
2. 환경 변수가 제대로 설정되었는지 확인
3. `netlify.toml` 파일이 올바른지 확인

### Supabase 연결 오류 시

1. 환경 변수 값이 정확한지 확인
2. Supabase 프로젝트가 활성화되어 있는지 확인
3. Supabase Dashboard에서 API 키가 유효한지 확인

### 배포는 성공했지만 사이트가 작동하지 않을 때

1. 브라우저 콘솔에서 에러 확인
2. Netlify Functions 로그 확인
3. Supabase 연결 상태 확인

