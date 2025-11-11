-- 기본 뱃지 데이터
INSERT INTO badges (name, description, condition_type, condition_value) VALUES
('첫 픽', '첫 번째 투표 완료', 'votes', 1),
('픽 마스터', '100번 투표 완료', 'votes', 100),
('예측왕', '정확도 80% 달성', 'accuracy', 80),
('연속 적중', '5연속 정답', 'streak', 5),
('포인트 헌터', '1000포인트 달성', 'points', 1000),
('솔로 탈출', '솔로 등급 달성', 'points', 200),
('연애 고수', '연애고수 등급 달성', 'points', 5000);

-- 샘플 미션 데이터
INSERT INTO missions (title, description, mission_type, vote_type, program_name, status, end_date, is_hot, total_participants) VALUES
('나는솔로 14기 최종 커플 예측하기', '14기 출연진들의 최종 커플을 예측해보세요!', 'prediction', 'couple', '나는솔로', 'active', NOW() + INTERVAL '2 hours', true, 8432),
('나는솔로 14기 인기투표', '가장 인기 있는 출연진을 선택해주세요', 'majority', 'multiple', '나는솔로', 'active', NOW() + INTERVAL '1 day', false, 5234),
('나는솔로 13기 vs 14기 비교', '더 재미있었던 시즌은?', 'majority', 'binary', '나는솔로', 'active', NOW() + INTERVAL '3 days', false, 3891),
('나는솔로 역대 최고 커플은?', '역대 최고의 커플을 선택해주세요', 'majority', 'multiple', '나는솔로', 'active', NOW() + INTERVAL '5 days', false, 7123),
('나는솔로 14기 최고 명장면', '가장 인상 깊었던 장면은?', 'prediction', 'multiple', '나는솔로', 'active', NOW() + INTERVAL '2 days', false, 4567);

-- 샘플 사용자 데이터
INSERT INTO users (email, username, display_name, points, grade) VALUES
('user1@example.com', 'user1', '픽마스터', 1250, '썸'),
('user2@example.com', 'user2', '연애고수', 5500, '연애고수'),
('user3@example.com', 'user3', '솔로킹', 350, '솔로');
