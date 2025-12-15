/**
 * 이메일 알림 발송 유틸리티
 * Next.js API Route를 호출하여 Resend로 이메일 전송
 */

/**
 * 미션 생성 알림 발송
 */
export async function sendMissionNotification({
  missionId,
  missionTitle,
  category,
  showId,
  creatorId
}: {
  missionId: string
  missionTitle: string
  category?: string
  showId?: string
  creatorId: string
}): Promise<{ success: boolean; error?: string }> {
  console.log('[Email] 🚀 Starting email notification process:', { missionId, missionTitle, category, showId, creatorId })
  
  try {
    // 카테고리가 없으면 알림 발송 안 함
    if (!category) {
      console.log('[Email] ⚠️ No category specified, skipping notification')
      return { success: true }
    }

    // Next.js API Route 호출
    const apiUrl = '/api/send-mission-notification'
    console.log('[Email] 📡 Calling API Route:', apiUrl)

    const payload = {
      missionId,
      missionTitle,
      category,
      showId,
      creatorId
    }
    console.log('[Email] 📦 Payload:', JSON.stringify(payload, null, 2))

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    console.log('[Email] 📥 Response status:', response.status, response.statusText)

    if (!response.ok) {
      const error = await response.text()
      console.error('[Email] ❌ API Route error:', error)
      return { success: false, error }
    }

    const result = await response.json()
    console.log('[Email] ✅ Notification sent successfully:', result)
    return { success: true }
  } catch (error: any) {
    console.error('[Email] 💥 Failed to send notification:', error)
    console.error('[Email] 💥 Error stack:', error.stack)
    return { success: false, error: error.message }
  }
}

