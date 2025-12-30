# 이메일 알림 설정 가이드

## 🔴 현재 문제

에러 메시지: `"Invalid API key"` 또는 `"Failed to fetch notification preferences"`

이는 다음 중 하나의 문제일 수 있습니다:
1. Supabase Service Role Key가 설정되지 않았거나 잘못됨
2. Resend API Key가 설정되지 않았거나 잘못됨
3. `t_notification_preferences` 테이블이 생성되지 않음

---

## ✅ 해결 방법

### 1. Supabase Service Role Key 설정

**Netlify 환경 변수 설정:**

1. Netlify Dashboard 접속
2. Site Settings → Environment Variables
3. 다음 변수 추가/수정:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Service Role Key 확인 방법:**
1. Supabase Dashboard 접속
2. Settings → API
3. "service_role" 섹션의 "secret" 키 복사
4. ⚠️ 이 키는 매우 민감하므로 절대 공개하지 마세요!

**로컬 개발 환경:**
`.env.local` 파일에 추가:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

### 2. Resend API Key 설정

**Resend 계정 설정:**

1. [Resend Dashboard](https://resend.com/api-keys) 접속
2. API Keys 섹션에서 새 키 생성
3. 키 복사

**Netlify 환경 변수 설정:**

```
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**참고:**
- `RESEND_FROM_EMAIL`은 Resend에서 인증한 도메인의 이메일이어야 합니다
- 테스트용으로는 `onboarding@resend.dev` 사용 가능 (제한적)

**로컬 개발 환경:**
`.env.local` 파일에 추가:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

### 3. 알림 설정 테이블 생성

**Supabase SQL Editor에서 실행:**

```sql
-- scripts/create_notification_preferences.sql 파일 실행
```

또는 직접 실행:

```sql
CREATE TABLE IF NOT EXISTS t_notification_preferences (
  f_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  f_user_id UUID NOT NULL REFERENCES t_users(f_id) ON DELETE CASCADE,
  f_email_enabled BOOLEAN DEFAULT true,
  f_categories TEXT[] DEFAULT ARRAY['LOVE', 'VICTORY', 'STAR']::TEXT[],
  f_created_at TIMESTAMPTZ DEFAULT NOW(),
  f_updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(f_user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id 
ON t_notification_preferences(f_user_id);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_email_enabled 
ON t_notification_preferences(f_email_enabled) 
WHERE f_email_enabled = true;

-- RLS 정책 활성화
ALTER TABLE t_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Users can view own notification preferences"
ON t_notification_preferences FOR SELECT
USING (auth.uid() = f_user_id);

CREATE POLICY "Users can create own notification preferences"
ON t_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = f_user_id);

CREATE POLICY "Users can update own notification preferences"
ON t_notification_preferences FOR UPDATE
USING (auth.uid() = f_user_id);

CREATE POLICY "Users can delete own notification preferences"
ON t_notification_preferences FOR DELETE
USING (auth.uid() = f_user_id);

-- Service Role은 RLS를 우회하므로 별도 정책 불필요
```

---

### 4. 환경 변수 확인 체크리스트

**Netlify 환경 변수:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 설정됨
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정됨 (⚠️ Service Role Key, Anon Key 아님!)
- [ ] `RESEND_API_KEY` 설정됨
- [ ] `RESEND_FROM_EMAIL` 설정됨
- [ ] `NEXT_PUBLIC_SITE_URL` 설정됨 (선택사항, 기본값 사용 가능)

**로컬 개발 환경 (`.env.local`):**
- [ ] 위의 모든 변수 설정됨

---

### 5. 테스트 방법

**1. 환경 변수 확인:**
```bash
# Netlify Functions 로그에서 확인
# 또는 브라우저 콘솔에서 API 에러 메시지 확인
```

**2. 알림 설정 확인:**
- 사용자가 프로필 페이지에서 이메일 알림을 활성화했는지 확인
- `/p-settings/notifications` 페이지에서 설정 가능

**3. 미션 생성 테스트:**
- 새 미션 생성 시 이메일 알림이 발송되는지 확인
- Netlify Functions 로그에서 에러 확인

---

## 🔍 문제 해결

### 에러: "Invalid API key"

**원인:**
- `SUPABASE_SERVICE_ROLE_KEY`가 잘못되었거나 만료됨
- Anon Key를 Service Role Key로 사용함

**해결:**
1. Supabase Dashboard에서 Service Role Key 재확인
2. Netlify 환경 변수 업데이트
3. 사이트 재배포

---

### 에러: "Failed to fetch notification preferences"

**원인:**
- `t_notification_preferences` 테이블이 없음
- RLS 정책 문제

**해결:**
1. `scripts/create_notification_preferences.sql` 실행
2. 테이블 생성 확인:
```sql
SELECT * FROM t_notification_preferences LIMIT 1;
```

---

### 에러: "Email notifications skipped (no API key)"

**원인:**
- `RESEND_API_KEY`가 설정되지 않음

**해결:**
1. Resend에서 API 키 생성
2. Netlify 환경 변수에 추가
3. 사이트 재배포

---

## 📝 참고 사항

1. **Service Role Key vs Anon Key:**
   - Service Role Key: RLS를 우회하여 모든 데이터 접근 가능 (서버 사이드 전용)
   - Anon Key: RLS 정책을 따르는 클라이언트 키
   - ⚠️ Service Role Key는 절대 클라이언트에 노출하면 안 됩니다!

2. **Resend 제한:**
   - 무료 플랜: 월 3,000건
   - Rate Limit: 초당 10건
   - 현재 코드는 초당 1.6건으로 안전하게 설정됨

3. **이메일 도메인 인증:**
   - 프로덕션에서는 반드시 자신의 도메인을 Resend에 인증해야 합니다
   - 인증하지 않으면 `onboarding@resend.dev`만 사용 가능 (제한적)

---

**작성일**: 2025-01-16  
**최종 업데이트**: 2025-01-16



