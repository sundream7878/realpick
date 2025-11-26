# 바이브코딩 네이밍 헌법 (v2.0 - 최종본)

## 1. 개요

**목적**: 1년간의 바이브코딩 경험에서 도출된, AI와 개발자의 혼란을 원천적으로 방지하기 위한 핵심 명명 규칙.

**적용**: '어그로필터', '리얼PIC' 등 모든 신규 프로젝트에 동일하게 적용되는 '마스터 헌법'.

## 2. 기본 원칙

- **폴더 (Prefix p-, c- 등)**: **'카테고리'**를 정의.
- **파일 (Suffix .hook.ts 등)**: 혼란을 유발하는 특정 파일의 **'역할'**을 정의.
- **DB/코드 (Prefix t_, f_, T 등)**: 데이터와 코드의 **'타입'**을 정의.

## 3. 폴더/파일 명명 (접두사/접미사)

### P- (Pages)

**설명**: Next.js/React 등에서 페이지 라우팅을 담당하는 폴더.

**규칙**: 프레임워크 규칙(예: `page.tsx`)을 최우선으로 존중.

**예시**: 
- `src/app/p-profile/page.tsx`
- `app/p-mypage/page.tsx`

### A- (API)

**설명**: API 엔드포인트 라우팅을 담당하는 폴더.

**규칙**: 프레임워크 규칙(예: `route.ts`)을 최우선으로 존중.

**예시**: 
- `src/app/api/a-users/route.ts`
- `app/api/a-missions/route.ts`

### C- (Components)

**설명**: "멍청한 부품" (UI 컴포넌트).

**규칙**: 파일에 별도 접미사가 불필요. 표준 방식 준수.

**예시**: 
- `src/components/c-button/Button.tsx`
- `components/c-ui/button.tsx`
- `components/c-mission/MissionCard.tsx`

### H- (Hooks)

**설명**: React 커스텀 훅.

**규칙**: 파일 접미사 필수 (`.hook.ts`) → '역할' 명시.

**예시**: 
- `src/hooks/h-auth/useAuth.hook.ts`
- `hooks/h-mission/useMission.hook.ts`
- `hooks/h-toast/useToast.hook.ts`

### S- (Stores)

**설명**: Zustand, Redux 등 전역 상태 관리 스토어.

**규칙**: 파일 접미사 필수 (`.store.ts`) → '역할' 명시.

**예시**: 
- `src/stores/s-user/user.store.ts`
- `stores/s-mission/mission.store.ts`

### U- (Utils)

**설명**: 유틸리티 함수 모음.

**규칙**: 파일 접미사 필수 (`.util.ts`) → '역할' 명시.

**예시**: 
- `src/utils/u-date/formatDate.util.ts`
- `lib/utils/u-utils/utils.util.ts`
- `lib/utils/u-vote/vote.util.ts`

### T- (Types)

**설명**: TypeScript 타입/인터페이스 정의 파일.

**규칙**: 파일 접미사 필수 (`.types.ts`) → '역할' 명시.

**예시**: 
- `src/types/t-user/user.types.ts`
- `types/t-vote/vote.types.ts`
- `types/t-mission/mission.types.ts`

## 4. DB 스키마 명명 (접두사)

### t_ (Tables)

**설명**: 데이터베이스 테이블.

**목적**: DB 예약어 충돌을 방지하고 '테이블'임을 명시.

**예시**: 
- `t_users`
- `t_missions1`
- `t_missions2`
- `t_episodes`
- `t_pickresult1`
- `t_pickresult2`

### f_ (Fields/Columns)

**설명**: 데이터베이스 테이블의 컬럼(필드).

**목적**: **[헌법 핵심]** 코드 내 함수/변수명과의 충돌을 원천 방지.

**예시**: 
- `t_users` 테이블 내: `f_id`, `f_email`, `f_nickname`, `f_created_at`
- `t_missions1` 테이블 내: `f_title`, `f_deadline`, `f_status`

**코드 예시**:
```typescript
// ✅ 올바른 사용
const user = await getUser(userId)
console.log(user.f_email)  // 100% 필드임을 명확히 알 수 있음

// ❌ 잘못된 사용
console.log(user.email)  // 함수와 혼동 가능
```

## 5. TypeScript 코드 명명 (접두사)

### T (Types/Interfaces)

**설명**: 인터페이스(Interface) 또는 타입(Type) 별칭.

**목적**: 변수/클래스명과의 충돌을 방지하고 '설계도'임을 명시.

**규칙**: 하이픈(-) 없이 T를 붙여 PascalCase로 작성.

**예시**: 
```typescript
interface TUser {
  id: string
  email: string
  nickname: string
}

type TMission = {
  id: string
  title: string
}

type TResponse<T> = {
  data: T
  error?: string
}
```

### E (Enums)

**설명**: 열거형(Enum).

**목적**: '열거형'임을 명시.

**규칙**: 하이픈(-) 없이 E를 붙여 PascalCase로 작성.

**예시**: 
```typescript
enum EUserRole {
  ADMIN = "admin",
  USER = "user",
  GUEST = "guest"
}

enum EMissionStatus {
  OPEN = "open",
  CLOSED = "closed",
  SETTLED = "settled"
}
```

## 6. 기타 코드 명명 (기본 규칙)

### 함수 (Functions)

**규칙**: `camelCase()` (접두사 불필요)

**예시**:
```typescript
function getUserById(id: string) { ... }
const calculatePoints = (score: number) => { ... }
async function submitVote(data: TVoteSubmission) { ... }
```

### 변수 (Variables)

**규칙**: `camelCase`

**예시**:
```typescript
const userId = "user123"
const missionData = { ... }
const isVoting = true
```

### 상수 (Constants)

**규칙**: `UPPER_SNAKE_CASE`

**예시**:
```typescript
const MAX_POINTS = 1000
const DEFAULT_TIER = "모태솔로"
const API_BASE_URL = "https://api.example.com"
```

## 7. 파일 구조 예시

```
project-root/
├── app/
│   ├── p-profile/
│   │   └── page.tsx
│   ├── p-mypage/
│   │   └── page.tsx
│   └── api/
│       └── a-users/
│           └── route.ts
├── components/
│   ├── c-ui/
│   │   ├── button.tsx
│   │   └── card.tsx
│   └── c-mission/
│       └── MissionCard.tsx
├── hooks/
│   ├── h-auth/
│   │   └── useAuth.hook.ts
│   └── h-mission/
│       └── useMission.hook.ts
├── lib/
│   └── utils/
│       ├── u-date/
│       │   └── formatDate.util.ts
│       └── u-vote/
│           └── vote.util.ts
├── types/
│   ├── t-user/
│   │   └── user.types.ts
│   └── t-vote/
│       └── vote.types.ts
└── stores/
    └── s-user/
        └── user.store.ts
```

## 8. 체크리스트

코드 작성 시 다음을 확인하세요:

- [ ] 폴더명이 적절한 접두사(p-, a-, c-, h-, s-, u-, t-)를 사용하는가?
- [ ] Hook 파일이 `.hook.ts` 접미사를 사용하는가?
- [ ] Store 파일이 `.store.ts` 접미사를 사용하는가?
- [ ] Util 파일이 `.util.ts` 접미사를 사용하는가?
- [ ] Type 파일이 `.types.ts` 접미사를 사용하는가?
- [ ] DB 테이블명이 `t_` 접두사를 사용하는가?
- [ ] DB 컬럼명이 `f_` 접두사를 사용하는가?
- [ ] TypeScript 인터페이스/타입이 `T` 접두사를 사용하는가?
- [ ] Enum이 `E` 접두사를 사용하는가?
- [ ] 함수명이 `camelCase`를 사용하는가?
- [ ] 변수명이 `camelCase`를 사용하는가?
- [ ] 상수명이 `UPPER_SNAKE_CASE`를 사용하는가?

## 9. 주의사항

1. **프레임워크 규칙 우선**: Next.js의 `page.tsx`, `route.ts` 등 프레임워크 규칙은 항상 최우선으로 존중합니다.

2. **일관성 유지**: 한 번 정한 네이밍 규칙은 프로젝트 전체에 일관되게 적용해야 합니다.

3. **충돌 방지**: DB 컬럼의 `f_` 접두사는 코드의 함수/변수와의 충돌을 방지하기 위한 핵심 규칙입니다.

4. **가독성**: 네이밍은 코드의 가독성을 높이고, AI와 개발자 모두가 쉽게 이해할 수 있어야 합니다.

---

**마지막 업데이트**: 2025-01-13  
**버전**: v2.0 (최종본)






