-- 사용자별 알림 설정 테이블 생성
-- 이메일 알림 ON/OFF 및 관심 카테고리 설정

CREATE TABLE IF NOT EXISTS t_notification_preferences (
  f_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  f_user_id UUID NOT NULL REFERENCES t_users(f_id) ON DELETE CASCADE,
  f_email_enabled BOOLEAN DEFAULT true,
  f_deadline_email_enabled BOOLEAN DEFAULT true, -- 추가: 미션 마감 알림 설정
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

CREATE INDEX IF NOT EXISTS idx_notification_prefs_deadline_enabled 
ON t_notification_preferences(f_deadline_email_enabled) 
WHERE f_deadline_email_enabled = true;

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE t_notification_preferences ENABLE ROW LEVEL SECURITY;

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

-- 기존 사용자에게 기본 알림 설정 생성 (선택사항)
-- INSERT INTO t_notification_preferences (f_user_id, f_email_enabled, f_categories)
-- SELECT f_id, true, ARRAY['LOVE', 'VICTORY', 'STAR']::TEXT[]
-- FROM t_users
-- WHERE f_id NOT IN (SELECT f_user_id FROM t_notification_preferences);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.f_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_prefs_updated_at
BEFORE UPDATE ON t_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_prefs_updated_at();

COMMENT ON TABLE t_notification_preferences IS '사용자별 알림 설정 (이메일, 카테고리 구독)';
COMMENT ON COLUMN t_notification_preferences.f_email_enabled IS '이메일 알림 활성화 여부';
COMMENT ON COLUMN t_notification_preferences.f_categories IS '구독 중인 카테고리 목록 (LOVE, VICTORY, STAR)';
