-- 트리거 생성
CREATE TRIGGER trigger_update_user_grade
  AFTER UPDATE OF points ON users
  FOR EACH ROW
  WHEN (OLD.points IS DISTINCT FROM NEW.points)
  EXECUTE FUNCTION update_user_grade();

CREATE TRIGGER trigger_update_mission_participants_insert
  AFTER INSERT ON user_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_participants();

CREATE TRIGGER trigger_update_mission_participants_delete
  AFTER DELETE ON user_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_mission_participants();

CREATE TRIGGER trigger_update_option_vote_count
  AFTER INSERT OR UPDATE OR DELETE ON user_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_option_vote_count();
