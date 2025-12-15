/**
 * Email Service
 * 
 * Handles sending emails for notifications, verification, etc.
 * Currently uses a mock implementation that logs to console.
 * Can be switched to Resend, Nodemailer, or AWS SES later.
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    if (!process.env.RESEND_API_KEY) {
      console.warn("⚠️ [Email Service] RESEND_API_KEY is missing. Falling back to console log.");
      console.log(`📧 To: ${to}\nSubject: ${subject}\nHTML: ${html.substring(0, 50)}...`);
      return { success: true };
    }

    try {
      // 2. Send via Resend
      const { data, error } = await resend.emails.send({
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
  <style>
    body { margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; max-width: 600px;">
          <tr>
            <td style="background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 32px; font-weight: bold;">리얼픽</h1>
              <p style="margin: 10px 0 0 0; color: #E5E7EB; font-size: 14px;">LOGIN VERIFICATION CODE</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1F2937; font-size: 22px;">로그인 인증 코드 안내</h2>
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                안녕하세요, 리얼픽에 로그인 할 권한을 확인하기 위해 인증 코드를 생성했습니다.<br>
                아래 인증 코드를 입력해 주세요.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%); border-radius: 12px; padding: 2px;">
                      <tr>
                        <td style="background-color: #FFFFFF; border-radius: 10px; padding: 25px 40px;">
                          <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 12px; text-align: center;">리얼픽 인증 코드</p>
                          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #2C2745; font-family: 'Courier New', monospace;">
                            ${code}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0 0; color: #6B7280; font-size: 14px;">
                이 코드는 발송 시간으로부터 <strong style="color: #3E757B;">10분 동안 유효</strong>합니다.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; color: #6B7280; font-size: 12px;">© 리얼픽. All rights reserved.</p>
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
