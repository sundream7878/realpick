# Netlify + Resend 통합 가이드

## 📋 개요

Netlify에서 호스팅하는 Next.js 앱에서 Resend 이메일 알림을 설정하는 방법입니다.

---

## 🎯 전제 조건

### 필수
- ✅ Netlify에 배포된 Next.js 앱
- ✅ 커스텀 도메인 (예: `realpick.com`)
- ✅ Netlify에 도메인이 연결되어 있음

### 선택
- Netlify DNS를 사용 중 (권장)
- 또는 외부 DNS 제공자 사용

---

## 🔧 설정 단계

### 1️⃣ 현재 도메인 확인

**Netlify에서 확인**:
1. Netlify Dashboard → 사이트 선택
2. **Site settings** → **Domain management**
3. Primary domain 확인 (예: `realpick.com`)

**DNS 제공자 확인**:
- Netlify DNS 사용 중: DNS 레코드를 Netlify에서 직접 추가
- 외부 DNS (Cloudflare, 가비아 등): 해당 서비스에서 DNS 레코드 추가

---

### 2️⃣ Resend 도메인 추가

1. https://resend.com/domains 접속
2. **Add Domain** 클릭
3. 도메인 입력:
   - 메인 도메인: `realpick.com`
   - 또는 서브도메인: `mail.realpick.com` (권장)
4. DNS 레코드 3개 복사

---

### 3️⃣ DNS 레코드 추가

#### A. Netlify DNS 사용 시 🎯

**장점**: Netlify에서 직접 관리 가능, 빠른 전파

1. **Netlify Dashboard** → 사이트 선택
2. **Site settings** → **Domain management**
3. 스크롤 다운 → **DNS records** 섹션
4. **Add new record** 클릭

**① TXT 레코드 추가** (인증용):
```
Record type: TXT
Name: _resend (또는 전체 도메인이면 @)
Value: resend-verification=xxxxxxxx
TTL: 3600
```

**② CNAME 레코드 추가** (DKIM):
```
Record type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com
TTL: 3600
```

**③ TXT 레코드 추가** (SPF, 선택사항):
```
Record type: TXT
Name: @ (루트)
Value: v=spf1 include:resend.com ~all
TTL: 3600
```

**주의사항**:
- 서브도메인(`mail.realpick.com`)을 사용하는 경우:
  - Name: `_resend.mail` 또는 `_resend.mail.realpick.com`
  - Netlify DNS는 자동으로 도메인을 추가하므로 짧은 형식 사용

#### B. 외부 DNS 제공자 사용 시

**Cloudflare, 가비아 등**에서 DNS 레코드 추가:
- 이전에 작성한 `RESEND_DOMAIN_STEP_BY_STEP.md` 참고
- DNS 제공자 사이트에서 직접 레코드 추가

---

### 4️⃣ Netlify 환경 변수 추가

1. **Netlify Dashboard** → 사이트 선택
2. **Site settings** → **Environment variables**
3. **Add a variable** 클릭

**추가할 환경 변수**:

```bash
# Resend API Key
Key: RESEND_API_KEY
Value: re_bpm4yuYG_4jX2ybiPPsbfweafjJFKGzBp
Scopes: All (Production, Deploy previews, Branch deploys)

# Resend From Email
Key: RESEND_FROM_EMAIL
Value: notifications@realpick.com
Scopes: All

# Supabase Service Role Key (이미 있다면 건너뛰기)
Key: SUPABASE_SERVICE_ROLE_KEY
Value: eyJxxx...
Scopes: All

# Google API Key (Embed용, 선택사항)
Key: GOOGLE_API_KEY
Value: your_google_api_key
Scopes: All

# Site URL
Key: NEXT_PUBLIC_SITE_URL
Value: https://realpick.com (또는 실제 도메인)
Scopes: All
```

**⚠️ 보안 경고**: 
- `RESEND_API_KEY`는 노출되었으므로 테스트 후 삭제하고 새로 발급!
- 환경 변수 추가 후 **재배포 필요**

---

### 5️⃣ 재배포

환경 변수를 추가한 후:

**방법 1: 자동 재배포**
- Git에 푸시하면 자동 배포

**방법 2: 수동 재배포**
1. **Deploys** 탭
2. **Trigger deploy** → **Deploy site** 클릭

배포 완료까지 3~5분 소요

---

### 6️⃣ DNS 인증 확인

DNS 레코드 추가 후 10~30분 대기 후:

1. https://resend.com/domains 접속
2. 추가한 도메인의 **Verify** 버튼 클릭
3. ✅ 상태가 **Verified**로 변경되면 완료!

---

### 7️⃣ 테스트

1. Netlify 배포된 사이트 접속
2. 미션 생성
3. 모든 사용자의 이메일 확인
4. Netlify Functions 로그 확인:
   - **Functions** 탭 → `send-mission-notification` 로그

---

## 🎨 Netlify Functions 로그 확인

### 로그 위치
1. Netlify Dashboard → 사이트 선택
2. **Functions** 탭
3. `send-mission-notification` 선택
4. 최근 실행 로그 확인

### 정상 로그 예시
```
[Mission Notification] Found 4 users to notify
[Mission Notification] Successfully sent email to user1@...
[Mission Notification] Successfully sent email to user2@...
[Mission Notification] Email sending complete: 4 success, 0 failed
```

---

## 🐛 문제 해결

### 환경 변수가 적용 안 될 때
- 환경 변수 추가 후 **재배포** 했는지 확인
- Netlify → **Site settings** → **Environment variables** 확인
- Scopes가 올바른지 확인 (Production 포함)

### DNS 레코드가 인식 안 될 때
- 10~30분 더 대기
- Netlify DNS를 사용하는 경우: Netlify에서 레코드 확인
- 외부 DNS 사용하는 경우: 해당 서비스에서 레코드 확인
- DNS Checker로 전파 확인: https://dnschecker.org

### 이메일이 발송 안 될 때
- Resend 도메인이 **Verified** 상태인지 확인
- `.env.local`이 아닌 Netlify 환경 변수 사용하는지 확인
- `RESEND_FROM_EMAIL`이 인증한 도메인과 일치하는지 확인
- Netlify Functions 로그에서 에러 확인

---

## ✅ 체크리스트

- [ ] Netlify에 커스텀 도메인 연결됨
- [ ] DNS 제공자 확인 (Netlify DNS 또는 외부)
- [ ] Resend에 도메인 추가
- [ ] DNS 레코드 3개 추가
- [ ] Netlify 환경 변수 5개 추가
- [ ] Netlify 재배포
- [ ] 10~30분 대기
- [ ] Resend 도메인 인증 (Verify)
- [ ] 미션 생성하여 테스트
- [ ] 모든 사용자 이메일 수신 확인

---

## 🎉 완료!

이제 Netlify에서 호스팅하는 RealPick 앱에서 모든 사용자에게 이메일 알림을 보낼 수 있습니다! 🚀

**발송 주소**: `notifications@realpick.com` (또는 설정한 도메인)
**전달률**: 높음 (SPF, DKIM 인증)
**스팸 방지**: 자동 설정됨

