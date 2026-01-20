# Netlify 환경 변수 디버깅 가이드

## 🔍 현재 상황
- 환경 변수 3개가 Netlify에 설정되어 있음
- 하지만 500 에러가 여전히 발생

## ✅ 체크리스트

### 1. 재배포 확인
- [ ] 환경 변수 설정 후 **재배포**를 했나요?
- [ ] **Clear cache and deploy** 옵션을 사용했나요?

### 2. FIREBASE_PRIVATE_KEY 형식 확인

#### 올바른 값 예시:
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...[중략]...aBcD==\n-----END PRIVATE KEY-----\n"
```

#### 확인 포인트:
- [ ] 맨 앞에 큰따옴표(`"`)가 있나요?
- [ ] 맨 뒤에 큰따옴표(`"`)가 있나요?
- [ ] `\n`이 문자 그대로 `\n`으로 되어 있나요? (실제 줄바꿈이 아님)
- [ ] `-----BEGIN PRIVATE KEY-----`로 시작하나요?
- [ ] `-----END PRIVATE KEY-----`로 끝나나요?

### 3. 환경 변수 값 재확인

#### FIREBASE_PROJECT_ID
```
realpick-a090d
```

#### FIREBASE_CLIENT_EMAIL
```
firebase-adminsdk-xxxxx@realpick-a090d.iam.gserviceaccount.com
```

#### FIREBASE_PRIVATE_KEY
- Firebase Console에서 다운로드한 JSON 파일의 `private_key` 값 전체
- **반드시 큰따옴표를 포함**하여 복사

### 4. Service Account 권한 확인

Firebase Console에서:
1. Project Settings → Service Accounts
2. 사용 중인 Service Account 확인
3. **Firestore Admin** 권한이 있는지 확인

## 🐛 디버깅 방법

### A. Netlify Function 로그 확인

1. Netlify Dashboard → **Functions** 탭
2. 에러 로그 확인
3. 다음 메시지를 찾으세요:
   ```
   ❌ Firebase Admin 환경 변수가 누락되었습니다
   ```

### B. 브라우저 콘솔 확인

1. 웹사이트 접속
2. F12 → Console 탭
3. 다음 에러 확인:
   ```
   [Public Shows API] ❌ adminDb가 초기화되지 않았습니다
   ```

### C. API 직접 호출 테스트

브라우저 콘솔에서:
```javascript
fetch('https://your-site.netlify.app/api/public/shows')
  .then(r => r.json())
  .then(console.log)
```

## 🔧 해결 방법

### 방법 1: 환경 변수 재설정

1. Netlify에서 3개 환경 변수 **모두 삭제**
2. Firebase Console에서 새로운 Service Account 키 생성
3. 다운로드한 JSON 파일에서 값 복사
4. Netlify에 다시 설정:
   - `FIREBASE_PROJECT_ID`: JSON의 `project_id` 값
   - `FIREBASE_CLIENT_EMAIL`: JSON의 `client_email` 값
   - `FIREBASE_PRIVATE_KEY`: JSON의 `private_key` 값 (**큰따옴표 포함**)
5. **Clear cache and deploy** 실행

### 방법 2: PRIVATE_KEY 수동 수정

Netlify 환경 변수에서 `FIREBASE_PRIVATE_KEY`를 수정할 때:

1. Firebase JSON의 `private_key` 값 복사
2. 텍스트 에디터(VS Code 등)에 붙여넣기
3. 실제 줄바꿈을 `\n`으로 변경:
   ```
   "-----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBg...
   ...
   -----END PRIVATE KEY-----
   "
   ```
   ↓ 변경
   ```
   "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n...\n-----END PRIVATE KEY-----\n"
   ```
4. 전체를 복사하여 Netlify 환경 변수에 붙여넣기

### 방법 3: 로컬 `.env.local` 값 사용

로컬에서 작동하는 경우, `.env.local` 파일의 값을 그대로 복사:

1. 프로젝트 루트의 `.env.local` 파일 열기
2. `FIREBASE_PRIVATE_KEY` 값 복사 (전체)
3. Netlify 환경 변수에 그대로 붙여넣기

## 📞 추가 도움

위 방법으로도 해결되지 않으면:
1. Netlify **Deploy log** 전체 스크린샷
2. Netlify **Functions log** 스크린샷
3. 브라우저 콘솔 에러 메시지
위 3가지를 확인하여 공유해주세요.
