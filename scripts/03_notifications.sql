-- ============================================
-- Notification System for RealPick
-- 마지막 업데이트: 2025-01-13
-- 네이밍 법칙: 테이블 t_, 컬럼 f_
-- ============================================

-- 1. Notifications 테이블
CREATE TABLE IF NOT EXISTS t_notifications (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE CASCADE NOT NULL,
  
  -- 알림 타입: 'NEW_MISSION' (새 미션), 'MISSION_CLOSED' (미션 마감), 'SYSTEM' (공지 등)
  f_type VARCHAR(50) NOT NULL CHECK (f_type IN ('NEW_MISSION', 'MISSION_CLOSED', 'SYSTEM')),
  
  f_title TEXT NOT NULL,
  f_content TEXT NOT NULL,
  
  -- 연결 데이터
  f_mission_id UUID, -- 관련 미션 ID (t_missions1 또는 t_missions2)
  f_creator_id UUID REFERENCES t_users(f_id) ON DELETE SET NULL, -- 미션 생성자 ID (프로필 이미지용)
  
  f_is_read BOOLEAN DEFAULT FALSE NOT NULL,
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_t_notifications_f_user_id ON t_notifications(f_user_id);
CREATE INDEX IF NOT EXISTS idx_t_notifications_f_created_at ON t_notifications(f_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_t_notifications_f_is_read ON t_notifications(f_is_read);

-- 2. RLS 설정
ALTER TABLE t_notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 본인의 알림만 조회 가능
CREATE POLICY "Users can view own notifications" ON t_notifications
    FOR SELECT USING (auth.uid() = f_user_id);

-- 사용자는 본인의 알림만 읽음 처리 또는 삭제 가능
CREATE POLICY "Users can update own notifications" ON t_notifications
    FOR UPDATE USING (auth.uid() = f_user_id);

CREATE POLICY "Users can delete own notifications" ON t_notifications
    FOR DELETE USING (auth.uid() = f_user_id);

-- 3. 자동 삭제 트리거 (30일 지난 알림)
-- Supabase에서는 크론잡(pg_cron)을 쓰거나, 수동으로 처리해야 하지만 
-- 여기서는 일단 쿼리로만 남겨둡니다. 
-- 실제 운영 환경에서는 pg_cron을 사용하여 DELETE FROM t_notifications WHERE f_created_at < NOW() - INTERVAL '30 days' 수행 권장.

-- 4. 미션 생성 시 알림 트리거 함수
CREATE OR REPLACE FUNCTION notify_new_mission_to_users()
RETURNS TRIGGER AS $$
DECLARE
    subscriber_record RECORD;
    creator_nickname TEXT;
BEGIN
    -- 생성자 닉네임 가져오기
    SELECT f_nickname INTO creator_nickname FROM t_users WHERE f_id = NEW.f_creator_id;

    -- 해당 카테고리를 구독 중인 모든 사용자에게 알림 생성
    FOR subscriber_record IN 
        SELECT f_user_id 
        FROM t_notification_preferences 
        WHERE f_email_enabled = true AND f_categories @> ARRAY[NEW.f_category]::VARCHAR[]
    LOOP
        INSERT INTO t_notifications (f_user_id, f_type, f_title, f_content, f_mission_id, f_creator_id)
        VALUES (
            subscriber_record.f_user_id, 
            'NEW_MISSION', 
            '새로운 미션이 등록되었습니다', 
            '[' || NEW.f_title || '] 미션이 시작되었습니다. 지금 바로 참여해보세요!',
            NEW.f_id,
            NEW.f_creator_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 연결
DROP TRIGGER IF EXISTS tr_on_mission1_created ON t_missions1;
CREATE TRIGGER tr_on_mission1_created
    AFTER INSERT ON t_missions1
    FOR EACH ROW EXECUTE FUNCTION notify_new_mission_to_users();

DROP TRIGGER IF EXISTS tr_on_mission2_created ON t_missions2;
CREATE TRIGGER tr_on_mission2_created
    AFTER INSERT ON t_missions2
    FOR EACH ROW EXECUTE FUNCTION notify_new_mission_to_users();

-- 5. 미션 마감 시 알림 트리거 함수
CREATE OR REPLACE FUNCTION notify_mission_closed_to_participants()
RETURNS TRIGGER AS $$
DECLARE
    participant_record RECORD;
BEGIN
    -- 미션 상태가 'settled'로 변경되었을 때만 실행
    IF (OLD.f_status != 'settled' AND NEW.f_status = 'settled') THEN
        -- 미션에 참여한 모든 사용자에게 알림 생성 (t_pickresult1 또는 t_pickresult2)
        -- t_pickresult1 (일반 미션)
        FOR participant_record IN 
            SELECT DISTINCT f_user_id FROM t_pickresult1 WHERE f_mission_id = NEW.f_id
        LOOP
            INSERT INTO t_notifications (f_user_id, f_type, f_title, f_content, f_mission_id, f_creator_id)
            VALUES (
                participant_record.f_user_id, 
                'MISSION_CLOSED', 
                '참여하신 미션이 마감되었습니다', 
                '[' || NEW.f_title || '] 미션의 정답과 결과를 확인해보세요!',
                NEW.f_id,
                NEW.f_creator_id
            );
        END LOOP;

        -- t_pickresult2 (커플 매칭 미션 - f_id가 동일한 경우를 대비해 테이블 체크 로직 필요할 수 있음)
        -- 하지만 보통 NEW.f_id는 해당 테이블 내에서 고유함
        FOR participant_record IN 
            SELECT DISTINCT f_user_id FROM t_pickresult2 WHERE f_mission_id = NEW.f_id
        LOOP
            INSERT INTO t_notifications (f_user_id, f_type, f_title, f_content, f_mission_id, f_creator_id)
            VALUES (
                participant_record.f_user_id, 
                'MISSION_CLOSED', 
                '참여하신 커플 매칭 미션이 마감되었습니다', 
                '[' || NEW.f_title || '] 최종 결과를 확인하고 포인트를 확인하세요!',
                NEW.f_id,
                NEW.f_creator_id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 연결
DROP TRIGGER IF EXISTS tr_on_mission1_settled ON t_missions1;
CREATE TRIGGER tr_on_mission1_settled
    AFTER UPDATE ON t_missions1
    FOR EACH ROW EXECUTE FUNCTION notify_mission_closed_to_participants();

DROP TRIGGER IF EXISTS tr_on_mission2_settled ON t_missions2;
CREATE TRIGGER tr_on_mission2_settled
    AFTER UPDATE ON t_missions2
    FOR EACH ROW EXECUTE FUNCTION notify_mission_closed_to_participants();

