import { NextRequest, NextResponse } from 'next/server';
import { generateOtpEmailHtml, generateOtpEmailText } from '@/lib/utils/otp-template';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: '서버 설정 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 6자리 랜덤 코드 생성
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후 만료

    // Firestore에 OTP 저장
    await adminDb.collection('otp_codes').doc(email).set({
      code: otpCode,
      expiresAt: expiresAt,
      createdAt: new Date(),
    });

    // Resend 초기화
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 커스텀 이메일 템플릿 생성
    const htmlTemplate = generateOtpEmailHtml(otpCode);
    const textTemplate = generateOtpEmailText(otpCode);

    // 이메일 발송 정보 구성
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@real-pick.com';

    // Resend로 이메일 발송
    const sendResult = await resend.emails.send({
      from: `리얼픽 <${fromEmail}>`,
      to: email,
      subject: `🔐 리얼픽 인증 코드 [${otpCode}]`,
      html: htmlTemplate,
      text: textTemplate,
    });

    if (sendResult.error) {
      console.error('[OTP] 이메일 발송 실패:', sendResult.error);
      return NextResponse.json(
        { success: false, error: '이메일 발송에 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log('[OTP] 이메일 발송 성공:', email, otpCode);

    return NextResponse.json({
      success: true,
      message: '인증 코드가 이메일로 발송되었습니다.',
    });

  } catch (error: any) {
    console.error('[OTP] 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
