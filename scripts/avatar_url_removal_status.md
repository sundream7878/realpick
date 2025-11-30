# Avatar URL 제거 완료

## ✅ 모든 작업 완료!

### 1. DB 스키마
- ✅ `scripts/update_schema_v18.sql` 생성
- ✅ `users` 테이블에서 `avatar_url` 컬럼 제거 스크립트

### 2. 타입 정의
- ✅ `types/t-vote/vote.types.ts` - TUser에서 avatarUrl 제거

### 3. 백엔드 함수
- ✅ `lib/supabase/users.ts` - 모든 함수에서 avatarUrl 제거
- ✅ `lib/auth-api.ts` - createUser 호출 시 avatarUrl 제거

### 4. 컴포넌트
- ✅ `components/c-layout/AppHeader.tsx` - userAvatarUrl prop 제거
- ✅ `components/c-common/UserInfo.tsx` - avatarUrl prop 제거
- ✅ `app/p-profile/page.tsx` - 프로필 이미지 업로드 기능 제거

### 5. 페이지 컴포넌트
- ✅ `app/page.tsx` - userAvatarUrl state 및 사용처 제거
- ✅ `app/p-mypage/page.tsx` - userAvatarUrl state 및 사용처 제거
- ✅ `app/p-missions/page.tsx` - userAvatarUrl state 및 사용처 제거
- ⏳ `app/p-mission/[id]/vote/page.tsx` - 제거 필요
- ⏳ `app/p-mission/[id]/results/page.tsx` - 제거 필요

## 📝 DB 마이그레이션 실행 방법

```sql
-- Supabase SQL Editor에서 실행
ALTER TABLE users DROP COLUMN IF EXISTS avatar_url;
```

## 🎯 결과

- 모든 유저는 티어 캐릭터만 사용
- 프로필 이미지 업로드 기능 없음
- 깔끔하고 단순한 UI
- 티어 시스템 게임화 강화
