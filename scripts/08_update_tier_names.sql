-- scripts/08_update_tier_names.sql
-- 등급 명칭 변경 마이그레이션 스크립트
-- 기존 등급명을 새로운 등급명으로 업데이트

-- 1. CHECK 제약조건 업데이트
ALTER TABLE public.t_users
DROP CONSTRAINT IF EXISTS t_users_f_tier_check;

ALTER TABLE public.t_users
ADD CONSTRAINT t_users_f_tier_check 
CHECK (f_tier IN ('루키', '워처', '촉쟁이', '예감러', '분석자', '인사이터', '픽마스터'));

-- 2. 기존 데이터 마이그레이션 (기존 등급명을 새 등급명으로 변환)
UPDATE public.t_users
SET f_tier = CASE
  WHEN f_tier = '넥서스' THEN '픽마스터'
  WHEN f_tier = '조율사' THEN '인사이터'
  WHEN f_tier = '공감 실천가' THEN '분석자'
  WHEN f_tier = '그린 플래그' THEN '예감러'
  WHEN f_tier = '짝사랑 빌더' THEN '촉쟁이'
  WHEN f_tier = '솔로 지망생' THEN '워처'
  WHEN f_tier = '모태솔로' THEN '루키'
  ELSE '루키' -- 알 수 없는 등급은 루키로 설정
END
WHERE f_tier IN ('넥서스', '조율사', '공감 실천가', '그린 플래그', '짝사랑 빌더', '솔로 지망생', '모태솔로');

-- 3. 기본값 업데이트
ALTER TABLE public.t_users
ALTER COLUMN f_tier SET DEFAULT '루키';

-- 4. update_user_tier 함수 업데이트
CREATE OR REPLACE FUNCTION update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE t_users 
  SET f_tier = CASE 
    WHEN NEW.f_points >= 5000 THEN '픽마스터'
    WHEN NEW.f_points >= 3000 THEN '인사이터'
    WHEN NEW.f_points >= 2000 THEN '분석자'
    WHEN NEW.f_points >= 1000 THEN '예감러'
    WHEN NEW.f_points >= 500 THEN '촉쟁이'
    WHEN NEW.f_points >= 200 THEN '워처'
    ELSE '루키'
  END,
  f_updated_at = NOW()
  WHERE f_id = NEW.f_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN public.t_users.f_tier IS '티어 (루키, 워처, 촉쟁이, 예감러, 분석자, 인사이터, 픽마스터)';

