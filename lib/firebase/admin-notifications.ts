import { adminDb } from "./admin";
import { FieldValue } from "firebase-admin/firestore";

const NOTIFICATION_USER_LIMIT = 500;

/**
 * 알림을 받을 대상 사용자 ID 목록 (봇 제외, 전체 유저 또는 구독자).
 * 배치 알림용으로 카테고리 무관 전체 대상 반환.
 */
export async function getNotificationTargetUserIds(): Promise<string[]> {
  if (!adminDb) return [];
  const usersSnapshot = await adminDb.collection("users").limit(NOTIFICATION_USER_LIMIT).get();
  return usersSnapshot.docs
    .filter((doc) => !doc.data().isBot)
    .map((doc) => doc.id);
}

/**
 * 매일 정오(12시)·저녁(19시) 배치: 해당 구간에 생성된 미션 목록으로 인앱 알림 1건씩 발송.
 */
export async function createDailyMissionBatchNotification({
  missions,
  slot,
}: {
  missions: Array<{ id: string; title: string; category?: string; showId?: string; creatorNickname?: string }>;
  slot: "noon" | "evening";
}) {
  if (!adminDb || missions.length === 0) {
    return { success: true, count: 0 };
  }
  const userIds = await getNotificationTargetUserIds();
  if (userIds.length === 0) {
    return { success: true, count: 0 };
  }
  const label = slot === "noon" ? "정오" : "저녁";
  const count = missions.length;
  const first = missions[0];
  const content =
    count === 1
      ? `'${first.title}' 미션이 올라왔어요.`
      : count === 2
        ? `'${missions[0].title}', '${missions[1].title}' 미션이 올라왔어요.`
        : `'${first.title}' 외 ${count - 1}개의 새 미션이 올라왔어요.`;

  const batch = adminDb.batch();
  const notificationsRef = adminDb.collection("notifications");
  userIds.forEach((userId) => {
    const ref = notificationsRef.doc();
    batch.set(ref, {
      userId,
      type: "NEW_MISSION",
      title: `${label} 알림: 새 미션 ${count}개`,
      content,
      mission_id: first.id,
      missionId: first.id,
      showId: first.showId || "nasolo",
      category: first.category || "LOVE",
      creatorId: "AI_SYSTEM",
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  console.log(`[Admin Notification] ${label} 배치 알림 완료: ${count}개 미션 → ${userIds.length}명`);
  return { success: true, count: userIds.length };
}

/**
 * 모든 (또는 특정 카테고리 구독) 사용자에게 새 미션 알림을 생성합니다.
 */
export async function createGlobalNotification({
  missionId,
  missionTitle,
  category,
  showId = 'nasolo',
  creatorId = "AI_SYSTEM",
  creatorNickname = "AI 생성",
}: {
  missionId: string;
  missionTitle: string;
  category: string;
  showId?: string;
  creatorId?: string;
  creatorNickname?: string;
}) {
  if (!adminDb) {
    console.error("❌ [Admin Notification] adminDb가 초기화되지 않았습니다.");
    return { success: false, count: 0 };
  }

  try {
    console.log(`[Admin Notification] 알림 생성 시작: ${missionTitle} (${category}, ${showId})`);

    // 1. 해당 카테고리를 구독 중인 사용자들 조회
    const prefsSnapshot = await adminDb.collection('notification_preferences')
      .where('categories', 'array-contains', category)
      .get();

    let userIds: string[] = [];

    if (!prefsSnapshot.empty) {
      userIds = prefsSnapshot.docs.map(doc => doc.id);
      console.log(`[Admin Notification] 카테고리 구독 사용자: ${userIds.length}명`);
    } else {
      // notification_preferences가 없는 경우, 모든 유저에게 알림
      console.log("[Admin Notification] 구독 설정 없음, 전체 유저에게 발송");
      const usersSnapshot = await adminDb.collection('users')
        .limit(100)  // 초기에는 100명까지만
        .get();
      
      // 봇 유저 제외
      userIds = usersSnapshot.docs
        .filter(doc => !doc.data().isBot)
        .map(doc => doc.id);
      console.log(`[Admin Notification] 전체 사용자 (봇 제외): ${userIds.length}명`);
    }

    if (userIds.length === 0) {
      console.log("[Admin Notification] 알림을 보낼 대상 사용자가 없습니다.");
      return { success: true, count: 0 };
    }
    const notificationBatch = adminDb.batch();
    const notificationsRef = adminDb.collection('notifications');

    console.log(`[Admin Notification] 대상 사용자: ${userIds.length}명`);

    // 2. 각 사용자별 알림 문서 생성
    userIds.forEach(userId => {
      const newNotifRef = notificationsRef.doc();
      notificationBatch.set(newNotifRef, {
        userId,
        type: "NEW_MISSION",
        title: "새로운 미션 알림",
        content: `${creatorNickname}님이 '${missionTitle}' 미션을 게시했습니다!`,
        mission_id: missionId, // 기존 시스템과 일치
        missionId: missionId,  // 호환성 유지
        showId: showId,
        category: category,
        creatorId: creatorId,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    await notificationBatch.commit();
    console.log(`✅ [Admin Notification] ${userIds.length}명의 사용자에게 알림 전송 완료`);
    
    return { success: true, count: userIds.length };
  } catch (error) {
    console.error("❌ [Admin Notification] 알림 생성 중 오류:", error);
    return { success: false, count: 0, error };
  }
}
