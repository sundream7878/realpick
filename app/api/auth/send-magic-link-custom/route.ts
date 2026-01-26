/**
 * 커스텀 템플릿을 사용한 매직링크 발송 API
 * 
 * POST /api/auth/send-magic-link-custom
 * Body: { email: string }
 * 
 * 참고: 이 예시는 Firebase 자체 이메일 대신 
 * Resend를 통해 커스텀 디자인 이메일을 발송합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMagicLinkEmailHtml, generateMagicLinkEmailText } from '@/lib/utils/magic-link-template';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // 이메일 유효성 검사
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Resend 초기화
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Firebase Admin으로 커스텀 매직링크 생성
    const { auth } = await import('firebase-admin/auth');
    const { adminAuth } = await import('@/lib/firebase/admin');
    
    // 이메일 확인 링크 생성
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      handleCodeInApp: true,
    };

    // Firebase Admin SDK로 커스텀 이메일 링크 생성
    // (주의: 이 방법은 Firebase Admin SDK를 사용합니다)
    const link = await adminAuth.generateSignInWithEmailLink(
      email,
      actionCodeSettings
    );

    console.log('[Magic Link] 생성된 링크:', link);

    // 커스텀 이메일 템플릿 생성
    const htmlTemplate = generateMagicLinkEmailHtml(link);
    const textTemplate = generateMagicLinkEmailText(link);

    // 이메일 발송 정보 구성
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@realpick.com';

    // Resend로 이메일 발송
    const sendResult = await resend.emails.send({
      from: `리얼픽 <${fromEmail}>`,
      to: email,
      subject: '🔐 리얼픽 로그인 링크가 도착했습니다',
      html: htmlTemplate,
      text: textTemplate,
    });

    if (sendResult.error) {
      console.error('[Magic Link] 이메일 발송 실패:', sendResult.error);
      return NextResponse.json(
        { success: false, error: '이메일 발송에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log('[Magic Link] 이메일 발송 성공:', email);

    // 이메일 주소를 로컬 스토리지에 저장하도록 클라이언트에 알림
    return NextResponse.json({
      success: true,
      message: '로그인 링크가 이메일로 발송되었습니다.',
      email,
    });

  } catch (error: any) {
    console.error('[Magic Link] 오류 발생:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '알 수 없는 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

/**
 * 사용 예시 (클라이언트):
 * 
 * ```typescript
 * async function sendMagicLink(email: string) {
 *   const response = await fetch('/api/auth/send-magic-link-custom', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ email }),
 *   });
 *   
 *   const data = await response.json();
 *   
 *   if (data.success) {
 *     // 이메일 발송 성공
 *     localStorage.setItem('emailForSignIn', email);
 *     alert('이메일을 확인해주세요!');
 *   } else {
 *     // 오류 처리
 *     alert(data.error);
 *   }
 * }
 * ```
 */
