-- ============================================
-- Realtime 설정 확인 (간단 버전)
-- ============================================

-- 1. Realtime Publication에 등록된 테이블 확인
SELECT 
  tablename,
  CASE 
    WHEN tablename IN ('t_missions1', 't_missions2') THEN '✅ Realtime 활성화됨'
    ELSE 'ℹ️ 다른 테이블'
  END as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND schemaname = 'public'
ORDER BY tablename;

-- 2. t_missions1, t_missions2가 Realtime에 등록되어 있는지 확인
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 't_missions1'
    ) THEN '✅ t_missions1: Realtime 활성화됨'
    ELSE '❌ t_missions1: Realtime 비활성화됨'
  END as missions1_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 't_missions2'
    ) THEN '✅ t_missions2: Realtime 활성화됨'
    ELSE '❌ t_missions2: Realtime 비활성화됨'
  END as missions2_status;


