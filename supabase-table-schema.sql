-- RealPick 미션 테이블 생성 SQL
-- Supabase 대시보드 > SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS t_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('prediction', 'majority')),
  format TEXT NOT NULL CHECK (format IN ('binary', 'multiple', 'couple')),
  season_type TEXT NOT NULL CHECK (season_type IN ('전체', '기수별')),
  season_number TEXT,
  options TEXT[],
  male_options TEXT[],
  female_options TEXT[],
  deadline TIMESTAMPTZ NOT NULL,
  result_visibility TEXT NOT NULL CHECK (result_visibility IN ('realtime', 'onClose')),
  creator_id UUID NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'deleted')),
  participants INTEGER DEFAULT 0,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_missions_creator ON t_missions(creator_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON t_missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_created_at ON t_missions(created_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE t_missions ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 미션을 조회할 수 있도록 (관람 모드)
CREATE POLICY "Anyone can view missions" ON t_missions
  FOR SELECT USING (true);

-- 로그인한 사용자만 미션을 생성할 수 있도록
CREATE POLICY "Authenticated users can create missions" ON t_missions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 미션 생성자만 자신의 미션을 수정/삭제할 수 있도록
CREATE POLICY "Users can update their own missions" ON t_missions
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own missions" ON t_missions
  FOR DELETE USING (auth.uid() = creator_id);





