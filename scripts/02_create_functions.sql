-- RealPick Database Functions (v9 - plan.md 기반)
-- 마지막 업데이트: 2025-01-13

-- ============================================
-- 1. 사용자 티어 업데이트 함수
-- plan.md의 7단계 티어 시스템 반영
-- ============================================
CREATE OR REPLACE FUNCTION update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET tier = CASE 
    WHEN NEW.points >= 5000 THEN '픽마스터'
    WHEN NEW.points >= 3000 THEN '인사이터'
    WHEN NEW.points >= 2000 THEN '분석자'
    WHEN NEW.points >= 1000 THEN '예감러'
    WHEN NEW.points >= 500 THEN '촉쟁이'
    WHEN NEW.points >= 200 THEN '워처'
    ELSE '루키'
  END,
  updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. 미션 참여자 수 업데이트 함수
-- Votes 테이블 기준으로 참여자 수 계산
-- ============================================
CREATE OR REPLACE FUNCTION update_mission_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE missions 
    SET stats_participants = (
      SELECT COUNT(DISTINCT user_id) 
      FROM votes 
      WHERE mission_id = NEW.mission_id
    ),
    updated_at = NOW()
    WHERE id = NEW.mission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE missions 
    SET stats_participants = (
      SELECT COUNT(DISTINCT user_id) 
      FROM votes 
      WHERE mission_id = OLD.mission_id
    ),
    updated_at = NOW()
    WHERE id = OLD.mission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. 커플 매칭 참여자 수 업데이트 함수
-- MatchPicks 테이블 기준으로 참여자 수 계산
-- ============================================
CREATE OR REPLACE FUNCTION update_match_mission_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE missions 
    SET stats_participants = (
      SELECT COUNT(DISTINCT user_id) 
      FROM match_picks 
      WHERE mission_id = NEW.mission_id AND submitted = TRUE
    ),
    updated_at = NOW()
    WHERE id = NEW.mission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE missions 
    SET stats_participants = (
      SELECT COUNT(DISTINCT user_id) 
      FROM match_picks 
      WHERE mission_id = OLD.mission_id AND submitted = TRUE
    ),
    updated_at = NOW()
    WHERE id = OLD.mission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. 포인트 계산 함수 (이진/다중 선택)
-- plan.md의 포인트 시스템 반영
-- ============================================
CREATE OR REPLACE FUNCTION calculate_binary_multi_points(
  p_form VARCHAR,
  p_is_correct BOOLEAN
) RETURNS INTEGER AS $$
BEGIN
  IF NOT p_is_correct THEN
    RETURN 0; -- 오답은 0점
  END IF;
  
  CASE p_form
    WHEN 'binary' THEN RETURN 10;
    WHEN 'multi' THEN 
      -- multi의 경우 옵션 개수에 따라 다르지만, 
      -- 기본적으로 3지선다: 30P, 4지선다: 40P, 5지선다: 50P
      -- 이 함수는 기본값을 반환하고, 실제 계산은 애플리케이션 레벨에서 처리
      RETURN 30;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. 포인트 계산 함수 (커플 매칭)
-- plan.md의 회차별 점수 시스템 반영
-- ============================================
CREATE OR REPLACE FUNCTION calculate_match_points(
  p_episode_no INTEGER,
  p_is_correct BOOLEAN
) RETURNS INTEGER AS $$
DECLARE
  base_points INTEGER;
BEGIN
  -- 회차별 기본 점수: 1회차 100P → 회차가 지날수록 10P씩 감소
  base_points := GREATEST(100 - (p_episode_no - 1) * 10, 30);
  
  IF p_is_correct THEN
    RETURN base_points; -- 정답: +회차 점수
  ELSE
    RETURN -base_points; -- 오답: -회차 점수
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. 결과 분포 업데이트 함수
-- Votes 테이블 변경 시 Results 테이블의 distribution 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_result_distribution()
RETURNS TRIGGER AS $$
DECLARE
  v_mission_id UUID;
  v_distribution JSONB;
  v_total_votes INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_mission_id := NEW.mission_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_mission_id := OLD.mission_id;
  ELSE
    RETURN NULL;
  END IF;
  
  -- Votes 테이블에서 분포 계산
  SELECT 
    jsonb_object_agg(
      option_text, 
      ROUND((COUNT(*)::NUMERIC / NULLIF(SUM(COUNT(*)) OVER(), 0)) * 100, 1)
    ),
    COUNT(*)
  INTO v_distribution, v_total_votes
  FROM (
    SELECT jsonb_array_elements_text(selected_option) AS option_text
    FROM votes
    WHERE mission_id = v_mission_id
  ) sub;
  
  -- Results 테이블 업데이트 또는 삽입
  INSERT INTO results (mission_id, distribution, total_votes, updated_at)
  VALUES (v_mission_id, COALESCE(v_distribution, '{}'::jsonb), COALESCE(v_total_votes, 0), NOW())
  ON CONFLICT (mission_id) 
  DO UPDATE SET 
    distribution = COALESCE(v_distribution, '{}'::jsonb),
    total_votes = COALESCE(v_total_votes, 0),
    updated_at = NOW();
  
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  ELSE
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;
