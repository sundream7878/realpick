-- ============================================
-- 간단한 컬럼 구조 확인 쿼리
-- Supabase Dashboard → SQL Editor에서 실행
-- ============================================

-- 모든 t_ 테이블의 컬럼이 f_ 접두사를 사용하는지 확인
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

-- 네이밍 법칙 준수율 요약
SELECT 
  table_name,
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name LIKE 'f_%' THEN 1 END) as f_prefixed_columns,
  COUNT(CASE WHEN column_name NOT LIKE 'f_%' THEN 1 END) as non_prefixed_columns,
  CASE 
    WHEN COUNT(CASE WHEN column_name NOT LIKE 'f_%' THEN 1 END) = 0 THEN '✅ 완벽'
    ELSE '⚠️ 일부 컬럼이 f_ 접두사를 사용하지 않음'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 't_%'
GROUP BY table_name
ORDER BY table_name;








