-- User Role System Database Migration
-- Add constraint to f_role column in t_users table

-- Drop existing constraint if it exists
ALTER TABLE t_users 
DROP CONSTRAINT IF EXISTS t_users_f_role_check;

-- Add new constraint with all 4 roles
ALTER TABLE t_users
ADD CONSTRAINT t_users_f_role_check 
CHECK (f_role IN ('PICKER', 'DEALER', 'MAIN_DEALER', 'ADMIN'));

-- Set default role for existing users with NULL role
UPDATE t_users 
SET f_role = 'PICKER' 
WHERE f_role IS NULL;

-- Optional: Create an index on f_role for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON t_users(f_role);

-- Verify the changes
SELECT f_role, COUNT(*) as user_count
FROM t_users
GROUP BY f_role
ORDER BY 
  CASE f_role
    WHEN 'ADMIN' THEN 1
    WHEN 'MAIN_DEALER' THEN 2
    WHEN 'DEALER' THEN 3
    WHEN 'PICKER' THEN 4
  END;
