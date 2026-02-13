import { adminDb } from "./admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 서버 사이드(또는 자동화 스크립트)에서 미션을 생성합니다.
 * 알림은 매일 정오(12시)·저녁(19시) 배치로만 발송됩니다.
 */
export async function createSystemMission(missionData: any) {
  if (!adminDb) {
    console.error("❌ [Admin Mission] adminDb가 초기화되지 않았습니다.");
    return { success: false };
  }

  try {
    const isCouple = missionData.format === "couple";
    const collectionName = isCouple ? "missions2" : "missions1";

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

    const docRef = await adminDb.collection(collectionName).add(missionPayload);
    console.log(`✅ [Admin Mission] 미션 생성 완료: ${docRef.id} (${collectionName})`);

    return { success: true, missionId: docRef.id };
  } catch (error) {
    console.error("❌ [Admin Mission] 미션 생성 실패:", error);
    return { success: false, error };
  }
}
