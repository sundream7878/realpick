-- 미션 생성 시 Edge Function을 호출하는 Database Trigger
-- t_missions1과 t_missions2 테이블에 INSERT 시 자동으로 이메일 알림 발송

-- 1. Edge Function 호출 함수 생성
CREATE OR REPLACE FUNCTION notify_new_mission()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  function_url text;
  anon_key text;
BEGIN
  -- Edge Function URL 설정 (환경에 맞게 수정 필요)
  function_url := 'https://your-project-ref.supabase.co/functions/v1/send-mission-notification';
  anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- 페이로드 생성
  payload := jsonb_build_object(
    'missionId', NEW.f_id,
    'missionTitle', NEW.f_title,
    'category', NEW.f_category,
    'showId', NEW.f_show_id,
    'creatorId', NEW.f_creator_id
  );
  
  -- Edge Function 비동기 호출 (pg_net 확장 필요)
  -- Supabase에서는 pg_net이 기본 제공됨
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := payload
  );
  
  -- 로그 출력
  RAISE NOTICE 'Mission notification triggered for mission: %', NEW.f_id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 에러가 발생해도 미션 생성은 계속 진행
    RAISE WARNING 'Failed to trigger mission notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. t_missions1 테이블에 트리거 연결
DROP TRIGGER IF EXISTS on_mission1_created ON t_missions1;
CREATE TRIGGER on_mission1_created
AFTER INSERT ON t_missions1
FOR EACH ROW
EXECUTE FUNCTION notify_new_mission();

-- 3. t_missions2 테이블에 트리거 연결
DROP TRIGGER IF EXISTS on_mission2_created ON t_missions2;
CREATE TRIGGER on_mission2_created
AFTER INSERT ON t_missions2
FOR EACH ROW
EXECUTE FUNCTION notify_new_mission();

COMMENT ON FUNCTION notify_new_mission() IS '새 미션 생성 시 Edge Function을 호출하여 이메일 알림 발송';

-- 참고: pg_net 확장이 활성화되어 있는지 확인
-- SELECT * FROM pg_extension WHERE extname = 'pg_net';
-- 없다면: CREATE EXTENSION IF NOT EXISTS pg_net;
