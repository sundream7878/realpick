# 🔥 Firebase Functions - 리얼픽 매직링크

Firebase Cloud Functions를 사용한 매직링크 이메일 발송 시스템입니다.

## 📁 구조

```
functions/
├── index.js              # 매직링크 템플릿 및 Cloud Functions
├── package.json          # 의존성 패키지
└── README.md            # 이 문서
```

## 🚀 배포하기

### 1. Firebase CLI 로그인

```bash
firebase login
```

### 2. Firebase 프로젝트 설정

```bash
firebase use --add
```

프로젝트를 선택하고 alias를 지정합니다.

### 3. 환경 변수 설정

```bash
# 사이트 URL 설정
firebase functions:config:set site.url="https://realpick.com"

# 설정 확인
firebase functions:config:get
```

### 4. Functions 배포

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 📡 Cloud Functions 목록

### 1. `sendMagicLink` - 매직링크 발송

사용자에게 매직링크를 이메일로 발송합니다.

**엔드포인트:**
```
POST https://<region>-<project-id>.cloudfunctions.net/sendMagicLink
```

**요청 바디:**
```json
{
  "email": "user@example.com"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "로그인 링크가 이메일로 발송되었습니다."
}
```

**클라이언트 사용 예시:**
```javascript
async function sendMagicLinkToUser(email) {
  const response = await fetch('https://<your-function-url>/sendMagicLink', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('이메일 발송 성공!');
  } else {
    console.error('오류:', data.error);
  }
}
```

### 2. `previewMagicLinkTemplate` - 템플릿 미리보기

매직링크 이메일 템플릿을 브라우저에서 미리 볼 수 있습니다.

**엔드포인트:**
```
GET https://<region>-<project-id>.cloudfunctions.net/previewMagicLinkTemplate
```

브라우저에서 이 URL을 열면 템플릿이 렌더링됩니다.

## 🎨 템플릿 함수

### `generateMagicLinkEmailHtml(magicLink)`

HTML 형식의 이메일 템플릿을 생성합니다.

**매개변수:**
- `magicLink` (string): Firebase에서 생성된 매직링크 URL

**반환값:**
- `string`: HTML 이메일 템플릿

**예시:**
```javascript
const html = generateMagicLinkEmailHtml('https://...');
```

### `generateMagicLinkEmailText(magicLink)`

텍스트 형식의 이메일 템플릿을 생성합니다.

**매개변수:**
- `magicLink` (string): Firebase에서 생성된 매직링크 URL

**반환값:**
- `string`: 텍스트 이메일 템플릿

## 🔧 이메일 서비스 연동

현재 `index.js`의 `sendMagicLink` 함수는 템플릿만 생성하고 실제 이메일은 발송하지 않습니다.
실제 이메일을 발송하려면 이메일 서비스를 연동해야 합니다.

### Resend 연동 예시

#### 1. Resend 패키지 설치

```bash
cd functions
npm install resend
```

#### 2. Resend API 키 설정

```bash
firebase functions:config:set resend.api_key="re_xxxxxxxxxx"
firebase functions:config:set resend.from_email="noreply@realpick.com"
```

#### 3. index.js 수정

```javascript
const {Resend} = require('resend');

exports.sendMagicLink = functions.https.onRequest(async (req, res) => {
  // ... 기존 코드 ...
  
  // Resend 초기화
  const resend = new Resend(functions.config().resend.api_key);
  
  // 이메일 발송
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

### SendGrid 연동 예시

#### 1. SendGrid 패키지 설치

```bash
cd functions
npm install @sendgrid/mail
```

#### 2. SendGrid API 키 설정

```bash
firebase functions:config:set sendgrid.api_key="SG.xxxxxxxxxx"
firebase functions:config:set sendgrid.from_email="noreply@realpick.com"
```

#### 3. index.js 수정

```javascript
const sgMail = require('@sendgrid/mail');

exports.sendMagicLink = functions.https.onRequest(async (req, res) => {
  // ... 기존 코드 ...
  
  // SendGrid 초기화
  sgMail.setApiKey(functions.config().sendgrid.api_key);
  
  // 이메일 발송
  await sgMail.send({
    from: functions.config().sendgrid.from_email,
    to: email,
    subject: '🔐 리얼픽 로그인 링크가 도착했습니다',
    html: htmlTemplate,
    text: textTemplate,
  });
  
  // ... 나머지 코드 ...
});
```

## 🧪 로컬 테스트

### Firebase Emulator 사용

```bash
# Emulator 시작
cd functions
npm run serve

# 다른 터미널에서 테스트
curl -X POST http://localhost:5001/<project-id>/<region>/sendMagicLink \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 템플릿 미리보기
# 브라우저에서 열기: http://localhost:5001/<project-id>/<region>/previewMagicLinkTemplate
```

## 📊 로그 확인

```bash
# 실시간 로그 확인
firebase functions:log

# 특정 함수 로그만 확인
firebase functions:log --only sendMagicLink
```

## 🔒 보안 고려사항

1. **API 키 보호**: Firebase Functions Config나 Secret Manager 사용
2. **CORS 설정**: 프로덕션에서는 특정 도메인만 허용
3. **Rate Limiting**: 남용 방지를 위한 요청 제한 구현
4. **이메일 검증**: 유효한 이메일 형식인지 확인

### CORS 설정 강화 예시

```javascript
exports.sendMagicLink = functions.https.onRequest(async (req, res) => {
  // 프로덕션에서는 특정 도메인만 허용
  const allowedOrigins = [
    'https://realpick.com',
    'https://www.realpick.com',
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  
  // ... 나머지 코드 ...
});
```

## 💰 비용 최적화

Firebase Functions는 실행 시간과 호출 횟수에 따라 비용이 발생합니다.

### 무료 할당량 (Spark Plan)
- 호출: 125,000회/월
- GB-초: 40,000 GB-초/월
- CPU-초: 200,000 CPU-초/월

### 최적화 팁
1. **Cold Start 최소화**: 함수를 warm 상태로 유지
2. **메모리 최적화**: 필요한 만큼만 메모리 할당
3. **타임아웃 설정**: 불필요하게 긴 타임아웃 방지

```javascript
exports.sendMagicLink = functions
  .runWith({
    memory: '256MB',  // 메모리 최적화
    timeoutSeconds: 60,  // 타임아웃 설정
  })
  .https.onRequest(async (req, res) => {
    // ... 코드 ...
  });
```

## 📚 추가 자료

- [Firebase Functions 문서](https://firebase.google.com/docs/functions)
- [Firebase Admin SDK 문서](https://firebase.google.com/docs/admin/setup)
- [Resend 문서](https://resend.com/docs)
- [SendGrid 문서](https://docs.sendgrid.com/)

## 🐛 문제 해결

### Functions 배포 실패

```bash
# Firebase CLI 업데이트
npm install -g firebase-tools

# 프로젝트 재설정
firebase use --clear
firebase use --add
```

### 환경 변수가 작동하지 않을 때

```bash
# 환경 변수 확인
firebase functions:config:get

# 환경 변수 삭제 후 재설정
firebase functions:config:unset site.url
firebase functions:config:set site.url="https://realpick.com"

# 재배포
firebase deploy --only functions
```

---

**제작**: RealPick Team  
**최종 업데이트**: 2026-01-26
