-- RealPick Database Schema (v10 - 8개 테이블 구조)
-- 마지막 업데이트: 2025-01-13
-- 
-- 테이블 구조:
-- 1. users - 사용자 정보
-- 2. missions1 - binary/multi 미션
-- 3. missions2 - 커플 매칭 미션
-- 4. episodes - missions2 회차 상태
-- 5. pickresult1 - 개별 사용자의 binary/multi 투표 기록 (정답여부, 점수 포함)
-- 6. pickresult2 - 개별 사용자의 커플 매칭 예측 기록 (정답여부, 점수 포함)
-- 7. pointlogs - 포인트 집계
-- 8. mypage - 마이페이지 통계 (캐시용)
-- 
-- 추가: mission_option_counts - missions1의 옵션별 투표 카운트 집계 테이블

-- ============================================
-- 1. Users 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(100) UNIQUE NOT NULL,
  avatar_url TEXT,
  points INTEGER DEFAULT 0 NOT NULL,
  tier VARCHAR(20) DEFAULT '모태솔로' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- 2. Missions1 테이블 (Binary/Multi 미션)
-- ============================================
CREATE TABLE IF NOT EXISTS missions1 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 기본 정보
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- 미션 타입 및 형식
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('predict', 'majority')),
  form VARCHAR(20) NOT NULL CHECK (form IN ('binary', 'multi')),
  
  -- 시즌 정보
  season_type VARCHAR(20) CHECK (season_type IN ('전체', '기수별')),
  season_number INTEGER,
  
  -- 선택지 (JSON 배열 형식)
  -- binary: ["옵션1", "옵션2"]
  -- multi: ["옵션1", "옵션2", "옵션3", ...] (3~5개)
  options JSONB NOT NULL,
  
  -- 마감 및 공개 정책
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  reveal_policy VARCHAR(20) NOT NULL DEFAULT 'realtime' CHECK (reveal_policy IN ('realtime', 'onClose')),
  
  -- 상태
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled')),
  
  -- 정답 정보 (결과 확정 후)
  correct_answer TEXT, -- predict 타입의 정답
  majority_option TEXT, -- majority 타입의 다수 선택
  
  -- 통계 (캐시용)
  stats_participants INTEGER DEFAULT 0 NOT NULL,
  stats_total_votes INTEGER DEFAULT 0 NOT NULL,
  
  -- 옵션별 투표 카운트 (JSONB 형식)
  -- {"옵션1": {"count": 100, "percentage": 62.5}, "옵션2": {"count": 60, "percentage": 37.5}}
  option_vote_counts JSONB DEFAULT '{}'::jsonb,
  
  -- 메타데이터
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- 4. Missions2 테이블 (커플 매칭 미션)
-- ============================================
CREATE TABLE IF NOT EXISTS missions2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 기본 정보
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- 미션 타입 (커플 매칭은 항상 predict)
  kind VARCHAR(20) NOT NULL DEFAULT 'predict' CHECK (kind = 'predict'),
  
  -- 시즌 정보
  season_type VARCHAR(20) CHECK (season_type IN ('전체', '기수별')),
  season_number INTEGER,
  
  -- 출연자 정보 (JSON 형식)
  -- {"left": ["남성1", "남성2", ...], "right": ["여성1", "여성2", ...]}
  connections JSONB NOT NULL,
  
  -- 회차 정보
  total_episodes INTEGER NOT NULL DEFAULT 8, -- 총 회차 수
  
  -- 마감 및 공개 정책
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  reveal_policy VARCHAR(20) NOT NULL DEFAULT 'realtime' CHECK (reveal_policy IN ('realtime', 'onClose')),
  
  -- 상태
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled')),
  
  -- 최종 정답 (회차별 정답이 아닌 최종 커플)
  final_answer JSONB, -- [{"left": "남성명", "right": "여성명"}, ...]
  
  -- 통계 (캐시용)
  stats_participants INTEGER DEFAULT 0 NOT NULL,
  
  -- 메타데이터
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- 4. Episodes 테이블 (Missions2 회차 상태 및 집계)
-- ============================================
CREATE TABLE IF NOT EXISTS episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID REFERENCES missions2(id) ON DELETE CASCADE NOT NULL,
  episode_no INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'locked')),
  
  -- 회차별 커플 매칭 집계 데이터 (JSONB 형식)
  -- {"남성1-여성1": {"count": 100, "percentage": 25.5}, "남성2-여성2": {"count": 80, "percentage": 20.4}, ...}
  couple_pick_counts JSONB DEFAULT '{}'::jsonb,
  
  -- 회차별 통계
  stats_total_picks INTEGER DEFAULT 0 NOT NULL, -- 총 예측 수
  stats_participants INTEGER DEFAULT 0 NOT NULL, -- 참여자 수
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(mission_id, episode_no)
);

-- ============================================
-- 5. PickResult1 테이블 (개별 사용자의 Binary/Multi 투표 기록)
-- ============================================
CREATE TABLE IF NOT EXISTS pickresult1 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES missions1(id) ON DELETE CASCADE NOT NULL,
  
  -- 선택한 옵션
  -- binary: 단일 문자열 "옵션1"
  -- multi: 문자열 배열 ["옵션1", "옵션2"] (다중 선택 가능한 경우)
  selected_option JSONB NOT NULL,
  
  -- 정답 여부 (결과 확정 후 업데이트)
  is_correct BOOLEAN,
  
  -- 획득 점수
  points_earned INTEGER DEFAULT 0 NOT NULL,
  
  -- 투표 시간
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 미션에 한 번만 투표 가능
  UNIQUE(user_id, mission_id)
);

-- ============================================
-- 6. PickResult2 테이블 (개별 사용자의 커플 매칭 예측 기록)
-- ============================================
CREATE TABLE IF NOT EXISTS pickresult2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES missions2(id) ON DELETE CASCADE NOT NULL,
  episode_no INTEGER NOT NULL,
  
  -- 커플 연결 정보: [{"left": "남성명", "right": "여성명"}, ...]
  connections JSONB NOT NULL,
  
  -- 제출 여부 및 시간
  submitted BOOLEAN DEFAULT FALSE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  -- 정답 여부 (결과 확정 후 업데이트)
  -- 각 커플별 정답 여부: [{"left": "남성명", "right": "여성명", "is_correct": true}, ...]
  connections_result JSONB,
  
  -- 획득 점수 (회차별 총합)
  points_earned INTEGER DEFAULT 0 NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 미션의 한 회차에 하나의 예측만 가능
  UNIQUE(user_id, mission_id, episode_no)
);

-- ============================================
-- 7. PointLogs 테이블 (포인트 집계)
-- ============================================
CREATE TABLE IF NOT EXISTS pointlogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID, -- missions1 또는 missions2 참조 (NULL 가능)
  mission_type VARCHAR(20) CHECK (mission_type IN ('mission1', 'mission2')),
  
  -- 포인트 변화량 (양수: 획득, 음수: 감점)
  diff INTEGER NOT NULL,
  
  -- 포인트 변경 사유
  reason TEXT NOT NULL,
  
  -- 추가 정보 (회차 번호 등)
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- 8. MyPage 테이블 (마이페이지 통계 - 캐시용)
-- ============================================
-- 중요: 계산 가능한 값은 저장하지 않음 (accuracy_rate 등)
-- 꼭 필요한 캐시 값만 유지
CREATE TABLE IF NOT EXISTS mypage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- 생성한 미션 총 수 (missions1 + missions2 합계)
  created_missions_count INTEGER DEFAULT 0 NOT NULL,
  
  -- 참여한 미션 총 수 (missions1 + missions2 합계)
  participated_missions_count INTEGER DEFAULT 0 NOT NULL,
  
  -- 최근 활동 시간
  recent_mission_created_at TIMESTAMP WITH TIME ZONE, -- 최근 미션 생성 시간
  recent_vote_at TIMESTAMP WITH TIME ZONE, -- 최근 투표 참여 시간
  
  -- 포인트 통계 (캐시)
  total_points_earned INTEGER DEFAULT 0 NOT NULL, -- 총 획득 포인트
  total_points_lost INTEGER DEFAULT 0 NOT NULL, -- 총 감점 포인트
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- 9. Comments 테이블 (댓글)
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 미션 연결 (missions1 또는 missions2)
  mission_id UUID NOT NULL, -- missions1 또는 missions2 참조
  mission_type VARCHAR(20) NOT NULL CHECK (mission_type IN ('mission1', 'mission2')),
  
  -- 작성자
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 댓글 내용
  content TEXT NOT NULL,
  
  -- 좋아요 수 (캐시용)
  likes_count INTEGER DEFAULT 0 NOT NULL,
  
  -- 답글 수 (캐시용)
  replies_count INTEGER DEFAULT 0 NOT NULL,
  
  -- 삭제 여부 (soft delete)
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- 10. Replies 테이블 (답글)
-- ============================================
CREATE TABLE IF NOT EXISTS replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- 댓글 참조 (어떤 댓글에 대한 답글인지)
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  
  -- 작성자
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 답글 내용
  content TEXT NOT NULL,
  
  -- 좋아요 수 (캐시용)
  likes_count INTEGER DEFAULT 0 NOT NULL,
  
  -- 삭제 여부 (soft delete)
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- 11. Comment Likes 테이블 (댓글 좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 댓글에 한 번만 좋아요 가능
  UNIQUE(comment_id, user_id)
);

-- ============================================
-- 12. Reply Likes 테이블 (답글 좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS reply_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID REFERENCES replies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 답글에 한 번만 좋아요 가능
  UNIQUE(reply_id, user_id)
);

-- ============================================
-- 인덱스 생성
-- ============================================
-- Users
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Missions1
CREATE INDEX IF NOT EXISTS idx_missions1_status ON missions1(status);
CREATE INDEX IF NOT EXISTS idx_missions1_deadline ON missions1(deadline);
CREATE INDEX IF NOT EXISTS idx_missions1_kind ON missions1(kind);
CREATE INDEX IF NOT EXISTS idx_missions1_form ON missions1(form);
CREATE INDEX IF NOT EXISTS idx_missions1_creator_id ON missions1(creator_id);
CREATE INDEX IF NOT EXISTS idx_missions1_season ON missions1(season_type, season_number);

-- Missions2
CREATE INDEX IF NOT EXISTS idx_missions2_status ON missions2(status);
CREATE INDEX IF NOT EXISTS idx_missions2_deadline ON missions2(deadline);
CREATE INDEX IF NOT EXISTS idx_missions2_creator_id ON missions2(creator_id);
CREATE INDEX IF NOT EXISTS idx_missions2_season ON missions2(season_type, season_number);

-- Episodes
CREATE INDEX IF NOT EXISTS idx_episodes_mission_id ON episodes(mission_id);
CREATE INDEX IF NOT EXISTS idx_episodes_episode_no ON episodes(episode_no);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);

-- PickResult1
CREATE INDEX IF NOT EXISTS idx_pickresult1_user_id ON pickresult1(user_id);
CREATE INDEX IF NOT EXISTS idx_pickresult1_mission_id ON pickresult1(mission_id);
CREATE INDEX IF NOT EXISTS idx_pickresult1_created_at ON pickresult1(created_at);
CREATE INDEX IF NOT EXISTS idx_pickresult1_is_correct ON pickresult1(is_correct);

-- PickResult2
CREATE INDEX IF NOT EXISTS idx_pickresult2_user_id ON pickresult2(user_id);
CREATE INDEX IF NOT EXISTS idx_pickresult2_mission_id ON pickresult2(mission_id);
CREATE INDEX IF NOT EXISTS idx_pickresult2_episode_no ON pickresult2(episode_no);
CREATE INDEX IF NOT EXISTS idx_pickresult2_submitted ON pickresult2(submitted);
CREATE INDEX IF NOT EXISTS idx_pickresult2_points_earned ON pickresult2(points_earned);

-- PointLogs
CREATE INDEX IF NOT EXISTS idx_pointlogs_user_id ON pointlogs(user_id);
CREATE INDEX IF NOT EXISTS idx_pointlogs_mission_id ON pointlogs(mission_id);
CREATE INDEX IF NOT EXISTS idx_pointlogs_created_at ON pointlogs(created_at);

-- MyPage
CREATE INDEX IF NOT EXISTS idx_mypage_user_id ON mypage(user_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_mission_id ON comments(mission_id);
CREATE INDEX IF NOT EXISTS idx_comments_mission_type ON comments(mission_type);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_is_deleted ON comments(is_deleted);
CREATE INDEX IF NOT EXISTS idx_comments_mission_composite ON comments(mission_id, mission_type, is_deleted);

-- Replies
CREATE INDEX IF NOT EXISTS idx_replies_comment_id ON replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_replies_user_id ON replies(user_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON replies(created_at);
CREATE INDEX IF NOT EXISTS idx_replies_is_deleted ON replies(is_deleted);

-- Comment Likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Reply Likes
CREATE INDEX IF NOT EXISTS idx_reply_likes_reply_id ON reply_likes(reply_id);
CREATE INDEX IF NOT EXISTS idx_reply_likes_user_id ON reply_likes(user_id);
