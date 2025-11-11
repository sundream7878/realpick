-- 사용자 등급 업데이트 함수
CREATE OR REPLACE FUNCTION update_user_grade()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET grade = CASE 
    WHEN NEW.points >= 5000 THEN '연애고수'
    WHEN NEW.points >= 3000 THEN '연애중수'
    WHEN NEW.points >= 2000 THEN '연애초보'
    WHEN NEW.points >= 1000 THEN '썸'
    WHEN NEW.points >= 500 THEN '짝사랑'
    WHEN NEW.points >= 200 THEN '솔로'
    ELSE '모솔'
  END,
  updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 미션 참여자 수 업데이트 함수
CREATE OR REPLACE FUNCTION update_mission_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE missions 
    SET total_participants = total_participants + 1,
        updated_at = NOW()
    WHERE id = NEW.mission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE missions 
    SET total_participants = total_participants - 1,
        updated_at = NOW()
    WHERE id = OLD.mission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 옵션 투표 수 업데이트 함수
CREATE OR REPLACE FUNCTION update_option_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.option_id IS NOT NULL THEN
    UPDATE mission_options 
    SET vote_count = vote_count + 1
    WHERE id = NEW.option_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.option_id IS NOT NULL THEN
    UPDATE mission_options 
    SET vote_count = vote_count - 1
    WHERE id = OLD.option_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 옵션이 변경된 경우
    IF OLD.option_id IS NOT NULL THEN
      UPDATE mission_options 
      SET vote_count = vote_count - 1
      WHERE id = OLD.option_id;
    END IF;
    IF NEW.option_id IS NOT NULL THEN
      UPDATE mission_options 
      SET vote_count = vote_count + 1
      WHERE id = NEW.option_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
