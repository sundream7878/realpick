# Supabase SQL 파일 실행 가이드

## 📋 방법 1: Supabase Dashboard에서 실행 (권장)

가장 간단하고 안전한 방법입니다.

### 스키마 생성
1. Supabase Dashboard → **SQL Editor** 열기
2. `scripts/supabase_schema.sql` 파일 내용을 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭
5. 성공 메시지 확인

### RLS 정책 적용
1. `scripts/supabase_rls.sql` 파일 내용을 복사
2. SQL Editor에 붙여넣기
3. **Run** 버튼 클릭
4. 성공 메시지 확인

## 📋 방법 2: Supabase CLI 사용 (고급)

### 1. Supabase 프로젝트 연결

먼저 Supabase 프로젝트를 연결해야 합니다:

```bash
# Supabase 로그인
npx supabase login

# 프로젝트 연결 (project-ref는 Supabase Dashboard → Settings → General에서 확인)
npx supabase link --project-ref your-project-ref
```

### 2. SQL 파일을 마이그레이션으로 변환

```bash
# 마이그레이션 파일 생성
npx supabase migration new initial_schema

# 생성된 마이그레이션 파일에 SQL 내용 복사
# supabase/migrations/xxxxx_initial_schema.sql 파일에
# scripts/supabase_schema.sql 내용을 복사
```

### 3. 마이그레이션 실행

```bash
# 원격 데이터베이스에 마이그레이션 푸시
npx supabase db push
```

## 📋 방법 3: psql 사용 (로컬에 PostgreSQL 설치된 경우)

```bash
# 연결 문자열은 Supabase Dashboard → Settings → Database → Connection string에서 확인
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f scripts/supabase_schema.sql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" -f scripts/supabase_rls.sql
```

## ✅ 확인 방법

SQL 실행 후 Supabase Dashboard → **Table Editor**에서 다음 테이블들이 생성되었는지 확인:

- ✅ users
- ✅ missions1
- ✅ missions2
- ✅ episodes
- ✅ pickresult1
- ✅ pickresult2
- ✅ pointlogs
- ✅ mypage
- ✅ comments
- ✅ replies
- ✅ comment_likes
- ✅ reply_likes

## 🔧 문제 해결

### 오류: "relation already exists"
- 테이블이 이미 존재하는 경우입니다.
- `DROP TABLE IF EXISTS` 문을 추가하거나 기존 테이블을 삭제 후 재실행하세요.

### 오류: "permission denied"
- Service Role Key를 사용해야 합니다.
- Supabase Dashboard → Settings → API → `service_role` 키 사용

### 오류: "function exec_sql does not exist"
- Node.js 스크립트 대신 Dashboard의 SQL Editor를 사용하세요.







