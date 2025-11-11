-- Row Level Security (RLS) 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 수정 가능
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 미션은 모든 사용자가 조회 가능, 생성자만 수정 가능
CREATE POLICY "Anyone can view missions" ON missions
  FOR SELECT USING (true);

CREATE POLICY "Users can create missions" ON missions
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Mission creators can update their missions" ON missions
  FOR UPDATE USING (auth.uid() = creator_id);

-- 투표는 본인 것만 조회/생성 가능
CREATE POLICY "Users can view their own votes" ON user_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own votes" ON user_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 활동 기록은 본인 것만 조회 가능
CREATE POLICY "Users can view their own activities" ON user_activities
  FOR SELECT USING (auth.uid() = user_id);

-- 뱃지는 본인 것만 조회 가능
CREATE POLICY "Users can view their own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);
