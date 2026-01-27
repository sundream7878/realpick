import { adminDb } from "./admin";
import { FieldValue } from "firebase-admin/firestore";
import { createGlobalNotification } from "./admin-notifications";

/**
 * 서버 사이드(또는 자동화 스크립트)에서 미션을 생성하고 알림까지 한 번에 처리합니다.
 */
export async function createSystemMission(missionData: any) {
  if (!adminDb) {
    console.error("❌ [Admin Mission] adminDb가 초기화되지 않았습니다.");
    return { success: false };
  }

  try {
    const isCouple = missionData.format === "couple";
    const collectionName = isCouple ? "missions2" : "missions1";
    
    // 1. 미션 데이터 준비
    const missionPayload = {
      ...missionData,
      status: "open",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      stats: {
        totalVotes: 0,
        participants: 0
      }
    };

    // 2. Firestore에 미션 추가
    const docRef = await adminDb.collection(collectionName).add(missionPayload);
    console.log(`✅ [Admin Mission] 미션 생성 완료: ${docRef.id} (${collectionName})`);

    // 3. 알림 생성 (모든 구독자에게)
    if (missionData.category) {
      await createGlobalNotification({
        missionId: docRef.id,
        missionTitle: missionData.title,
        category: missionData.category,
        creatorId: missionData.creatorId || "SYSTEM",
        creatorNickname: missionData.creatorNickname || "리얼픽"
      });
    }

    return { success: true, missionId: docRef.id };
  } catch (error) {
    console.error("❌ [Admin Mission] 미션 생성 실패:", error);
    return { success: false, error };
  }
}
