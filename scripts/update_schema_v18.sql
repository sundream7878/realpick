-- Migration v18: Remove avatar_url column from users table
-- Date: 2025-11-29
-- Description: 프로필 이미지 업로드 기능 제거, 티어 캐릭터만 사용

-- Remove avatar_url column
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;

-- Add comment
COMMENT ON TABLE users IS 'User profiles - using tier character images only';
