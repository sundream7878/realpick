-- ============================================
-- 마이그레이션: t_users 테이블에 나잇대/성별 컬럼 추가
-- 작성일: 2025-01-XX
-- 설명: 신규 사용자 가입 시 나잇대와 성별 정보를 저장하기 위한 컬럼 추가
-- ============================================

-- 나잇대 컬럼 추가 (10대, 20대, 30대, 40대, 50대, 60대, 70대, 80대, 90대)
ALTER TABLE t_users 
ADD COLUMN IF NOT EXISTS f_age_range VARCHAR(20) NULL;

-- 나잇대 CHECK 제약조건 추가
ALTER TABLE t_users
DROP CONSTRAINT IF EXISTS t_users_f_age_range_check;

ALTER TABLE t_users
ADD CONSTRAINT t_users_f_age_range_check 
CHECK (f_age_range IN ('10대', '20대', '30대', '40대', '50대', '60대', '70대', '80대', '90대') OR f_age_range IS NULL);

-- 성별 컬럼 추가 (남성, 여성)
ALTER TABLE t_users 
ADD COLUMN IF NOT EXISTS f_gender VARCHAR(20) NULL;

-- 성별 CHECK 제약조건 추가
ALTER TABLE t_users
DROP CONSTRAINT IF EXISTS t_users_f_gender_check;

ALTER TABLE t_users
ADD CONSTRAINT t_users_f_gender_check 
CHECK (f_gender IN ('남성', '여성') OR f_gender IS NULL);

-- 컬럼 추가 확인
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 't_users'
  AND column_name IN ('f_age_range', 'f_gender')
ORDER BY column_name;

