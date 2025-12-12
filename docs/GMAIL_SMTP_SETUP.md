# Gmail SMTP 이메일 알림 설정 가이드

RealPick 이메일 알림을 Gmail SMTP로 무료 설정하는 방법입니다.

## 📋 목차

1. [Gmail 앱 비밀번호 생성](#1-gmail-앱-비밀번호-생성)
2. [데이터베이스 설정](#2-데이터베이스-설정)
3. [Supabase Edge Function 배포](#3-supabase-edge-function-배포)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [테스트](#5-테스트)

---

## 1. Gmail 앱 비밀번호 생성

### 1-1. 2단계 인증 활성화

1. [Google 계정](https://myaccount.google.com/) 접속
2. **보안** 메뉴 클릭
3. **2단계 인증** 활성화 (아직 안 했다면)

### 1-2. 앱 비밀번호 생성

1. [앱 비밀번호 페이지](https://myaccount.google.com/apppasswords) 접속
2. **앱 선택**: "메일"
3. **기기 선택**: "기타 (맞춤 이름)" → "RealPick"
4. **생성** 클릭
5. 생성된 **16자리 비밀번호** 복사 (공백 제거)
   - 예: `abcd efgh ijkl mnop` → `abcdefghijklmnop`

⚠️ **중요**: 이 비밀번호는 한 번만 표시됩니다. 안전하게 보관하세요!

---

## 2. 데이터베이스 설정

### 2-1. Supabase SQL Editor 접속

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 → **SQL Editor** 클릭

### 2-2. SQL 실행

`scripts/setup_email_notifications.sql` 파일의 내용을 복사해서 실행:

```sql
-- 이 파일의 모든 내용을 복사해서 SQL Editor에 붙여넣고 Run 클릭
```

✅ 실행 완료 후 확인:
- `t_notification_preferences` 테이블 생성됨
- 기존 사용자에게 기본 알림 설정 추가됨

---

## 3. Supabase Edge Function 배포

### 3-1. Supabase CLI 설치 (처음만)

```powershell
# Scoop으로 설치 (권장)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# 또는 직접 다운로드
# https://github.com/supabase/cli/releases
```

### 3-2. Supabase 로그인

```powershell
supabase login
```

### 3-3. Edge Function 배포

```powershell
cd C:\Users\USER\realpick-1

# Edge Function 배포
supabase functions deploy send-mission-notification --project-ref your-project-ref
```

💡 **project-ref 찾기**:
- Supabase 대시보드 → **Settings** → **API** → **Project URL**에서 확인
- 예: `https://abcdefghijk.supabase.co` → `abcdefghijk`가 project-ref

---

## 4. 환경 변수 설정

### 4-1. Supabase 대시보드에서 설정

1. Supabase 대시보드 → **Edge Functions** 메뉴
2. `send-mission-notification` 함수 선택
3. **Settings** 탭 → **Secrets** 섹션
4. 다음 환경 변수 추가:

| 키 | 값 | 설명 |
|---|---|---|
| `SMTP_USER` | `your-email@gmail.com` | Gmail 주소 |
| `SMTP_PASS` | `abcdefghijklmnop` | 앱 비밀번호 (16자리) |
| `SUPABASE_URL` | 자동 설정됨 | - |
| `SUPABASE_SERVICE_ROLE_KEY` | 자동 설정됨 | - |

### 4-2. 로컬 테스트용 환경 변수

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Gmail SMTP 설정
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop

# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 5. 테스트

### 5-1. 알림 설정 확인

1. RealPick 웹사이트 접속
2. **설정** → **알림 설정** 페이지 이동
3. 이메일 알림 **켜기**
4. 관심 카테고리 선택 (로맨스, 서바이벌, 오디션)

### 5-2. 테스트 미션 생성

1. 새 미션 생성
2. 카테고리 선택 (예: 로맨스)
3. 미션 게시

### 5-3. 이메일 확인

- Gmail 받은편지함 확인
- 발신자: `RealPick <your-email@gmail.com>`
- 제목: `[RealPick] 새로운 로맨스 미션!`

⚠️ **스팸함 확인**: 처음에는 스팸으로 분류될 수 있습니다.

### 5-4. Edge Function 로그 확인

```powershell
# 실시간 로그 확인
supabase functions logs send-mission-notification --project-ref your-project-ref
```

또는 Supabase 대시보드:
- **Edge Functions** → `send-mission-notification` → **Logs** 탭

---

## 🔧 문제 해결

### "SMTP not configured" 에러
- Supabase Edge Function의 **Secrets**에 `SMTP_USER`, `SMTP_PASS` 추가 확인

### "Authentication failed" 에러
- Gmail 앱 비밀번호가 올바른지 확인
- 16자리에 공백이 포함되지 않았는지 확인
- 2단계 인증이 활성화되어 있는지 확인

### 이메일이 안 옴
1. Edge Function 로그 확인
2. `t_notification_preferences` 테이블에 데이터 있는지 확인
3. 알림 설정에서 이메일 알림이 켜져 있는지 확인
4. Gmail 스팸함 확인

### Database Trigger가 작동 안 함
- 아직 Database Trigger를 설정하지 않았다면 수동으로 API 호출 필요
- 다음 섹션 참조: [API에서 직접 호출](#option-2-api에서-직접-호출)

---

## 📊 발송 제한

Gmail SMTP 무료 계정 제한:
- **일일 발송량**: 500통
- **분당 발송량**: 제한 없음 (하지만 너무 빠르면 차단될 수 있음)

💡 **발송량이 많아지면**: Resend, SendGrid, AWS SES 등 전문 서비스로 전환 고려

---

## 🎯 다음 단계

✅ 설정 완료 후:
1. Database Trigger 설정 (자동 알림)
2. 또는 API에서 직접 Edge Function 호출
3. 이메일 템플릿 커스터마이징

관련 파일:
- `supabase/functions/send-mission-notification/index.ts` - Edge Function 코드
- `scripts/create_mission_notification_trigger.sql` - Database Trigger 설정
- `app/p-settings/notifications/page.tsx` - 알림 설정 UI

