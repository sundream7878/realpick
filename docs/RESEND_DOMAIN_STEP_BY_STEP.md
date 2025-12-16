# Resend 도메인 인증 - 단계별 가이드

## 🎯 목표
모든 사용자에게 이메일을 발송하기 위해 도메인을 인증합니다.

---

## 📋 준비물
- ✅ 자신의 도메인 (예: `realpick.com`)
- ✅ 도메인 DNS 설정 권한

---

## 1️⃣ Resend에서 도메인 추가

### 단계 1: Resend Domains 페이지 접속
1. https://resend.com/domains 접속
2. **Add Domain** 버튼 클릭

### 단계 2: 도메인 입력
- 메인 도메인 사용: `realpick.com`
- 또는 서브도메인 사용: `mail.realpick.com` (권장)

> 💡 서브도메인을 권장하는 이유:
> - 메인 도메인의 이메일 설정과 분리됨
> - DNS 충돌 위험 감소
> - 관리가 더 간편함

### 단계 3: DNS 레코드 확인
Resend가 3가지 DNS 레코드를 제공합니다:

**① 인증용 TXT 레코드**
```
Type: TXT
Name: _resend (또는 @)
Value: resend-verification=xxxxxxxx
```

**② DKIM 서명용 CNAME 레코드**
```
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com
```

**③ SPF용 TXT 레코드** (선택사항)
```
Type: TXT
Name: @ (또는 루트)
Value: v=spf1 include:resend.com ~all
```

---

## 2️⃣ DNS 설정하기

### A. Cloudflare 사용 시

1. **Cloudflare Dashboard** 접속: https://dash.cloudflare.com
2. 도메인 선택
3. **DNS** 탭 → **Records** 섹션
4. **Add record** 클릭

**TXT 레코드 추가**:
- Type: `TXT`
- Name: `_resend`
- Content: Resend에서 제공한 값 (예: `resend-verification=abc123...`)
- TTL: Auto
- Proxy status: DNS only (회색 구름)
- **Save** 클릭

**CNAME 레코드 추가**:
- Type: `CNAME`
- Name: `resend._domainkey`
- Target: `resend._domainkey.resend.com`
- TTL: Auto
- Proxy status: DNS only (회색 구름)
- **Save** 클릭

### B. 가비아 사용 시

1. **가비아 관리콘솔** 접속: https://my.gabia.com
2. **도메인** → **My 가비아** → **DNS 설정**
3. 해당 도메인 선택 → **DNS 레코드 설정**

**TXT 레코드 추가**:
- 호스트: `_resend`
- 값/위치: Resend에서 제공한 값
- TTL: 3600
- **추가** 클릭

**CNAME 레코드 추가**:
- 호스트: `resend._domainkey`
- 값/위치: `resend._domainkey.resend.com`
- TTL: 3600
- **추가** 클릭

### C. Namecheap 사용 시

1. **Namecheap Dashboard** 접속
2. **Domain List** → 도메인 선택
3. **Advanced DNS** 탭

**TXT 레코드 추가**:
- Type: `TXT Record`
- Host: `_resend`
- Value: Resend에서 제공한 값
- TTL: Automatic
- **Add** 클릭

**CNAME 레코드 추가**:
- Type: `CNAME Record`
- Host: `resend._domainkey`
- Target: `resend._domainkey.resend.com`
- TTL: Automatic
- **Add** 클릭

---

## 3️⃣ 인증 확인

### 단계 1: DNS 전파 대기
- DNS 레코드 추가 후 **10~30분** 대기
- 빠르면 5분, 늦으면 24시간까지 걸릴 수 있음

### 단계 2: DNS 전파 확인 (선택사항)
온라인 도구로 DNS 레코드 확인:
- https://dnschecker.org
- https://mxtoolbox.com/SuperTool.aspx

**확인 방법**:
- TXT 레코드: `_resend.yourdomain.com`
- CNAME 레코드: `resend._domainkey.yourdomain.com`

### 단계 3: Resend에서 인증
1. https://resend.com/domains 접속
2. 추가한 도메인의 **Verify** 버튼 클릭
3. ✅ 상태가 **Verified**로 변경되면 완료!

---

## 4️⃣ 환경 변수 업데이트

### .env.local 파일 수정

```bash
# 변경 전
RESEND_FROM_EMAIL=onboarding@resend.dev

# 변경 후 (인증한 도메인 사용)
RESEND_FROM_EMAIL=notifications@yourdomain.com
# 또는
RESEND_FROM_EMAIL=noreply@yourdomain.com
# 또는
RESEND_FROM_EMAIL=hello@yourdomain.com
```

> 💡 발신 주소는 인증한 도메인이면 아무거나 가능합니다!
> - `notifications@realpick.com` ✅
> - `noreply@realpick.com` ✅
> - `hello@realpick.com` ✅
> - `admin@realpick.com` ✅

### 서버 재시작
```bash
npm run dev
```

---

## 5️⃣ 테스트

### 미션 생성 후 확인
1. 미션 생성
2. 서버 로그 확인:
   ```
   [Mission Notification] Found 4 users to notify
   [Mission Notification] Successfully sent email to user1@... ✅
   [Mission Notification] Successfully sent email to user2@... ✅
   [Mission Notification] Successfully sent email to user3@... ✅
   [Mission Notification] Successfully sent email to user4@... ✅
   [Mission Notification] Email sending complete: 4 success, 0 failed
   ```
3. 모든 사용자의 이메일 확인

---

## 🐛 문제 해결

### DNS 레코드가 안 보일 때
- 10~30분 더 대기
- DNS 캐시 플러시: `ipconfig /flushdns` (Windows)
- 다른 DNS 도구로 확인

### Resend에서 인증 실패
- DNS 레코드 값 정확히 확인
- Name 필드에 도메인 중복 입력 안 했는지 확인
  - ❌ `_resend.yourdomain.com` (잘못)
  - ✅ `_resend` (올바름)

### 여전히 403 에러 발생
- `.env.local`의 `RESEND_FROM_EMAIL` 확인
- 인증한 도메인과 일치하는지 확인
- 서버 재시작했는지 확인

---

## ✅ 완료 체크리스트

- [ ] Resend에서 도메인 추가
- [ ] DNS 레코드 3개 추가 (TXT, CNAME)
- [ ] 10~30분 대기
- [ ] Resend에서 Verify 클릭
- [ ] 상태 "Verified" 확인
- [ ] `.env.local`의 `RESEND_FROM_EMAIL` 업데이트
- [ ] 서버 재시작 (`npm run dev`)
- [ ] 미션 생성하여 테스트
- [ ] 모든 사용자의 이메일 수신 확인

---

## 🎉 성공!

도메인 인증이 완료되면:
- ✅ 모든 사용자에게 이메일 발송 가능
- ✅ 높은 전달률 (SPF, DKIM 인증)
- ✅ 스팸 폴더 가능성 감소
- ✅ 전문적인 발신 주소 (`notifications@realpick.com`)

완료되면 미션을 생성하고 모든 사용자가 이메일을 받는지 확인하세요! 🚀


