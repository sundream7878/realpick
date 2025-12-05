RealPick 프로젝트 계획 (v17) - 통합본

최종 업데이트: 2025-11-30 (주말 업무 통합: 포인트/티어 시스템 확정, 미션 카드 고도화, DB 스키마 변경, 리얼 캐스팅 구현)

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

미션 유형 및 포인트 보상 규칙

기능 설명

이진 투표 (Binary Vote)

정답/다수일치 시: +10P / 오답 시: 0P

예/아니오, 매너 있다/없다 등 2지선다. 참여 장벽 최소화.

다중 선택 (Multi Vote)

3지: +30P, 4지: +40P, 5지: +50P (정답 시) / 오답 시: 0P

3~5개 선택지 중 택 1. 입체적인 시청자 해석 수집.

커플 매칭 (Match Vote)

회차별 차등 점수 (±100P ~ ±30P)

남 ↔ 여 출연자 드래그 연결. 정답 시 +점수, 오답 시 -점수.

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

이진 투표: 승리 +10P / 패배 0P

다중 투표: 승리 +30~50P (선택지 개수에 비례) / 패배 0P

5.2. 커플 매칭 점수 규칙

계산: 정답 커플: +회차 점수 / 오답 커플: -회차 점수 / 미선택: 0P.

점수 범위: 음수까지 가능 (전략적 선택 유도).

회차별 점수표:

1회차: ±100P
2회차: ±90P
3회차: ±80P
4회차: ±70P
5회차: ±60P
6회차: ±50P
7회차: ±40P
8회차: ±30P (최소점)

5.3. 티어 시스템 (7단계)

오직 점수에 따라 결정됨.

캐릭터 이미지 파일: `public/images/tiers/` 내 위치.

티어명 및 기준 점수:

1. 픽마스터 (Pick Master): 5,000P 이상 (호랑이)
2. 인사이터 (Insighter): 3,000P 이상 (고양이)
3. 분석자 (Analyzer): 2,000P 이상 (늑대)
4. 예감러 (Predictor): 1,000P 이상 (시바견)
5. 촉쟁이 (Intuition): 500P 이상 (고양이)
6. 워처 (Watcher): 200P 이상 (토끼)
7. 루키 (Rookie): 0P (햄스터)

6. UI/UX 및 피드 시스템

디자인 방향: "가벼운 연애 감성 + 깔끔한 UI + 게임 같은 재미"

기술/디자인: 모바일 최적화 + PC 반응형, 다크 모드 지원.

컬러 아이덴티티: 로즈핑크 + 라일락.

홈 피드 구성: 인기 미션, 최신 미션, 마감 임박 미션, 시즌별 커플 매칭 바로가기.

미션 카드 정보:
- 썸네일 (유튜브 썸네일 or 프로그램 공식 포스터)
- 미션 제목
- 배지: 포인트 배지(New!), 유형 배지, 시즌 배지
- 마감시간 / 상태
- 참여자 수
- 딜러 정보 (닉네임 + 티어 캐릭터)

**[New] 데이터 폴백(Fallback) 시스템:**
- 딜러가 `referenceUrl`이나 `thumbnailUrl`을 입력하지 않은 경우:
  - `shows.ts`에 정의된 프로그램별 `officialUrl`로 자동 연결.
  - `shows.ts`에 정의된 프로그램별 `defaultThumbnail` (공식 포스터) 자동 표시.
  - 예: "나는 SOLO" 미션 -> `prismstudios.sbs.co.kr` 연결, `nasolo.jpg` 표시.

7. 코딩 네이밍 헌법 (VIBE_CODING_NAMING_RULES.md v2.0)

1. 기본 원칙

폴더 (Prefix p-, c- 등): '카테고리' 정의.

파일 (Suffix .hook.ts 등): 혼란을 유발하는 특정 파일의 '역할' 정의.

DB/코드 (Prefix t_, f_, T 등): 데이터와 코드의 '타입' 정의.

2. 폴더/파일 명명 (접두사/접미사)

분류 | 접두사/접미사 | 설명 | 예시
---|---|---|---
페이지 | P- | Next.js/React 페이지 라우팅 폴더 | src/app/p-profile/page.tsx
API | A- | API 엔드포인트 라우팅 폴더 | src/app/api/a-users/route.ts
컴포넌트 | C- | UI 컴포넌트 | src/components/c-button/Button.tsx
훅 | H- | React 커스텀 훅 (.hook.ts) | src/hooks/h-auth/useAuth.hook.ts
스토어 | S- | 전역 상태 관리 스토어 (.store.ts) | src/stores/s-user/user.store.ts
유틸 | U- | 유틸리티 함수 (.util.ts) | src/utils/u-date/formatDate.util.ts
타입 | T- | TypeScript 타입 정의 (.types.ts) | src/types/t-types/user.types.ts

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

8. 결과 (Result) 시스템

표시 정보: 옵션별 비율(막대 차트), 내가 선택한 옵션 강조, 성공/실패 배지, 매칭 회차 점수 계산, 랜덤 코멘트.

공개 정책:
- 실시간 공개: 투표 직후 즉시 비율 확인 (Binary/Multi).
- 마감 후 공개: 마감될 때까지 비공개 (Match Vote 정답).

9. AI (AI Assistant) 기능

미션 생성 시 내용 중복/부적절 등 유효성 검증 기능.

9.1. Real Casting (참여자/방청 모집)
- **개요**: 방송국 협력 및 유저 참여 확대를 위한 오디션/방청 정보 허브.
- **슬로건**: "다음 주인공은 바로 당신입니다."
- **데이터**: DB 없이 `lib/constants/recruits.ts`에서 상수로 관리.
- **기능**: 유형 구분(Cast/Audience), 정렬(마감임박순), 필터(장르/프로그램).
- **UI/UX**: 티켓/초대장 메타포 카드 디자인, 공식 포스터 연동.

10. 데이터 아키텍처 (Supabase & RLS)

DB 엔진: PostgreSQL (Supabase 활용).

스키마 (총 12개 테이블):
t_users, t_missions1, t_missions2, t_episodes, t_pickresult1, t_pickresult2, t_pointlogs, t_mypage, t_comments, t_replies, t_comment_likes, t_reply_likes.

**[2025-11-30 업데이트] t_missions1, t_missions2 테이블 추가 컬럼:**
- `f_show_id` (varchar): 프로그램 ID (예: `nasolo`) - `shows.ts`와 매칭용.
- `f_category` (varchar): 프로그램 카테고리 (예: `LOVE`).

t_users 테이블 주요 변경사항:
- f_tier: 티어명 변경 완료.
- f_age_range, f_gender: 추가 정보 컬럼.

Row Level Security (RLS) 정책:
- Soft Wall 반영: SELECT 허용, INSERT/UPDATE 인증 필수.
- 개인 데이터 보호: 본인 데이터만 수정 가능.

11. 주요 코드 구조 및 모듈 (Refactoring)

유틸리티/타입 리팩토링:
- `lib/utils/u-points/pointSystem.util.ts`: 포인트 계산 로직 중앙화.
- `lib/constants/shows.ts`: 프로그램 정보(URL, 썸네일 등) 관리.

데이터 접근 모듈:
- `lib/supabase/missions.ts`: 미션 생성/조회 (show_id 매핑 로직 포함).

인증 관련 모듈:
- Magic Link 인증 로직 적용 완료.

12. 리얼PICK 협업 헌법 (PROJECT_CONSTITUTION.md v1.0)

1. 핵심 원칙 및 호칭 정의
- 개발직원 (Developer): 최종 결정권자, 실행자.
- 재미나이 (Gemini PM): 기획/Plan 관리자.
- 커서agent (Cursor Agent): 코드 작성자.

2. 커서agent 헌법 (5대 원칙)
- 기능 동결, 모바일 퍼스트, 선 계획 후 작업, 보고 의무, Git 커밋 보고.

3. 재미나이 헌법
- Plan.md 수정 절차 준수.

4. 개발직원 헌법
- 수동 실행 (Human-in-the-Loop).

13. 배포 및 환경 설정

Supabase 설정:
- Redirect URLs: `/auth/callback` 등록.
- Email Templates: Magic Link 템플릿 수정.
- 환경 변수: SUPABASE_URL, ANON_KEY, SITE_URL 설정.
