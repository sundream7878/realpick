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
        from: 'RealPick <onboarding@resend.dev>', // Default Resend test domain or verified domain
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
   */
  sendVerificationCode: async (email: string, code: string) => {
    const subject = "[RealPick] 인증 코드를 확인해주세요";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4B466F;">RealPick 인증</h1>
        <p>안녕하세요,</p>
        <p>로그인을 위한 인증 코드는 다음과 같습니다:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p>이 코드는 10분간 유효합니다.</p>
      </div>
    `;

    return emailService.send({ to: email, subject, html, text: `인증 코드: ${code}` });
  }
};
