# Supabase 스키마 검증 가이드

네이밍 법칙이 제대로 적용되었는지 확인하는 방법입니다.

## 방법 1: Supabase Dashboard에서 확인 (가장 간단)

### 1. 테이블 목록 확인
1. Supabase Dashboard → **Table Editor** 열기
2. 좌측 사이드바에서 다음 테이블들이 `t_` 접두사로 시작하는지 확인:
   - ✅ `t_users`
   - ✅ `t_missions1`
   - ✅ `t_missions2`
   - ✅ `t_episodes`
   - ✅ `t_pickresult1`
   - ✅ `t_pickresult2`
   - ✅ `t_pointlogs`
   - ✅ `t_mypage`
   - ✅ `t_comments`
   - ✅ `t_replies`
   - ✅ `t_comment_likes`
   - ✅ `t_reply_likes`

### 2. 컬럼 구조 확인
1. `t_users` 테이블 클릭
2. 컬럼 목록에서 모든 컬럼이 `f_` 접두사로 시작하는지 확인:
   - ✅ `f_id`
   - ✅ `f_email`
   - ✅ `f_nickname`
   - ✅ `f_avatar_url`
   - ✅ `f_points`
   - ✅ `f_tier`
   - ✅ `f_created_at`
   - ✅ `f_updated_at`

### 3. SQL Editor에서 확인
```sql
-- 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 't_%'
ORDER BY table_name;

-- t_users 테이블의 컬럼 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 't_users'
ORDER BY ordinal_position;

-- 모든 테이블의 컬럼이 f_로 시작하는지 확인
SELECT 
  table_name,
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name LIKE 'f_%' THEN 1 END) as f_prefixed_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 't_%'
GROUP BY table_name
ORDER BY table_name;
```

## 방법 2: 자동 검증 스크립트 실행

```bash
npm run db:test
```

이 명령어는 다음을 확인합니다:
- ✅ 모든 테이블이 `t_` 접두사를 사용하는지
- ✅ 모든 컬럼이 `f_` 접두사를 사용하는지
- ✅ 필수 컬럼이 존재하는지
- ✅ 기본 쿼리가 정상 작동하는지

## 예상 결과

### 정상적인 경우:
```
🔍 Supabase 스키마 검증 시작...

1️⃣ 테이블 존재 여부 확인
  ✅ t_users - 존재함
  ✅ t_missions1 - 존재함
  ✅ t_missions2 - 존재함
  ✅ t_episodes - 존재함
  ✅ t_pickresult1 - 존재함
  ✅ t_pickresult2 - 존재함
  ✅ t_pointlogs - 존재함
  ✅ t_mypage - 존재함
  ✅ t_comments - 존재함
  ✅ t_replies - 존재함
  ✅ t_comment_likes - 존재함
  ✅ t_reply_likes - 존재함

📊 결과: 12/12 테이블 존재

2️⃣ 주요 테이블 컬럼 구조 확인
  ✅ t_users
     - 총 컬럼 수: 8
     - f_ 접두사 컬럼: 8개
     ✅ 모든 컬럼이 f_ 접두사를 사용합니다
```

### 문제가 있는 경우:
- 테이블이 존재하지 않음 → SQL 스키마를 다시 실행하세요
- 컬럼에 `f_` 접두사가 없음 → SQL 스키마를 다시 확인하세요
- RLS 정책 오류 → RLS 정책을 다시 적용하세요

## 수동 확인 체크리스트

- [ ] 12개 테이블이 모두 `t_` 접두사로 시작하는가?
- [ ] 모든 테이블의 컬럼이 `f_` 접두사로 시작하는가?
- [ ] `t_users` 테이블에 필수 컬럼이 모두 있는가?
- [ ] `t_missions1`과 `t_missions2` 테이블이 정상적으로 생성되었는가?
- [ ] 인덱스가 정상적으로 생성되었는가?
- [ ] 트리거가 정상적으로 생성되었는가?







