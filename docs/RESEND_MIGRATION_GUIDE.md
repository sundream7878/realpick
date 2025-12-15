# Resend 이메일 알림 시스템 마이그레이션 가이드

## 📋 개요

기존의 Supabase Edge Function + Gmail SMTP 방식에서 **Next.js API Route + Resend** 방식으로 마이그레이션했습니다.

## 🔄 변경 사항

### 이전 아키텍처 (Supabase Edge Function)
```
미션 생성
  ↓
lib/supabase/email-notification.ts (클라이언트)
  ↓
Supabase Edge Function (Deno)
  ↓
Gmail SMTP (denomailer)
  ↓
사용자 이메일
```

### 현재 아키텍처 (Resend)
```
미션 생성
  ↓
lib/supabase/email-notification.ts (클라이언트)
  ↓
Next.js API Route (/api/send-mission-notification)
  ↓
Resend API
  ↓
사용자 이메일
```

## 📦 새로운 구조

### 1. 이메일 템플릿
**파일**: `lib/email-templates/mission-notification.tsx`

React 컴포넌트로 작성된 HTML 이메일 템플릿입니다.

```typescript
<MissionNotificationEmail
  missionTitle="미션 제목"
  category="LOVE"
  categoryName="로맨스"
  userNickname="사용자"
  missionUrl="https://..."
/>
```

**특징**:
- 카테고리별 색상 구분
- 반응형 디자인
- 깔끔한 UI/UX

### 2. API Route
**파일**: `app/api/send-mission-notification/route.ts`

Next.js API Route로 이메일 발송을 처리합니다.

**주요 기능**:
- Supabase Service Role로 알림 대상 조회
- Resend API로 이메일 발송
- 발송 결과 로깅

### 3. 클라이언트 유틸리티
**파일**: `lib/supabase/email-notification.ts`

미션 생성 시 API Route를 호출합니다.

**변경 내용**:
- ❌ Supabase Edge Function 호출 제거
- ✅ Next.js API Route 호출

## 🔐 환경 변수

### 필수 환경 변수 (.env.local)

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev

# Supabase Configuration (기존)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Site URL (이메일 링크용)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 제거된 환경 변수
- ~~`SMTP_USER`~~ (Gmail 이메일 주소)
- ~~`SMTP_PASS`~~ (Gmail 앱 비밀번호)

## 🚀 장점

### Resend 방식의 이점

1. **✅ 간편한 설정**
   - Gmail 2단계 인증, 앱 비밀번호 불필요
   - API 키만으로 즉시 사용 가능

2. **📊 전송 모니터링**
   - Resend 대시보드에서 이메일 전송 현황 확인
   - 열람률, 클릭률, 바운스 등 분석 가능

3. **🎨 React 컴포넌트 템플릿**
   - JSX/TSX로 이메일 템플릿 작성
   - 타입 안전성 보장

4. **🔒 보안 강화**
   - Gmail 계정 자격 증명 노출 위험 제거
   - Resend API 키만 관리

5. **⚡ 성능 향상**
   - Next.js API Route는 Edge Function보다 빠름
   - Resend는 전송 속도가 매우 빠름

6. **🌍 도메인 인증 지원**
   - 자체 도메인 설정 가능 (예: `notifications@realpick.com`)
   - SPF, DKIM, DMARC 자동 설정

## 🗑️ 삭제 가능한 파일

이제 다음 파일들은 더 이상 사용되지 않습니다:

```
supabase/functions/send-mission-notification/index.ts
docs/GMAIL_SMTP_SETUP.md
docs/EMAIL_NOTIFICATION_SETUP_SUMMARY.md
docs/EMAIL_NOTIFICATION_TEST_GUIDE.md
```

**삭제 여부**: 필요 시 백업 후 삭제하거나, 참고용으로 보관할 수 있습니다.

## 🧪 테스트 방법

### 1. 로컬 테스트

1. `.env.local`에 Resend API 키 추가
2. 개발 서버 실행:
   ```bash
   npm run dev
   ```
3. 미션 생성 테스트:
   - 알림을 받을 사용자로 로그인
   - 프로필 페이지에서 이메일 알림 활성화 및 카테고리 선택
   - 다른 사용자 계정으로 미션 생성
   - 이메일 수신 확인

### 2. 로그 확인

**서버 콘솔**:
```
[Mission Notification] Received request: { missionId: '...', category: 'LOVE' }
[Mission Notification] Found 2 users to notify
[Mission Notification] Successfully sent email to user@example.com (ID: abc123)
[Mission Notification] Email sending complete: 2 success, 0 failed
```

**Resend 대시보드**:
- https://resend.com/emails
- 발송된 이메일 목록 및 상태 확인

### 3. 이메일 미리보기

개발 중에는 `onboarding@resend.dev` 발신 주소를 사용합니다.
- 실제 이메일이 발송되므로 테스트용 이메일 주소 사용 권장

## 🔧 도메인 설정 (선택사항)

자체 도메인으로 이메일을 보내려면:

1. **Resend 대시보드**에서 도메인 추가
2. DNS 레코드 설정 (SPF, DKIM)
3. `.env.local` 업데이트:
   ```bash
   RESEND_FROM_EMAIL=notifications@yourdomain.com
   ```

## 🆘 문제 해결

### 이메일이 발송되지 않는 경우

1. **API 키 확인**
   ```bash
   echo $RESEND_API_KEY
   ```

2. **서버 콘솔 로그 확인**
   - 에러 메시지 확인

3. **Resend 대시보드 확인**
   - API 키가 활성화되어 있는지 확인
   - 전송 로그 확인

4. **환경 변수 재확인**
   - 서버 재시작 후 테스트

### 스팸 폴더로 들어가는 경우

- `onboarding@resend.dev`는 테스트용이므로 스팸으로 분류될 수 있음
- 자체 도메인을 인증하면 전달률이 크게 향상됨

## 📚 참고 자료

- [Resend 공식 문서](https://resend.com/docs)
- [React Email 문서](https://react.email/docs/introduction)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)

---

✅ **마이그레이션 완료!** 이제 Resend로 안정적이고 빠른 이메일 알림을 보낼 수 있습니다! 🎉

