-- ============================================
-- 미션 삭제 정책 추가 (관리자용)
-- ============================================

-- t_missions1 DELETE 정책 추가
-- 관리자(ADMIN)만 삭제 가능
CREATE POLICY "Admins can delete missions1" ON t_missions1
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM t_users
      WHERE t_users.f_id = auth.uid()
      AND t_users.f_role = 'ADMIN'
    )
  );

-- t_missions2 DELETE 정책 추가
-- 관리자(ADMIN)만 삭제 가능
CREATE POLICY "Admins can delete missions2" ON t_missions2
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM t_users
      WHERE t_users.f_id = auth.uid()
      AND t_users.f_role = 'ADMIN'
    )
  );

-- 관련 테이블 DELETE 정책도 추가 (관리자가 삭제할 수 있도록)

-- t_pickresult1 DELETE 정책 (관리자용)
CREATE POLICY "Admins can delete pickresult1" ON t_pickresult1
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM t_users
      WHERE t_users.f_id = auth.uid()
      AND t_users.f_role = 'ADMIN'
    )
  );

-- t_pickresult2 DELETE 정책 (관리자용)
CREATE POLICY "Admins can delete pickresult2" ON t_pickresult2
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM t_users
      WHERE t_users.f_id = auth.uid()
      AND t_users.f_role = 'ADMIN'
    )
  );

-- t_comments DELETE 정책 (관리자용)
CREATE POLICY "Admins can delete comments" ON t_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM t_users
      WHERE t_users.f_id = auth.uid()
      AND t_users.f_role = 'ADMIN'
    )
  );

-- t_pointlogs DELETE 정책 (관리자용)
CREATE POLICY "Admins can delete pointlogs" ON t_pointlogs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM t_users
      WHERE t_users.f_id = auth.uid()
      AND t_users.f_role = 'ADMIN'
    )
  );

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 미션 삭제 정책이 추가되었습니다!';
  RAISE NOTICE '📝 관리자(ADMIN)만 미션을 삭제할 수 있습니다.';
END $$;






