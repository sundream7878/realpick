-- ============================================
-- Realtime 설정 확인 및 검증
-- ============================================

-- 1. Realtime Publication 확인
SELECT 
  schemaname,
  tablename,
  'Already in Realtime ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('t_missions1', 't_missions2')
ORDER BY tablename;

-- 2. RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN qual LIKE '%true%' THEN '✅ 모든 사용자 접근 가능'
    ELSE '⚠️ 제한적 접근'
  END as access_level
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('t_missions1', 't_missions2')
  AND cmd = 'SELECT'
ORDER BY tablename;

-- 3. RLS가 활성화되어 있는지 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS 활성화됨'
    ELSE '⚠️ RLS 비활성화됨'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('t_missions1', 't_missions2')
ORDER BY tablename;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Realtime 설정 확인 완료!';
  RAISE NOTICE '';
  RAISE NOTICE '다음 단계:';
  RAISE NOTICE '1. 위 결과에서 "Already in Realtime ✅" 확인';
  RAISE NOTICE '2. "모든 사용자 접근 가능" 확인';
  RAISE NOTICE '3. 브라우저 2개로 테스트';
  RAISE NOTICE '====================================';
END $$;

