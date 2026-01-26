const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {Resend} = require("resend");

// Firebase Admin 초기화
admin.initializeApp();

// Resend 초기화
// TODO: 프로덕션에서는 환경 변수로 관리하세요!
const resend = new Resend("re_gxzfTvTf_HtxYZHLZxgBRzA6A4X8YY82F");

/* eslint-disable max-len */
/**
 * 매직링크 이메일 HTML 템플릿 생성 함수
 * @param {string} magicLink - Firebase에서 생성된 매직링크 URL
 * @return {string} HTML 형식의 이메일 템플릿
 */
function generateMagicLinkEmailHtml(magicLink) {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>리얼픽 로그인</title>
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
                REAL PICK MAGIC LINK
              </p>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px; font-weight: 700; text-align: center;">
                로그인 링크가 도착했습니다
              </h2>
              <p style="margin: 0 0 35px 0; color: #4B5563; font-size: 16px; line-height: 1.7; text-align: center;">
                안녕하세요! 리얼픽에 로그인하시려면<br>아래 버튼을 클릭해 주세요. 별도의 비밀번호 없이 바로 접속됩니다.
              </p>

              <!-- CTA 버튼 -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%); color: #FFFFFF; text-decoration: none; padding: 18px 50px; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 15px rgba(44, 39, 69, 0.3);">
                      리얼픽 시작하기
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 보조 안내 -->
              <div style="margin-top: 45px; padding-top: 30px; border-top: 1px solid #F3F4F6;">
                <p style="margin: 0 0 10px 0; color: #9CA3AF; font-size: 13px; text-align: center;">
                  버튼이 작동하지 않나요? 아래 링크를 복사하여 브라우저에 붙여넣어 주세요.
                </p>
                <p style="margin: 0; color: #3E757B; font-size: 12px; text-align: center; word-break: break-all;">
                  <a href="${magicLink}" style="color: #3E757B; text-decoration: underline;">${magicLink}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #F3F4F6;">
              <p style="margin: 0 0 8px 0; color: #9CA3AF; font-size: 12px;">
                본 메일은 본인 확인을 위해 발송되었습니다.<br>
                본인이 요청하지 않은 경우 이 메일을 안전하게 무시하셔도 됩니다.
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
/* eslint-enable max-len */

/**
 * 매직링크 이메일 텍스트 버전 생성 함수
 * @param {string} magicLink - Firebase에서 생성된 매직링크 URL
 * @return {string} 텍스트 형식의 이메일 템플릿
 */
function generateMagicLinkEmailText(magicLink) {
  return `
리얼픽 (REALPICK)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

로그인 링크가 도착했습니다

안녕하세요! 리얼픽에 로그인하시려면 아래 링크를 클릭해 주세요.
별도의 비밀번호 없이 바로 접속됩니다.

👉 로그인 링크:
${magicLink}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

본 메일은 본인 확인을 위해 발송되었습니다.
본인이 요청하지 않은 경우 이 메일을 안전하게 무시하셔도 됩니다.

© REALPICK. All rights reserved.
  `.trim();
}

/**
 * 매직링크 발송 Cloud Function (실제 이메일 발송 포함!)
 *
 * 사용 예시:
 * POST https://<region>-<project-id>.cloudfunctions.net/sendMagicLink
 * Body: { "email": "user@example.com" }
 */
exports.sendMagicLink = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const {email, redirectUrl} = req.body;

    // 이메일 유효성 검사
    if (!email || !email.includes("@")) {
      res.status(400).json({
        success: false,
        error: "유효한 이메일 주소를 입력해주세요.",
      });
      return;
    }

    // Firebase Admin SDK로 매직링크 생성
    // redirectUrl이 제공되면 사용, 없으면 기본값 사용
    const callbackUrl = redirectUrl || "https://realpick.com/auth/callback";

    console.log("[Magic Link] Using callback URL:", callbackUrl);

    const actionCodeSettings = {
      url: callbackUrl,
      handleCodeInApp: true,
    };

    const link = await admin.auth().generateSignInWithEmailLink(
        email,
        actionCodeSettings,
    );

    console.log("[Magic Link] 생성된 링크:", link);

    // 이메일 템플릿 생성
    const htmlTemplate = generateMagicLinkEmailHtml(link);
    const textTemplate = generateMagicLinkEmailText(link);

    // Resend로 실제 이메일 발송!
    const fromEmail = "onboarding@resend.dev";

    console.log("[Magic Link] 이메일 발송 시작:", email);

    const emailResult = await resend.emails.send({
      from: `리얼픽 <${fromEmail}>`,
      to: email,
      subject: "🔐 리얼픽 로그인 링크가 도착했습니다",
      html: htmlTemplate,
      text: textTemplate,
    });

    console.log("[Magic Link] 이메일 발송 완료:", emailResult);

    res.status(200).json({
      success: true,
      message: "로그인 링크가 이메일로 발송되었습니다.",
      emailId: emailResult.id,
    });
  } catch (error) {
    console.error("[Magic Link] 오류 발생:", error);

    res.status(500).json({
      success: false,
      error: error.message || "알 수 없는 오류가 발생했습니다.",
    });
  }
});

/**
 * 템플릿 미리보기용 Cloud Function (개발용)
 *
 * GET https://<region>-<project-id>.cloudfunctions.net/previewMagicLinkTemplate
 */
exports.previewMagicLinkTemplate = functions.https.onRequest((req, res) => {
  const demoLink = "https://realpick.com/auth/callback?" +
    "apiKey=demo&oobCode=demo123&mode=signIn";
  const html = generateMagicLinkEmailHtml(demoLink);

  res.set("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
});

// 템플릿 함수를 다른 함수에서도 사용할 수 있도록 export
exports.generateMagicLinkEmailHtml = generateMagicLinkEmailHtml;
exports.generateMagicLinkEmailText = generateMagicLinkEmailText;
