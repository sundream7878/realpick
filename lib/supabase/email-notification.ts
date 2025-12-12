/**
 * 이메일 알림 발송 유틸리티
 * Supabase Edge Function을 호출하여 Gmail SMTP로 이메일 전송
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
  try {
    // 카테고리가 없으면 알림 발송 안 함
    if (!category) {
      console.log('[Email] No category specified, skipping notification')
      return { success: true }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Email] Supabase credentials not configured')
      return { success: false, error: 'Supabase credentials not configured' }
    }

    // Supabase Edge Function 호출
    const functionUrl = `${supabaseUrl}/functions/v1/send-mission-notification`

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        missionId,
        missionTitle,
        category,
        showId,
        creatorId
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Email] Edge Function error:', error)
      return { success: false, error }
    }

    const result = await response.json()
    console.log('[Email] Notification sent:', result)
    return { success: true }
  } catch (error: any) {
    console.error('[Email] Failed to send notification:', error)
    return { success: false, error: error.message }
  }
}

