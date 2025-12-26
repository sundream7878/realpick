import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/service';

// Resend 클라이언트는 필요할 때 초기화 (환경 변수 체크 후)
let resend: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn('[Mission Notification] RESEND_API_KEY is not set');
    return null;
  }
  
  // API Key 형식 검증
  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith('re_')) {
    console.error('[Mission Notification] ⚠️ RESEND_API_KEY format is invalid (should start with "re_")');
    console.error('[Mission Notification] Key starts with:', trimmedKey.substring(0, 5));
    return null;
  }
  
  // 키에 공백이나 줄바꿈이 있는지 확인
  if (apiKey !== trimmedKey || apiKey.includes('\n') || apiKey.includes('\r')) {
    console.warn('[Mission Notification] ⚠️ RESEND_API_KEY contains whitespace, trimming...');
  }
  
  if (!resend) {
    try {
      resend = new Resend(trimmedKey);
      console.log('[Mission Notification] ✅ Resend client created with key:', trimmedKey.substring(0, 10) + '...');
    } catch (error: any) {
      console.error('[Mission Notification] ❌ Failed to create Resend client:', error);
      return null;
    }
  }
  
  return resend;
}

// Supabase 서비스 롤 클라이언트는 createServiceClient() 사용 (다른 API와 일관성 유지)

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

// Resend from 필드 형식 검증 및 변환
function formatFromEmail(emailOrDomain: string | undefined, defaultEmail: string = 'onboarding@resend.dev'): string {
  if (!emailOrDomain) {
    return defaultEmail;
  }

  const trimmed = emailOrDomain.trim();

  // 이미 올바른 이메일 형식인지 확인 (email@domain.com 또는 Name <email@domain.com>)
  if (trimmed.includes('@')) {
    // 이메일 주소가 포함되어 있으면 그대로 반환
    return trimmed;
  }

  // 도메인만 있는 경우: noreply@도메인 형식으로 변환
  if (trimmed && !trimmed.includes('@') && !trimmed.includes('<')) {
    console.warn(`[Mission Notification] ⚠️ RESEND_FROM_EMAIL is domain only (${trimmed}), converting to noreply@${trimmed}`);
    return `리얼픽 <noreply@${trimmed}>`;
  }

  // 그 외의 경우 기본값 사용
  console.warn(`[Mission Notification] ⚠️ RESEND_FROM_EMAIL format is invalid (${trimmed}), using default: ${defaultEmail}`);
  return defaultEmail;
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
    // 0. 환경 변수 체크 (Supabase) - 상세 로깅
    console.log('[Mission Notification] 🔍 Environment variables check:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'MISSING',
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'NOT SET',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET'
    });

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [];
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      
      console.warn('[Mission Notification] ⚠️ Missing environment variables:', missing);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Notifications skipped (no Supabase config)', 
          missing: missing,
          sent: 0 
        },
        { status: 500 }
      );
    }

    // 1. Resend API 키 체크
    const resendApiKey = process.env.RESEND_API_KEY;
    const trimmedKey = resendApiKey?.trim();
    
    console.log('[Mission Notification] 🔑 Resend API Key check:', {
      hasKey: !!resendApiKey,
      keyLength: resendApiKey ? resendApiKey.length : 0,
      trimmedLength: trimmedKey ? trimmedKey.length : 0,
      keyPrefix: trimmedKey ? trimmedKey.substring(0, 10) + '...' : 'MISSING',
      keyStartsWith: trimmedKey ? (trimmedKey.startsWith('re_') ? '✅ Correct format (re_)' : '❌ Wrong format') : 'MISSING',
      hasWhitespace: resendApiKey && resendApiKey !== trimmedKey,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'NOT SET (will use onboarding@resend.dev)'
    });
    
    // 키에 문제가 있는지 확인
    if (resendApiKey && resendApiKey !== trimmedKey) {
      console.warn('[Mission Notification] ⚠️ RESEND_API_KEY contains leading/trailing whitespace! This may cause authentication issues.');
    }

    const resendClient = getResendClient();
    if (!resendClient) {
      console.warn('[Mission Notification] ⚠️ RESEND_API_KEY is not set; skipping email notifications');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Email notifications skipped (no API key)', 
          error: 'RESEND_API_KEY environment variable is missing',
          sent: 0 
        },
        { status: 500 }
      );
    }

    // 2. 요청 본문 파싱
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

    // 3. 알림 수신 대상 조회
    // - 이메일 알림이 활성화되어 있고
    // - 해당 카테고리를 구독 중인 사용자
    // - 미션 생성자는 제외
    let supabaseClient;
    try {
      supabaseClient = createServiceClient();
      console.log('[Mission Notification] ✅ Supabase service client created');
    } catch (error: any) {
      console.error('[Mission Notification] ❌ Failed to create Supabase service client:', error);
      return NextResponse.json(
        { 
          error: 'Failed to initialize Supabase client', 
          details: error.message,
          hint: 'Check SUPABASE_SERVICE_ROLE_KEY environment variable in Netlify'
        },
        { status: 500 }
      );
    }

    // 먼저 Supabase 연결 테스트 (간단한 쿼리로)
    console.log('[Mission Notification] Testing Supabase connection...');
    const { data: testData, error: testError } = await supabaseClient
      .from('t_users')
      .select('f_id')
      .limit(1);
    
    if (testError) {
      console.error('[Mission Notification] ❌ Supabase connection test failed:', {
        code: testError.code,
        message: testError.message,
        details: testError.details,
        hint: testError.hint
      });
      
      if (testError.message?.includes('Invalid API key') || testError.message?.includes('JWT')) {
        return NextResponse.json(
          { 
            error: 'Invalid Supabase API key', 
            details: testError.message,
            hint: 'The SUPABASE_SERVICE_ROLE_KEY may be incorrect. Check if you are using the Service Role Key (not Anon Key) from Supabase Dashboard → Settings → API → service_role section'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Supabase connection failed', 
          details: testError.message,
          code: testError.code
        },
        { status: 500 }
      );
    }
    
    console.log('[Mission Notification] ✅ Supabase connection test passed');

    // 먼저 알림 설정만 조회 (RLS 우회를 위해 Service Role 사용)
    console.log('[Mission Notification] Querying preferences for category:', category);
    console.log('[Mission Notification] Creator ID to exclude:', creatorId);
    
    // 1단계: 이메일 알림이 활성화된 모든 사용자 조회 (배열 필터링은 JavaScript에서)
    const { data: allPreferences, error: prefError } = await supabaseClient
      .from('t_notification_preferences')
      .select(`
        f_user_id,
        f_email_enabled,
        f_categories
      `)
      .eq('f_email_enabled', true)
      .neq('f_user_id', creatorId);
    
    console.log('[Mission Notification] Raw query result:', {
      hasData: !!allPreferences,
      count: allPreferences?.length || 0,
      error: prefError ? {
        code: prefError.code,
        message: prefError.message,
        details: prefError.details,
        hint: prefError.hint
      } : null,
      sampleData: allPreferences?.slice(0, 2) // 처음 2개만 샘플로
    });

    if (prefError) {
      console.error('[Mission Notification] Error fetching preferences:', prefError);
      console.error('[Mission Notification] Error details:', {
        code: prefError.code,
        message: prefError.message,
        details: prefError.details,
        hint: prefError.hint
      });
      
      // 테이블이 없는 경우와 API 키 오류를 구분
      if (prefError.code === 'PGRST116' || prefError.message?.includes('relation') || prefError.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Notification preferences table not found', 
            details: 't_notification_preferences table may not exist. Run scripts/create_notification_preferences.sql',
            errorCode: prefError.code
          },
          { status: 500 }
        );
      }
      
      if (prefError.message?.includes('Invalid API key') || prefError.message?.includes('JWT')) {
        return NextResponse.json(
          { 
            error: 'Invalid Supabase API key', 
            details: 'SUPABASE_SERVICE_ROLE_KEY is invalid or expired. Check Netlify environment variables.',
            hint: 'Get the Service Role Key from Supabase Dashboard → Settings → API'
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Failed to fetch notification preferences', 
          details: prefError.message,
          code: prefError.code,
          hint: prefError.hint
        },
        { status: 500 }
      );
    }

    // 2단계: JavaScript에서 카테고리 필터링 (배열에 해당 카테고리가 포함되어 있는지)
    const preferences = (allPreferences || []).filter(pref => {
      const categories = pref.f_categories || [];
      const hasCategory = Array.isArray(categories) && categories.includes(category);
      console.log(`[Mission Notification] User ${pref.f_user_id}: categories=${JSON.stringify(categories)}, hasCategory=${hasCategory}`);
      return hasCategory;
    });

    console.log(`[Mission Notification] After filtering: ${preferences.length} users to notify (out of ${allPreferences?.length || 0} total)`);

    if (!preferences || preferences.length === 0) {
      console.log('[Mission Notification] No users to notify after category filtering');
      return NextResponse.json(
        { success: true, message: 'No users to notify', sent: 0 },
        { status: 200 }
      );
    }

    // 4. 사용자 정보 조회 (user_id 목록으로)
    const userIds = preferences.map(p => p.f_user_id);
    const { data: users, error: usersError } = await supabaseClient
      .from('t_users')
      .select('f_id, f_email, f_nickname')
      .in('f_id', userIds);

    if (usersError) {
      console.error('[Mission Notification] Error fetching users:', usersError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch user information', 
          details: usersError.message 
        },
        { status: 500 }
      );
    }

    // 사용자 정보를 Map으로 변환 (빠른 조회)
    const userMap = new Map(
      (users || []).map(u => [u.f_id, { email: u.f_email, nickname: u.f_nickname || '사용자' }])
    );

    // 5. 미션 URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '') || 'http://localhost:3000';
    const missionUrl = `${baseUrl}/p-mission/${missionId}/vote`;

    // 6. 이메일 발송 (순차 처리로 rate limit 회피)
    const results = [];
    
    for (const pref of preferences) {
      const userInfo = userMap.get(pref.f_user_id);
      if (!userInfo || !userInfo.email) {
        console.warn(`[Mission Notification] User info not found for ${pref.f_user_id}`);
        continue;
      }

      const userEmail = userInfo.email;
      const userNickname = userInfo.nickname;

      try {
        const emailHtml = generateEmailHtml({
          missionTitle,
          category,
          categoryName: getCategoryName(category),
          userNickname,
          missionUrl,
          baseUrl,
        });

        // from 필드 형식 검증 및 변환
        let fromEmail = formatFromEmail(process.env.RESEND_FROM_EMAIL);
        console.log(`[Mission Notification] 📧 Sending email to ${userEmail} from ${fromEmail}`);
        
        let data, error;
        let retryWithDefault = false;

        // 첫 번째 시도
        const sendResult = await resendClient.emails.send({
          from: fromEmail,
          to: userEmail,
          subject: `[리얼픽] 새로운 ${getCategoryName(category)} 미션!`,
          html: emailHtml,
        });

        data = sendResult.data;
        error = sendResult.error;

        // 도메인 인증 에러인 경우 기본값으로 재시도
        if (error && (
          error.message?.includes('domain is not verified') ||
          error.message?.includes('not verified') ||
          error.statusCode === 422
        )) {
          console.warn(`[Mission Notification] ⚠️ Domain verification error for ${fromEmail}, retrying with default email`);
          retryWithDefault = true;
          fromEmail = 'onboarding@resend.dev';
          
          // 기본 이메일로 재시도
          const retryResult = await resendClient.emails.send({
            from: fromEmail,
            to: userEmail,
            subject: `[리얼픽] 새로운 ${getCategoryName(category)} 미션!`,
            html: emailHtml,
          });
          
          data = retryResult.data;
          error = retryResult.error;
          
          if (!error) {
            console.log(`[Mission Notification] ✅ Successfully sent email with fallback address (ID: ${data?.id})`);
          }
        }

        if (error) {
          console.error(`[Mission Notification] ❌ Failed to send email to ${userEmail}:`, {
            statusCode: error.statusCode,
            name: error.name,
            message: error.message,
            fullError: error,
            retriedWithDefault: retryWithDefault
          });
          
          // Resend API Key 오류인 경우 명확한 메시지
          if (error.statusCode === 401 || error.message?.includes('API key') || error.message?.includes('invalid')) {
            console.error('[Mission Notification] 🔴 RESEND_API_KEY is invalid or expired!');
            console.error('[Mission Notification] 💡 Solution: Get a new API key from https://resend.com/api-keys and update Netlify environment variable');
          }
          
          // 도메인 인증 에러 안내
          if (error.message?.includes('domain is not verified') || error.message?.includes('not verified')) {
            console.error('[Mission Notification] 🔴 Domain is not verified in Resend!');
            console.error('[Mission Notification] 💡 Solution: Add and verify your domain at https://resend.com/domains');
            console.error('[Mission Notification] 💡 Temporary: Using onboarding@resend.dev as fallback (already attempted)');
          }
          
          results.push({
            success: false,
            email: userEmail,
            error: error.message || JSON.stringify(error),
            statusCode: error.statusCode,
            errorName: error.name
          });
        } else {
          console.log(`[Mission Notification] ✅ Successfully sent email to ${userEmail} (ID: ${data?.id})${retryWithDefault ? ' [used fallback]' : ''}`);
          results.push({
            success: true,
            email: userEmail,
            emailId: data?.id,
            usedFallback: retryWithDefault
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

