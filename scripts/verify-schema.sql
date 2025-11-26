-- ============================================
-- Supabase 스키마 검증 SQL 쿼리
-- Supabase Dashboard → SQL Editor에서 실행하세요
-- ============================================

-- 1. 테이블 목록 확인 (t_ 접두사)
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE 't_%' THEN '✅ 네이밍 법칙 준수'
    ELSE '❌ 네이밍 법칙 위반'
  END as naming_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. 예상되는 테이블 목록과 비교
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_users') THEN '✅'
    ELSE '❌'
  END as t_users,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_missions1') THEN '✅'
    ELSE '❌'
  END as t_missions1,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_missions2') THEN '✅'
    ELSE '❌'
  END as t_missions2,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_episodes') THEN '✅'
    ELSE '❌'
  END as t_episodes,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_pickresult1') THEN '✅'
    ELSE '❌'
  END as t_pickresult1,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_pickresult2') THEN '✅'
    ELSE '❌'
  END as t_pickresult2,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_pointlogs') THEN '✅'
    ELSE '❌'
  END as t_pointlogs,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_mypage') THEN '✅'
    ELSE '❌'
  END as t_mypage,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_comments') THEN '✅'
    ELSE '❌'
  END as t_comments,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_replies') THEN '✅'
    ELSE '❌'
  END as t_replies,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_comment_likes') THEN '✅'
    ELSE '❌'
  END as t_comment_likes,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_reply_likes') THEN '✅'
    ELSE '❌'
  END as t_reply_likes;

-- 3. 각 테이블의 컬럼 구조 확인 (f_ 접두사)
SELECT 
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name LIKE 'f_%' THEN '✅'
    ELSE '❌'
  END as naming_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 't_%'
ORDER BY table_name, ordinal_position;

-- 4. 네이밍 법칙 준수율 확인
SELECT 
  table_name,
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name LIKE 'f_%' THEN 1 END) as f_prefixed_columns,
  COUNT(CASE WHEN column_name NOT LIKE 'f_%' THEN 1 END) as non_prefixed_columns,
  CASE 
    WHEN COUNT(CASE WHEN column_name NOT LIKE 'f_%' THEN 1 END) = 0 THEN '✅ 모든 컬럼이 f_ 접두사 사용'
    ELSE '⚠️ 일부 컬럼이 f_ 접두사를 사용하지 않음'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 't_%'
GROUP BY table_name
ORDER BY table_name;

-- 5. t_users 테이블 상세 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name LIKE 'f_%' THEN '✅'
    ELSE '❌'
  END as naming_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 't_users'
ORDER BY ordinal_position;

-- 6. 인덱스 확인
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 't_%'
ORDER BY tablename, indexname;

-- 7. 외래 키 확인
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 't_%'
ORDER BY tc.table_name, kcu.column_name;







