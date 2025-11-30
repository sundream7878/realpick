-- 미션 테이블에 상세 설명 및 이미지 URL 컬럼 추가
-- t_missions1 (일반 미션)
ALTER TABLE t_missions1 
ADD COLUMN IF NOT EXISTS f_description TEXT,
ADD COLUMN IF NOT EXISTS f_image_url TEXT;

-- t_missions2 (커플 매칭 미션)
ALTER TABLE t_missions2 
ADD COLUMN IF NOT EXISTS f_description TEXT,
ADD COLUMN IF NOT EXISTS f_image_url TEXT;

-- 코멘트: 상세 설명은 최대 1000자 제한을 권장하지만, DB 레벨에서는 TEXT로 유연하게 둠.
-- f_reference_url은 이미 존재하므로 추가하지 않음.
