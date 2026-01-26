# ⚡ 빠른 시작 가이드 - Firebase Functions 매직링크

5분 안에 매직링크 이메일 발송 시스템을 셋업하세요!

## 📦 1단계: 패키지 설치

```bash
cd functions
npm install
```

## 🔑 2단계: Firebase 프로젝트 설정

```bash
# Firebase 로그인
firebase login

# 프로젝트 선택
firebase use --add
# 프롬프트에서 프로젝트를 선택하고 alias 입력 (예: production)
```

## ⚙️ 3단계: 환경 변수 설정

```bash
# 사이트 URL 설정
firebase functions:config:set site.url="https://realpick.com"

# 설정 확인
firebase functions:config:get
```

출력 예시:
```json
{
  "site": {
    "url": "https://realpick.com"
  }
}
```

## 🚀 4단계: Functions 배포

```bash
# functions 폴더에서 빠져나가기
cd ..

# 배포
firebase deploy --only functions
```

배포가 완료되면 다음과 같은 URL이 출력됩니다:
```
✔ functions[sendMagicLink]: https://asia-northeast3-realpick.cloudfunctions.net/sendMagicLink
✔ functions[previewMagicLinkTemplate]: https://asia-northeast3-realpick.cloudfunctions.net/previewMagicLinkTemplate
```

## 🧪 5단계: 테스트

### 방법 1: 브라우저에서 템플릿 미리보기

배포된 `previewMagicLinkTemplate` URL을 브라우저에서 열어보세요:
```
https://asia-northeast3-<your-project>.cloudfunctions.net/previewMagicLinkTemplate
```

### 방법 2: cURL로 매직링크 발송 테스트

```bash
curl -X POST https://asia-northeast3-<your-project>.cloudfunctions.net/sendMagicLink \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

응답 예시:
```json
{
  "success": true,
  "message": "로그인 링크가 이메일로 발송되었습니다.",
  "link": "https://realpick.com/auth/callback?..."
}
```

### 방법 3: JavaScript에서 호출

```javascript
async function testMagicLink() {
  const response = await fetch('https://asia-northeast3-<your-project>.cloudfunctions.net/sendMagicLink', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'user@example.com'
    }),
  });
  
  const data = await response.json();
  console.log(data);
}

testMagicLink();
```

## 📧 6단계: 이메일 서비스 연동 (선택)

현재는 매직링크만 생성하고 실제 이메일은 발송하지 않습니다.
실제 이메일을 발송하려면 이메일 서비스를 연동하세요.

### Resend 연동 (권장)

```bash
# 1. Resend 패키지 설치
cd functions
npm install resend

# 2. API 키 설정
firebase functions:config:set resend.api_key="re_xxxxxxxxxx"
firebase functions:config:set resend.from_email="noreply@realpick.com"

# 3. index.js 수정 (아래 코드 참고)

# 4. 재배포
cd ..
firebase deploy --only functions
```

**index.js 수정 예시:**

```javascript
// 파일 상단에 추가
const {Resend} = require('resend');

// sendMagicLink 함수 안에서 이메일 발송 부분 수정
exports.sendMagicLink = functions.https.onRequest(async (req, res) => {
  // ... 기존 코드 ...
  
  // Resend로 이메일 발송
  const resend = new Resend(functions.config().resend.api_key);
  
  await resend.emails.send({
    from: functions.config().resend.from_email,
    to: email,
    subject: '🔐 리얼픽 로그인 링크가 도착했습니다',
    html: htmlTemplate,
    text: textTemplate,
  });
  
  // ... 나머지 코드 ...
});
```

## 🔍 7단계: 로그 확인

```bash
# 실시간 로그 스트리밍
firebase functions:log

# 특정 함수만 확인
firebase functions:log --only sendMagicLink
```

## ✅ 완료!

이제 매직링크 이메일 발송 시스템이 준비되었습니다! 🎉

### 다음 단계

- [ ] 프론트엔드에서 `sendMagicLink` 함수 호출 구현
- [ ] 이메일 서비스 연동 (Resend, SendGrid 등)
- [ ] 에러 핸들링 강화
- [ ] Rate Limiting 추가
- [ ] 모니터링 및 알림 설정

## 🆘 문제가 생겼나요?

### 배포 실패

```bash
# Firebase CLI 업데이트
npm install -g firebase-tools@latest

# 다시 시도
firebase deploy --only functions --force
```

### 환경 변수가 작동하지 않을 때

```bash
# 환경 변수 확인
firebase functions:config:get

# 환경 변수 재설정
firebase functions:config:set site.url="https://realpick.com"
firebase deploy --only functions
```

### CORS 에러

`index.js`의 CORS 설정을 확인하세요:
```javascript
res.set('Access-Control-Allow-Origin', '*');
```

프로덕션에서는 특정 도메인만 허용하도록 변경:
```javascript
res.set('Access-Control-Allow-Origin', 'https://realpick.com');
```

## 📚 더 자세한 정보

자세한 내용은 `functions/README.md`를 참고하세요!

---

**Happy Coding! 🚀**
