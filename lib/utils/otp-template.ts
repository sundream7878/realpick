/**
 * OTP 인증 코드 이메일 HTML 템플릿 생성 함수
 * @param otpCode - 6자리 인증 코드
 * @returns HTML 형식의 이메일 템플릿
 */
export function generateOtpEmailHtml(otpCode: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>리얼픽 인증 코드</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- 메인 컨테이너 -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); max-width: 600px;">
          
          <!-- 헤더 (리얼픽 그라데이션) -->
          <tr>
            <td style="background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%); padding: 50px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 34px; font-weight: 800; letter-spacing: -1px;">
                리얼픽
              </h1>
              <p style="margin: 12px 0 0 0; color: #E5E7EB; font-size: 15px; letter-spacing: 0.5px; opacity: 0.9;">
                REAL PICK VERIFICATION CODE
              </p>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 700; text-align: center;">
                인증 코드가 도착했습니다
              </h2>
              <p style="margin: 0 0 35px 0; color: #4B5563; font-size: 16px; line-height: 1.7; text-align: center;">
                안녕하세요! 리얼픽에 로그인하시려면<br>아래의 6자리 인증 코드를 입력해 주세요.
              </p>

              <!-- OTP 코드 박스 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #F3F4F6; color: #2C2745; padding: 20px 40px; border-radius: 12px; font-size: 36px; font-weight: 800; letter-spacing: 8px; border: 1px solid #E5E7EB;">
                      ${otpCode}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #9CA3AF; font-size: 14px; text-align: center;">
                이 코드는 5분 동안 유효합니다.
              </p>

              <!-- 보조 안내 -->
              <div style="margin-top: 45px; padding-top: 30px; border-top: 1px solid #F3F4F6;">
                <p style="margin: 0; color: #9CA3AF; font-size: 13px; text-align: center;">
                  인증 코드를 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.
                </p>
              </div>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #F3F4F6;">
              <p style="margin: 0 0 8px 0; color: #9CA3AF; font-size: 12px;">
                본 메일은 본인 확인을 위해 발송되었습니다.<br>
              </p>
              <p style="margin: 0; color: #D1D5DB; font-size: 11px; font-weight: 500;">
                © REALPICK. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * OTP 인증 코드 이메일 텍스트 버전 생성 함수
 */
export function generateOtpEmailText(otpCode: string): string {
  return `
리얼픽 (REALPICK)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

인증 코드가 도착했습니다

안녕하세요! 리얼픽에 로그인하시려면 아래의 6자리 인증 코드를 입력해 주세요.

👉 인증 코드: ${otpCode}

이 코드는 5분 동안 유효합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

본 메일은 본인 확인을 위해 발송되었습니다.
본인이 요청하지 않은 경우 이 메일을 안전하게 무시하셔도 됩니다.

© REALPICK. All rights reserved.
  `.trim();
}
