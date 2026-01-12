import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "./config";
import type { TDealer } from "@/types/t-vote/vote.types";

/**
 * Firestore를 사용한 딜러 데이터 관리
 */

// Firestore 데이터를 TDealer로 변환
const mapFirestoreToDealer = (id: string, data: any): TDealer => ({
  id: id,
  userId: data.userId,
  channelName: data.channelName,
  channelUrl: data.channelUrl || undefined,
  subscriberCount: data.subscriberCount || 0,
  introMessage: data.introMessage || undefined,
  broadcastSection: data.broadcastSection || undefined,
  status: data.status || "PENDING",
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
});

// 딜러 정보 조회 (User ID 기반)
export async function getDealer(userId: string): Promise<TDealer | null> {
  try {
    const docSnap = await getDoc(doc(db, "dealers", userId));
    if (docSnap.exists()) {
      return mapFirestoreToDealer(docSnap.id, docSnap.data());
    }
    return null;
  } catch (error) {
    console.error("Error fetching dealer from Firestore:", error);
    return null;
  }
}

// 딜러 정보 생성
export async function createDealer(dealer: Omit<TDealer, "id" | "createdAt" | "updatedAt">): Promise<TDealer | null> {
  try {
    const dealerData = {
      ...dealer,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(doc(db, "dealers", dealer.userId), dealerData);
    
    // 다시 읽어와서 반환
    return await getDealer(dealer.userId);
  } catch (error) {
    console.error("Error creating dealer in Firestore:", error);
    return null;
  }
}

// 딜러 정보 업데이트
export async function updateDealer(userId: string, updates: Partial<TDealer>): Promise<boolean> {
  try {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(doc(db, "dealers", userId), updateData);
    return true;
  } catch (error) {
    console.error("Error updating dealer in Firestore:", error);
    return false;
  }
}

