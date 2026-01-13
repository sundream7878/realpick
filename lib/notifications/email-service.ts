/**
 * Email Service
 * 
 * Handles sending emails for notifications, verification, etc.
 * Currently uses a mock implementation that logs to console.
 * Can be switched to Resend, Nodemailer, or AWS SES later.
 */

import { Resend } from 'resend';

// Resend 클라이언트를 필요할 때만 초기화
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  /**
   * Send an email using Resend
   */
  send: async ({ to, subject, html, text }: SendEmailParams): Promise<{ success: boolean; error?: string }> => {
    // 1. Check for API Key
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn("⚠️ [Email Service] RESEND_API_KEY is missing. Falling back to console log.");
      console.log(`📧 To: ${to}\nSubject: ${subject}\nHTML: ${html.substring(0, 50)}...`);
      return { success: true };
    }

    try {
      // 2. Send via Resend
      const { data, error } = await resendClient.emails.send({
        from: '리얼픽 <onboarding@resend.dev>', // Default Resend test domain or verified domain
        to: [to],
        subject: subject,
        html: html,
        text: text,
      });

      if (error) {
        console.error("❌ [Email Service] Resend Error:", error);
        return { success: false, error: error.message };
      }

      console.log("✅ [Email Service] Email sent via Resend:", data?.id);
      return { success: true };
    } catch (err: any) {
      console.error("❌ [Email Service] Unexpected Error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Send a verification code email (Example)
   * Note: 실제 인증은 Supabase OTP를 사용하므로 이 함수는 예시용입니다.
   */
  sendVerificationCode: async (email: string, code: string) => {
    const subject = "[리얼픽] 로그인 인증 코드";
    const html = `
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
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); max-width: 600px;">
          
          <!-- 헤더 (리얼픽 그라데이션) -->
          <tr>
            <td style="background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%); padding: 50px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 34px; font-weight: 800; letter-spacing: -1px;">
                리얼픽
              </h1>
              <p style="margin: 12px 0 0 0; color: #E5E7EB; font-size: 15px; letter-spacing: 0.5px; opacity: 0.9;">
                LOGIN VERIFICATION CODE
              </p>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 700; text-align: center;">
                로그인 인증 코드 안내
              </h2>
              <p style="margin: 0 0 35px 0; color: #4B5563; font-size: 16px; line-height: 1.7; text-align: center;">
                안녕하세요! 리얼픽에 로그인하시려면<br>아래 인증 코드를 입력해 주세요.
              </p>

              <!-- 인증 코드 박스 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%); border-radius: 12px; padding: 2px;">
                      <tr>
                        <td style="background-color: #FFFFFF; border-radius: 10px; padding: 25px 40px;">
                          <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-align: center; font-weight: 500;">리얼픽 인증 코드</p>
                          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #2C2745; font-family: 'Courier New', monospace;">
                            ${code}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 14px; text-align: center;">
                이 코드는 발송 시간으로부터 <strong style="color: #3E757B;">10분 동안 유효</strong>합니다.
              </p>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #F3F4F6;">
              <p style="margin: 0 0 8px 0; color: #9CA3AF; font-size: 12px;">
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
    `;

    return emailService.send({ to: email, subject, html, text: `[리얼픽] 인증 코드: ${code}\n\n이 코드는 10분간 유효합니다.` });
  }
};
