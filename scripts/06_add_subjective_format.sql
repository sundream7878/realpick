-- ============================================
-- 마이그레이션: 주관식 형식 지원 추가
-- 날짜: 2025-01-XX
-- 설명: t_missions1 테이블에 주관식(subjective) 형식 지원 추가
-- ============================================

-- 1. 기존 f_form CHECK 제약조건 제거 및 새로운 제약조건 추가
--    (subjective 형식 추가)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- 기존 제약조건 이름 찾기
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 't_missions1'::regclass
    AND contype = 'c'
    AND conname LIKE '%f_form%';
  
  -- 제약조건이 있으면 제거
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE t_missions1 DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE '기존 제약조건 제거: %', constraint_name;
  END IF;
END $$;

-- 새로운 제약조건 추가 (subjective 포함)
ALTER TABLE t_missions1 
  ADD CONSTRAINT t_missions1_f_form_check 
  CHECK (f_form IN ('binary', 'multi', 'subjective'));

-- 2. f_options를 NULL 허용으로 변경
--    (주관식 형식은 선택지가 없으므로 NULL 허용)
ALTER TABLE t_missions1 
  ALTER COLUMN f_options DROP NOT NULL;

-- 3. 주관식 안내 문구 필드 추가
ALTER TABLE t_missions1 
  ADD COLUMN IF NOT EXISTS f_subjective_placeholder TEXT;

-- 4. 주관식 형식일 때 f_options가 NULL이어도 되도록 제약조건 추가
--    (주관식이 아닐 때만 NOT NULL 체크)
DO $$
BEGIN
  -- 기존 제약조건이 있다면 제거
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 't_missions1_f_options_not_null_check'
  ) THEN
    ALTER TABLE t_missions1 DROP CONSTRAINT t_missions1_f_options_not_null_check;
  END IF;
  
  -- 새로운 제약조건 추가: 주관식이 아닐 때만 f_options가 NOT NULL
  ALTER TABLE t_missions1 
    ADD CONSTRAINT t_missions1_f_options_not_null_check 
    CHECK (
      (f_form = 'subjective' AND f_options IS NULL) OR
      (f_form IN ('binary', 'multi') AND f_options IS NOT NULL)
    );
END $$;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '주관식 형식 지원이 성공적으로 추가되었습니다!';
  RAISE NOTICE '변경사항:';
  RAISE NOTICE '  - f_form에 subjective 형식 추가';
  RAISE NOTICE '  - f_options를 NULL 허용으로 변경';
  RAISE NOTICE '  - f_subjective_placeholder 필드 추가';
END $$;

