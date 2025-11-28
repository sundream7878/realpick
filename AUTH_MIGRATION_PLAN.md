# 인증 시스템 마이그레이션 플랜

## 📋 목표
1. **OTP 방식 → 매직링크 방식으로 변경**
2. **신규 사용자 가입 시 나잇대와 성별 입력 과정 추가**

---

## 🔍 현재 상황 분석

### 현재 구조
- **인증 방식**: OTP (6자리 숫자 코드)
- **로그인 플로우**: 이메일 입력 → OTP 코드 입력 → 검증 → 로그인
- **사용자 생성**: `verifyCode` 함수에서 자동 생성 (나잇대/성별 정보 없음)
- **DB 스키마**: `t_users` 테이블에 `f_age`, `f_gender` 컬럼 없음

### 주요 파일
- `lib/auth-api.ts`: `sendVerificationCode`, `verifyCode` 함수
- `components/c-login-modal/login-modal.tsx`: 로그인 모달 UI
- `lib/supabase/users.ts`: 사용자 생성/조회 함수

---

## 📝 작업 플랜

### Phase 1: DB 스키마 변경

#### 1.1 `t_users` 테이블에 컬럼 추가
```sql
-- 나잇대 컬럼 추가 (10대, 20대, 30대, 40대, 50대, 60대, 70대, 80대, 90대)
ALTER TABLE t_users 
ADD COLUMN IF NOT EXISTS f_age_range VARCHAR(20) NULL
CHECK (f_age_range IN ('10대', '20대', '30대', '40대', '50대', '60대', '70대', '80대', '90대') OR f_age_range IS NULL);

-- 성별 컬럼 추가 (남성, 여성)
ALTER TABLE t_users 
ADD COLUMN IF NOT EXISTS f_gender VARCHAR(20) NULL
CHECK (f_gender IN ('남성', '여성') OR f_gender IS NULL);
```

**참고**: 기존 사용자는 NULL 허용, 신규 사용자는 필수 입력

**고려사항:**
- 신규 사용자는 필수 입력 (NOT NULL)
- 기존 사용자는 NULL로 유지 (추후 프로필에서 입력 유도)
- CHECK 제약조건 추가: 나잇대는 10대~90대만 허용, 성별은 남성/여성만 허용
- 인덱스 추가 여부 결정 필요

---

### Phase 2: 인증 방식 변경 (OTP → 매직링크)

#### 2.1 `lib/auth-api.ts` 수정

**변경 전:**
```typescript
// OTP 방식
const { data, error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    shouldCreateUser: true,
  },
})
```

**변경 후:**
```typescript
// 매직링크 방식
const { data, error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    shouldCreateUser: true,
    emailRedirectTo: `${window.location.origin}/auth/callback`, // 리다이렉트 URL
  },
})
```

**추가 함수:**
- `handleMagicLinkCallback`: 매직링크 클릭 시 처리 함수
- 매직링크 토큰 검증 및 세션 생성

#### 2.2 콜백 페이지 생성
- `app/auth/callback/page.tsx` 생성
- URL에서 토큰 추출
- Supabase 세션 확인
- 신규 사용자 여부 확인
- 신규 사용자면 추가 정보 입력 페이지로 리다이렉트
- 기존 사용자면 홈으로 리다이렉트

---

### Phase 3: 추가 정보 입력 UI 추가

#### 3.1 추가 정보 입력 모달/페이지 생성
- `components/c-user-info-modal/user-info-modal.tsx` 생성
- 나잇대 선택 (드롭다운 또는 라디오 버튼) - **필수**
- 성별 선택 (드롭다운 또는 라디오 버튼) - **필수**
- 제출 버튼은 나잇대와 성별 모두 선택되어야 활성화

**나잇대 옵션:**
- "10대"
- "20대"
- "30대"
- "40대"
- "50대"
- "60대"
- "70대"
- "80대"
- "90대"

**성별 옵션:**
- "남성"
- "여성"

#### 3.2 사용자 정보 업데이트 함수
- `lib/supabase/users.ts`에 `updateUserAdditionalInfo` 함수 추가
- 나잇대와 성별을 DB에 저장

---

### Phase 4: 로그인 플로우 수정

#### 4.1 `components/c-login-modal/login-modal.tsx` 수정

**변경 전 플로우:**
```
이메일 입력 → OTP 코드 입력 → 검증 → 로그인 완료
```

**변경 후 플로우:**
```
이메일 입력 → 매직링크 전송 완료 안내 → 이메일에서 링크 클릭 → 
콜백 페이지 → 신규 사용자 여부 확인 → 
[신규] 추가 정보 입력 (나잇대/성별 필수) → 로그인 완료
[기존] 로그인 완료
```

**UI 변경:**
- OTP 코드 입력 필드 제거
- "이메일로 전송된 링크를 클릭해주세요" 안내 메시지 추가
- 이메일 재전송 버튼 유지

#### 4.2 매직링크 전송 후 화면
- "이메일을 확인해주세요" 안내
- 이메일 재전송 버튼
- 이메일 주소 표시

---

### Phase 5: 타입 정의 업데이트

#### 5.1 `types/t-vote/vote.types.ts` 수정
```typescript
export type TUser = {
  id: string
  email: string
  nickname: string
  avatarUrl?: string
  points: number
  tier: TTier
  ageRange?: string  // 추가
  gender?: string    // 추가
  createdAt: Date
  updatedAt: Date
}
```

---

### Phase 6: 기존 사용자 처리

#### 6.1 기존 사용자 마이그레이션
- 기존 사용자는 나잇대/성별이 NULL로 유지
- 프로필 페이지에서 추가 정보 입력 유도 (선택사항)
- 신규 사용자는 매직링크 클릭 직후 필수 입력

---

## 🎯 구현 순서

### Step 1: DB 스키마 변경
1. `t_users` 테이블에 `f_age_range`, `f_gender` 컬럼 추가
2. 마이그레이션 SQL 스크립트 작성

### Step 2: 타입 정의 업데이트
1. `TUser` 타입에 `ageRange`, `gender` 필드 추가
2. 관련 타입 파일 업데이트

### Step 3: 인증 API 수정
1. `lib/auth-api.ts`에서 OTP → 매직링크로 변경
2. 콜백 처리 함수 추가
3. `app/auth/callback/page.tsx` 생성

### Step 4: 사용자 정보 업데이트 함수 추가
1. `lib/supabase/users.ts`에 `updateUserAdditionalInfo` 함수 추가

### Step 5: 추가 정보 입력 UI 생성
1. `components/c-user-info-modal/user-info-modal.tsx` 생성
2. 나잇대/성별 선택 UI 구현

### Step 6: 로그인 모달 수정
1. OTP 입력 필드 제거
2. 매직링크 전송 안내 UI로 변경
3. 콜백 페이지와 연동

### Step 7: 테스트
1. 신규 사용자 가입 플로우 테스트
2. 기존 사용자 로그인 플로우 테스트
3. 추가 정보 입력 플로우 테스트

---

## ⚠️ 주의사항

### 1. 매직링크 리다이렉트 URL 설정
- Supabase 대시보드에서 리다이렉트 URL 등록 필요
- 개발: `http://localhost:3000/auth/callback`
- 프로덕션: `https://yourdomain.com/auth/callback`

### 2. 이메일 템플릿 수정
- Supabase 대시보드에서 매직링크 이메일 템플릿 확인
- 필요시 커스터마이징

### 3. 기존 사용자 경험
- 기존 사용자도 매직링크 방식으로 로그인
- 추가 정보는 선택사항으로 처리

### 4. 보안 고려사항
- 매직링크 토큰 유효기간 확인
- 세션 관리 확인

---

## 📊 예상 작업 시간

- **Phase 1 (DB 스키마)**: 30분
- **Phase 2 (인증 방식 변경)**: 2시간
- **Phase 3 (추가 정보 입력 UI)**: 2시간
- **Phase 4 (로그인 플로우 수정)**: 1.5시간
- **Phase 5 (타입 정의)**: 30분
- **Phase 6 (기존 사용자 처리)**: 1시간
- **테스트 및 버그 수정**: 1시간

**총 예상 시간**: 약 8-9시간

---

## ✅ 확정된 요구사항

1. **나잇대 옵션**: 10대, 20대, 30대, 40대, 50대, 60대, 70대, 80대, 90대 (9개 옵션)
2. **성별 옵션**: 남성, 여성 (2개 옵션)
3. **추가 정보 입력**: 필수
4. **입력 시점**: 매직링크 클릭 직후
5. **필수 여부**: 나잇대와 성별 모두 필수 입력

---

## 🚀 다음 단계

위 플랜을 검토하신 후, 확인이 필요하신 사항을 알려주시면 수정하겠습니다.
확인되면 단계별로 진행하겠습니다!

