-- Add f_show_id and f_category columns to t_missions1
ALTER TABLE t_missions1 
ADD COLUMN IF NOT EXISTS f_show_id TEXT,
ADD COLUMN IF NOT EXISTS f_category TEXT;

-- Add f_show_id and f_category columns to t_missions2
ALTER TABLE t_missions2 
ADD COLUMN IF NOT EXISTS f_show_id TEXT,
ADD COLUMN IF NOT EXISTS f_category TEXT;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_missions1_show_id ON t_missions1(f_show_id);
CREATE INDEX IF NOT EXISTS idx_missions1_category ON t_missions1(f_category);
CREATE INDEX IF NOT EXISTS idx_missions2_show_id ON t_missions2(f_show_id);
CREATE INDEX IF NOT EXISTS idx_missions2_category ON t_missions2(f_category);

-- Comment on columns
COMMENT ON COLUMN t_missions1.f_show_id IS 'Program ID (e.g., nasolo, culinary-class-wars2)';
COMMENT ON COLUMN t_missions1.f_category IS 'Program Category (e.g., LOVE, VICTORY, STAR)';
COMMENT ON COLUMN t_missions2.f_show_id IS 'Program ID';
COMMENT ON COLUMN t_missions2.f_category IS 'Program Category';
