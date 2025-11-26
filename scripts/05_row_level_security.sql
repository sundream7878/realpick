-- Row Level Security (RLS) 설정 (v9 - plan.md 기반)
-- 마지막 업데이트: 2025-01-13

-- ============================================
-- 1. RLS 활성화
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Users 테이블 정책
-- ============================================
-- 사용자는 자신의 데이터만 조회/수정 가능
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 모든 사용자는 다른 사용자의 기본 정보(닉네임, 티어 등) 조회 가능
CREATE POLICY "Anyone can view user profiles" ON users
  FOR SELECT USING (true);

-- ============================================
-- 3. Missions 테이블 정책
-- ============================================
-- 모든 사용자가 미션 조회 가능
CREATE POLICY "Anyone can view missions" ON missions
  FOR SELECT USING (true);

-- 인증된 사용자는 미션 생성 가능
CREATE POLICY "Authenticated users can create missions" ON missions
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- 미션 생성자만 수정 가능
CREATE POLICY "Mission creators can update their missions" ON missions
  FOR UPDATE USING (auth.uid() = creator_id);

-- ============================================
-- 4. Episode Statuses 테이블 정책
-- ============================================
-- 모든 사용자가 회차 상태 조회 가능
CREATE POLICY "Anyone can view episode statuses" ON episode_statuses
  FOR SELECT USING (true);

-- 미션 생성자만 회차 상태 수정 가능
CREATE POLICY "Mission creators can update episode statuses" ON episode_statuses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM missions 
      WHERE missions.id = episode_statuses.mission_id 
      AND missions.creator_id = auth.uid()
    )
  );

-- ============================================
-- 5. Votes 테이블 정책
-- ============================================
-- 사용자는 자신의 투표만 조회 가능
CREATE POLICY "Users can view their own votes" ON votes
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 투표만 생성 가능
CREATE POLICY "Users can create their own votes" ON votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 투표만 수정 가능 (마감 전에만)
CREATE POLICY "Users can update their own votes" ON votes
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM missions 
      WHERE missions.id = votes.mission_id 
      AND missions.status = 'open'
      AND missions.deadline > NOW()
    )
  );

-- ============================================
-- 6. Match Picks 테이블 정책
-- ============================================
-- 사용자는 자신의 커플 매칭 예측만 조회 가능
CREATE POLICY "Users can view their own match picks" ON match_picks
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 커플 매칭 예측만 생성/수정 가능
CREATE POLICY "Users can create their own match picks" ON match_picks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own match picks" ON match_picks
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM missions 
      WHERE missions.id = match_picks.mission_id 
      AND missions.status = 'open'
      AND missions.deadline > NOW()
    )
  );

-- ============================================
-- 7. Results 테이블 정책
-- ============================================
-- 모든 사용자가 결과 조회 가능
CREATE POLICY "Anyone can view results" ON results
  FOR SELECT USING (true);

-- 미션 생성자만 결과 생성/수정 가능
CREATE POLICY "Mission creators can manage results" ON results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM missions 
      WHERE missions.id = results.mission_id 
      AND missions.creator_id = auth.uid()
    )
  );

-- ============================================
-- 8. Point Logs 테이블 정책
-- ============================================
-- 사용자는 자신의 포인트 로그만 조회 가능
CREATE POLICY "Users can view their own point logs" ON point_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 포인트 로그는 시스템에서만 생성 (INSERT 정책 없음)
