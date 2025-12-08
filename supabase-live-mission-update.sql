-- Add f_is_live column to t_missions1 table
ALTER TABLE t_missions1 ADD COLUMN f_is_live BOOLEAN DEFAULT FALSE;

-- Add f_is_live column to t_missions2 table
ALTER TABLE t_missions2 ADD COLUMN f_is_live BOOLEAN DEFAULT FALSE;

-- Comment on columns for clarity
COMMENT ON COLUMN t_missions1.f_is_live IS '라이브 미션 여부 (TRUE: 라이브, FALSE: 일반)';
COMMENT ON COLUMN t_missions2.f_is_live IS '라이브 미션 여부 (TRUE: 라이브, FALSE: 일반)';
