-- RealPick Seed Data (v9 - plan.md 기반)
-- 마지막 업데이트: 2025-01-13

-- ============================================
-- 1. 샘플 사용자 데이터
-- ============================================
INSERT INTO users (email, nickname, points, tier) VALUES
('user1@example.com', '픽마스터', 1250, '그린 플래그'),
('user2@example.com', '연애고수', 5500, '넥서스'),
('user3@example.com', '솔로킹', 350, '솔로 지망생'),
('user4@example.com', '모태솔로', 50, '모태솔로'),
('user5@example.com', '조율사님', 3200, '조율사')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. 샘플 미션 데이터
-- ============================================

-- 이진 투표 미션 (예측픽)
INSERT INTO missions (
  title, 
  description, 
  kind, 
  form, 
  season_type, 
  season_number,
  options, 
  deadline, 
  reveal_policy, 
  status,
  stats_participants
) VALUES (
  '나는솔로 29기 광수와 영숙',
  '광수와 영숙이 커플이 될까요?',
  'predict',
  'binary',
  '기수별',
  29,
  '["커플 성사", "커플 실패"]'::jsonb,
  NOW() + INTERVAL '1 day',
  'realtime',
  'open',
  8432
) ON CONFLICT DO NOTHING;

-- 다중 선택 미션 (다수픽)
INSERT INTO missions (
  title,
  description,
  kind,
  form,
  season_type,
  season_number,
  options,
  deadline,
  reveal_policy,
  status,
  stats_participants
) VALUES (
  '나는솔로 29기 가장 인기 있는 출연자는?',
  '가장 인기 있는 출연자를 선택해주세요',
  'majority',
  'multi',
  '기수별',
  29,
  '["영수", "영호", "광수", "상철"]'::jsonb,
  NOW() + INTERVAL '2 days',
  'realtime',
  'open',
  5234
) ON CONFLICT DO NOTHING;

-- 커플 매칭 미션 (예측픽)
INSERT INTO missions (
  title,
  description,
  kind,
  form,
  season_type,
  season_number,
  options,
  deadline,
  reveal_policy,
  status,
  episodes,
  stats_participants
) VALUES (
  '나는솔로 29기 커플 매칭 예측',
  '최종 커플을 예측해보세요',
  'predict',
  'match',
  '기수별',
  29,
  '{"left": ["영수", "영호", "영식", "영철", "광수", "상철"], "right": ["영순", "정숙", "순자", "영자", "옥순", "현숙"]}'::jsonb,
  NOW() + INTERVAL '7 days',
  'realtime',
  'open',
  8,
  7123
) ON CONFLICT DO NOTHING;

-- ============================================
-- 3. 회차 상태 데이터 (커플 매칭 미션용)
-- ============================================
-- 위에서 생성된 커플 매칭 미션의 ID를 가져와서 사용
-- 실제 사용 시에는 mission_id를 동적으로 가져와야 함
DO $$
DECLARE
  v_mission_id UUID;
BEGIN
  SELECT id INTO v_mission_id 
  FROM missions 
  WHERE form = 'match' AND season_number = 29 
  LIMIT 1;
  
  IF v_mission_id IS NOT NULL THEN
    INSERT INTO episode_statuses (mission_id, episode_no, status) VALUES
    (v_mission_id, 1, 'settled'),
    (v_mission_id, 2, 'settled'),
    (v_mission_id, 3, 'settled'),
    (v_mission_id, 4, 'settled'),
    (v_mission_id, 5, 'settled'),
    (v_mission_id, 6, 'open'),
    (v_mission_id, 7, 'locked'),
    (v_mission_id, 8, 'locked')
    ON CONFLICT (mission_id, episode_no) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 4. 샘플 투표 데이터
-- ============================================
-- 실제 사용 시에는 mission_id와 user_id를 동적으로 가져와야 함
DO $$
DECLARE
  v_binary_mission_id UUID;
  v_multi_mission_id UUID;
  v_user1_id UUID;
  v_user2_id UUID;
BEGIN
  -- 미션 ID 가져오기
  SELECT id INTO v_binary_mission_id FROM missions WHERE form = 'binary' LIMIT 1;
  SELECT id INTO v_multi_mission_id FROM missions WHERE form = 'multi' LIMIT 1;
  
  -- 사용자 ID 가져오기
  SELECT id INTO v_user1_id FROM users WHERE email = 'user1@example.com';
  SELECT id INTO v_user2_id FROM users WHERE email = 'user2@example.com';
  
  -- 이진 투표
  IF v_binary_mission_id IS NOT NULL AND v_user1_id IS NOT NULL THEN
    INSERT INTO votes (user_id, mission_id, selected_option) VALUES
    (v_user1_id, v_binary_mission_id, '"커플 성사"'::jsonb)
    ON CONFLICT (user_id, mission_id) DO NOTHING;
  END IF;
  
  -- 다중 선택 투표
  IF v_multi_mission_id IS NOT NULL AND v_user2_id IS NOT NULL THEN
    INSERT INTO votes (user_id, mission_id, selected_option) VALUES
    (v_user2_id, v_multi_mission_id, '["영수", "광수"]'::jsonb)
    ON CONFLICT (user_id, mission_id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 5. 샘플 커플 매칭 예측 데이터
-- ============================================
DO $$
DECLARE
  v_match_mission_id UUID;
  v_user1_id UUID;
BEGIN
  SELECT id INTO v_match_mission_id FROM missions WHERE form = 'match' LIMIT 1;
  SELECT id INTO v_user1_id FROM users WHERE email = 'user1@example.com';
  
  IF v_match_mission_id IS NOT NULL AND v_user1_id IS NOT NULL THEN
    INSERT INTO match_picks (user_id, mission_id, episode_no, connections, submitted, submitted_at) VALUES
    (v_user1_id, v_match_mission_id, 1, '[{"left": "영수", "right": "정숙"}, {"left": "영호", "right": "영순"}, {"left": "광수", "right": "순자"}]'::jsonb, TRUE, NOW()),
    (v_user1_id, v_match_mission_id, 2, '[{"left": "영수", "right": "정숙"}, {"left": "영호", "right": "영순"}, {"left": "광수", "right": "순자"}]'::jsonb, TRUE, NOW())
    ON CONFLICT (user_id, mission_id, episode_no) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 6. 샘플 결과 데이터
-- ============================================
DO $$
DECLARE
  v_binary_mission_id UUID;
  v_multi_mission_id UUID;
BEGIN
  SELECT id INTO v_binary_mission_id FROM missions WHERE form = 'binary' LIMIT 1;
  SELECT id INTO v_multi_mission_id FROM missions WHERE form = 'multi' LIMIT 1;
  
  -- 이진 투표 결과
  IF v_binary_mission_id IS NOT NULL THEN
    INSERT INTO results (mission_id, correct_answer, distribution, total_votes) VALUES
    (v_binary_mission_id, '커플 성사', '{"커플 성사": 62, "커플 실패": 38}'::jsonb, 8432)
    ON CONFLICT (mission_id) DO UPDATE SET
      correct_answer = EXCLUDED.correct_answer,
      distribution = EXCLUDED.distribution,
      total_votes = EXCLUDED.total_votes;
  END IF;
  
  -- 다중 선택 결과
  IF v_multi_mission_id IS NOT NULL THEN
    INSERT INTO results (mission_id, majority_option, distribution, total_votes) VALUES
    (v_multi_mission_id, '영수', '{"영수": 35, "영호": 25, "광수": 30, "상철": 10}'::jsonb, 5234)
    ON CONFLICT (mission_id) DO UPDATE SET
      majority_option = EXCLUDED.majority_option,
      distribution = EXCLUDED.distribution,
      total_votes = EXCLUDED.total_votes;
  END IF;
END $$;

-- ============================================
-- 7. 샘플 포인트 로그 데이터
-- ============================================
DO $$
DECLARE
  v_user1_id UUID;
  v_binary_mission_id UUID;
BEGIN
  SELECT id INTO v_user1_id FROM users WHERE email = 'user1@example.com';
  SELECT id INTO v_binary_mission_id FROM missions WHERE form = 'binary' LIMIT 1;
  
  IF v_user1_id IS NOT NULL AND v_binary_mission_id IS NOT NULL THEN
    INSERT INTO point_logs (user_id, mission_id, diff, reason) VALUES
    (v_user1_id, v_binary_mission_id, 10, '이진 투표 정답'),
    (v_user1_id, NULL, 30, '다중 선택 투표 정답'),
    (v_user1_id, NULL, 100, '커플 매칭 1회차 정답')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
