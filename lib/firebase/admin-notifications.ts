import { adminDb } from "./admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 모든 (또는 특정 카테고리 구독) 사용자에게 새 미션 알림을 생성합니다.
 */
export async function createGlobalNotification({
  missionId,
  missionTitle,
  category,
  creatorId = "AI_SYSTEM",
  creatorNickname = "AI 생성",
}: {
  missionId: string;
  missionTitle: string;
  category: string;
  creatorId?: string;
  creatorNickname?: string;
}) {
  if (!adminDb) {
    console.error("❌ [Admin Notification] adminDb가 초기화되지 않았습니다.");
    return { success: false };
  }

  try {
    console.log(`[Admin Notification] 알림 생성 시작: ${missionTitle} (${category})`);

    // 1. 해당 카테고리를 구독 중인 사용자들 조회
    // (또는 전체 사용자에게 보내고 싶다면 'users' 컬렉션을 조회)
    const prefsSnapshot = await adminDb.collection('notification_preferences')
      .where('categories', 'array-contains', category)
      .get();

    if (prefsSnapshot.empty) {
      console.log("[Admin Notification] 알림을 보낼 대상 사용자가 없습니다.");
      return { success: true, count: 0 };
    }

    const userIds = prefsSnapshot.docs.map(doc => doc.id);
    const notificationBatch = adminDb.batch();
    const notificationsRef = adminDb.collection('notifications');

    // 2. 각 사용자별 알림 문서 생성 (Firestore Batch 사용 - 한 번에 최대 500개)
    // 실제로는 사용자가 많을 경우 여러 번에 나누어 처리해야 함
    userIds.forEach(userId => {
      const newNotifRef = notificationsRef.doc();
      notificationBatch.set(newNotifRef, {
        userId,
        type: "NEW_MISSION",
        title: "새로운 미션 알림",
        content: `'${category}' 카테고리에 새로운 미션 '${missionTitle}'이(가) 게시되었습니다!`,
        missionId,
        creatorId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    await notificationBatch.commit();
    console.log(`[Admin Notification] ${userIds.length}명의 사용자에게 알림 전송 완료`);
    
    return { success: true, count: userIds.length };
  } catch (error) {
    console.error("❌ [Admin Notification] 알림 생성 중 오류:", error);
    return { success: false, error };
  }
}
