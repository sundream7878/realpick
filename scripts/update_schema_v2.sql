
-- 1. t_missions2: 회차 상태 관리 컬럼 추가
ALTER TABLE t_missions2 
ADD COLUMN IF NOT EXISTS f_episode_statuses JSONB DEFAULT '{}'::jsonb;

-- 기존 미션들의 1회차를 'open'으로 초기화 (데이터가 없는 경우에만)
UPDATE t_missions2
SET f_episode_statuses = '{"1": "open"}'::jsonb
WHERE f_episode_statuses = '{}'::jsonb OR f_episode_statuses IS NULL;


-- 2. t_pickresult2: 테이블 구조 변경 (회차별 Row -> 유저당 1 Row)
-- 기존 테이블 삭제 (데이터 초기화 주의)
DROP TABLE IF EXISTS t_pickresult2;

CREATE TABLE IF NOT EXISTS t_pickresult2 (
  f_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE CASCADE NOT NULL,
  f_mission_id UUID REFERENCES t_missions2(f_id) ON DELETE CASCADE NOT NULL,
  
  -- 투표 데이터 (JSONB)
  -- Key: 회차 번호 (String), Value: 해당 회차의 투표 정보
  -- 예: {
  --   "1": { "connections": [...], "submitted_at": "..." },
  --   "2": { "connections": [...], "submitted_at": "..." }
  -- }
  f_votes JSONB DEFAULT '{}'::jsonb NOT NULL,
  
  -- 총 획득 포인트 (모든 회차 합산)
  f_points_earned INTEGER DEFAULT 0 NOT NULL,
  
  f_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 미션에 하나의 레코드만 가짐
  UNIQUE(f_user_id, f_mission_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pickresult2_user_id ON t_pickresult2(f_user_id);
CREATE INDEX IF NOT EXISTS idx_pickresult2_mission_id ON t_pickresult2(f_mission_id);
