# Supabase 매직링크 이메일 템플릿 설정 가이드

매직링크 인증을 위한 이메일 템플릿 설정 가이드입니다.

## 📧 이메일 템플릿 수정 방법

### 1단계: Supabase 대시보드 접속

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. RealPick 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** → **Email Templates** 클릭
4. **"Magic link"** 탭 선택

### 2단계: Subject 수정

**Subject** 필드:
```
RealPick 로그인 링크
```

### 3단계: Body 수정

**Body** 섹션에서 **"Source"** 탭 클릭 후 다음 템플릿으로 수정:

```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #e11d48; font-size: 32px; margin: 0;">RealPick</h1>
  </div>
  
  <div style="background: linear-gradient(135deg, #fef2f2 0%, #fce7f3 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; border: 2px solid #fecdd3;">
    <h2 style="color: #333; font-size: 24px; margin-top: 0; margin-bottom: 15px;">로그인 링크</h2>
    <p style="font-size: 16px; color: #333; margin-bottom: 25px;">안녕하세요!</p>
    <p style="font-size: 16px; color: #333; margin-bottom: 30px;">RealPick 로그인을 위해 아래 링크를 클릭해주세요:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #e11d48 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(225, 29, 72, 0.3);">
        로그인하기
      </a>
    </div>
    
    <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e; margin-top: 25px;">
      <p style="font-size: 14px; color: #166534; margin: 0;">
        <strong>💡 안내:</strong> 위 링크를 클릭하면 자동으로 로그인됩니다.
      </p>
    </div>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 14px; color: #6b7280; margin: 0;">
      이 링크는 <strong>10분 동안</strong> 유효합니다.
    </p>
    <p style="font-size: 14px; color: #6b7280; margin: 10px 0 0 0;">
      만약 이 요청을 하지 않으셨다면, 이 이메일을 무시하셔도 됩니다.
    </p>
  </div>
</div>
```

### 4단계: 저장

- **Save** 버튼 클릭하여 저장

---

## 📝 주요 변경사항

### OTP 방식 → 매직링크 방식

**변경 전 (OTP):**
- `{{.Token}}` 사용 (6자리 숫자 코드)
- "6자리 코드를 앱에 입력해주세요" 안내

**변경 후 (매직링크):**
- `{{.ConfirmationURL}}` 사용 (로그인 링크)
- "링크를 클릭하세요" 안내
- 버튼 형태의 링크 제공

---

## ✅ 확인 사항

- [ ] Subject가 "RealPick 로그인 링크"로 변경됨
- [ ] Body에 `{{.ConfirmationURL}}` 사용
- [ ] "링크를 클릭하세요" 안내 문구 포함
- [ ] Save 버튼 클릭하여 저장 완료

---

## 🧪 테스트 방법

1. 로그인 모달에서 이메일 입력
2. 이메일 수신 확인
3. 이메일의 "로그인하기" 버튼 클릭
4. `/auth/callback`으로 리다이렉트되는지 확인
5. 추가 정보 입력 페이지 또는 홈으로 이동하는지 확인

---

설정이 완료되면 매직링크 인증이 정상적으로 작동합니다! 🎉

