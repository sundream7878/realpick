/**
 * 매직링크 이메일 템플릿 사용 예시
 * 
 * 이 파일은 magic-link-template.ts의 사용법을 보여줍니다.
 * 실제 프로덕션 코드에서는 이 파일을 import하지 마세요.
 */

import { generateMagicLinkEmailHtml, generateMagicLinkEmailText } from './magic-link-template';

/**
 * 예시 1: Firebase sendSignInLinkToEmail과 함께 사용
 * 
 * 참고: Firebase는 자체적으로 이메일을 발송하므로,
 * 커스텀 템플릿을 사용하려면 Resend 같은 별도 서비스가 필요합니다.
 */
async function exampleWithResend() {
  // 1. Firebase에서 매직링크 생성 (실제로는 sendSignInLinkToEmail 사용)
  const magicLink = 'https://realpick.com/auth/callback?apiKey=xxx&oobCode=xxx&mode=signIn';
  
  // 2. 이메일 템플릿 생성
  const htmlTemplate = generateMagicLinkEmailHtml(magicLink);
  const textTemplate = generateMagicLinkEmailText(magicLink);
  
  // 3. Resend로 이메일 발송 (예시)
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: '리얼픽 <noreply@realpick.com>',
    to: 'user@example.com',
    subject: '리얼픽 로그인 링크입니다',
    html: htmlTemplate,
    text: textTemplate, // HTML 미지원 클라이언트용
  });
}

/**
 * 예시 2: API 라우트에서 사용
 */
export async function POST_MagicLinkExample(request: Request) {
  const { email } = await request.json();
  
  // Firebase로 매직링크 생성 (실제 구현)
  const { auth } = await import('firebase/auth');
  const { sendSignInLinkToEmail } = await import('firebase/auth');
  
  const actionCodeSettings = {
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    handleCodeInApp: true,
  };
  
  // Firebase 자체 이메일 대신 커스텀 템플릿 사용
  // (주의: Firebase는 자체 이메일을 보내므로, 커스텀 템플릿을 사용하려면 다른 방법이 필요)
  
  return Response.json({ success: true });
}

/**
 * 예시 3: 단순 HTML 미리보기용
 */
export function previewMagicLinkEmail() {
  const demoLink = 'https://realpick.com/auth/callback?apiKey=demo&oobCode=demo123&mode=signIn';
  const html = generateMagicLinkEmailHtml(demoLink);
  
  console.log('=== 매직링크 이메일 HTML 미리보기 ===');
  console.log(html);
  
  return html;
}

/**
 * 실제 사용 시 권장사항:
 * 
 * 1. Firebase + Resend 조합:
 *    - Firebase의 sendSignInLinkToEmail은 자체 이메일을 발송합니다
 *    - 커스텀 템플릿을 사용하려면 Firebase Action URL을 직접 생성하고
 *      Resend로 이메일을 발송해야 합니다
 * 
 * 2. 보안 고려사항:
 *    - 매직링크는 일회용이며 시간 제한이 있어야 합니다
 *    - HTTPS를 통해서만 전송해야 합니다
 *    - 링크에 사용자 식별 정보가 노출되지 않도록 주의하세요
 * 
 * 3. UX 개선:
 *    - 이메일 발송 후 사용자에게 "이메일을 확인하세요" 메시지 표시
 *    - 링크 클릭 후 자동 로그인 및 원래 페이지로 리다이렉트
 *    - 링크 만료 시 재발송 옵션 제공
 */

// 테스트용 내보내기
if (process.env.NODE_ENV === 'development') {
  console.log('매직링크 템플릿 모듈이 로드되었습니다.');
  console.log('previewMagicLinkEmail()을 호출하면 미리보기를 볼 수 있습니다.');
}
