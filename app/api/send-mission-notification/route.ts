import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase/admin';
import { getShowById } from '@/lib/constants/shows';
import { FieldValue } from 'firebase-admin/firestore';

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
    return null;
  }
  
  if (!resend) {
    try {
      resend = new Resend(trimmedKey);
      console.log('[Mission Notification] ✅ Resend client created');
    } catch (error: any) {
      console.error('[Mission Notification] ❌ Failed to create Resend client:', error);
      return null;
    }
  }
  
  return resend;
}

interface MissionNotificationPayload {
  missionId: string;
  missionTitle: string;
  category: string;
  showId?: string | null;
  creatorId?: string; // Optional for deadline type
  type?: 'new' | 'deadline'; // 'new' is default
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

  if (trimmed.includes('@')) {
    return trimmed;
  }

  if (trimmed && !trimmed.includes('@') && !trimmed.includes('<')) {
    return `리얼픽 <noreply@${trimmed}>`;
  }

  return defaultEmail;
}

// HTML 이메일 템플릿 생성
function generateEmailHtml(params: {
  missionTitle: string;
  category: string;
  categoryName: string;
  showName?: string;
  userNickname: string;
  missionUrl: string;
  baseUrl: string;
}): string {
  const { missionTitle, category, categoryName, showName, userNickname, missionUrl, baseUrl } = params;
  const categoryColor = getCategoryColor(category);
  const profileUrl = `${baseUrl}/p-profile`;

  const displayCategory = showName ? `${categoryName} [${showName}]` : categoryName;

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
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: bold;">리얼픽</h1>
              <p style="margin: 10px 0 0 0; color: #E5E7EB; font-size: 14px;">${displayCategory} 새로운 미션이 도착했습니다!</p>
            </td>
          </tr>
          <!-- 본문 -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.5;">안녕하세요, <strong>${userNickname}</strong>님!</p>
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${categoryColor}; color: #FFFFFF; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">${displayCategory}</span>
              </div>
              <div style="background-color: #F9FAFB; border-left: 4px solid ${categoryColor}; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                <h2 style="margin: 0 0 10px 0; color: #1F2937; font-size: 20px; font-weight: bold;">${missionTitle}</h2>
                <p style="margin: 0; color: #6B7280; font-size: 14px;">관심 카테고리에 새로운 미션이 등록되었습니다. 지금 바로 확인해보세요!</p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-top: 10px; padding-bottom: 20px;">
                    <a href="${missionUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${categoryColor}; color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">미션 확인하기 →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- 푸터 -->
          <tr>
            <td style="background-color: #F3F4F6; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 12px; line-height: 1.5;">이 이메일은 리얼픽 알림 설정에 따라 발송되었습니다.</p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">알림 설정을 변경하려면 <a href="${profileUrl}" style="color: #2563EB; text-decoration: none;">프로필 페이지</a>를 방문하세요.</p>
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

// HTML 이메일 템플릿 생성 (마감 알림)
function generateDeadlineEmailHtml(params: {
  missionTitle: string;
  category: string;
  categoryName: string;
  showName?: string;
  userNickname: string;
  resultsUrl: string;
  baseUrl: string;
}): string {
  const { missionTitle, category, categoryName, showName, userNickname, resultsUrl, baseUrl } = params;
  const categoryColor = getCategoryColor(category);
  const profileUrl = `${baseUrl}/p-profile`;

  const displayCategory = showName ? `${categoryName} [${showName}]` : categoryName;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>미션 마감 알림</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #F9FAFB;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- 헤더 -->
          <tr>
            <td style="background: linear-gradient(135deg, #2C2745 0%, #3E757B 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: bold;">리얼픽</h1>
              <p style="margin: 10px 0 0 0; color: #E5E7EB; font-size: 14px;">참여하신 ${displayCategory} 미션이 마감되었습니다!</p>
            </td>
          </tr>
          <!-- 본문 -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.5;">안녕하세요, <strong>${userNickname}</strong>님!</p>
              <div style="margin-bottom: 20px;">
                <span style="display: inline-block; background-color: ${categoryColor}; color: #FFFFFF; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">${displayCategory}</span>
              </div>
              <div style="background-color: #F9FAFB; border-left: 4px solid ${categoryColor}; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                <h2 style="margin: 0 0 10px 0; color: #1F2937; font-size: 20px; font-weight: bold;">${missionTitle}</h2>
                <p style="margin: 0; color: #6B7280; font-size: 14px;">참여하신 미션이 종료되었습니다. 최종 결과를 확인해보세요!</p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-top: 10px; padding-bottom: 20px;">
                    <a href="${resultsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${categoryColor}; color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">결과 확인하기 →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- 푸터 -->
          <tr>
            <td style="background-color: #F3F4F6; padding: 20px 30px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 12px; line-height: 1.5;">이 이메일은 리얼픽 알림 설정에 따라 발송되었습니다.</p>
              <p style="margin: 0; color: #9CA3AF; font-size: 12px;">알림 설정을 변경하려면 <a href="${profileUrl}" style="color: #2563EB; text-decoration: none;">프로필 페이지</a>를 방문하세요.</p>
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
  try {
    const resendClient = getResendClient();
    if (!resendClient) {
      return NextResponse.json({ success: false, message: 'Resend not configured' }, { status: 500 });
    }

    const payload: MissionNotificationPayload = await request.json();
    const { missionId, missionTitle, category, showId, type = 'new' } = payload;

    console.log(`[Mission Notification] Sending ${type} notification for ${missionTitle}`);

    let userIdsToNotify: string[] = [];

    if (type === 'new') {
      // 1. 새 미션 알림 대상 조회 (카테고리 구독자 모두)
      const prefsSnapshot = await adminDb.collection('notification_preferences')
        .where('categories', 'array-contains', category)
        .get();

      userIdsToNotify = prefsSnapshot.docs.map(doc => doc.id);
      
      // 작성자 본인도 알림을 받고 싶어 한다면 목록에 추가 (이미 있으면 중복 제거)
      if (payload.creatorId && !userIdsToNotify.includes(payload.creatorId)) {
        userIdsToNotify.push(payload.creatorId);
      }
    } else if (type === 'deadline') {
      // 1. 마감 미션 참여자 조회 (Firestore 'pickresult1' & 'pickresult2')
      const [snap1, snap2] = await Promise.all([
        adminDb.collection('pickresult1').where('missionId', '==', missionId).get(),
        adminDb.collection('pickresult2').where('missionId', '==', missionId).get()
      ]);

      const participantIds = [
        ...new Set([
          ...snap1.docs.map(doc => doc.data().userId),
          ...snap2.docs.map(doc => doc.data().userId)
        ])
      ].filter(Boolean) as string[];

      if (participantIds.length > 0) {
        // 2. 참여자 중 마감 알림 활성 사용자 필터링
        const prefsSnapshot = await adminDb.collection('notification_preferences')
          .where('deadlineEmailEnabled', '==', true)
          .where('userId', 'in', participantIds)
          .get();
        
        userIdsToNotify = prefsSnapshot.docs.map(doc => doc.id);
      }
    }

    if (userIdsToNotify.length === 0) {
      return NextResponse.json({ success: true, message: 'No users to notify', sent: 0 });
    }

    // 2. 사용자 정보 및 설정 조회 (Firestore 'users' & 'notification_preferences')
    const users: any[] = [];
    const preferencesMap: Record<string, any> = {};

    for (let i = 0; i < userIdsToNotify.length; i += 30) {
      const chunk = userIdsToNotify.slice(i, i + 30);
      
      const [userSnaps, prefSnaps] = await Promise.all([
        adminDb.collection('users').where('__name__', 'in', chunk).get(),
        adminDb.collection('notification_preferences').where('__name__', 'in', chunk).get()
      ]);

      userSnaps.docs.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
      prefSnaps.docs.forEach(doc => preferencesMap[doc.id] = doc.data());
    }

    // 3. 미션 URL 생성
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://real-pick.com';
    baseUrl = baseUrl.replace(/\/$/, '');
    
    console.log('[Mission Notification] Base URL:', baseUrl);
    console.log('[Mission Notification] Mission ID:', missionId);
    
    const showInfo = showId ? getShowById(showId) : undefined;
    const showName = showInfo?.displayName || showInfo?.name;
    const missionUrl = type === 'deadline' 
      ? `${baseUrl}/p-mission/${missionId}/results`
      : `${baseUrl}/p-mission/${missionId}/vote`;
    
    console.log('[Mission Notification] Generated URL:', missionUrl);

    // 4. 알림 생성 (Email & In-App)
    const results = [];
    const fromEmail = formatFromEmail(process.env.RESEND_FROM_EMAIL);
    const displayCategory = showName ? `${getCategoryName(category)} [${showName}]` : getCategoryName(category);
    const subject = type === 'deadline'
      ? `[리얼픽] 참여하신 ${displayCategory} 미션이 마감되었습니다: ${missionTitle}`
      : `[리얼픽] ${displayCategory} 새 미션이 게시되었습니다!`;

    // In-app 알림 배치를 위한 준비
    const notificationBatch = adminDb.batch();
    const notificationCollection = adminDb.collection('notifications');

    for (const user of users) {
      // 4-1. In-App 알림 생성
      const notificationRef = notificationCollection.doc();
      notificationBatch.set(notificationRef, {
        userId: user.id,
        type: type === 'deadline' ? 'MISSION_CLOSED' : 'NEW_MISSION',
        title: type === 'deadline' ? '미션 마감 알림' : '새로운 미션 알림',
        content: type === 'deadline' 
          ? `참여하신 미션 '${missionTitle}'이(가) 마감되었습니다. 결과를 확인해보세요!`
          : `'${displayCategory}'에 새로운 미션 '${missionTitle}'이(가) 게시되었습니다!`,
        missionId,
        creatorId: payload.creatorId || null,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      // 4-2. Email 발송 (설정된 경우만)
      const userPrefs = preferencesMap[user.id];
      const isEmailEnabled = type === 'deadline' 
        ? userPrefs?.deadlineEmailEnabled !== false // 기본값 true
        : userPrefs?.emailEnabled !== false; // 기본값 true

      if (user.email && isEmailEnabled) {
        try {
          const emailHtml = type === 'deadline'
            ? generateDeadlineEmailHtml({
                missionTitle,
                category,
                categoryName: getCategoryName(category),
                showName,
                userNickname: user.nickname || '사용자',
                resultsUrl: missionUrl,
                baseUrl,
              })
            : generateEmailHtml({
                missionTitle,
                category,
                categoryName: getCategoryName(category),
                showName,
                userNickname: user.nickname || '사용자',
                missionUrl,
                baseUrl,
              });

          // 디버깅: 생성된 이메일 HTML 확인
          console.log('[Mission Notification] Email HTML for', user.email, '- Mission URL:', missionUrl);
          if (emailHtml.includes('image.png')) {
            console.error('[Mission Notification] ⚠️ Email HTML contains "image.png" - this might cause issues');
          }

          const sendResult = await resendClient.emails.send({
            from: fromEmail,
            to: user.email,
            subject: subject,
            html: emailHtml,
          });

          results.push({ success: !sendResult.error, email: user.email });
        } catch (err) {
          console.error(`Failed to send email to ${user.email}:`, err);
          results.push({ success: false, email: user.email });
        }
      }
      
      // Rate limit 회피 (안전하게 50ms)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // In-App 알림 배치 커밋
    await notificationBatch.commit();

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      sent: successCount,
      total: users.length
    });

  } catch (error: any) {
    console.error('[Mission Notification] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
