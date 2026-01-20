import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";
import type { TPointLog } from "@/types/t-vote/vote.types";

/**
 * Firestore를 사용한 포인트 로그 관리
 */

export async function addPointLog(
  userId: string, 
  diff: number, 
  reason: string, 
  missionId?: string, 
  missionType?: "mission1" | "mission2"
): Promise<boolean> {
  try {
    // 1. 포인트 로그 기록
    await addDoc(collection(db, "pointlogs"), {
      userId,
      diff,
      reason,
      missionId: missionId || null,
      missionType: missionType || null,
      createdAt: serverTimestamp(),
    });

    // 2. 유저 포인트 업데이트
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      points: increment(diff),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Error adding point log to Firestore:", error);
    return false;
  }
}

export async function getUserPointLogs(userId: string): Promise<TPointLog[]> {
  try {
    console.log('[getUserPointLogs] 포인트 로그 조회 시작 - userId:', userId)
    
    const q = query(
      collection(db, "pointlogs"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    
    console.log('[getUserPointLogs] 조회된 문서 수:', snap.docs.length)
    
    const logs = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        missionId: data.missionId,
        diff: data.diff,
        reason: data.reason,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
      };
    });
    
    console.log('[getUserPointLogs] 반환할 로그 수:', logs.length)
    return logs;
  } catch (error) {
    console.error("[getUserPointLogs] Error fetching point logs from Firestore:", error);
    return [];
  }
}

