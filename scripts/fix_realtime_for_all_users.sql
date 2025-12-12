-- ============================================
-- Realtime 알림을 모든 사용자에게 보이도록 설정
-- ============================================

-- 1. 익명 사용자도 미션을 조회할 수 있도록 명시적 정책 추가
-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Anyone can view missions1" ON t_missions1;
DROP POLICY IF EXISTS "Anyone can view missions2" ON t_missions2;

-- 모든 사용자 (인증 + 익명)가 미션 조회 가능
CREATE POLICY "Anyone can view missions1" ON t_missions1
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view missions2" ON t_missions2
  FOR SELECT USING (true);

-- 2. Realtime Publication 설정 확인
-- Supabase는 기본적으로 supabase_realtime publication을 사용
-- 모든 테이블을 publication에 추가

-- 기존 publication 확인
DO $$
BEGIN
  -- t_missions1 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 't_missions1'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE t_missions1;
    RAISE NOTICE '✅ t_missions1을 Realtime publication에 추가했습니다';
  ELSE
    RAISE NOTICE 'ℹ️ t_missions1은 이미 Realtime publication에 있습니다';
  END IF;

  -- t_missions2 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 't_missions2'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE t_missions2;
    RAISE NOTICE '✅ t_missions2를 Realtime publication에 추가했습니다';
  ELSE
    RAISE NOTICE 'ℹ️ t_missions2는 이미 Realtime publication에 있습니다';
  END IF;
END $$;

-- 3. 설정 확인 쿼리
SELECT 
  schemaname,
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('t_missions1', 't_missions2')
ORDER BY tablename;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime 설정 완료!';
  RAISE NOTICE '📡 모든 사용자가 실시간 알림을 받을 수 있습니다';
END $$;

