-- ============================================
-- RealPick 이메일 알림 시스템 완전 설정
-- Gmail SMTP 사용
-- ============================================

-- 1. pg_net 확장 활성화 (HTTP 요청용)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 사용자별 알림 설정 테이블 생성
CREATE TABLE IF NOT EXISTS t_notification_preferences (
  f_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  f_user_id UUID NOT NULL REFERENCES t_users(f_id) ON DELETE CASCADE,
  f_email_enabled BOOLEAN DEFAULT true,
  f_categories TEXT[] DEFAULT ARRAY['LOVE', 'VICTORY', 'STAR']::TEXT[],
  f_created_at TIMESTAMPTZ DEFAULT NOW(),
  f_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(f_user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id 
ON t_notification_preferences(f_user_id);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_email_enabled 
ON t_notification_preferences(f_email_enabled) 
WHERE f_email_enabled = true;

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE t_notification_preferences ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view own notification preferences" ON t_notification_preferences;
DROP POLICY IF EXISTS "Users can create own notification preferences" ON t_notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON t_notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON t_notification_preferences;

-- 사용자는 자신의 알림 설정만 조회 가능
CREATE POLICY "Users can view own notification preferences"
ON t_notification_preferences FOR SELECT
USING (auth.uid() = f_user_id);

-- 사용자는 자신의 알림 설정만 생성 가능
CREATE POLICY "Users can create own notification preferences"
ON t_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = f_user_id);

-- 사용자는 자신의 알림 설정만 수정 가능
CREATE POLICY "Users can update own notification preferences"
ON t_notification_preferences FOR UPDATE
USING (auth.uid() = f_user_id);

-- 사용자는 자신의 알림 설정만 삭제 가능
CREATE POLICY "Users can delete own notification preferences"
ON t_notification_preferences FOR DELETE
USING (auth.uid() = f_user_id);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.f_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_prefs_updated_at ON t_notification_preferences;
CREATE TRIGGER trigger_update_notification_prefs_updated_at
BEFORE UPDATE ON t_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_prefs_updated_at();

-- 3. 기존 사용자에게 기본 알림 설정 생성
INSERT INTO t_notification_preferences (f_user_id, f_email_enabled, f_categories)
SELECT f_id, true, ARRAY['LOVE', 'VICTORY', 'STAR']::TEXT[]
FROM t_users
WHERE f_id NOT IN (SELECT f_user_id FROM t_notification_preferences)
ON CONFLICT (f_user_id) DO NOTHING;

-- 4. 미션에 카테고리 컬럼 추가 (없다면)
ALTER TABLE t_missions1 ADD COLUMN IF NOT EXISTS f_category TEXT;
ALTER TABLE t_missions1 ADD COLUMN IF NOT EXISTS f_show_id TEXT;
ALTER TABLE t_missions2 ADD COLUMN IF NOT EXISTS f_category TEXT;
ALTER TABLE t_missions2 ADD COLUMN IF NOT EXISTS f_show_id TEXT;

-- 카테고리 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_missions1_category ON t_missions1(f_category);
CREATE INDEX IF NOT EXISTS idx_missions2_category ON t_missions2(f_category);

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 이메일 알림 시스템 데이터베이스 설정 완료!';
  RAISE NOTICE '📧 다음 단계: Supabase Edge Function 배포 및 환경 변수 설정';
END $$;

