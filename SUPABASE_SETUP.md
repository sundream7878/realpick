# Supabase 연결 가이드

이 가이드는 RealPick 프로젝트를 Supabase에 연결하는 방법을 설명합니다.

## 📋 사전 준비사항

1. Supabase 계정 생성: https://supabase.com
2. 새 프로젝트 생성 (프로젝트 이름: `realpick`)

## 🔧 단계별 설정

### 1단계: Supabase 패키지 설치

```bash
npm install @supabase/supabase-js @supabase/ssr
```

또는

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### 2단계: Supabase 프로젝트 생성 및 설정

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 설정:
   - **Name**: `realpick` (프로젝트 이름 동일하게)
   - **Database Password**: 안전한 비밀번호 설정 (기록해두세요!)
   - **Region**: 가장 가까운 지역 선택
4. 프로젝트 생성 완료 대기 (약 2분)

### 3단계: 환경 변수 설정

1. Supabase 프로젝트 대시보드에서:
   - 좌측 메뉴에서 **Settings** → **API** 클릭
   - 다음 정보를 복사:
     - `Project URL` (예: `https://xxxxx.supabase.co`)
     - `anon public` 키 (예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

2. 프로젝트 루트에 `.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

⚠️ **주의**: `.env.local` 파일은 `.gitignore`에 포함되어 있어야 합니다!

### 4단계: 데이터베이스 스키마 생성

1. Supabase 대시보드에서:
   - 좌측 메뉴에서 **SQL Editor** 클릭
   - "New query" 클릭

2. `scripts/supabase_schema.sql` 파일 내용을 복사하여 실행

3. `scripts/supabase_rls.sql` 파일 내용을 복사하여 실행

4. 실행 완료 후 테이블이 생성되었는지 확인:
   - 좌측 메뉴에서 **Table Editor** 클릭
   - 12개 테이블이 생성되었는지 확인

### 5단계: Supabase 클라이언트 생성

프로젝트에 Supabase 클라이언트 파일이 생성됩니다.

### 6단계: 연결 테스트

개발 서버를 실행하고 브라우저 콘솔에서 연결 상태를 확인합니다.

## 📝 다음 단계

- 인증 시스템 구현
- 데이터베이스 쿼리 함수 작성
- 실시간 구독 설정

## 🔗 유용한 링크

- [Supabase 문서](https://supabase.com/docs)
- [Supabase JavaScript 클라이언트](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js + Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)










