# RealPick 코드 및 DB 스키마 분석 보고서

**분석 일시**: 2025-01-16  
**분석 범위**: 전체 코드베이스 및 데이터베이스 스키마  
**기준 문서**: plan2.md

---

## 📋 목차

1. [전체 평가](#1-전체-평가)
2. [잘된 점](#2-잘된-점)
3. [발견된 문제점](#3-발견된-문제점)
4. [DB 스키마 분석](#4-db-스키마-분석)
5. [개선 권장 사항](#5-개선-권장-사항)

---

## 1. 전체 평가

### ✅ 전반적으로 잘 짜여진 코드입니다!

**강점:**
- 명확한 네이밍 컨벤션 (t_, f_ 접두사)
- 체계적인 폴더 구조 (p-, c-, h-, u- 접두사)
- TypeScript 타입 안정성
- 모듈화된 코드 구조
- 적절한 인덱싱 전략

**주의 필요:**
- 스키마 버전 불일치 문제
- plan2.md와 실제 구현 간 차이점
- 일부 마이그레이션 누락 가능성

---

## 2. 잘된 점

### 2.1 네이밍 컨벤션 준수
- ✅ 테이블: `t_` 접두사 일관성 있게 사용
- ✅ 컬럼: `f_` 접두사 일관성 있게 사용
- ✅ 폴더 구조: `p-`, `c-`, `h-`, `u-` 접두사로 역할 명확화
- ✅ TypeScript 타입: `T` 접두사 사용

### 2.2 데이터베이스 설계
- ✅ 정규화가 잘 되어 있음
- ✅ 적절한 인덱스 전략 (복합 인덱스 포함)
- ✅ CHECK 제약조건으로 데이터 무결성 보장
- ✅ Soft Delete 패턴 적용 (댓글/답글)
- ✅ JSONB 활용으로 유연한 데이터 저장

### 2.3 코드 구조
- ✅ 유틸리티 함수 모듈화 (`lib/utils/`)
- ✅ Supabase 클라이언트 분리 (`lib/supabase/`)
- ✅ 타입 정의 중앙화 (`types/`)
- ✅ 상수 관리 (`lib/constants/`)

### 2.4 비즈니스 로직
- ✅ 포인트 시스템 중앙화 (`pointSystem.util.ts`)
- ✅ 티어 시스템 중앙화 (`tierSystem.util.ts`)
- ✅ 역주행 채점 로직 구현 (커플 매칭)

---

## 3. 발견된 문제점

### 🔴 심각 (즉시 수정 필요)

#### 3.1 DB 스키마 버전 불일치

**문제:**
- `scripts/supabase_schema.sql` (메인 스키마)와 실제 사용 중인 스키마가 불일치
- plan2.md에 명시된 구조와 실제 스키마가 다름

**구체적 불일치:**

1. **티어 시스템**
   - ❌ `supabase_schema.sql`: 구 티어명 사용 (`모태솔로`, `솔로 지망생` 등)
   - ✅ `plan2.md` & 실제 코드: 신 티어명 사용 (`루키`, `워처` 등)
   - ✅ 마이그레이션 스크립트 존재: `scripts/08_update_tier_names.sql`

2. **티어 포인트 기준 불일치**
   ```sql
   -- supabase_schema.sql (구 기준)
   DEFAULT '모태솔로'
   
   -- plan2.md (신 기준)
   루키: 0P
   워처: 5,000P 이상
   촉쟁이: 10,000P 이상
   예감러: 20,000P 이상
   분석자: 35,000P 이상
   인사이터: 70,000P 이상
   픽마스터: 100,000P 이상
   
   -- scripts/08_update_tier_names.sql (구 기준 - 티어명만 변경)
   WHEN NEW.f_points >= 5000 THEN '픽마스터'
   WHEN NEW.f_points >= 3000 THEN '인사이터'
   ...
   
   -- lib/utils/u-tier-system/tierSystem.util.ts (신 기준)
   minPoints: 100000  // 픽마스터
   minPoints: 70000   // 인사이터
   ...
   ```

3. **t_pickresult2 구조 불일치**
   - ❌ `supabase_schema.sql`: 회차별 row 구조 (`f_episode_no` 컬럼 존재)
   - ✅ `plan2.md` & 실제 코드: `f_votes` JSONB 통합 구조
   - ✅ 마이그레이션 스크립트 존재: `scripts/update_schema_v2.sql`

4. **누락된 컬럼**
   - ❌ `t_users`: `f_age_range`, `f_gender` 없음
   - ✅ 마이그레이션: `scripts/07_add_user_age_gender.sql` 존재
   - ❌ `t_missions1`, `t_missions2`: `f_show_id`, `f_category` 없음
   - ✅ 마이그레이션: `scripts/12_add_show_and_category.sql` 존재

**해결 방안:**
```sql
-- 메인 스키마 파일을 최신 버전으로 업데이트 필요
-- 또는 마이그레이션 스크립트를 순서대로 실행하여 DB 동기화
```

#### 3.2 plan2.md와 실제 구현 불일치

**티어 포인트 기준:**
- plan2.md: `픽마스터 100,000P`, `인사이터 70,000P` 등
- 실제 코드 (`tierSystem.util.ts`): ✅ 일치
- DB 트리거 (`08_update_tier_names.sql`): ❌ 구 기준 사용 (5,000P, 3,000P 등)

**해결 필요:**
- DB 트리거 함수를 plan2.md 기준으로 업데이트 필요

---

### 🟡 주의 (개선 권장)

#### 3.3 스키마 문서화 불일치

**문제:**
- `scripts/TABLE_STRUCTURE.md`: 구 구조 설명 (회차별 row)
- `plan2.md`: 신 구조 설명 (f_votes JSONB)
- 실제 코드: 신 구조 사용

**해결:**
- `TABLE_STRUCTURE.md` 업데이트 필요

#### 3.4 중복 스키마 파일

**문제:**
- `scripts/01_create_tables.sql`: 구 스키마 (t_ 접두사 없음)
- `scripts/supabase_schema.sql`: 신 스키마 (t_ 접두사 있음)
- 두 파일이 공존하여 혼란 가능

**해결:**
- 하나로 통합하거나 명확한 용도 구분 필요

---

### 🟢 경미 (선택적 개선)

#### 3.5 타입 안정성

**개선 가능:**
- 일부 `any` 타입 사용 (`lib/supabase/votes.ts` 등)
- JSONB 타입을 더 구체적으로 정의 가능

#### 3.6 에러 처리

**개선 가능:**
- 일부 함수에서 에러 로깅만 하고 상위로 전파하지 않음
- 에러 타입을 더 구체적으로 정의 가능

---

## 4. DB 스키마 분석

### 4.1 테이블 구조 요약

| 테이블 | 역할 | 상태 | 비고 |
|--------|------|------|------|
| `t_users` | 사용자 정보 | ⚠️ | f_age_range, f_gender 누락 (마이그레이션 필요) |
| `t_missions1` | Binary/Multi 미션 | ⚠️ | f_show_id, f_category 누락 (마이그레이션 필요) |
| `t_missions2` | 커플 매칭 미션 | ⚠️ | f_show_id, f_category 누락 (마이그레이션 필요) |
| `t_episodes` | 회차 상태 | ✅ | 정상 |
| `t_pickresult1` | Binary/Multi 투표 | ✅ | 정상 |
| `t_pickresult2` | 커플 매칭 투표 | ⚠️ | 구조 변경 필요 (f_votes JSONB) |
| `t_pointlogs` | 포인트 이력 | ✅ | 정상 |
| `t_mypage` | 마이페이지 통계 | ✅ | 정상 |
| `t_comments` | 댓글 | ✅ | 정상 |
| `t_replies` | 답글 | ✅ | 정상 |
| `t_comment_likes` | 댓글 좋아요 | ✅ | 정상 |
| `t_reply_likes` | 답글 좋아요 | ✅ | 정상 |

### 4.2 관계도

```
t_users (1) ──< (N) t_missions1 (creator_id)
              └─< (N) t_missions2 (creator_id)
              └─< (N) t_pickresult1 (user_id)
              └─< (N) t_pickresult2 (user_id)
              └─< (N) t_pointlogs (user_id)
              └─< (1) t_mypage (user_id)
              └─< (N) t_comments (user_id)
              └─< (N) t_replies (user_id)
              └─< (N) t_comment_likes (user_id)
              └─< (N) t_reply_likes (user_id)

t_missions1 (1) ──< (N) t_pickresult1 (mission_id)
                  └─< (N) t_comments (mission_id, mission_type='mission1')
                  └─< (N) t_pointlogs (mission_id, mission_type='mission1')

t_missions2 (1) ──< (N) t_episodes (mission_id)
                  └─< (N) t_pickresult2 (mission_id)
                  └─< (N) t_comments (mission_id, mission_type='mission2')
                  └─< (N) t_pointlogs (mission_id, mission_type='mission2')

t_comments (1) ──< (N) t_replies (comment_id)
               └─< (N) t_comment_likes (comment_id)

t_replies (1) ──< (N) t_reply_likes (reply_id)
```

### 4.3 인덱스 전략 평가

**✅ 잘 설계된 인덱스:**
- 복합 인덱스 적절히 사용 (`(mission_id, mission_type, is_deleted)`)
- 정렬 쿼리를 위한 DESC 인덱스 (`created_at DESC`)
- 외래키 인덱스

**⚠️ 개선 가능:**
- `t_pickresult2`의 `f_votes` JSONB 쿼리 최적화 (GIN 인덱스 고려)

### 4.4 제약조건 평가

**✅ 잘 적용된 제약조건:**
- CHECK 제약조건으로 데이터 무결성 보장
- UNIQUE 제약조건으로 중복 방지
- 외래키 CASCADE 정책 적절

**⚠️ 주의:**
- `t_users.f_tier` CHECK 제약조건이 구 티어명으로 되어 있음 (마이그레이션 필요)

---

## 5. 개선 권장 사항

### 5.1 즉시 조치 필요

#### 1. 스키마 동기화
```sql
-- 순서대로 실행:
-- 1. scripts/07_add_user_age_gender.sql
-- 2. scripts/08_update_tier_names.sql (포인트 기준도 수정 필요)
-- 3. scripts/12_add_show_and_category.sql
-- 4. scripts/update_schema_v2.sql (t_pickresult2 구조 변경)
```

#### 2. 티어 포인트 기준 통일
```sql
-- scripts/08_update_tier_names.sql의 트리거 함수 수정:
CREATE OR REPLACE FUNCTION update_user_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE t_users 
  SET f_tier = CASE 
    WHEN NEW.f_points >= 100000 THEN '픽마스터'
    WHEN NEW.f_points >= 70000 THEN '인사이터'
    WHEN NEW.f_points >= 35000 THEN '분석자'
    WHEN NEW.f_points >= 20000 THEN '예감러'
    WHEN NEW.f_points >= 10000 THEN '촉쟁이'
    WHEN NEW.f_points >= 5000 THEN '워처'
    ELSE '루키'
  END,
  f_updated_at = NOW()
  WHERE f_id = NEW.f_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 3. 메인 스키마 파일 업데이트
- `scripts/supabase_schema.sql`을 최신 구조로 업데이트
- 또는 마이그레이션 기반으로 재작성

### 5.2 단기 개선 (1-2주)

#### 1. 문서화 업데이트
- `scripts/TABLE_STRUCTURE.md` 최신화
- `scripts/README.md` 마이그레이션 순서 명시

#### 2. 타입 안정성 강화
- JSONB 타입을 더 구체적으로 정의
- `any` 타입 제거

#### 3. 에러 처리 개선
- 일관된 에러 처리 패턴 적용
- 에러 타입 정의

### 5.3 장기 개선 (1개월+)

#### 1. 스키마 버전 관리
- 마이그레이션 파일 버전 관리 체계화
- 스키마 변경 이력 추적

#### 2. 테스트 코드
- DB 스키마 검증 테스트
- 마이그레이션 롤백 테스트

#### 3. 성능 최적화
- JSONB GIN 인덱스 추가 검토
- 쿼리 성능 모니터링

---

## 6. 결론

### 전체 평가: ⭐⭐⭐⭐ (4/5)

**강점:**
- 체계적인 코드 구조
- 명확한 네이밍 컨벤션
- 잘 설계된 데이터베이스 구조
- 모듈화된 비즈니스 로직

**개선 필요:**
- 스키마 버전 동기화
- 문서화 업데이트
- 티어 포인트 기준 통일

**권장 조치:**
1. ✅ 마이그레이션 스크립트 순서대로 실행
2. ✅ 티어 포인트 기준 통일
3. ✅ 메인 스키마 파일 업데이트
4. ✅ 문서화 업데이트

---

**작성자**: Cursor Agent  
**검토 필요**: 개발직원 (마이그레이션 실행 승인)





