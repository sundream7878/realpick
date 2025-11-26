-- ============================================
-- RealPick Supabase Database Schema
-- 마지막 업데이트: 2025-01-13
-- 네이밍 법칙: 테이블 t_, 컬럼 f_
-- PostgreSQL / Supabase 최적화
-- ============================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Users 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS t_users (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_email VARCHAR(255) UNIQUE NOT NULL,
  f_nickname VARCHAR(100) UNIQUE NOT NULL,
  f_avatar_url TEXT,
  f_points INTEGER DEFAULT 0 NOT NULL CHECK (f_points >= 0),
  f_tier VARCHAR(20) DEFAULT '모태솔로' NOT NULL CHECK (f_tier IN ('모태솔로', '솔로 지망생', '짝사랑 빌더', '그린 플래그', '공감 실천가', '조율사', '넥서스')),
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 2. Missions1 테이블 (Binary/Multi 미션)
-- ============================================
CREATE TABLE IF NOT EXISTS t_missions1 (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_creator_id UUID REFERENCES t_users(f_id) ON DELETE SET NULL,
  
  -- 기본 정보
  f_title VARCHAR(200) NOT NULL,
  f_description TEXT,
  
  -- 미션 타입 및 형식
  f_kind VARCHAR(20) NOT NULL CHECK (f_kind IN ('predict', 'majority')),
  f_form VARCHAR(20) NOT NULL CHECK (f_form IN ('binary', 'multi')),
  
  -- 시즌 정보
  f_season_type VARCHAR(20) CHECK (f_season_type IN ('전체', '기수별')),
  f_season_number INTEGER,
  
  -- 선택지 (JSON 배열 형식)
  -- binary: ["옵션1", "옵션2"]
  -- multi: ["옵션1", "옵션2", "옵션3", ...] (3~5개)
  f_options JSONB NOT NULL,
  
  -- 마감 및 공개 정책
  f_deadline TIMESTAMPTZ NOT NULL,
  f_reveal_policy VARCHAR(20) NOT NULL DEFAULT 'realtime' CHECK (f_reveal_policy IN ('realtime', 'onClose')),
  
  -- 상태
  f_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (f_status IN ('open', 'closed', 'settled')),
  
  -- 정답 정보 (결과 확정 후)
  f_correct_answer TEXT, -- predict 타입의 정답
  f_majority_option TEXT, -- majority 타입의 다수 선택
  
  -- 통계 (캐시용)
  f_stats_participants INTEGER DEFAULT 0 NOT NULL CHECK (f_stats_participants >= 0),
  f_stats_total_votes INTEGER DEFAULT 0 NOT NULL CHECK (f_stats_total_votes >= 0),
  
  -- 옵션별 투표 카운트 (JSONB 형식)
  -- {"옵션1": {"count": 100, "percentage": 62.5}, "옵션2": {"count": 60, "percentage": 37.5}}
  f_option_vote_counts JSONB DEFAULT '{}'::jsonb,
  
  -- 메타데이터
  f_thumbnail_url TEXT,
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 3. Missions2 테이블 (커플 매칭 미션)
-- ============================================
CREATE TABLE IF NOT EXISTS t_missions2 (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_creator_id UUID REFERENCES t_users(f_id) ON DELETE SET NULL,
  
  -- 기본 정보
  f_title VARCHAR(200) NOT NULL,
  f_description TEXT,
  
  -- 미션 타입 (커플 매칭은 항상 predict)
  f_kind VARCHAR(20) NOT NULL DEFAULT 'predict' CHECK (f_kind = 'predict'),
  
  -- 시즌 정보
  f_season_type VARCHAR(20) CHECK (f_season_type IN ('전체', '기수별')),
  f_season_number INTEGER,
  
  -- 출연자 정보 (JSON 형식)
  -- {"left": ["남성1", "남성2", ...], "right": ["여성1", "여성2", ...]}
  f_match_pairs JSONB NOT NULL,
  
  -- 회차 정보
  f_total_episodes INTEGER NOT NULL DEFAULT 8 CHECK (f_total_episodes > 0),
  
  -- 마감 및 공개 정책
  f_deadline TIMESTAMPTZ NOT NULL,
  f_reveal_policy VARCHAR(20) NOT NULL DEFAULT 'realtime' CHECK (f_reveal_policy IN ('realtime', 'onClose')),
  
  -- 상태
  f_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (f_status IN ('open', 'closed', 'settled')),
  
  -- 최종 정답 (회차별 정답이 아닌 최종 커플)
  f_final_answer JSONB, -- [{"left": "남성명", "right": "여성명"}, ...]
  
  -- 통계 (캐시용)
  f_stats_participants INTEGER DEFAULT 0 NOT NULL CHECK (f_stats_participants >= 0),
  
  -- 메타데이터
  f_thumbnail_url TEXT,
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 4. Episodes 테이블 (Missions2 회차 상태 및 집계)
-- ============================================
CREATE TABLE IF NOT EXISTS t_episodes (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_mission_id UUID REFERENCES t_missions2(f_id) ON DELETE CASCADE NOT NULL,
  f_episode_no INTEGER NOT NULL CHECK (f_episode_no > 0),
  f_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (f_status IN ('open', 'settled', 'locked')),
  
  -- 회차별 커플 매칭 집계 데이터 (JSONB 형식)
  -- {"남성1-여성1": {"count": 100, "percentage": 25.5}, "남성2-여성2": {"count": 80, "percentage": 20.4}, ...}
  f_couple_pick_counts JSONB DEFAULT '{}'::jsonb,
  
  -- 회차별 통계
  f_stats_total_picks INTEGER DEFAULT 0 NOT NULL CHECK (f_stats_total_picks >= 0), -- 총 예측 수
  f_stats_participants INTEGER DEFAULT 0 NOT NULL CHECK (f_stats_participants >= 0), -- 참여자 수
  
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(f_mission_id, f_episode_no)
);

-- ============================================
-- 5. PickResult1 테이블 (개별 사용자의 Binary/Multi 투표 기록)
-- ============================================
CREATE TABLE IF NOT EXISTS t_pickresult1 (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE CASCADE NOT NULL,
  f_mission_id UUID REFERENCES t_missions1(f_id) ON DELETE CASCADE NOT NULL,
  
  -- 선택한 옵션
  -- binary: 단일 문자열 "옵션1"
  -- multi: 문자열 배열 ["옵션1", "옵션2"] (다중 선택 가능한 경우)
  f_selected_option JSONB NOT NULL,
  
  -- 정답 여부 (결과 확정 후 업데이트)
  f_is_correct BOOLEAN,
  
  -- 획득 점수
  f_points_earned INTEGER DEFAULT 0 NOT NULL,
  
  -- 투표 시간
  f_submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 미션에 한 번만 투표 가능
  UNIQUE(f_user_id, f_mission_id)
);

-- ============================================
-- 6. PickResult2 테이블 (개별 사용자의 커플 매칭 예측 기록)
-- ============================================
CREATE TABLE IF NOT EXISTS t_pickresult2 (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE CASCADE NOT NULL,
  f_mission_id UUID REFERENCES t_missions2(f_id) ON DELETE CASCADE NOT NULL,
  f_episode_no INTEGER NOT NULL CHECK (f_episode_no > 0),
  
  -- 커플 연결 정보: [{"left": "남성명", "right": "여성명"}, ...]
  f_connections JSONB NOT NULL,
  
  -- 제출 여부 및 시간
  f_submitted BOOLEAN DEFAULT FALSE NOT NULL,
  f_submitted_at TIMESTAMPTZ,
  
  -- 정답 여부 (결과 확정 후 업데이트)
  -- 각 커플별 정답 여부: [{"left": "남성명", "right": "여성명", "is_correct": true}, ...]
  f_connections_result JSONB,
  
  -- 획득 점수 (회차별 총합)
  f_points_earned INTEGER DEFAULT 0 NOT NULL,
  
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 미션의 한 회차에 하나의 예측만 가능
  UNIQUE(f_user_id, f_mission_id, f_episode_no)
);

-- ============================================
-- 7. PointLogs 테이블 (포인트 집계)
-- ============================================
CREATE TABLE IF NOT EXISTS t_pointlogs (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE CASCADE NOT NULL,
  f_mission_id UUID, -- t_missions1 또는 t_missions2 참조 (NULL 가능)
  f_mission_type VARCHAR(20) CHECK (f_mission_type IN ('mission1', 'mission2')),
  
  -- 포인트 변화량 (양수: 획득, 음수: 감점)
  f_diff INTEGER NOT NULL,
  
  -- 포인트 변경 사유
  f_reason TEXT NOT NULL,
  
  -- 추가 정보 (회차 번호 등)
  f_metadata JSONB,
  
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 8. MyPage 테이블 (마이페이지 통계 - 캐시용)
-- ============================================
CREATE TABLE IF NOT EXISTS t_mypage (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- 생성한 미션 총 수 (missions1 + missions2 합계)
  f_created_missions_count INTEGER DEFAULT 0 NOT NULL CHECK (f_created_missions_count >= 0),
  
  -- 참여한 미션 총 수 (missions1 + missions2 합계)
  f_participated_missions_count INTEGER DEFAULT 0 NOT NULL CHECK (f_participated_missions_count >= 0),
  
  -- 최근 활동 시간
  f_recent_mission_created_at TIMESTAMPTZ, -- 최근 미션 생성 시간
  f_recent_vote_at TIMESTAMPTZ, -- 최근 투표 참여 시간
  
  -- 포인트 통계 (캐시)
  f_total_points_earned INTEGER DEFAULT 0 NOT NULL CHECK (f_total_points_earned >= 0), -- 총 획득 포인트
  f_total_points_lost INTEGER DEFAULT 0 NOT NULL CHECK (f_total_points_lost >= 0), -- 총 감점 포인트
  
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 9. Comments 테이블 (댓글)
-- ============================================
CREATE TABLE IF NOT EXISTS t_comments (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- 미션 연결 (missions1 또는 missions2)
  f_mission_id UUID NOT NULL, -- t_missions1 또는 t_missions2 참조
  f_mission_type VARCHAR(20) NOT NULL CHECK (f_mission_type IN ('mission1', 'mission2')),
  
  -- 작성자
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE SET NULL,
  
  -- 댓글 내용
  f_content TEXT NOT NULL CHECK (LENGTH(f_content) > 0),
  
  -- 좋아요 수 (캐시용)
  f_likes_count INTEGER DEFAULT 0 NOT NULL CHECK (f_likes_count >= 0),
  
  -- 답글 수 (캐시용)
  f_replies_count INTEGER DEFAULT 0 NOT NULL CHECK (f_replies_count >= 0),
  
  -- 삭제 여부 (soft delete)
  f_is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 10. Replies 테이블 (답글)
-- ============================================
CREATE TABLE IF NOT EXISTS t_replies (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- 댓글 참조 (어떤 댓글에 대한 답글인지)
  f_comment_id UUID REFERENCES t_comments(f_id) ON DELETE CASCADE NOT NULL,
  
  -- 작성자
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE SET NULL,
  
  -- 답글 내용
  f_content TEXT NOT NULL CHECK (LENGTH(f_content) > 0),
  
  -- 좋아요 수 (캐시용)
  f_likes_count INTEGER DEFAULT 0 NOT NULL CHECK (f_likes_count >= 0),
  
  -- 삭제 여부 (soft delete)
  f_is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  f_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 11. Comment Likes 테이블 (댓글 좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS t_comment_likes (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_comment_id UUID REFERENCES t_comments(f_id) ON DELETE CASCADE NOT NULL,
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE CASCADE NOT NULL,
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 댓글에 한 번만 좋아요 가능
  UNIQUE(f_comment_id, f_user_id)
);

-- ============================================
-- 12. Reply Likes 테이블 (답글 좋아요)
-- ============================================
CREATE TABLE IF NOT EXISTS t_reply_likes (
  f_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  f_reply_id UUID REFERENCES t_replies(f_id) ON DELETE CASCADE NOT NULL,
  f_user_id UUID REFERENCES t_users(f_id) ON DELETE CASCADE NOT NULL,
  f_created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- 한 사용자는 한 답글에 한 번만 좋아요 가능
  UNIQUE(f_reply_id, f_user_id)
);

-- ============================================
-- 인덱스 생성
-- ============================================
-- Users
CREATE INDEX IF NOT EXISTS idx_t_users_f_points ON t_users(f_points DESC);
CREATE INDEX IF NOT EXISTS idx_t_users_f_tier ON t_users(f_tier);
CREATE INDEX IF NOT EXISTS idx_t_users_f_email ON t_users(f_email);

-- Missions1
CREATE INDEX IF NOT EXISTS idx_t_missions1_f_status ON t_missions1(f_status);
CREATE INDEX IF NOT EXISTS idx_t_missions1_f_deadline ON t_missions1(f_deadline);
CREATE INDEX IF NOT EXISTS idx_t_missions1_f_kind ON t_missions1(f_kind);
CREATE INDEX IF NOT EXISTS idx_t_missions1_f_form ON t_missions1(f_form);
CREATE INDEX IF NOT EXISTS idx_t_missions1_f_creator_id ON t_missions1(f_creator_id);
CREATE INDEX IF NOT EXISTS idx_t_missions1_f_season ON t_missions1(f_season_type, f_season_number);
CREATE INDEX IF NOT EXISTS idx_t_missions1_f_status_deadline ON t_missions1(f_status, f_deadline);

-- Missions2
CREATE INDEX IF NOT EXISTS idx_t_missions2_f_status ON t_missions2(f_status);
CREATE INDEX IF NOT EXISTS idx_t_missions2_f_deadline ON t_missions2(f_deadline);
CREATE INDEX IF NOT EXISTS idx_t_missions2_f_creator_id ON t_missions2(f_creator_id);
CREATE INDEX IF NOT EXISTS idx_t_missions2_f_season ON t_missions2(f_season_type, f_season_number);
CREATE INDEX IF NOT EXISTS idx_t_missions2_f_status_deadline ON t_missions2(f_status, f_deadline);

-- Episodes
CREATE INDEX IF NOT EXISTS idx_t_episodes_f_mission_id ON t_episodes(f_mission_id);
CREATE INDEX IF NOT EXISTS idx_t_episodes_f_episode_no ON t_episodes(f_episode_no);
CREATE INDEX IF NOT EXISTS idx_t_episodes_f_status ON t_episodes(f_status);
CREATE INDEX IF NOT EXISTS idx_t_episodes_f_mission_episode ON t_episodes(f_mission_id, f_episode_no);

-- PickResult1
CREATE INDEX IF NOT EXISTS idx_t_pickresult1_f_user_id ON t_pickresult1(f_user_id);
CREATE INDEX IF NOT EXISTS idx_t_pickresult1_f_mission_id ON t_pickresult1(f_mission_id);
CREATE INDEX IF NOT EXISTS idx_t_pickresult1_f_created_at ON t_pickresult1(f_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_t_pickresult1_f_is_correct ON t_pickresult1(f_is_correct);
CREATE INDEX IF NOT EXISTS idx_t_pickresult1_f_user_mission ON t_pickresult1(f_user_id, f_mission_id);

-- PickResult2
CREATE INDEX IF NOT EXISTS idx_t_pickresult2_f_user_id ON t_pickresult2(f_user_id);
CREATE INDEX IF NOT EXISTS idx_t_pickresult2_f_mission_id ON t_pickresult2(f_mission_id);
CREATE INDEX IF NOT EXISTS idx_t_pickresult2_f_episode_no ON t_pickresult2(f_episode_no);
CREATE INDEX IF NOT EXISTS idx_t_pickresult2_f_submitted ON t_pickresult2(f_submitted);
CREATE INDEX IF NOT EXISTS idx_t_pickresult2_f_points_earned ON t_pickresult2(f_points_earned DESC);
CREATE INDEX IF NOT EXISTS idx_t_pickresult2_f_user_mission_episode ON t_pickresult2(f_user_id, f_mission_id, f_episode_no);

-- PointLogs
CREATE INDEX IF NOT EXISTS idx_t_pointlogs_f_user_id ON t_pointlogs(f_user_id);
CREATE INDEX IF NOT EXISTS idx_t_pointlogs_f_mission_id ON t_pointlogs(f_mission_id);
CREATE INDEX IF NOT EXISTS idx_t_pointlogs_f_created_at ON t_pointlogs(f_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_t_pointlogs_f_user_created ON t_pointlogs(f_user_id, f_created_at DESC);

-- MyPage
CREATE INDEX IF NOT EXISTS idx_t_mypage_f_user_id ON t_mypage(f_user_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_t_comments_f_mission_id ON t_comments(f_mission_id);
CREATE INDEX IF NOT EXISTS idx_t_comments_f_mission_type ON t_comments(f_mission_type);
CREATE INDEX IF NOT EXISTS idx_t_comments_f_user_id ON t_comments(f_user_id);
CREATE INDEX IF NOT EXISTS idx_t_comments_f_created_at ON t_comments(f_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_t_comments_f_is_deleted ON t_comments(f_is_deleted);
CREATE INDEX IF NOT EXISTS idx_t_comments_f_mission_composite ON t_comments(f_mission_id, f_mission_type, f_is_deleted, f_created_at DESC);

-- Replies
CREATE INDEX IF NOT EXISTS idx_t_replies_f_comment_id ON t_replies(f_comment_id);
CREATE INDEX IF NOT EXISTS idx_t_replies_f_user_id ON t_replies(f_user_id);
CREATE INDEX IF NOT EXISTS idx_t_replies_f_created_at ON t_replies(f_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_t_replies_f_is_deleted ON t_replies(f_is_deleted);

-- Comment Likes
CREATE INDEX IF NOT EXISTS idx_t_comment_likes_f_comment_id ON t_comment_likes(f_comment_id);
CREATE INDEX IF NOT EXISTS idx_t_comment_likes_f_user_id ON t_comment_likes(f_user_id);

-- Reply Likes
CREATE INDEX IF NOT EXISTS idx_t_reply_likes_f_reply_id ON t_reply_likes(f_reply_id);
CREATE INDEX IF NOT EXISTS idx_t_reply_likes_f_user_id ON t_reply_likes(f_user_id);

-- ============================================
-- 트리거 함수: updated_at 자동 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.f_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 적용
CREATE TRIGGER update_t_users_f_updated_at BEFORE UPDATE ON t_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_t_missions1_f_updated_at BEFORE UPDATE ON t_missions1
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_t_missions2_f_updated_at BEFORE UPDATE ON t_missions2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_t_episodes_f_updated_at BEFORE UPDATE ON t_episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_t_pickresult1_f_updated_at BEFORE UPDATE ON t_pickresult1
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_t_pickresult2_f_updated_at BEFORE UPDATE ON t_pickresult2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_t_mypage_f_updated_at BEFORE UPDATE ON t_mypage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_t_comments_f_updated_at BEFORE UPDATE ON t_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_t_replies_f_updated_at BEFORE UPDATE ON t_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 댓글/답글 좋아요 수 자동 업데이트 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE t_comments SET f_likes_count = f_likes_count + 1 WHERE f_id = NEW.f_comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE t_comments SET f_likes_count = GREATEST(f_likes_count - 1, 0) WHERE f_id = OLD.f_comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reply_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE t_replies SET f_likes_count = f_likes_count + 1 WHERE f_id = NEW.f_reply_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE t_replies SET f_likes_count = GREATEST(f_likes_count - 1, 0) WHERE f_id = OLD.f_reply_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE t_comments SET f_replies_count = f_replies_count + 1 WHERE f_id = NEW.f_comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE t_comments SET f_replies_count = GREATEST(f_replies_count - 1, 0) WHERE f_id = OLD.f_comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_likes_count
  AFTER INSERT OR DELETE ON t_comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

CREATE TRIGGER trigger_reply_likes_count
  AFTER INSERT OR DELETE ON t_reply_likes
  FOR EACH ROW EXECUTE FUNCTION update_reply_likes_count();

CREATE TRIGGER trigger_replies_count
  AFTER INSERT OR DELETE ON t_replies
  FOR EACH ROW EXECUTE FUNCTION update_replies_count();

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'RealPick 데이터베이스 스키마가 성공적으로 생성되었습니다!';
  RAISE NOTICE '총 12개 테이블이 생성되었습니다.';
END $$;
