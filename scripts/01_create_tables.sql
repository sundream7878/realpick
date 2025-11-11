-- RealPick Database Schema
-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  points INTEGER DEFAULT 0,
  grade VARCHAR(20) DEFAULT '모솔',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 미션 테이블
CREATE TABLE IF NOT EXISTS missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  mission_type VARCHAR(20) NOT NULL, -- 'prediction', 'majority', 'couple_matching'
  vote_type VARCHAR(20) NOT NULL, -- 'binary', 'multiple', 'couple'
  program_name VARCHAR(100) DEFAULT '나는솔로',
  thumbnail_url TEXT,
  creator_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'completed'
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  total_participants INTEGER DEFAULT 0,
  is_hot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 미션 옵션 테이블 (투표 선택지)
CREATE TABLE IF NOT EXISTS mission_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  option_text VARCHAR(200) NOT NULL,
  option_image_url TEXT,
  vote_count INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 커플 매칭용 참가자 테이블
CREATE TABLE IF NOT EXISTS contestants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  profile_image_url TEXT,
  gender VARCHAR(10), -- 'male', 'female'
  age INTEGER,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 투표 테이블
CREATE TABLE IF NOT EXISTS user_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
  option_id UUID REFERENCES mission_options(id) ON DELETE CASCADE,
  contestant_pair JSONB, -- 커플 매칭의 경우 선택한 커플 정보
  points_earned INTEGER DEFAULT 0,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- 사용자 활동 기록 테이블
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL, -- 'vote', 'create_mission', 'earn_points'
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  points_change INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 뱃지 테이블
CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  condition_type VARCHAR(50), -- 'points', 'votes', 'accuracy', 'streak'
  condition_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 뱃지 테이블
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_end_date ON missions(end_date);
CREATE INDEX IF NOT EXISTS idx_missions_is_hot ON missions(is_hot);
CREATE INDEX IF NOT EXISTS idx_user_votes_user_id ON user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_mission_id ON user_votes(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points);
