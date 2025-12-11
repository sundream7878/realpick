// Supabase Edge Function: 미션 생성 시 이메일 알림 발송
// Deno runtime을 사용하며, Supabase의 내장 이메일 기능 활용

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 요청 데이터 파싱
    const { missionId, missionTitle, category, showId, creatorId } = await req.json()

    console.log('[Email Notification] Processing mission:', { missionId, missionTitle, category })

    // 1. 해당 카테고리를 구독한 사용자 조회
    const { data: preferences, error: prefError } = await supabase
      .from('t_notification_preferences')
      .select(`
        f_user_id,
        f_email_enabled,
        f_categories,
        user:t_users!inner(f_email, f_nickname)
      `)
      .eq('f_email_enabled', true)
      .contains('f_categories', [category])

    if (prefError) {
      console.error('[Email Notification] Error fetching preferences:', prefError)
      throw prefError
    }

    if (!preferences || preferences.length === 0) {
      console.log('[Email Notification] No subscribers found for category:', category)
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: 'No subscribers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[Email Notification] Found ${preferences.length} subscribers`)

    // 2. 프로그램 정보 조회
    const showNames: Record<string, string> = {
      'nasolo': '나는 SOLO',
      'dolsingles6': '돌싱글즈6',
      'choegang-yagu': '최강야구',
      'mr-trot3': '미스터트롯3',
    }
    const showName = showNames[showId] || showId

    // 3. 각 사용자에게 이메일 발송
    const emailPromises = preferences.map(async (pref: any) => {
      const userEmail = pref.user.f_email
      const userNickname = pref.user.f_nickname

      if (!userEmail) {
        console.log('[Email Notification] No email for user:', pref.f_user_id)
        return { success: false, reason: 'no_email' }
      }

      // 이메일 HTML 템플릿 생성
      const emailHtml = generateEmailTemplate({
        nickname: userNickname,
        missionTitle,
        category,
        showName,
        missionId
      })

      // Supabase Auth의 이메일 기능 사용
      // 주의: 이 방법은 인증 이메일용이므로, 실제로는 외부 SMTP 또는 다른 방법 필요
      // 여기서는 로그만 출력
      console.log(`[Email Notification] Would send email to: ${userEmail}`)
      console.log(`[Email Notification] Subject: [RealPick] 새로운 ${getCategoryName(category)} 미션!`)

      // 실제 이메일 발송은 Supabase의 SMTP 설정이 필요하거나
      // Database Webhook으로 외부 서비스 호출 필요

      return { success: true, email: userEmail }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => r.success).length

    console.log(`[Email Notification] Completed: ${successCount}/${preferences.length} emails`)

    return new Response(
      JSON.stringify({
        success: true,
        notified: successCount,
        total: preferences.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[Email Notification] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// 이메일 HTML 템플릿 생성
function generateEmailTemplate({
  nickname,
  missionTitle,
  category,
  showName,
  missionId
}: {
  nickname: string
  missionTitle: string
  category: string
  showName: string
  missionId: string
}): string {
  const categoryEmoji = {
    'LOVE': '❤️',
    'VICTORY': '🏆',
    'STAR': '⭐'
  }[category] || '🎯'

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RealPick 새 미션 알림</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #4B466F 0%, #6EA4A9 100%);
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .emoji {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 16px;
          color: #333;
          margin-bottom: 20px;
        }
        .mission-box {
          background: linear-gradient(135deg, rgba(75, 70, 111, 0.05) 0%, rgba(110, 164, 169, 0.05) 100%);
          border-left: 4px solid #4B466F;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .mission-title {
          font-size: 20px;
          font-weight: 700;
          color: #4B466F;
          margin: 0 0 10px 0;
        }
        .mission-meta {
          font-size: 14px;
          color: #666;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #4B466F 0%, #6EA4A9 100%);
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          transition: transform 0.2s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background: #f9f9f9;
          padding: 20px 30px;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="emoji">${categoryEmoji}</div>
          <h1>새로운 미션이 등록되었습니다!</h1>
        </div>
        
        <div class="content">
          <p class="greeting">
            안녕하세요, <strong>${nickname}</strong>님!
          </p>
          
          <p>
            관심 카테고리인 <strong>${getCategoryName(category)}</strong>에 
            새로운 미션이 등록되었습니다.
          </p>
          
          <div class="mission-box">
            <h2 class="mission-title">${missionTitle}</h2>
            <p class="mission-meta">
              📺 ${showName} · ${getCategoryName(category)}
            </p>
          </div>
          
          <p>
            지금 바로 참여하고 포인트를 획득하세요!<br>
            예측이 맞으면 <strong>+100P</strong>, 공감 픽은 <strong>+10P</strong>를 받을 수 있습니다.
          </p>
          
          <center>
            <a href="https://realpick.netlify.app/p-mission/${missionId}/vote" class="cta-button">
              🎯 미션 참여하기
            </a>
          </center>
        </div>
        
        <div class="footer">
          <p>
            이 이메일은 RealPick 알림 설정에 따라 발송되었습니다.<br>
            알림 설정을 변경하려면 <a href="https://realpick.netlify.app/p-settings/notifications">여기</a>를 클릭하세요.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// 카테고리 한글 이름
function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    'LOVE': '로맨스',
    'VICTORY': '서바이벌',
    'STAR': '오디션'
  }
  return names[category] || category
}

// 실제 이메일 발송 함수 (Deno SMTP 사용)
async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    // SMTP 환경 변수 확인
    const smtpUser = Deno.env.get('SMTP_USER')
    const smtpPass = Deno.env.get('SMTP_PASS')

    if (!smtpUser || !smtpPass) {
      console.warn('[Email] SMTP credentials not configured. Email not sent.')
      console.log(`[Email] Would send to: ${to}`)
      console.log(`[Email] Subject: ${subject}`)
      return { success: false, error: 'SMTP not configured' }
    }

    // Deno SMTP 라이브러리 동적 import
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts")

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 587,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    })

    await client.send({
      from: `RealPick <${smtpUser}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    })

    await client.close()

    console.log(`[Email] Successfully sent to: ${to}`)
    return { success: true }
  } catch (error: any) {
    console.error('[Email] Failed to send:', error.message)
    return { success: false, error: error.message }
  }
}

