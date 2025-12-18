import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Resend 클라이언트는 필요할 때 초기화 (환경 변수 체크 후)
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Mission Notification] RESEND_API_KEY is not set');
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Supabase 서비스 롤 클라이언트 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface MissionNotificationPayload {
  missionId: string;
  missionTitle: string;
  category: string;
  showId?: string | null;
  creatorId: string;
}

// 카테고리 이름 매핑
function getCategoryName(category: string): string {
  const categoryMap: Record<string, string> = {
    LOVE: '로맨스',
    VICTORY: '서바이벌',
    STAR: '오디션',
  };
  return categoryMap[category] || category;
}

// 카테고리별 색상
function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    LOVE: '#F43F5E', // rose-500
    VICTORY: '#2563EB', // blue-600
    STAR: '#EAB308', // yellow-500
  };
  return colorMap[category] || '#6B7280';
}

// HTML 이메일 템플릿 생성
function generateEmailHtml(params: {
  missionTitle: string;
  category: string;
  categoryName: string;
  userNickname: string;
  missionUrl: string;
  baseUrl: string;
}): string {
  const { missionTitle, category, categoryName, userNickname, missionUrl, baseUrl } = params;
  const categoryColor = getCategoryColor(category);
  const profileUrl = `${baseUrl}/p-profile`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새로운 미션 알림</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #F9FAFB;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- 헤더 -->
          <tr>
            <td style="background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%); padding: 30px; text-align: center;">
              <img src="${baseUrl}/realpick-logo-new.png" alt="리얼픽 로고" style="height: 40px; margin-bottom: 10px;" />
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: bold;">
                리얼픽
              </h1>
              <p style="margin: 10px 0 0 0; color: #E5E7EB; font-size: 14px;">
                새로운 미션이 도착했습니다!
              </p>
            </td>
          </tr>

          <!-- 본문 -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- 인사말 -->
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.5;">
                안녕하세요, <strong>${userNickname}</strong>님!
              </p>

              <!-- 카테고리 배지 -->
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${categoryColor}; color: #FFFFFF; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                  ${categoryName}
                </span>
              </div>

              <!-- 미션 제목 -->
              <div style="background-color: #F9FAFB; border-left: 4px solid ${categoryColor}; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                <h2 style="margin: 0 0 10px 0; color: #1F2937; font-size: 20px; font-weight: bold;">
                  ${missionTitle}
                </h2>
                <p style="margin: 0; color: #6B7280; font-size: 14px;">
                  관심 카테고리에 새로운 미션이 등록되었습니다.
                </p>
              </div>

              <!-- CTA 버튼 -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-top: 10px; padding-bottom: 20px;">
                    <a href="${missionUrl}" style="display: inline-block; background-color: ${categoryColor}; color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                      미션 확인하기 →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 안내 메시지 -->
              <p style="margin: 20px 0 0 0; color: #9CA3AF; font-size: 14px; line-height: 1.5;">
                지금 바로 참여하여 다른 사용자들과 함께 픽을 선택해보세요!
              </p>
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background-color: #F3F4F6; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 12px; line-height: 1.5;">
                이 이메일은 리얼픽 알림 설정에 따라 발송되었습니다.
              </p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                알림 설정을 변경하려면 
                <a href="${profileUrl}" style="color: #2563EB; text-decoration: none;">프로필 페이지</a>
                를 방문하세요.
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

export async function POST(request: NextRequest) {
  console.log('[Mission Notification] 🎯 API Route called!');
  
  try {
    // 0. Resend API 키 체크
    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[Mission Notification] ⚠️ RESEND_API_KEY is not set; skipping email notifications');
      return NextResponse.json(
        { success: true, message: 'Email notifications skipped (no API key)', sent: 0 },
        { status: 200 }
      );
    }

    // 1. 요청 본문 파싱
    const payload: MissionNotificationPayload = await request.json();
    const { missionId, missionTitle, category, showId, creatorId } = payload;

    console.log('[Mission Notification] 📦 Received request:', { missionId, missionTitle, category, showId, creatorId });
    console.log('[Mission Notification] 🔐 Environment check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 7) + '...',
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      fromEmail: process.env.RESEND_FROM_EMAIL
    });

    // 2. 알림 수신 대상 조회
    // - 이메일 알림이 활성화되어 있고
    // - 해당 카테고리를 구독 중인 사용자
    // - 미션 생성자는 제외
    const { data: preferences, error: prefError } = await supabaseAdmin
      .from('t_notification_preferences')
      .select(`
        f_user_id,
        f_email_enabled,
        f_categories,
        user:f_user_id (
          f_email,
          f_nickname
        )
      `)
      .eq('f_email_enabled', true)
      .contains('f_categories', [category])
      .neq('f_user_id', creatorId);

    if (prefError) {
      console.error('[Mission Notification] Error fetching preferences:', prefError);
      return NextResponse.json(
        { error: 'Failed to fetch notification preferences', details: prefError.message },
        { status: 500 }
      );
    }

    if (!preferences || preferences.length === 0) {
      console.log('[Mission Notification] No users to notify');
      return NextResponse.json(
        { success: true, message: 'No users to notify', sent: 0 },
        { status: 200 }
      );
    }

    console.log(`[Mission Notification] Found ${preferences.length} users to notify`);

    // 3. 미션 URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const missionUrl = `${baseUrl}/p-mission/${missionId}/vote`;

    // 4. 이메일 발송 (순차 처리로 rate limit 회피)
    const results = [];
    
    for (const pref of preferences) {
      const userEmail = pref.user.f_email;
      const userNickname = pref.user.f_nickname || '사용자';

      try {
        const emailHtml = generateEmailHtml({
          missionTitle,
          category,
          categoryName: getCategoryName(category),
          userNickname,
          missionUrl,
          baseUrl,
        });

        const { data, error } = await resendClient.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: userEmail,
          subject: `[리얼픽] 새로운 ${getCategoryName(category)} 미션!`,
          html: emailHtml,
        });

        if (error) {
          console.error(`[Mission Notification] Failed to send email to ${userEmail}:`, error);
          results.push({
            success: false,
            email: userEmail,
            error: error.message || JSON.stringify(error),
          });
        } else {
          console.log(`[Mission Notification] Successfully sent email to ${userEmail} (ID: ${data?.id})`);
          results.push({
            success: true,
            email: userEmail,
            emailId: data?.id,
          });
        }

        // Rate limit 회피: 각 이메일 발송 후 600ms 대기 (초당 1.6개 = 안전)
        if (preferences.indexOf(pref) < preferences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      } catch (error: any) {
        console.error(`[Mission Notification] Unexpected error sending to ${userEmail}:`, error);
        results.push({
          success: false,
          email: userEmail,
          error: error.message,
        });
      }
    }
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[Mission Notification] Email sending complete: ${successCount} success, ${failureCount} failed`);

    return NextResponse.json(
      {
        success: true,
        message: 'Mission notifications sent',
        sent: successCount,
        failed: failureCount,
        results,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Mission Notification] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

