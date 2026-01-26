# 🔐 리얼픽 매직링크 이메일 템플릿 가이드

리얼픽 브랜드 디자인이 적용된 매직링크 로그인 이메일 템플릿입니다.

## 📁 파일 구조

```
lib/utils/
├── magic-link-template.ts           # 핵심 템플릿 함수
├── magic-link-template-example.ts   # 사용 예시
└── MAGIC_LINK_README.md            # 이 문서

app/api/auth/
└── send-magic-link-custom/
    └── route.ts                     # API 라우트 예시
```

## 🎨 템플릿 디자인 특징

- **리얼픽 브랜드 그라데이션**: `#2C2745` → `#3E757B`
- **반응형 디자인**: 모바일/데스크톱 최적화
- **접근성**: 텍스트 버전 포함 (HTML 미지원 클라이언트용)
- **깔끔한 UI**: 모던한 카드 레이아웃, 부드러운 그림자

## 🚀 빠른 시작

### 1. 기본 사용법

```typescript
import { generateMagicLinkEmailHtml } from '@/lib/utils/magic-link-template';

// Firebase에서 생성된 매직링크
const magicLink = 'https://realpick.com/auth/callback?apiKey=xxx&oobCode=xxx';

// HTML 템플릿 생성
const emailHtml = generateMagicLinkEmailHtml(magicLink);

console.log(emailHtml); // 완성된 HTML 출력
```

### 2. Resend와 함께 사용

```typescript
import { Resend } from 'resend';
import { 
  generateMagicLinkEmailHtml, 
  generateMagicLinkEmailText 
} from '@/lib/utils/magic-link-template';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: '리얼픽 <noreply@realpick.com>',
  to: 'user@example.com',
  subject: '🔐 리얼픽 로그인 링크가 도착했습니다',
  html: generateMagicLinkEmailHtml(magicLink),
  text: generateMagicLinkEmailText(magicLink), // 텍스트 버전
});
```

### 3. API 라우트 예시

전체 구현 예시는 `/app/api/auth/send-magic-link-custom/route.ts`를 참고하세요.

```typescript
// POST /api/auth/send-magic-link-custom
// Body: { email: string }

const response = await fetch('/api/auth/send-magic-link-custom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' }),
});

const data = await response.json();
// { success: true, message: "로그인 링크가 이메일로 발송되었습니다." }
```

## 🔧 환경 변수 설정

`.env.local` 파일에 다음 변수를 추가하세요:

```bash
# Resend API 키
RESEND_API_KEY=re_xxxxxxxxxx

# 발신 이메일 주소
RESEND_FROM_EMAIL=noreply@realpick.com

# 사이트 URL (매직링크 리다이렉트용)
NEXT_PUBLIC_SITE_URL=https://realpick.com
```

## 📋 함수 레퍼런스

### `generateMagicLinkEmailHtml(magicLink: string): string`

HTML 형식의 이메일 템플릿을 생성합니다.

**매개변수:**
- `magicLink` (string): Firebase에서 생성된 매직링크 URL

**반환값:**
- `string`: 완성된 HTML 이메일 템플릿

**예시:**
```typescript
const html = generateMagicLinkEmailHtml('https://...');
```

### `generateMagicLinkEmailText(magicLink: string): string`

텍스트 형식의 이메일 템플릿을 생성합니다. (HTML 미지원 클라이언트용)

**매개변수:**
- `magicLink` (string): Firebase에서 생성된 매직링크 URL

**반환값:**
- `string`: 텍스트 이메일 템플릿

## 🎯 Firebase vs 커스텀 템플릿

### Firebase 기본 이메일

```typescript
// Firebase가 자체 디자인 이메일을 발송
await sendSignInLinkToEmail(auth, email, actionCodeSettings);
```

**장점:**
- 간단한 설정
- 별도 이메일 서비스 불필요

**단점:**
- 디자인 커스터마이징 불가
- 브랜드 일관성 유지 어려움

### 커스텀 템플릿 (이 모듈)

```typescript
// Firebase Admin SDK로 링크 생성 + Resend로 커스텀 이메일 발송
const link = await adminAuth.generateSignInWithEmailLink(email, settings);
await resend.emails.send({
  html: generateMagicLinkEmailHtml(link),
  // ...
});
```

**장점:**
- 완벽한 브랜드 일관성
- 자유로운 디자인 커스터마이징
- 발송 통계 추적 가능

**단점:**
- Firebase Admin SDK 필요
- 별도 이메일 서비스(Resend) 필요
- 약간 더 복잡한 설정

## 🔒 보안 고려사항

1. **HTTPS 필수**: 매직링크는 반드시 HTTPS를 통해 전송되어야 합니다.
2. **일회용 링크**: Firebase는 링크를 자동으로 일회용으로 처리합니다.
3. **시간 제한**: 링크는 일정 시간 후 만료됩니다.
4. **이메일 저장**: 클라이언트에서 이메일을 `localStorage`에 저장해야 콜백 페이지에서 사용자를 식별할 수 있습니다.

```typescript
// 이메일 발송 전
localStorage.setItem('emailForSignIn', email);

// 콜백 페이지에서
const email = localStorage.getItem('emailForSignIn');
```

## 📱 반응형 디자인

이 템플릿은 다음 환경에서 테스트되었습니다:

- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (Web, Desktop)
- ✅ Apple Mail (macOS, iOS)
- ✅ Naver 메일
- ✅ Daum 메일

## 🎨 디자인 커스터마이징

템플릿 색상을 변경하려면 `magic-link-template.ts` 파일에서 다음 값을 수정하세요:

```typescript
// 헤더 그라데이션
background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%);

// 버튼 배경
background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%);

// 링크 색상
color: #3E757B;
```

## 📊 발송 로그 확인

Resend 대시보드에서 다음 정보를 확인할 수 있습니다:

- 발송 성공/실패 여부
- 이메일 오픈률
- 링크 클릭률
- 반송(Bounce) 정보

## 🐛 문제 해결

### 이메일이 도착하지 않을 때

1. **스팸 폴더 확인**: Gmail의 경우 프로모션 탭도 확인
2. **발신자 인증**: SPF, DKIM, DMARC 레코드 확인
3. **Resend 로그 확인**: 대시보드에서 발송 상태 확인
4. **환경 변수 확인**: `RESEND_API_KEY`와 `RESEND_FROM_EMAIL` 설정 확인

### 링크가 작동하지 않을 때

1. **링크 만료 확인**: 매직링크는 시간 제한이 있습니다
2. **이메일 저장 확인**: `localStorage`에 이메일이 저장되었는지 확인
3. **URL 설정 확인**: `NEXT_PUBLIC_SITE_URL`이 올바른지 확인

## 📚 추가 자료

- [Firebase Auth 문서](https://firebase.google.com/docs/auth)
- [Resend 문서](https://resend.com/docs)
- [이메일 템플릿 베스트 프랙티스](https://www.goodemailcode.com/)

## 📝 라이선스

이 템플릿은 리얼픽 프로젝트의 일부입니다.

---

**제작**: RealPick Team  
**최종 업데이트**: 2026-01-26
