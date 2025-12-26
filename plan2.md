RealPick 프로젝트 계획 (v21) - 최종 확정본

최종 업데이트: 2025-01-16 (코드 분석 반영 및 스키마 구조 정리)

1. 서비스 개요

서비스명: RealPick

목표: 로맨스, 서바이벌, 오디션 예능 프로그램 시청자를 '참여형 시청자'로 전환하고, 예측 판단력 게임화 및 집단지성 데이터 축적을 목표로 하는 커뮤니티형 투표 플랫폼.

핵심 가치: 시청 경험 확장, 예측 판단력 게임화, 집단지성 데이터 축적.

2. 인증 및 접근 정책 (Soft Wall)

콘텐츠 소비 (비로그인): 100% 허용. (투표 결과, 미션/매칭 페이지, 인기 순위, 회차별 정답, 댓글 목록 보기)

참여 활동 (로그인 필수): 투표 제출 (Binary/Multi), 커플매칭 제출 (Match), 댓글 작성.

로그인 유도 시점: 참여 버튼을 누르는 순간 이메일 로그인 모달 등장.

Soft Wall 구현: 비로그인 상태에서 참여 버튼 클릭 시, 로그인 성공 후 원래 의도했던 액션(pendingSubmit, pendingMissionCreation)이 자동 실행되도록 구현 완료.

2.1. 로그인 UI/UX 상세 (c-login-modal)

Magic Link 인증 방식: 이메일 입력 → 이메일로 전송된 링크 클릭 → 자동 로그인.

이메일 입력: localStorage 기반 최근 사용 이메일 자동완성 (최대 10개).

추가 정보 입력 (신규 가입자 필수):

나이대: 10대, 20대, 30대, 40대, 50대, 60대, 70대, 80대, 90대 (드롭다운)

성별: 남성, 여성 (라디오 버튼)

Magic Link 인증 직후 자동으로 추가 정보 입력 페이지 (/auth/setup)로 리다이렉트.

기존 사용자 중 나이대/성별 정보가 없는 경우에도 추가 정보 입력 필수.

Magic Link 콜백 처리:

콜백 URL: /auth/callback

Supabase 리다이렉트 URL 설정 필요 (로컬: http://localhost:3000/auth/callback, 배포: https://your-site.netlify.app/auth/callback)

3. 사용자 모델 (Picker)

역할: 미션 참여자, (향후) 미션 생성자, 데이터 소유자.

사용자 정보 (t_users 테이블):

기본 정보: 이메일, 닉네임, 아바타, 포인트, 티어

추가 정보 (2025-11-28 추가):

f_age_range: 나이대 (10대~90대, VARCHAR(20), NULL 허용, CHECK 제약)

f_gender: 성별 (남성/여성, VARCHAR(20), NULL 허용, CHECK 제약)

신규 가입자는 Magic Link 인증 직후 필수 입력

기존 사용자는 다음 로그인 시 추가 정보 입력 유도

UX 흐름: 참여 → 점수 획득 → 티어 상승 → 더 깊은 참여 → 나만의 판단 패턴 분석.

4. 주요 기능 및 데이터 모델

미션 유형

포인트 보상 규칙

기능 설명

공감 픽 (Poll/Majority)

참여 보상: +10P (오답 개념 없음)

시청자의 선호, 주관, 트렌드를 묻는 투표. 참여 장벽 최소화.

예측 픽 (Predict - Binary)

정답 +100P / 오답 -50P

2지선다 (예/아니오) 방식의 결과 예측 미션.

예측 픽 (Predict - Multi/Text)

정답당 +100P / 오답당 -50P

3지 이상 선택 또는 주관식 입력 방식의 결과 예측 미션.

커플 매칭 (Match Vote)

회차별 차등 점수 (±1000P ~ ±150P)

남 ↔ 여 출연자 드래그 연결. 역주행 채점 로직 적용.

4.2. 커플 매칭 UX 상세

메커니즘: 드래그 앤 드롭 연결, 자동 저장 (300ms 디바운스).

특징: 회차별로 다른 커플 조합 저장 가능.

제출: 제출 시 해당 회차 '픽 잠금(lock)'.

정보 제공: 전체 유저 픽 통계 모달 제공.

4.3. 회차 선택 시스템

기능: 단일 회차 예상 보기, 멀티 회차별 예상 비교.

아이콘: 도토리 아이콘 사용 (시즌 아이덴티티).

상태값:

open: 지금 투표 가능

settled: 이미 결과 반영, 조회만 가능

locked: 방송 전, 투표 불가

5. 포인트 및 티어 시스템

5.1. 일반 미션 점수 정책

공감 픽 (Poll/Majority): 참여 보상 +10P. (오답 및 감점 개념 없음)

예측 픽 (Predict):

단일 선택 (Binary): 정답 +100P / 오답 -50P

다중 선택 (Multi): 정답당 +100P / 오답당 -50P

주관식 (Text): 정답당 +100P / 오답당 -50P

5.2. 커플 매칭 점수 규칙 (역주행 채점)

계산: 최종 매칭 결과가 확정되었을 때, 정답을 맞힌 픽 중 (픽이 오답으로 바뀌지 않고 최종까지 유지된 픽 중에서) 가장 빠른 회차의 포인트만 1회 지급/감점합니다.

적중 (지급): 최종 정답을 맞힌 픽에 대해, 해당 픽이 정답 상태를 유지하기 시작한 최초 회차의 포인트 1회 지급.

오답 (감점): 최종 매칭 결과가 오답인 픽에 대해, 해당 픽이 오답 상태를 유지하기 시작한 최초 회차의 감점 포인트 1회 적용.

미선택: 점수 없음 (0P).

점수 범위: 음수까지 가능 (초기 픽의 중요성 및 전략적 선택 유도).

회차별 점수표 (비대칭 설계):

회차

적중 포인트 (단일 지급)

오답 포인트 (단일 감점)

1회차

+1000P

-500P

2회차

+900P

-450P

3회차

+800P

-400P

4회차

+700P

-350P

5회차

+600P

-300P

6회차

+500P

-250P

7회차

+400P

-200P

8회차

+300P

-150P (최소점)

비대칭 이유: 정답 유지는 큰 보상, 오답 고집은 상대적으로 작은 감점 (참여 유도).

[2025-12-05 업데이트] 커플 매칭 집계 로직 상세 (역주행 채점 방식)

핵심 개념: 연속성 (Streak)
   - 단순히 마지막 선택의 정답 여부가 아니라, 마지막 결과가 몇 회차부터 계속 이어져 왔는지를 기준으로 점수를 산정함.
   - 소신파 우대: 일찍부터 정답을 알아보고 유지한 유저에게 고득점 부여.
   - 고집 불통 징벌: 일찍부터 오답을 고집한 유저에게 큰 감점 부여.

채점 알고리즘 (Calculate Match Vote Points)
   - 방향: 8회차(마지막) → 1회차(처음) 순으로 역순 검사.
   - Case A: 최종 정답 (Final Correct Pick)
     - 8회차부터 거슬러 올라가며, 언제부터 계속 정답을 유지했는지 확인.
     - 예: 3회차부터 8회차까지 정답 유지 → 3회차 점수(+800P) 획득.
   - Case B: 최종 오답 (Final Incorrect Pick)
     - 8회차부터 거슬러 올라가며, 언제부터 계속 오답을 유지했는지 확인.
     - 예: 2회차부터 8회차까지 오답 유지 → 2회차 감점(-450P) 적용.

데이터 구조 (t_pickresult2)
   - 통합 저장: 유저당 1개의 레코드에 모든 회차 투표 기록을 f_votes (JSONB) 컬럼으로 저장.
   - 구조: {"1": {"connections": [...], "submitted_at": "..."}, "2": {"connections": [...], "submitted_at": "..."}, ...}
   - 이유: 한 번의 조회로 유저의 모든 투표 히스토리를 파악하여 고속 채점 가능.
   - 제약조건: UNIQUE(f_user_id, f_mission_id) - 한 사용자는 한 미션에 하나의 레코드만 가짐.
   - 주의: 기존 회차별 row 구조(f_episode_no)에서 통합 구조로 마이그레이션 필요 (scripts/update_schema_v2.sql 참고).

5.3. 티어 시스템 (7단계)

오직 점수에 따라 결정됨.

캐릭터 이미지 파일: public/images/tiers/ 내 위치.

티어명

기준 점수 (P)

캐릭터

픽마스터 (Pick Master)

100,000P 이상

호랑이

인사이터 (Insighter)

70,000P 이상

고양이

분석자 (Analyzer)

35,000P 이상

늑대

예감러 (Predictor)

20,000P 이상

시바견

촉쟁이 (Intuition)

10,000P 이상

고양이

워처 (Watcher)

5,000P 이상

토끼

루키 (Rookie)

0P

햄스터

티어 인플레이션 배경:

커플 매칭 1회 정답 시 최대 +1000P 획득 가능

여러 미션 참여 시 빠른 티어 상승으로 성취감 강화

장기 플레이어 보상 강화 (100,000P = 약 100회 이상 성공적 참여)

6. UI/UX 및 피드 시스템

디자인 방향: "가벼운 연애 감성 + 깔끔한 UI + 게임 같은 재미"

기술/디자인: 모바일 최적화 + PC 반응형, 다크 모드 지원.

컬러 아이덴티티: 로즈핑크 + 라일락.

홈 피드 구성: 인기 미션, 최신 미션, 마감 임박 미션, 시즌별 커플 매칭 바로가기.

미션 카드 정보:

썸네일 (유튜브 썸네일 or 프로그램 공식 포스터)

미션 제목

배지: 포인트 배지 (New!), 유형 배지, 시즌 배지

마감시간 / 상태

참여자 수

딜러 정보 (닉네임 + 티어 캐릭터)

[New] 데이터 폴백(Fallback) 시스템:

딜러가 referenceUrl이나 thumbnailUrl을 입력하지 않은 경우:

lib/constants/shows.ts에 정의된 프로그램별 officialUrl로 자동 연결.

lib/constants/shows.ts에 정의된 프로그램별 defaultThumbnail (공식 포스터) 자동 표시.

예: "나는 SOLO" 미션 -> prismstudios.sbs.co.kr 연결, nasolo.jpg 표시.

7. 코딩 네이밍 헌법 (VIBE_CODING_NAMING_RULES.md v2.0)

1. 기본 원칙

폴더 (Prefix p-, c- 등): '카테고리' 정의.

파일 (Suffix .hook.ts 등): 혼란을 유발하는 특정 파일의 '역할' 정의.

DB/코드 (Prefix t_, f_, T 등): 데이터와 코드의 '타입' 정의.

2. 폴더/파일 명명 (접두사/접미사)

분류

접두사/접미사

설명

예시

페이지

P-

Next.js/React 페이지 라우팅 폴더

src/app/p-profile/page.tsx

API

A-

API 엔드포인트 라우팅 폴더

src/app/api/a-users/route.ts

컴포넌트

C-

UI 컴포넌트

src/components/c-button/Button.tsx

훅

H-

React 커스텀 훅 (.hook.ts)

src/hooks/h-auth/useAuth.hook.ts

스토어

S-

전역 상태 관리 스토어 (.store.ts)

src/stores/s-user/user.store.ts

유틸

U-

유틸리티 함수 (.util.ts)

src/utils/u-date/formatDate.util.ts

타입

T-

TypeScript 타입 정의 (.types.ts)

src/types/t-types/user.types.ts

3. DB 스키마 명명 (접두사)

테이블: t_ (예: t_users, t_missions1)

필드/컬럼: f_ (예: f_name, f_show_id)

4. TypeScript 코드 명명 (접두사)

타입/인터페이스: T (PascalCase) (예: interface TUser)

열거형 (Enum): E (PascalCase) (예: enum EUserRole)

5. 기타 코드 명명

함수: camelCase()

변수: camelCase

상수: UPPER_SNAKE_CASE

**참고**: 상세한 네이밍 헌법은 `NAMING_CONVENTION.md` 파일 참고.

---

8. 결과 (Result) 시스템

표시 정보: 옵션별 비율(막대 차트), 내가 선택한 옵션 강조, 성공/실패 배지, 매칭 회차 점수 계산, 랜덤 코멘트.

공개 정책:

실시간 공개: 투표 직후 즉시 비율 확인 (Binary/Multi).

마감 후 공개: 마감될 때까지 비공개 (Match Vote 정답).

9. AI (AI Assistant) 기능

미션 생성 시 내용 중복/부적절 등 유효성 검증 기능.

9.1. Real Casting (참여자/방청 모집)

개요: 방송국 협력 및 유저 참여 확대를 위한 오디션/방청 정보 허브.

슬로건: "다음 주인공은 바로 당신입니다."

데이터: DB 없이 lib/constants/recruits.ts에서 상수로 관리.

기능: 유형 구분(Cast/Audience), 정렬(마감임박순), 필터(장르/프로그램).

UI/UX: 티켓/초대장 메타포 카드 디자인, 공식 포스터 연동.

10. 데이터 아키텍처 (Supabase & RLS)

DB 엔진: PostgreSQL (Supabase 활용).

스키마 (총 12개 테이블):

1. **t_users**: 사용자 정보 (f_age_range, f_gender 포함)
2. **t_missions1**: Binary/Multi 미션 (f_show_id, f_category 포함)
3. **t_missions2**: 커플 매칭 미션 (f_show_id, f_category 포함)
4. **t_episodes**: Missions2 회차 상태 및 집계
5. **t_pickresult1**: Binary/Multi 투표 기록
6. **t_pickresult2**: 커플 매칭 투표 기록 (f_votes JSONB 통합 구조)
7. **t_pointlogs**: 포인트 변경 이력
8. **t_mypage**: 마이페이지 통계 (캐시용)
9. **t_comments**: 댓글
10. **t_replies**: 답글
11. **t_comment_likes**: 댓글 좋아요
12. **t_reply_likes**: 답글 좋아요

**주요 컬럼 정보:**

t_missions1, t_missions2:
- f_show_id (TEXT): 프로그램 ID (예: nasolo) - lib/constants/shows.ts와 매칭용
- f_category (TEXT): 프로그램 카테고리 (예: LOVE, VICTORY, STAR)
- 마이그레이션: scripts/12_add_show_and_category.sql

t_users:
- f_tier (VARCHAR(20)): 티어명 (루키, 워처, 촉쟁이, 예감러, 분석자, 인사이터, 픽마스터)
- f_age_range (VARCHAR(20)): 나이대 (10대~90대, NULL 허용)
- f_gender (VARCHAR(20)): 성별 (남성/여성, NULL 허용)
- 마이그레이션: scripts/07_add_user_age_gender.sql, scripts/08_update_tier_names.sql

t_pickresult2:
- f_votes (JSONB): 모든 회차 투표 기록 통합 저장
- 구조: {"1": {"connections": [...], "submitted_at": "..."}, "2": {...}, ...}
- 마이그레이션: scripts/update_schema_v2.sql (회차별 row → 통합 구조)

Row Level Security (RLS) 정책:

Soft Wall 반영: SELECT 허용, INSERT/UPDATE 인증 필수.

개인 데이터 보호: 본인 데이터만 수정 가능.

11. 주요 코드 구조 및 모듈 (헌법 준수)

**폴더 구조 (네이밍 헌법 준수):**

- `app/p-*`: 페이지 라우팅 (예: p-profile, p-mypage, p-missions)
- `app/api/a-*`: API 엔드포인트 (예: a-missions, a-users)
- `components/c-*`: UI 컴포넌트 (예: c-mission, c-vote, c-login-modal)
- `hooks/h-*`: React 커스텀 훅 (예: h-mission, h-toast)
- `lib/utils/u-*`: 유틸리티 함수 (예: u-points, u-tier-system, u-vote)
- `types/t-*`: TypeScript 타입 정의 (예: t-vote, t-mission, t-tier)
- `lib/supabase/`: Supabase 데이터 접근 모듈

**주요 모듈:**

유틸리티/타입:
- `lib/utils/u-points/pointSystem.util.ts`: 포인트 계산 로직 중앙화
- `lib/utils/u-tier-system/tierSystem.util.ts`: 티어 시스템 로직 중앙화
- `lib/utils/u-points/matchPointSystem.util.ts`: 커플 매칭 포인트 계산 (역주행 채점)
- `lib/constants/shows.ts`: 프로그램 정보(URL, 썸네일 등) 관리

데이터 접근 모듈:
- `lib/supabase/missions.ts`: 미션 생성/조회 (f_show_id, f_category 매핑 로직 포함)
- `lib/supabase/votes.ts`: 투표 제출/조회 (t_pickresult2 f_votes JSONB 처리)
- `lib/supabase/users.ts`: 사용자 정보 관리 (f_age_range, f_gender 포함)
- `lib/supabase/points.ts`: 포인트 변경 이력 관리

인증 관련 모듈:
- `lib/auth-api.ts`: Magic Link 인증 로직
- `app/auth/callback`: Magic Link 콜백 처리
- `app/auth/setup`: 추가 정보 입력 페이지

**파일 명명 규칙 (헌법 준수):**
- 훅: `.hook.ts` 접미사 (예: useMission.hook.ts)
- 유틸: `.util.ts` 접미사 (예: pointSystem.util.ts)
- 타입: `.types.ts` 접미사 (예: vote.types.ts)
- 스토어: `.store.ts` 접미사 (현재 미사용)

12. 리얼PICK 협업 헌법 (PROJECT_CONSTITUTION.md v1.0)

1. 핵심 원칙 및 호칭 정의

개발직원 (Developer): 최종 결정권자, 실행자.

재미나이 (Gemini PM): 기획/Plan 관리자.

커서agent (Cursor Agent): 코드 작성자.

2. 커서agent 헌법 (5대 원칙)

기능 동결, 모바일 퍼스트, 선 계획 후 작업, 보고 의무, Git 커밋 보고.

3. 재미나이 헌법

Plan.md 수정 절차 준수.

4. 개발직원 헌법

수동 실행 (Human-in-the-Loop).

13. 배포 및 환경 설정

**Supabase 설정:**

- Redirect URLs: `/auth/callback` 등록 (로컬: http://localhost:3000/auth/callback, 배포: https://your-site.netlify.app/auth/callback)
- Email Templates: Magic Link 템플릿 수정
- 환경 변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SITE_URL` 설정

**데이터베이스 마이그레이션 순서:**

신규 DB 구축 시 다음 순서로 스크립트 실행:

1. `scripts/supabase_schema.sql`: 기본 스키마 생성
2. `scripts/07_add_user_age_gender.sql`: 사용자 추가 정보 컬럼
3. `scripts/08_update_tier_names.sql`: 티어명 변경 및 포인트 기준 업데이트 (⚠️ 포인트 기준 수정 필요)
4. `scripts/12_add_show_and_category.sql`: 미션 테이블에 프로그램 정보 컬럼
5. `scripts/update_schema_v2.sql`: t_pickresult2 구조 변경 (회차별 row → f_votes JSONB)

**주의사항:**

- `scripts/08_update_tier_names.sql`의 트리거 함수는 plan2.md의 티어 포인트 기준(100,000P, 70,000P 등)으로 수정 필요
- 기존 DB의 경우 마이그레이션 스크립트를 순서대로 실행하여 스키마 동기화 필요
- `scripts/supabase_schema.sql`은 구 버전이므로, 마이그레이션 후 최신 구조로 업데이트 권장

14. 코드 품질 및 헌법 준수

**네이밍 헌법 준수 상태:**

✅ 테이블: `t_` 접두사 일관성 있게 사용
✅ 컬럼: `f_` 접두사 일관성 있게 사용
✅ 폴더: `p-`, `c-`, `h-`, `u-`, `t-` 접두사로 역할 명확화
✅ TypeScript 타입: `T` 접두사 사용
✅ 파일 접미사: `.hook.ts`, `.util.ts`, `.types.ts` 규칙 준수

**검증 도구:**

- `scripts/check-naming-convention.ts`: 네이밍 헌법 준수 여부 자동 검증
- 실행: `npm run check:naming`