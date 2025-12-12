# 🚀 Supabase Edge Function 배포 (CLI 없이)

CLI 설치 없이 Supabase Dashboard에서 직접 Edge Function을 배포하는 방법입니다.

---

## 방법 1: Supabase Dashboard에서 직접 생성 (권장) ⭐

### Step 1: Edge Functions 페이지 접속

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 → **Edge Functions** 클릭

### Step 2: 새 Function 생성

1. **Create a new function** 버튼 클릭
2. Function 이름 입력: `send-mission-notification`
3. **Create function** 클릭

### Step 3: 코드 복사 & 붙여넣기

Editor에서 다음 코드 전체를 복사해서 붙여넣기:

```typescript
// 프로젝트의 이 파일 내용을 복사:
// supabase/functions/send-mission-notification/index.ts

// 또는 아래 코드 전체 복사
```

**전체 코드는 `supabase/functions/send-mission-notification/index.ts` 파일 참조**

### Step 4: Deploy 버튼 클릭

1. 코드 붙여넣기 완료 후
2. 우측 상단 **Deploy** 버튼 클릭
3. 배포 완료까지 기다리기 (1-2분)

### Step 5: 환경 변수 설정

1. 배포 완료 후 **Settings** 탭 클릭
2. **Secrets** 섹션으로 이동
3. 다음 환경 변수 추가:

| 키 | 값 | 설명 |
|---|---|---|
| `SMTP_USER` | `your-email@gmail.com` | Gmail 주소 |
| `SMTP_PASS` | `abcdefghijklmnop` | Gmail 앱 비밀번호 (16자리) |

4. **Save** 버튼 클릭

---

## 방법 2: GitHub 연동 (자동 배포)

### Step 1: GitHub Repository 연동

1. Supabase Dashboard → **Edge Functions**
2. **Connect to GitHub** 클릭
3. Repository 선택: `realpick-1`
4. Branch 선택: `main` (또는 현재 사용 중인 브랜치)

### Step 2: Function 경로 설정

1. Function path: `supabase/functions/send-mission-notification`
2. **Save** 클릭

### Step 3: 자동 배포 확인

- 이제 GitHub에 push할 때마다 자동으로 배포됩니다!
- `supabase/functions/` 폴더의 변경사항이 자동 반영됩니다.

---

## 배포 확인

### 1. Edge Functions 목록 확인

Supabase Dashboard → **Edge Functions**에서 `send-mission-notification` 함수가 표시되어야 합니다.

### 2. 테스트 호출

```javascript
// 브라우저 콘솔에서 테스트
const supabaseUrl = 'YOUR_SUPABASE_URL'
const anonKey = 'YOUR_ANON_KEY'

fetch(`${supabaseUrl}/functions/v1/send-mission-notification`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`
  },
  body: JSON.stringify({
    missionId: 'test-id',
    missionTitle: '테스트 미션',
    category: 'LOVE',
    showId: 'nasolo',
    creatorId: 'test-creator'
  })
})
.then(res => res.json())
.then(data => console.log(data))
```

### 3. 로그 확인

Supabase Dashboard → **Edge Functions** → `send-mission-notification` → **Logs** 탭

---

## 문제 해결

### "Function not found" 에러
- Function 이름이 정확히 `send-mission-notification`인지 확인
- Deploy가 완료되었는지 확인 (Status: Active)

### SMTP 에러
- Secrets에 `SMTP_USER`, `SMTP_PASS`가 올바르게 설정되어 있는지 확인
- Gmail 앱 비밀번호가 16자리인지 확인 (공백 제거)

### CORS 에러
- 코드에 CORS 헤더가 포함되어 있는지 확인
- `Access-Control-Allow-Origin: *` 확인

---

## 다음 단계

✅ Edge Function 배포 완료 후:
1. Gmail SMTP 환경 변수 설정
2. 테스트 미션 생성
3. 이메일 수신 확인

---

**🎉 CLI 없이도 완벽하게 배포할 수 있습니다!**

