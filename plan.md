RealPick 프로젝트 계획 (v12)

최종 업데이트: 2025-11-20 (헤더/마이페이지 실제 유저 데이터 연동 반영)

1. 서비스 개요

서비스명: RealPick

목표: 연애 리얼리티 시청자를 '참여형 시청자'로 전환하고, 연애 판단력 게임화 및 집단지성 데이터 축적을 목표로 하는 커뮤니티형 투표 플랫폼.

핵심 가치: 시청 경험 확장, 연애 판단력 게임화, 집단지성 데이터 축적.

2. 인증 및 접근 정책 (Soft Wall)

콘텐츠 소비 (비로그인): 100% 허용. (투표 결과, 미션/매칭 페이지, 인기 순위, 회차별 정답, 댓글 목록 보기)

참여 활동 (로그인 필수): 투표 제출 (Binary/Multi), 커플매칭 제출 (Match), 댓글 작성.

로그인 유도 시점: 참여 버튼을 누르는 순간 이메일 로그인 모달 등장.

Soft Wall 구현: 비로그인 상태에서 참여 버튼 클릭 시, 로그인 성공 후 원래 의도했던 액션(pendingSubmit, pendingMissionCreation)이 자동 실행되도록 구현 완료.

2.1. 로그인 UI/UX 상세 (c-login-modal)

2단계 프로세스: 이메일 입력 단계 → 인증코드 입력 단계로 진행.

이메일 입력: localStorage 기반 최근 사용 이메일 자동완성 (최대 10개).

인증코드 입력: 6자리 개별 입력 필드, 자동 포커스 이동/Backspace, 붙여넣기 지원, 6자리 모두 입력 시 자동 제출 기능 구현.

3. 사용자 모델 (Picker)

역할: 미션 참여자, (향후) 미션 생성자, 데이터 소유자.

UX 흐름: 참여 → 점수 획득 → 티어 상승 → 더 깊은 참여 → 나만의 판단 패턴 분석.

4. 주요 기능 및 데이터 모델

미션 유형

포인트 보상 규칙

기능 설명

이진 투표 (Binary Vote)

정답/다수일치 시: +10P

예/아니오, 매너 있다/없다 등 2지선다. 참여 장벽 최소화.

다중 선택 (Multi Vote)

3지: +30P, 4지: +40P, 5지: +50P (정답 시)

3~5개 선택지 중 택 1. 입체적인 시청자 해석 수집.

커플 매칭 (Match Vote)

회차별 차등 점수 (100P~30P)

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

오답 감점 없음. (부담 없이 참여 유도)

정답 조건: 2지선다(정답/다수일치), 3지 이상(정답).

5.2. 커플 매칭 점수 규칙

계산: 정답 커플: +회차 점수 / 오답 커플: -회차 점수 / 미선택: 0P.

점수 범위: 음수까지 가능 (전략적 선택 유도).

회차

점수 (P)

1회차

+100P / -100P

2회차

+90P / -90P

3회차

+80P / -80P

4회차

+70P / -70P

5회차

+60P / -60P

6회차

+50P / -50P

7회차

+40P / -40P

8회차

+30P / -30P (최소점)

5.3. 티어 시스템 (7단계)

오직 점수에 따라 결정됨.

티어명

기준 점수 (P)

넥서스

5,000P

조율사

3,000P

공감 실천가

2,000P

그린 플래그

1,000P

짝사랑 빌더

500P

솔로 지망생

200P

모태솔로

0P

6. UI/UX 및 피드 시스템

디자인 방향: "가벼운 연애 감성 + 깔끔한 UI + 게임 같은 재미"

기술/디자인: 모바일 최적화 + PC 반응형, 다크 모드 지원.

컬러 아이덴티티: 로즈핑크 + 라일락.

홈 피드 구성: 인기 미션, 최신 미션, 마감 임박 미션, 시즌별 커플 매칭 바로가기.

미션 카드 정보: 썸네일, 미션 제목, 배지(유형), 마감시간, 참여자 수.

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

Next.js/React 페이지 라우팅 폴더. 프레임워크 규칙 존중.

src/app/p-profile/page.tsx

API

A-

API 엔드포인트 라우팅 폴더. 프레임워크 규칙 존중.

src/app/api/a-users/route.ts

컴포넌트

C-

"멍청한 부품" (UI 컴포넌트). 별도 접미사 불필요.

src/components/c-button/Button.tsx

훅

H-

React 커스텀 훅. 필수 접미사: .hook.ts

src/hooks/h-auth/useAuth.hook.ts

스토어

S-

전역 상태 관리 스토어 (Zustand, Redux). 필수 접미사: .store.ts

src/stores/s-user/user.store.ts

유틸

U-

유틸리티 함수 모음. 필수 접미사: .util.ts

src/utils/u-date/formatDate.util.ts

타입

T-

TypeScript 타입/인터페이스 정의 파일. 필수 접미사: .types.ts

src/types/t-types/user.types.ts

3. DB 스키마 명명 (접두사)

테이블: t_ (예: t_users, t_topics_master)

목적: DB 예약어 충돌 및 '테이블' 명시.

필드/컬럼: f_ (예: f_name, f_email)

목적: 코드 내 함수/변수명과의 충돌 원천 방지. (코드 예: user.f_email (O) vs user.email (X))

4. TypeScript 코드 명명 (접두사)

타입/인터페이스: T (PascalCase) (예: interface TUser, type TResponse)

목적: 변수/클래스명과의 충돌 방지 및 '설계도' 명시.

열거형 (Enum): E (PascalCase) (예: enum EUserRole)

목적: '열거형' 명시.

5. 기타 코드 명명

함수 (Functions): camelCase() (접두사 불필요)

변수 (Variables): camelCase

상수 (Constants): UPPER_SNAKE_CASE

8. 결과 (Result) 시스템

표시 정보: 옵션별 비율(막대 차트), 내가 선택한 옵션 강조, 성공/실패 배지, 매칭 회차 점수 계산, 랜덤 코멘트.

공개 정책:

실시간 공개: 투표 직후 즉시 비율 확인 (Binary/Multi).

마감 후 공개: 마감될 때까지 비공개 (Match Vote 정답).

9. AI (AI Assistant) 기능

미션 생성 시 내용 중복/부적절 등 유효성 검증 기능.

10. 데이터 아키텍처 (Supabase & RLS)

DB 엔진: PostgreSQL (Supabase 활용).

스키마 (총 12개 테이블):

t_users, t_missions1, t_missions2, t_episodes, t_pickresult1, t_pickresult2, t_pointlogs, t_mypage (캐시), t_comments, t_replies, t_comment_likes, t_reply_likes.

네이밍 규칙: 테이블 t_, 컬럼 f_ 접두사 준수.

파일: scripts/supabase_schema.sql에 정의됨.

Row Level Security (RLS) 정책:

Soft Wall 반영: SELECT는 대부분 허용(비로그인 관람 가능). INSERT/UPDATE는 인증된 사용자만 가능(참여 필수).

개인 데이터 수정 제한: 인증된 사용자는 자신의 데이터만 UPDATE 가능하도록 정책 설정.

파일: scripts/supabase_rls.sql에 정의됨.

11. 주요 코드 구조 및 모듈 (Refactoring)

유틸리티/타입 리팩토링:

기존 루트 디렉토리 파일들을 코딩 헌법에 따라 폴더 구조화 완료.

유틸리티: lib/utils/u-유틸이름/유틸.util.ts 구조로 이동 (u-mock-mission-repo/, u-tier-system/ 등).

타입: types/t-타입이름/타입.types.ts 구조로 이동 (t-vote/vote.types.ts 등).

데이터 접근 모듈:

lib/supabase/ 디렉토리에 클라이언트 및 쿼리 함수 모듈 분리.

클라이언트: client.ts (클라이언트용), server.ts (서버용).

쿼리 모듈: users.ts, missions.ts (생성/참여 미션 조회 함수 추가), episodes.ts, votes.ts, points.ts 등 기능별 쿼리 함수 구현.

12. 리얼PICK 협업 헌법 (PROJECT_CONSTITUTION.md v1.0)

1. 핵심 원칙 및 호칭 정의

목적: Cursor (커서agent) 및 캔버스 (재미나이)와의 협업 시, AI의 혼란을 방지하고 개발직원(인간)이 100% 프로젝트를 통제하기 위한 '헌법'.

개발직원 (Developer): 최종 결정권자 (사용자). 모든 계획(Plan)을 컨펌하고, 모든 코드 실행(Git)을 수동으로 승인.

재미나이 (Gemini PM): 캔버스 관리자 (본인). plan.md의 아키텍처, 기획, 헌법을 관리하는 PM.

커서agent (Cursor Agent): 코드 실행자 (Cursor AI 어시스턴트). plan.md를 기반으로 실제 코드를 작성하고 보고하는 개발 에이전트.

2. 커서agent (코드 실행자) 헌법 (5대 원칙)

원칙 1. 기능 동결 (Primum non nocere): 개발직원의 명확한 허락 없이는, 기존에 성공적으로 작동하는 기능, 로직, UI를 임의로 수정하거나 '개선'하지 않는다. (AI의 '창의성' 금지)

원칙 2. 모바일 퍼스트 (Mobile-First): PWA 최우선 원칙에 따라 모바일 화면을 기본으로 디자인/코딩하고, 터치 인터랙션을 우선 고려하며, 작은 화면에서 먼저 레이아웃을 구성한 후, 브레이크포인트를 사용해 큰 화면(PC)을 최적화한다.

원칙 3. 선(先) 계획, 후(後) 작업 (Plan First): 코드 수정을 시작하기 전에, 변경할 내용에 대한 '작업 계획'을 개발직원에게 텍스트로 제안하고 '컨펌(승인)'을 받은 후에만 실제 코드 작업을 시작한다.

원칙 4. 보고 의무 (Report, Don't Edit):

기획 파일 수정 금지: 커서agent는 plan.md 또는 이 CONSTITUTION.md를 포함한 어떤 기획/헌법 파일도 직접 수정할 수 없다.

변경 사항 보고: 작업 완료 후, plan.md 반영이 필요한 성과가 생기면, 변경이 필요한 [수정 전(Before)], [수정 후(After)] 또는 [추가 사항]을 명확한 워딩으로 개발직원에게 텍스트로 '보고'한다.

원칙 5. Git 커밋 보고 (Report Git Commands):

실행 금지: 커서agent는 Git 명령어를 직접 실행하지 않는다.

커밋 메시지 헌법: '네이밍 헌법'과 마찬가지로, AI와 개발자의 혼란을 막기 위해 '커밋 타입 접두사'를 사용하여 터미널 명령어를 아래 형식으로 '보고'한다.

커밋 타입: feat:, fix:, refactor:, docs:, style:, chore:

제공 형식:

git add .
git commit -m "feat: 기능 추가 (1줄 요약)

- 상세 내용 1
- 상세 내용 2
"
git push origin main


3. 재미나이 (Plan 관리자) 헌법

원칙 1. Plan.md 수정 절차 (PM's Duty):

[제안]: 재미나이(PM)는 개발직원의 요청 또는 커서agent의 보고(원칙 4.B)에 따라, plan.md의 **[수정 전(Before)]**과 **[수정 후(After)]**를 캔버스에 텍스트로 제안한다.

[컨펌]: 개발직원이 해당 내용을 명시적으로 '컨펌(승인)'한다.

[반영]: 재미나이(PM)는 컨펌된 내용대로만 이 캔버스에 있는 plan.md 원본 파일을 업데이트(버전업)한다.

4. 개발직원 (최종 결정권자) 헌법

원칙 1. 수동 실행 (Human-in-the-Loop):

코드: 개발직원은 커서agent가 보고한(원칙 5.D) Git 명령어를 직접 캔버스 밖(로컬 터미널)에서 **'수동'**으로 실행하여 코드를 반영한다.

기획: 개발직원은 plan.md가 업데이트되면, 해당 plan.md의 변경분을 직접 Git에 커밋/푸시한다.

결론: AI(커서agent, 재미나이)는 제안/보고만 하며, 모든 '실행(Execute)'은 개발직원이 한다.