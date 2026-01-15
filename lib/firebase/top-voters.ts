import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit 
} from "firebase/firestore";
import { db } from "./config";

/**
 * 특정 미션의 상위 투표자 조회 (포인트 기준)
 */
export async function getTopVotersByMission(missionId: string, limitCount: number = 3): Promise<Array<{
  nickname: string
  points: number
  tier: string
}>> {
  try {
    // 1. pickresult1에서 해당 미션에 투표한 유저 ID 목록 가져오기 (최대 500개로 제한하여 성능 확보)
    const q1 = query(
      collection(db, "pickresult1"), 
      where("missionId", "==", missionId),
      firestoreLimit(500)
    );
    const snap1 = await getDocs(q1);

    // 2. pickresult2에서 해당 미션에 투표한 유저 ID 목록 가져오기 (최대 500개로 제한)
    const q2 = query(
      collection(db, "pickresult2"), 
      where("missionId", "==", missionId),
      firestoreLimit(500)
    );
    const snap2 = await getDocs(q2);

    const userIds = new Set<string>();
    snap1.forEach(doc => userIds.add(doc.data().userId));
    snap2.forEach(doc => userIds.add(doc.data().userId));

    if (userIds.size === 0) return [];

    const uniqueUserIds = Array.from(userIds);
    
    // 3. 해당 유저들의 정보를 포인트 순으로 조회
    // Firestore에서는 'in' 쿼리가 최대 30개까지만 가능
    const users: any[] = [];
    for (let i = 0; i < uniqueUserIds.length; i += 30) {
      const chunk = uniqueUserIds.slice(i, i + 30);
      const userQ = query(
        collection(db, "users"),
        where("__name__", "in", chunk)
      );
      const userSnaps = await getDocs(userQ);
      users.push(...userSnaps.docs.map(doc => doc.data()));
    }

    // 4. 수동으로 정렬 및 제한
    return users
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, limitCount)
      .map(u => ({
        nickname: u.nickname,
        points: u.points || 0,
        tier: u.tier || "루키"
      }));

  } catch (error) {
    console.error("Error fetching top voters from Firestore:", error);
    return [];
  }
}

