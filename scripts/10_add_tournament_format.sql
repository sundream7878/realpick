-- ============================================
-- 마이그레이션: 토너먼트 형식 지원 추가
-- 날짜: 2025-12-02
-- 설명: t_missions1 테이블에 토너먼트(tournament) 형식 지원 추가
-- ============================================

-- 1. 기존 f_form CHECK 제약조건 제거 및 새로운 제약조건 추가
--    (tournament 형식 추가)
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

-- 새로운 제약조건 추가 (tournament 포함)
ALTER TABLE t_missions1 
  ADD CONSTRAINT t_missions1_f_form_check 
  CHECK (f_form IN ('binary', 'multi', 'subjective', 'tournament'));


-- 2. f_options NULL 체크 제약조건 업데이트
--    (tournament 형식은 f_options가 필수이므로 binary/multi와 동일하게 처리)
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
      (f_form IN ('binary', 'multi', 'tournament') AND f_options IS NOT NULL)
    );
END $$;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '토너먼트 형식 지원이 성공적으로 추가되었습니다!';
  RAISE NOTICE '변경사항:';
  RAISE NOTICE '  - f_form에 tournament 형식 추가';
  RAISE NOTICE '  - f_options 제약조건 업데이트 (tournament는 options 필수)';
END $$;
