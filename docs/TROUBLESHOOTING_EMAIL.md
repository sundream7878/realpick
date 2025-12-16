# 이메일 알림 문제 해결 가이드

## 🔍 증상: 이메일이 발송되지 않음

### 1단계: 환경 변수 확인

**.env.local 파일 확인**:

```bash
# 필수 환경 변수
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev

# Supabase (기존)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# 사이트 URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**확인 사항**:
- ✅ `RESEND_API_KEY`가 `re_`로 시작하는지
- ✅ `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 (Anon Key가 아님!)
- ✅ 환경 변수 추가 후 서버를 재시작했는지

### 2단계: 서버 로그 확인

**터미널에서 다음 로그를 확인**:

#### 정상 케이스 ✅
```
[Mission Notification] Received request: { missionId: 'abc123', category: 'LOVE', showId: 'show1' }
[Mission Notification] Found 2 users to notify
[Mission Notification] Successfully sent email to user@example.com (ID: email_id_123)
[Mission Notification] Email sending complete: 2 success, 0 failed
```

#### 문제 케이스 ❌

**Case 1: 알림 대상이 없음**
```
[Mission Notification] Received request: { missionId: 'abc123', category: 'LOVE' }
[Mission Notification] No users to notify
```
👉 **원인**: 해당 카테고리를 구독한 사용자가 없음
👉 **해결**: 프로필 페이지에서 이메일 알림 설정 확인

**Case 2: Resend API 에러**
```
[Mission Notification] Failed to send email to user@example.com: Error: Invalid API key
```
👉 **원인**: API 키가 잘못되었거나 만료됨
👉 **해결**: Resend 대시보드에서 API 키 재확인

**Case 3: Supabase 연결 실패**
```
[Mission Notification] Error fetching preferences: ...
```
👉 **원인**: `SUPABASE_SERVICE_ROLE_KEY`가 없거나 잘못됨
👉 **해결**: Supabase 대시보드 → Settings → API에서 Service Role Key 복사

### 3단계: 알림 설정 확인

1. **프로필 페이지 접속** (`/p-profile`)
2. **이메일 알림 섹션 확인**:
   - "새 미션 이메일 알림 받기" 토글이 **ON**인지
   - 원하는 카테고리가 **선택**되어 있는지
   - "알림 설정 저장" 버튼을 **눌렀는지**
3. **데이터베이스 확인**:
   ```sql
   SELECT f_user_id, f_email_enabled, f_categories 
   FROM t_notification_preferences;
   ```

### 4단계: Resend 대시보드 확인

1. https://resend.com/emails 접속
2. **Emails** 탭에서 발송 내역 확인
3. 에러가 있다면 상세 내용 확인

### 5단계: 테스트 API 호출

**수동으로 API Route 테스트**:

```bash
curl -X POST http://localhost:3000/api/send-mission-notification \
  -H "Content-Type: application/json" \
  -d '{
    "missionId": "test-123",
    "missionTitle": "테스트 미션",
    "category": "LOVE",
    "showId": null,
    "creatorId": "creator-id"
  }'
```

**예상 응답**:
```json
{
  "success": true,
  "message": "Mission notifications sent",
  "sent": 2,
  "failed": 0,
  "results": [...]
}
```

---

## 🐛 Embed API 500 에러

### 증상
```
/api/missions/embed:1 Failed to load resource: the server responded with a status of 500
```

### 원인
`GOOGLE_API_KEY` 환경 변수가 설정되지 않았거나 잘못됨

### 해결

1. **.env.local에 추가**:
   ```bash
   GOOGLE_API_KEY=your_google_api_key_here
   ```

2. **Google AI Studio에서 API 키 발급**:
   - https://aistudio.google.com/app/apikey
   - API 키 생성
   - 복사하여 `.env.local`에 추가

3. **서버 재시작**:
   ```bash
   npm run dev
   ```

---

## 🆘 그래도 안 될 때

### 완전 초기화 방법

1. **서버 종료** (Ctrl+C)
2. **node_modules 삭제 및 재설치**:
   ```bash
   Remove-Item -Recurse -Force node_modules
   npm install --legacy-peer-deps
   ```
3. **.env.local 재확인**
4. **서버 재시작**:
   ```bash
   npm run dev
   ```

### 디버깅 모드

`app/api/send-mission-notification/route.ts`의 45번 줄에 추가:

```typescript
console.log('[DEBUG] Environment check:', {
  hasResendKey: !!process.env.RESEND_API_KEY,
  hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
});
```

---

## 📞 체크리스트

이메일이 발송되지 않을 때 확인할 사항:

- [ ] `.env.local`에 `RESEND_API_KEY` 추가
- [ ] `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가 (Anon이 아님!)
- [ ] `.env.local`에 `RESEND_FROM_EMAIL` 추가
- [ ] 환경 변수 추가 후 서버 재시작
- [ ] 프로필 페이지에서 이메일 알림 활성화
- [ ] 알림 받을 카테고리 선택
- [ ] "알림 설정 저장" 버튼 클릭
- [ ] 다른 사용자 계정으로 미션 생성
- [ ] 서버 콘솔에서 `[Mission Notification]` 로그 확인
- [ ] Resend 대시보드에서 발송 내역 확인

---

✅ 문제가 해결되지 않으면 서버 콘솔의 전체 로그를 공유해주세요!


