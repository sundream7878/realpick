# RealPick 데이터베이스 테이블 구조 상세 설명

## 📋 목차
1. [Users](#1-users-테이블)
2. [Missions1](#2-missions1-테이블)
3. [Missions2](#3-missions2-테이블)
4. [Episodes](#4-episodes-테이블)
5. [PickResult1](#5-pickresult1-테이블)
6. [PickResult2](#6-pickresult2-테이블)
7. [PointLogs](#7-pointlogs-테이블)
8. [MyPage](#8-mypage-테이블)
9. [Comments](#9-comments-테이블)
10. [Replies](#10-replies-테이블)
11. [Comment Likes](#11-comment-likes-테이블)
12. [Reply Likes](#12-reply-likes-테이블)

---

## 1. Users 테이블

**역할**: 사용자 정보 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 사용자 고유 ID (자동 생성) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 주소 (로그인용) |
| `nickname` | VARCHAR(100) | UNIQUE, NOT NULL | 닉네임 |
| `avatar_url` | TEXT | NULL | 프로필 이미지 URL |
| `points` | INTEGER | DEFAULT 0, NOT NULL | 보유 포인트 |
| `tier` | VARCHAR(20) | DEFAULT '모태솔로', NOT NULL | 티어 (모태솔로, 솔로 지망생, 짝사랑 빌더, 그린 플래그, 공감 실천가, 조율사, 넥서스) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 계정 생성 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 정보 수정 시간 |

**인덱스**:
- `idx_users_points`: 포인트 조회 최적화
- `idx_users_tier`: 티어별 조회 최적화
- `idx_users_email`: 이메일 로그인 최적화

---

## 2. Missions1 테이블

**역할**: Binary/Multi 선택 미션 정보 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 미션 고유 ID |
| `creator_id` | UUID | FK → users(id), ON DELETE SET NULL | 미션 생성자 ID |
| `title` | VARCHAR(200) | NOT NULL | 미션 제목 |
| `description` | TEXT | NULL | 미션 설명 |
| `kind` | VARCHAR(20) | NOT NULL, CHECK | 미션 타입: 'predict' (예측픽) 또는 'majority' (다수픽) |
| `form` | VARCHAR(20) | NOT NULL, CHECK | 미션 형식: 'binary' (2지선다) 또는 'multi' (다중선택) |
| `season_type` | VARCHAR(20) | CHECK | 시즌 분류: '전체' 또는 '기수별' |
| `season_number` | INTEGER | NULL | 기수 번호 (기수별인 경우) |
| `options` | JSONB | NOT NULL | 선택지 배열<br/>예: `["옵션1", "옵션2"]` (binary)<br/>예: `["옵션1", "옵션2", "옵션3"]` (multi) |
| `deadline` | TIMESTAMP WITH TIME ZONE | NOT NULL | 마감 시간 |
| `reveal_policy` | VARCHAR(20) | DEFAULT 'realtime', CHECK | 결과 공개 정책: 'realtime' (실시간) 또는 'onClose' (마감 후) |
| `status` | VARCHAR(20) | DEFAULT 'open', CHECK | 미션 상태: 'open' (진행중), 'closed' (마감), 'settled' (결과 확정) |
| `correct_answer` | TEXT | NULL | 정답 (predict 타입, 결과 확정 후) |
| `majority_option` | TEXT | NULL | 다수 선택 옵션 (majority 타입, 결과 확정 후) |
| `stats_participants` | INTEGER | DEFAULT 0, NOT NULL | 참여자 수 (캐시) |
| `stats_total_votes` | INTEGER | DEFAULT 0, NOT NULL | 총 투표 수 (캐시) |
| `option_vote_counts` | JSONB | DEFAULT '{}' | 옵션별 투표 카운트 (캐시)<br/>예: `{"옵션1": {"count": 100, "percentage": 62.5}, "옵션2": {"count": 60, "percentage": 37.5}}` |
| `thumbnail_url` | TEXT | NULL | 썸네일 이미지 URL |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 생성 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 수정 시간 |

**인덱스**:
- `idx_missions1_status`: 상태별 조회
- `idx_missions1_deadline`: 마감 시간 정렬
- `idx_missions1_kind`: 타입별 조회
- `idx_missions1_form`: 형식별 조회
- `idx_missions1_creator_id`: 생성자별 조회
- `idx_missions1_season`: 시즌별 조회

---

## 3. Missions2 테이블

**역할**: 커플 매칭 미션 정보 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 미션 고유 ID |
| `creator_id` | UUID | FK → users(id), ON DELETE SET NULL | 미션 생성자 ID |
| `title` | VARCHAR(200) | NOT NULL | 미션 제목 |
| `description` | TEXT | NULL | 미션 설명 |
| `kind` | VARCHAR(20) | DEFAULT 'predict', CHECK | 미션 타입 (항상 'predict') |
| `season_type` | VARCHAR(20) | CHECK | 시즌 분류: '전체' 또는 '기수별' |
| `season_number` | INTEGER | NULL | 기수 번호 |
| `connections` | JSONB | NOT NULL | 출연자 정보<br/>예: `{"left": ["남성1", "남성2"], "right": ["여성1", "여성2"]}` |
| `total_episodes` | INTEGER | DEFAULT 8, NOT NULL | 총 회차 수 |
| `deadline` | TIMESTAMP WITH TIME ZONE | NOT NULL | 마감 시간 |
| `reveal_policy` | VARCHAR(20) | DEFAULT 'realtime', CHECK | 결과 공개 정책 |
| `status` | VARCHAR(20) | DEFAULT 'open', CHECK | 미션 상태 |
| `final_answer` | JSONB | NULL | 최종 정답 커플<br/>예: `[{"left": "남성1", "right": "여성1"}, {"left": "남성2", "right": "여성2"}]` |
| `stats_participants` | INTEGER | DEFAULT 0, NOT NULL | 참여자 수 (캐시) |
| `thumbnail_url` | TEXT | NULL | 썸네일 이미지 URL |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 생성 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 수정 시간 |

**인덱스**:
- `idx_missions2_status`: 상태별 조회
- `idx_missions2_deadline`: 마감 시간 정렬
- `idx_missions2_creator_id`: 생성자별 조회
- `idx_missions2_season`: 시즌별 조회

---

## 4. Episodes 테이블

**역할**: Missions2의 회차별 상태 및 집계 데이터 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 회차 고유 ID |
| `mission_id` | UUID | FK → missions2(id), ON DELETE CASCADE, NOT NULL | 커플 매칭 미션 ID |
| `episode_no` | INTEGER | NOT NULL | 회차 번호 (1, 2, 3, ...) |
| `status` | VARCHAR(20) | DEFAULT 'open', CHECK | 회차 상태: 'open' (투표 가능), 'settled' (결과 확정), 'locked' (잠금) |
| `couple_pick_counts` | JSONB | DEFAULT '{}' | 회차별 커플 매칭 집계 데이터 (캐시)<br/>예: `{"남성1-여성1": {"count": 100, "percentage": 25.5}, "남성2-여성2": {"count": 80, "percentage": 20.4}}` |
| `stats_total_picks` | INTEGER | DEFAULT 0, NOT NULL | 총 예측 수 (캐시) |
| `stats_participants` | INTEGER | DEFAULT 0, NOT NULL | 참여자 수 (캐시) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 생성 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 수정 시간 |

**제약조건**:
- `UNIQUE(mission_id, episode_no)`: 한 미션의 회차는 중복 불가

**인덱스**:
- `idx_episodes_mission_id`: 미션별 회차 조회
- `idx_episodes_episode_no`: 회차 번호 정렬
- `idx_episodes_status`: 상태별 조회

---

## 5. PickResult1 테이블

**역할**: 개별 사용자의 Binary/Multi 투표 기록 저장 (정답 여부, 점수 포함)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 투표 기록 고유 ID |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE, NOT NULL | 투표한 사용자 ID |
| `mission_id` | UUID | FK → missions1(id), ON DELETE CASCADE, NOT NULL | 미션 ID |
| `selected_option` | JSONB | NOT NULL | 선택한 옵션<br/>binary: `"옵션1"` (문자열)<br/>multi: `["옵션1", "옵션2"]` (배열) |
| `is_correct` | BOOLEAN | NULL | 정답 여부 (결과 확정 후 업데이트) |
| `points_earned` | INTEGER | DEFAULT 0, NOT NULL | 획득한 점수 |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 투표 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 수정 시간 |

**제약조건**:
- `UNIQUE(user_id, mission_id)`: 한 사용자는 한 미션에 한 번만 투표 가능

**인덱스**:
- `idx_pickresult1_user_id`: 사용자별 투표 조회
- `idx_pickresult1_mission_id`: 미션별 투표 조회
- `idx_pickresult1_created_at`: 시간순 정렬
- `idx_pickresult1_is_correct`: 정답 여부별 조회

---

## 6. PickResult2 테이블

**역할**: 개별 사용자의 커플 매칭 예측 기록 저장 (정답 여부, 점수 포함)

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 예측 기록 고유 ID |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE, NOT NULL | 예측한 사용자 ID |
| `mission_id` | UUID | FK → missions2(id), ON DELETE CASCADE, NOT NULL | 커플 매칭 미션 ID |
| `episode_no` | INTEGER | NOT NULL | 회차 번호 |
| `connections` | JSONB | NOT NULL | 예측한 커플 연결 정보<br/>예: `[{"left": "남성1", "right": "여성1"}, {"left": "남성2", "right": "여성2"}]` |
| `submitted` | BOOLEAN | DEFAULT FALSE, NOT NULL | 제출 여부 |
| `submitted_at` | TIMESTAMP WITH TIME ZONE | NULL | 제출 시간 |
| `connections_result` | JSONB | NULL | 각 커플별 정답 여부 (결과 확정 후 업데이트)<br/>예: `[{"left": "남성1", "right": "여성1", "is_correct": true}, ...]` |
| `points_earned` | INTEGER | DEFAULT 0, NOT NULL | 획득한 점수 (회차별 총합) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 생성 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 수정 시간 |

**제약조건**:
- `UNIQUE(user_id, mission_id, episode_no)`: 한 사용자는 한 미션의 한 회차에 하나의 예측만 가능

**인덱스**:
- `idx_pickresult2_user_id`: 사용자별 예측 조회
- `idx_pickresult2_mission_id`: 미션별 예측 조회
- `idx_pickresult2_episode_no`: 회차별 조회
- `idx_pickresult2_submitted`: 제출 여부별 조회
- `idx_pickresult2_points_earned`: 점수별 정렬

---

## 7. PointLogs 테이블

**역할**: 포인트 변경 이력 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 로그 고유 ID |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE, NOT NULL | 사용자 ID |
| `mission_id` | UUID | NULL | 미션 ID (missions1 또는 missions2 참조, NULL 가능) |
| `mission_type` | VARCHAR(20) | CHECK | 미션 타입: 'mission1' 또는 'mission2' |
| `diff` | INTEGER | NOT NULL | 포인트 변화량 (양수: 획득, 음수: 감점) |
| `reason` | TEXT | NOT NULL | 포인트 변경 사유 (예: "이진 투표 정답", "커플 매칭 1회차 정답") |
| `metadata` | JSONB | NULL | 추가 정보 (회차 번호 등) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 변경 시간 |

**인덱스**:
- `idx_pointlogs_user_id`: 사용자별 포인트 이력 조회
- `idx_pointlogs_mission_id`: 미션별 포인트 이력 조회
- `idx_pointlogs_created_at`: 시간순 정렬

---

## 8. MyPage 테이블

**역할**: 마이페이지 통계 정보 저장 (캐시용)

**중요**: 계산 가능한 값은 저장하지 않음 (accuracy_rate 등). 꼭 필요한 캐시 값만 유지.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 통계 고유 ID |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE, UNIQUE, NOT NULL | 사용자 ID |
| `created_missions_count` | INTEGER | DEFAULT 0, NOT NULL | 생성한 미션 총 수 (missions1 + missions2 합계) |
| `participated_missions_count` | INTEGER | DEFAULT 0, NOT NULL | 참여한 미션 총 수 (missions1 + missions2 합계) |
| `recent_mission_created_at` | TIMESTAMP WITH TIME ZONE | NULL | 최근 미션 생성 시간 |
| `recent_vote_at` | TIMESTAMP WITH TIME ZONE | NULL | 최근 투표 참여 시간 |
| `total_points_earned` | INTEGER | DEFAULT 0, NOT NULL | 총 획득 포인트 (캐시) |
| `total_points_lost` | INTEGER | DEFAULT 0, NOT NULL | 총 감점 포인트 (캐시) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 생성 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 수정 시간 |

**제약조건**:
- `UNIQUE(user_id)`: 한 사용자당 하나의 통계 레코드만 존재

**인덱스**:
- `idx_mypage_user_id`: 사용자별 조회

**제거된 컬럼 (계산 가능한 값)**:
- `created_missions1_count`, `created_missions2_count` → `created_missions_count`로 통합
- `participated_missions1_count`, `participated_missions2_count` → `participated_missions_count`로 통합
- `total_votes_count` → pickresult1, pickresult2에서 COUNT 가능
- `correct_votes_count` → pickresult1, pickresult2에서 COUNT 가능
- `accuracy_rate` → `correct_votes_count / total_votes_count`로 계산 가능

---

## 9. Comments 테이블

**역할**: 미션에 달린 댓글 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 댓글 고유 ID |
| `mission_id` | UUID | NOT NULL | 미션 ID (missions1 또는 missions2 참조) |
| `mission_type` | VARCHAR(20) | NOT NULL, CHECK | 미션 타입: 'mission1' 또는 'mission2' |
| `user_id` | UUID | FK → users(id), ON DELETE SET NULL | 작성자 ID |
| `content` | TEXT | NOT NULL | 댓글 내용 |
| `likes_count` | INTEGER | DEFAULT 0, NOT NULL | 좋아요 수 (캐시) |
| `replies_count` | INTEGER | DEFAULT 0, NOT NULL | 답글 수 (캐시) |
| `is_deleted` | BOOLEAN | DEFAULT FALSE, NOT NULL | 삭제 여부 (soft delete) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 작성 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 수정 시간 |

**인덱스**:
- `idx_comments_mission_id`: 미션별 댓글 조회
- `idx_comments_mission_type`: 미션 타입별 조회
- `idx_comments_user_id`: 작성자별 조회
- `idx_comments_created_at`: 시간순 정렬
- `idx_comments_is_deleted`: 삭제 여부 필터링
- `idx_comments_mission_composite`: 복합 인덱스 (미션별 조회 최적화)

---

## 10. Replies 테이블

**역할**: 댓글에 대한 답글 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 답글 고유 ID |
| `comment_id` | UUID | FK → comments(id), ON DELETE CASCADE, NOT NULL | 댓글 ID (어떤 댓글에 대한 답글인지) |
| `user_id` | UUID | FK → users(id), ON DELETE SET NULL | 작성자 ID |
| `content` | TEXT | NOT NULL | 답글 내용 |
| `likes_count` | INTEGER | DEFAULT 0, NOT NULL | 좋아요 수 (캐시) |
| `is_deleted` | BOOLEAN | DEFAULT FALSE, NOT NULL | 삭제 여부 (soft delete) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 작성 시간 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 수정 시간 |

**인덱스**:
- `idx_replies_comment_id`: 댓글별 답글 조회
- `idx_replies_user_id`: 작성자별 조회
- `idx_replies_created_at`: 시간순 정렬
- `idx_replies_is_deleted`: 삭제 여부 필터링

---

## 11. Comment Likes 테이블

**역할**: 댓글 좋아요 기록 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 좋아요 고유 ID |
| `comment_id` | UUID | FK → comments(id), ON DELETE CASCADE, NOT NULL | 댓글 ID |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE, NOT NULL | 좋아요한 사용자 ID |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 좋아요 시간 |

**제약조건**:
- `UNIQUE(comment_id, user_id)`: 한 사용자는 한 댓글에 한 번만 좋아요 가능

**인덱스**:
- `idx_comment_likes_comment_id`: 댓글별 좋아요 조회
- `idx_comment_likes_user_id`: 사용자별 좋아요 조회

---

## 12. Reply Likes 테이블

**역할**: 답글 좋아요 기록 저장

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY | 좋아요 고유 ID |
| `reply_id` | UUID | FK → replies(id), ON DELETE CASCADE, NOT NULL | 답글 ID |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE, NOT NULL | 좋아요한 사용자 ID |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW(), NOT NULL | 좋아요 시간 |

**제약조건**:
- `UNIQUE(reply_id, user_id)`: 한 사용자는 한 답글에 한 번만 좋아요 가능

**인덱스**:
- `idx_reply_likes_reply_id`: 답글별 좋아요 조회
- `idx_reply_likes_user_id`: 사용자별 좋아요 조회

---

## 📊 테이블 관계도 요약

```
users
├── missions1 (creator_id)
├── missions2 (creator_id)
├── pickresult1 (user_id)
├── pickresult2 (user_id)
├── pointlogs (user_id)
├── mypage (user_id)
├── comments (user_id)
├── replies (user_id)
├── comment_likes (user_id)
└── reply_likes (user_id)

missions1
├── pickresult1 (mission_id)
├── comments (mission_id, mission_type='mission1')
└── pointlogs (mission_id, mission_type='mission1')

missions2
├── episodes (mission_id)
├── pickresult2 (mission_id)
├── comments (mission_id, mission_type='mission2')
└── pointlogs (mission_id, mission_type='mission2')

comments
├── replies (comment_id)
└── comment_likes (comment_id)

replies
└── reply_likes (reply_id)
```

---

## 🔑 주요 특징

1. **테이블 분리**: missions1 (일반 미션)과 missions2 (커플 매칭) 완전 분리
2. **집계 데이터 캐싱**: 옵션별 투표 수, 커플별 예측 수 등 JSONB로 캐싱
3. **Soft Delete**: 댓글/답글은 is_deleted로 삭제 처리
4. **결과 저장**: 투표 기록에 정답 여부와 점수 함께 저장
5. **통계 캐싱**: mypage 테이블로 마이페이지 통계 성능 최적화
6. **좋아요 분리**: 댓글과 답글의 좋아요를 별도 테이블로 관리


