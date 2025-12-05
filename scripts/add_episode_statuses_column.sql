
-- Add f_episode_statuses column to t_missions2
ALTER TABLE t_missions2 
ADD COLUMN IF NOT EXISTS f_episode_statuses JSONB DEFAULT '{}'::jsonb;

-- Initialize existing missions with episode 1 open
UPDATE t_missions2
SET f_episode_statuses = '{"1": "open"}'::jsonb
WHERE f_episode_statuses = '{}'::jsonb OR f_episode_statuses IS NULL;
