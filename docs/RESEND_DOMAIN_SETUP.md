# Resend 도메인 인증 가이드

## 📋 현재 상황

### 테스트 모드 제한
`onboarding@resend.dev`를 사용 중일 때는:
- ❌ 다른 사용자에게 이메일 발송 불가
- ✅ 자신의 이메일(`chiu3@naver.com`)로만 발송 가능

### 에러 메시지
```
You can only send testing emails to your own email address (chiu3@naver.com).
To send emails to other recipients, please verify a domain.
```

---

## 🎯 해결 방법 (2가지 옵션)

### 옵션 1: 도메인 인증 (프로덕션용) ⭐ 권장

실제 서비스에서 모든 사용자에게 이메일을 보내려면 **도메인을 인증**해야 합니다.

#### 1단계: 도메인 준비
- 자신의 도메인이 필요 (예: `realpick.com`)
- 도메인이 없다면:
  - [Namecheap](https://www.namecheap.com) (연 $10~)
  - [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) (저렴)
  - [가비아](https://domain.gabia.com/) (한국)

#### 2단계: Resend에서 도메인 추가

1. **Resend 대시보드** 접속: https://resend.com/domains
2. **Add Domain** 클릭
3. 도메인 입력 (예: `realpick.com`)
4. DNS 레코드 복사

#### 3단계: DNS 레코드 설정

Resend가 제공하는 DNS 레코드를 도메인 관리 페이지에 추가:

**예시 (실제 값은 Resend에서 제공됨)**:
```
Type: TXT
Name: _resend
Value: resend-verification=abc123...

Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com

Type: MX
Priority: 10
Value: feedback-smtp.us-east-1.amazonses.com
```

#### 4단계: 인증 확인

- DNS 레코드 추가 후 10~30분 대기
- Resend 대시보드에서 **Verify** 클릭
- ✅ 상태가 "Verified"로 변경되면 완료!

#### 5단계: 환경 변수 업데이트

`.env.local` 파일 수정:

```bash
# 변경 전
RESEND_FROM_EMAIL=onboarding@resend.dev

# 변경 후 (인증한 도메인 사용)
RESEND_FROM_EMAIL=notifications@realpick.com
# 또는
RESEND_FROM_EMAIL=noreply@realpick.com
```

#### 6단계: 서버 재시작

```bash
npm run dev
```

이제 모든 사용자에게 이메일을 보낼 수 있습니다! ✅

---

### 옵션 2: 테스트 모드 유지 (개발/테스트용)

도메인이 없거나 아직 준비 단계라면:

#### 방법 A: 자신의 이메일로만 테스트
- 알림을 받을 사용자의 이메일을 `chiu3@naver.com`으로 설정
- 또는 `t_users` 테이블에서 테스트 계정의 이메일을 `chiu3@naver.com`으로 임시 변경

#### 방법 B: 다른 이메일 추가 (Resend 무료 플랜)
1. Resend 대시보드 → Settings → Team
2. 팀원 초대 (다른 이메일 주소)
3. 초대된 이메일로도 테스트 가능

---

## 📊 비교표

| 기능 | 테스트 모드 | 도메인 인증 |
|-----|-----------|-----------|
| 발신 주소 | `onboarding@resend.dev` | `your@domain.com` |
| 수신자 제한 | 자신의 이메일만 | 누구에게나 가능 ✅ |
| 프로덕션 사용 | ❌ 불가 | ✅ 가능 |
| 전달률 | 낮음 (스팸 가능성) | 높음 (SPF/DKIM 인증) |
| 비용 | 무료 | 무료 (도메인 비용 별도) |

---

## 🚀 권장 사항

### 지금 (개발 단계)
- ✅ **테스트 모드 유지**: `onboarding@resend.dev` 사용
- ✅ 자신의 이메일로만 테스트
- ✅ 기능 개발 및 디버깅에 집중

### 나중 (배포 준비)
- ✅ **도메인 인증**: 실제 도메인으로 이메일 발송
- ✅ 모든 사용자에게 알림 가능
- ✅ 전달률 향상 (SPF, DKIM, DMARC)

---

## 💡 현재 할 수 있는 것

Rate limit 문제는 이미 해결했으므로:

1. **자신의 이메일로 테스트**:
   - 프로필 페이지에서 이메일 알림 설정
   - 이메일 주소를 `chiu3@naver.com`로 설정
   - 다른 계정으로 미션 생성
   - ✅ 이메일 수신 확인

2. **코드 검증 완료**:
   - ✅ API Route 정상 작동
   - ✅ Resend 연동 성공
   - ✅ HTML 이메일 생성 정상
   - ✅ Rate limit 회피 로직 적용

3. **나중에 도메인 인증**:
   - 실제 서비스 배포 시 도메인 인증
   - 환경 변수만 변경하면 즉시 적용

---

## ✅ 결론

**현재 상태**: 
- 이메일 알림 시스템은 완벽하게 작동합니다! ✅
- `chiu3@naver.com`으로는 정상 발송됩니다.
- 다른 사용자는 도메인 인증 후 가능합니다.

**다음 단계**:
1. 현재는 자신의 이메일로 테스트 계속
2. 도메인 구매/인증 준비되면 설정
3. 환경 변수 업데이트 후 모든 사용자에게 발송 가능

완벽합니다! 🎉

