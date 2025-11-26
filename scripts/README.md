# RealPick Database Schema (v10)

plan.md 기반으로 업데이트된 데이터베이스 스키마입니다.

## 스키마 개요

### 테이블 구조 (12개)

1. **users** - 사용자 정보
   - id, email, nickname, avatar_url
   - points, tier (7단계 티어 시스템)
   - created_at, updated_at

2. **missions1** - Binary/Multi 선택 미션
   - id, creator_id
   - kind (predict/majority), form (binary/multi)
   - title, description, options (JSONB)
   - deadline, reveal_policy, status
   - correct_answer, majority_option
   - option_vote_counts (JSONB) - 옵션별 투표 카운트 집계
   - stats_participants, stats_total_votes

3. **missions2** - 커플 매칭 미션
   - id, creator_id
   - kind (항상 'predict')
   - title, description
   - connections (JSONB) - 출연자 정보
   - total_episodes
   - deadline, reveal_policy, status
   - final_answer (JSONB) - 최종 정답 커플
   - stats_participants

4. **episodes** - Missions2 회차 상태 및 집계
   - mission_id, episode_no
   - status (open/settled/locked)
   - couple_pick_counts (JSONB) - 회차별 커플 매칭 집계
   - stats_total_picks, stats_participants

5. **pickresult1** - 개별 사용자의 Binary/Multi 투표 기록
   - user_id, mission_id
   - selected_option (JSONB)
   - is_correct, points_earned
   - created_at, updated_at

6. **pickresult2** - 개별 사용자의 커플 매칭 예측 기록
   - user_id, mission_id, episode_no
   - connections (JSONB)
   - submitted, submitted_at
   - connections_result (JSONB) - 각 커플별 정답 여부
   - points_earned
   - created_at, updated_at

7. **pointlogs** - 포인트 변경 이력
   - user_id, mission_id, mission_type
   - diff, reason, metadata (JSONB)
   - created_at

8. **mypage** - 마이페이지 통계 (캐시용)
   - user_id (UNIQUE)
   - created_missions_count, participated_missions_count
   - recent_mission_created_at, recent_vote_at
   - total_points_earned, total_points_lost
   - created_at, updated_at

9. **comments** - 댓글
   - mission_id, mission_type
   - user_id, content
   - likes_count, replies_count (캐시)
   - is_deleted (soft delete)
   - created_at, updated_at

10. **replies** - 답글
    - comment_id, user_id, content
    - likes_count (캐시)
    - is_deleted (soft delete)
    - created_at, updated_at

11. **comment_likes** - 댓글 좋아요
    - comment_id, user_id
    - UNIQUE(comment_id, user_id)
    - created_at

12. **reply_likes** - 답글 좋아요
    - reply_id, user_id
    - UNIQUE(reply_id, user_id)
    - created_at

## 주요 특징

### 1. 테이블 분리 전략
- **missions1**: Binary/Multi 미션 전용
- **missions2**: 커플 매칭 미션 전용
- 각 미션 타입의 특성에 맞춘 독립적인 스키마

### 2. 집계 데이터 캐싱
- **missions1.option_vote_counts**: 옵션별 투표 수 및 백분율 (JSONB)
- **episodes.couple_pick_counts**: 회차별 커플 매칭 집계 (JSONB)
- 실시간 조회 성능 최적화

### 3. 결과 저장
- **pickresult1, pickresult2**: 투표 기록에 정답 여부와 점수 함께 저장
- 결과 확정 후 자동 업데이트

### 4. 통계 캐싱
- **mypage**: 계산 가능한 값은 제외하고 꼭 필요한 캐시만 저장
- 정확도 등은 실시간 계산

### 5. 댓글 시스템
- 댓글과 답글 분리 (comments, replies)
- 좋아요 분리 (comment_likes, reply_likes)
- Soft Delete 지원 (is_deleted)

## 티어 시스템

plan.md의 7단계 티어 시스템:

- **넥서스**: 5,000P 이상
- **조율사**: 3,000P 이상
- **공감 실천가**: 2,000P 이상
- **그린 플래그**: 1,000P 이상
- **짝사랑 빌더**: 500P 이상
- **솔로 지망생**: 200P 이상
- **모태솔로**: 0P 이상

## 포인트 시스템

### 이진/다중 선택
- 2지선다: +10P (정답/다수일치)
- 3지선다: +30P (정답)
- 4지선다: +40P (정답)
- 5지선다: +50P (정답)
- 오답: 0P (감점 없음)

### 커플 매칭
- 회차별 기본 점수: 1회차 100P → 회차가 지날수록 10P씩 감소 (최소 30P)
- 정답 커플: +회차 점수
- 오답 커플: -회차 점수
- 선택하지 않은 커플: 0점
- 음수 허용

## 스크립트 실행 순서

1. `01_create_tables.sql` - 테이블 생성
2. `02_create_functions.sql` - 함수 생성
3. `03_create_triggers.sql` - 트리거 생성
4. `04_seed_data.sql` - 시드 데이터 삽입
5. `05_row_level_security.sql` - RLS 정책 설정

## 주요 변경 사항 (v10)

### 1. 테이블 분리
- **missions → missions1 + missions2**: 일반 미션과 커플 매칭 미션 완전 분리
- 각 미션 타입의 특성에 맞춘 독립적인 스키마

### 2. 집계 데이터 통합
- **mission_option_counts 테이블 제거**: missions1.option_vote_counts로 통합
- **episodes 테이블에 집계 추가**: couple_pick_counts 필드 추가

### 3. 투표 기록 테이블 분리
- **votes → pickresult1**: Binary/Multi 투표 기록
- **match_picks → pickresult2**: 커플 매칭 예측 기록
- 정답 여부와 점수 함께 저장

### 4. 댓글 시스템 추가
- **comments**: 댓글 테이블
- **replies**: 답글 테이블
- **comment_likes, reply_likes**: 좋아요 테이블

### 5. MyPage 테이블 간소화
- 계산 가능한 값 제거 (accuracy_rate 등)
- 꼭 필요한 캐시만 유지
- missions1/missions2 구분 제거 (총합만 저장)

### 6. 로그인 정책 반영
- 비로그인 사용자도 모든 콘텐츠 관람 가능
- RLS 정책에서 SELECT는 모두 허용, INSERT/UPDATE는 인증 필요

## 주의사항

- 모든 스크립트는 PostgreSQL을 기준으로 작성되었습니다.
- Supabase 환경에서 사용할 경우 RLS 정책이 자동으로 적용됩니다.
- JSONB 필드는 애플리케이션 레벨에서 검증이 필요합니다.
- 집계 데이터(option_vote_counts, couple_pick_counts)는 트리거로 자동 업데이트됩니다.

## 상세 문서

더 자세한 테이블 구조 정보는 **[TABLE_STRUCTURE.md](./TABLE_STRUCTURE.md)** 를 참고하세요.

## 다음 단계

1. 실제 DB에 스키마 적용
2. Mock 데이터를 실제 DB 구조에 맞춰 수정
3. API 엔드포인트 구현
4. 컴포넌트 개발

---

마지막 업데이트: 2025-01-13
버전: v10
