-- RealPick Database Triggers (v9 - plan.md 기반)
-- 마지막 업데이트: 2025-01-13

-- ============================================
-- 1. 사용자 포인트 변경 시 티어 자동 업데이트
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_user_tier ON users;
CREATE TRIGGER trigger_update_user_tier
  AFTER UPDATE OF points ON users
  FOR EACH ROW
  WHEN (OLD.points IS DISTINCT FROM NEW.points)
  EXECUTE FUNCTION update_user_tier();

-- ============================================
-- 2. Votes 테이블 변경 시 미션 참여자 수 업데이트
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_mission_participants_insert ON votes;
DROP TRIGGER IF EXISTS trigger_update_mission_participants_delete ON votes;

CREATE TRIGGER trigger_update_mission_participants_insert
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_participants();

CREATE TRIGGER trigger_update_mission_participants_delete
  AFTER DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_participants();

-- ============================================
-- 3. MatchPicks 테이블 변경 시 미션 참여자 수 업데이트
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_match_mission_participants_insert ON match_picks;
DROP TRIGGER IF EXISTS trigger_update_match_mission_participants_update ON match_picks;
DROP TRIGGER IF EXISTS trigger_update_match_mission_participants_delete ON match_picks;

CREATE TRIGGER trigger_update_match_mission_participants_insert
  AFTER INSERT ON match_picks
  FOR EACH ROW
  WHEN (NEW.submitted = TRUE)
  EXECUTE FUNCTION update_match_mission_participants();

CREATE TRIGGER trigger_update_match_mission_participants_update
  AFTER UPDATE OF submitted ON match_picks
  FOR EACH ROW
  WHEN (OLD.submitted IS DISTINCT FROM NEW.submitted)
  EXECUTE FUNCTION update_match_mission_participants();

CREATE TRIGGER trigger_update_match_mission_participants_delete
  AFTER DELETE ON match_picks
  FOR EACH ROW
  EXECUTE FUNCTION update_match_mission_participants();

-- ============================================
-- 4. Votes 테이블 변경 시 결과 분포 업데이트
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_result_distribution_insert ON votes;
DROP TRIGGER IF EXISTS trigger_update_result_distribution_delete ON votes;

CREATE TRIGGER trigger_update_result_distribution_insert
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_result_distribution();

CREATE TRIGGER trigger_update_result_distribution_delete
  AFTER DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_result_distribution();
