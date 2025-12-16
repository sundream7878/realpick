# Resend 이메일 알림 빠른 시작 가이드

## ⚡ 5분 안에 설정하기

### 1️⃣ Resend API 키 발급

1. [Resend](https://resend.com) 회원가입/로그인
2. **API Keys** 메뉴 이동
3. **Create API Key** 클릭
4. 이름: `RealPick-Mission-Notifications-Production`
5. 권한: **Sending Access** 선택
6. API 키 복사

### 2️⃣ 환경 변수 설정

`.env.local` 파일에 추가:

```bash
# Resend Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

> 💡 도메인 인증 전까지는 `onboarding@resend.dev`를 사용합니다.

### 3️⃣ 개발 서버 재시작

```bash
npm run dev
```

### 4️⃣ 테스트

1. 사용자 A: 프로필 페이지에서 이메일 알림 활성화
2. 사용자 B: 미션 생성
3. 사용자 A의 이메일 확인 ✉️

---

## 🎯 구조

```
미션 생성
  ↓
missions.ts (createMission)
  ↓
email-notification.ts (sendMissionNotification)
  ↓
/api/send-mission-notification (Next.js API Route)
  ↓
Resend API
  ↓
사용자 이메일 ✅
```

---

## 📊 모니터링

- **Resend 대시보드**: https://resend.com/emails
- 발송 내역, 열람률, 에러 등 확인 가능

---

## 🔐 보안 경고

⚠️ **API 키가 노출되었다면 즉시 재발급하세요!**

1. Resend 대시보드 → API Keys
2. 기존 키 삭제
3. 새 키 발급
4. `.env.local` 업데이트

---

## ✅ 완료!

이제 RealPick의 미션 알림 시스템이 Resend로 작동합니다! 🚀


