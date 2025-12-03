-- 포인트 업데이트 및 로그 기록 함수 (Security Definier)
-- RLS를 우회하여 다른 사용자의 포인트를 업데이트할 수 있도록 함

CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_diff INTEGER,
  p_reason TEXT,
  p_mission_id UUID DEFAULT NULL,
  p_mission_type TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_new_points INTEGER;
  v_old_points INTEGER;
  v_log_id UUID;
  v_tier TEXT;
BEGIN
  -- 1. 포인트 로그 기록
  INSERT INTO t_pointlogs (f_user_id, f_diff, f_reason, f_mission_id, f_mission_type, f_metadata)
  VALUES (p_user_id, p_diff, p_reason, p_mission_id, p_mission_type, p_metadata)
  RETURNING f_id INTO v_log_id;

  -- 2. 사용자 포인트 조회
  SELECT f_points INTO v_old_points FROM t_users WHERE f_id = p_user_id;
  
  IF v_old_points IS NULL THEN
    -- 사용자가 없으면 에러 반환
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- 3. 새 포인트 계산 (0 미만으로 내려가지 않도록 함)
  v_new_points := GREATEST(0, v_old_points + p_diff);
  
  -- 4. 티어 계산
  v_tier := CASE 
    WHEN v_new_points >= 5000 THEN '픽마스터'
    WHEN v_new_points >= 3000 THEN '인사이터'
    WHEN v_new_points >= 2000 THEN '분석자'
    WHEN v_new_points >= 1000 THEN '예감러'
    WHEN v_new_points >= 500 THEN '촉쟁이'
    WHEN v_new_points >= 200 THEN '워처'
    ELSE '루키'
  END;

  -- 5. 사용자 정보 업데이트
  UPDATE t_users
  SET f_points = v_new_points,
      f_tier = v_tier,
      f_updated_at = NOW()
  WHERE f_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_points', v_new_points,
    'log_id', v_log_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
