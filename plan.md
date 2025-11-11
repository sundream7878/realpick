# RealPick 프로젝트 계획서

## 프로젝트 개요
RealPick은 리얼리티 쇼 시청자들이 커플 매칭, 투표 등 다양한 예측 미션에 참여할 수 있는 인터랙티브 플랫폼입니다.

## 현재 구현된 기능

### 1. 미션 시스템
- **이진 투표 (Binary Vote)**: 예/아니오 형식의 투표
- **다중 선택 투표 (Multi Vote)**: 여러 옵션 중 선택
- **커플 매칭 (Match Vote)**: 드래그 앤 드롭으로 커플 매칭 예측

### 2. 커플 매칭 기능
- 드래그 앤 드롭 인터페이스로 남성-여성 매칭
- 여러 회차 동시 선택 및 픽 가능
- 자동 저장 기능 (300ms 디바운스)
- 회차별 매칭 결과 저장 및 불러오기
- 실시간 픽 결과 모달 (누적 결과 확인)

### 3. 회차 선택 시스템
- 개별 회차 선택
- 여러 회차 동시 선택 (멀티 셀렉트)
- 커스텀 도토리 아이콘 (1-10회차)
- 회차별 제출 상태 표시

### 4. UI/UX
- 반응형 디자인
- 다크 모드 지원
- 로즈 핑크 & 라일락 컬러 테마
- 애니메이션 효과 (드래그, 제출 완료 등)

## 최근 수정 사항

### 완료된 작업
1. ✅ 커플 매칭 픽하기 버튼 클릭 시 초기화 버그 수정
2. ✅ 2회차 임시 데이터 추가 (영수-정숙, 영호-영순, 광수-순자)
3. ✅ 제출 완료 시 성공 표시 추가 (녹색 체크마크 + 메시지)
4. ✅ 여러 회차 선택 시 커스텀 도토리 아이콘 적용
5. ✅ 미션 카드 버튼 위치 정렬 (flexbox 레이아웃)

## 알려진 이슈

### 해결된 이슈
- ~~커플 매칭 후 픽하기 버튼 클릭 시 연결이 초기화되는 문제~~
- ~~2회차 데이터 부재로 누적 결과 확인 불가~~
- ~~미션 카드 버튼 위치 불일치~~

### 진행 중인 이슈
- 없음

## 향후 개선 계획

### 단기 계획
1. 사용자 인증 시스템 (Supabase Auth)
2. 실제 데이터베이스 연동 (현재 Mock 데이터 사용)
3. 투표 결과 실시간 업데이트
4. 사용자 프로필 및 히스토리

### 중기 계획
1. 리더보드 시스템
2. 포인트/보상 시스템
3. 소셜 공유 기능
4. 알림 시스템

### 장기 계획
1. 모바일 앱 개발
2. 실시간 채팅 기능
3. 커뮤니티 기능
4. 다양한 리얼리티 쇼 지원

## 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State Management**: React Hooks + SWR

### Backend (계획)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Vercel Blob
- **API**: Next.js API Routes

### 개발 도구
- **Version Control**: Git
- **Deployment**: Vercel
- **Package Manager**: npm

## 데이터 구조

### 미션 타입
\`\`\`typescript
type MissionType = 'binary' | 'multi' | 'match'
\`\`\`

### 커플 매칭 데이터
\`\`\`typescript
interface Connection {
  male: string
  female: string
}

interface EpisodePick {
  episodeNo: number
  connections: Connection[]
  timestamp: number
  submitted?: boolean
}
\`\`\`

## 개발 가이드라인

### 코드 스타일
- TypeScript strict mode 사용
- 함수형 컴포넌트 + Hooks 패턴
- 명확한 타입 정의
- 재사용 가능한 컴포넌트 작성

### 커밋 메시지
- feat: 새로운 기능 추가
- fix: 버그 수정
- style: UI/스타일 변경
- refactor: 코드 리팩토링
- docs: 문서 수정

### 테스트
- 주요 기능에 대한 단위 테스트 작성 (예정)
- E2E 테스트 (예정)

## 참고 사항

### Mock 데이터
현재 프로젝트는 `lib/mock-vote-data.ts`의 Mock 데이터를 사용합니다.
실제 배포 시 Supabase 데이터베이스로 전환 예정입니다.

### 로컬 스토리지
사용자의 투표 및 매칭 데이터는 현재 브라우저 로컬 스토리지에 저장됩니다.
키 형식: `realpick_episode_picks_mission_{missionId}`

### 환경 변수
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
\`\`\`

## 연락처 및 지원
- GitHub Issues를 통한 버그 리포트
- Pull Request 환영

---

**마지막 업데이트**: 2025-01-13
**버전**: v7
