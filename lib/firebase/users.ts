import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  limit as firestoreLimit, 
  getDocs,
  where,
  serverTimestamp,
  Timestamp,
  startAfter,
  getCountFromServer
} from "firebase/firestore";
import { db } from "./config";
import type { TUser, TTier } from "@/types/t-vote/vote.types";
import { getTierFromPoints } from "@/lib/utils/u-tier-system/tierSystem.util";

/**
 * Firestore를 사용한 사용자 데이터 관리
 */

// Firestore 데이터 타입을 TUser로 변환
const mapFirestoreToUser = (id: string, data: any): TUser => ({
  id: id,
  email: data.email,
  nickname: data.nickname,
  points: data.points || 0,
  tier: data.tier || "루키",
  ageRange: data.ageRange,
  gender: data.gender,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  role: data.role || "PICKER",
});

// 사용자 정보 조회 (ID 기반)
export async function getUser(userId: string): Promise<TUser | null> {
  try {
    console.log('[Firebase Users] getUser 시작 - userId:', userId)
    const userDoc = await getDoc(doc(db, "users", userId));
    console.log('[Firebase Users] userDoc.exists():', userDoc.exists())
    if (userDoc.exists()) {
      const user = mapFirestoreToUser(userDoc.id, userDoc.data());
      console.log('[Firebase Users] 반환할 사용자:', user)
      return user;
    }
    console.warn('[Firebase Users] 사용자를 찾을 수 없습니다')
    return null;
  } catch (error) {
    console.error("[Firebase Users] Error fetching user from Firestore:", error);
    return null;
  }
}

// 사용자 정보 조회 (이메일 기반)
export async function getUserByEmail(email: string): Promise<TUser | null> {
  try {
    const q = query(collection(db, "users"), where("email", "==", email), firestoreLimit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return mapFirestoreToUser(userDoc.id, userDoc.data());
    }
    return null;
  } catch (error) {
    console.error("Error fetching user by email from Firestore:", error);
    return null;
  }
}

// 사용자 데이터 이전 (기존 UUID 데이터를 새로운 Firebase UID로 통합)
export async function linkUserToFirebaseUid(oldId: string, newUid: string): Promise<boolean> {
  try {
    const oldUserDoc = await getDoc(doc(db, "users", oldId));
    if (!oldUserDoc.exists()) return false;

    const userData = oldUserDoc.data();
    // 새로운 UID로 데이터 복사
    await setDoc(doc(db, "users", newUid), {
      ...userData,
      updatedAt: serverTimestamp(),
    });

    // 기존 데이터 삭제 (선택 사항 - 데이터 무결성을 위해 삭제 권장)
    // await deleteDoc(doc(db, "users", oldId));
    
    return true;
  } catch (error) {
    console.error("Error linking user to Firebase UID:", error);
    return false;
  }
}

// 사용자 생성
export async function createUser(user: Omit<TUser, "createdAt" | "updatedAt">): Promise<TUser | null> {
  try {
    const userData = {
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", user.id), userData);
    
    // 다시 읽어와서 반환 (Timestamp 때문)
    return await getUser(user.id);
  } catch (error) {
    console.error("Error creating user in Firestore:", error);
    return null;
  }
}

// 사용자 포인트 업데이트
export async function updateUserPoints(userId: string, newPoints: number): Promise<boolean> {
  try {
    const tierInfo = getTierFromPoints(newPoints);
    const tierName = tierInfo.name as TTier;

    await updateDoc(doc(db, "users", userId), {
      points: newPoints,
      tier: tierName,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating points in Firestore:", error);
    return false;
  }
}

// 프로필 업데이트
export async function updateUserProfile(userId: string, updates: { nickname?: string }): Promise<boolean> {
  try {
    await updateDoc(doc(db, "users", userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating profile in Firestore:", error);
    return false;
  }
}

// 추가 정보 업데이트
export async function updateUserAdditionalInfo(
  userId: string, 
  updates: { ageRange?: string; gender?: string }
): Promise<boolean> {
  try {
    await updateDoc(doc(db, "users", userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error updating additional info in Firestore:", error);
    return false;
  }
}

// 랭킹 조회
export async function getUserRanking(limitCount: number = 100): Promise<TUser[]> {
  try {
    const q = query(
      collection(db, "users"),
      orderBy("points", "desc"),
      firestoreLimit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => mapFirestoreToUser(doc.id, doc.data()));
  } catch (error) {
    console.error("Error fetching ranking from Firestore:", error);
    return [];
  }
}

// 모든 사용자 조회 (관리자 전용) - 페이징 및 필터링 최적화
export async function getAllUsers(
  limitCount: number = 50,
  lastDoc: any = null,
  roleFilter: string = "ALL"
): Promise<{ users: TUser[]; lastVisible: any; total: number }> {
  try {
    console.log('[Firebase Users] getAllUsers 시작:', { limitCount, roleFilter, hasLastDoc: !!lastDoc });
    const coll = collection(db, "users");
    
    // 1. 전체 개수 조회
    let countQuery = query(coll);
    if (roleFilter !== "ALL") {
      countQuery = query(coll, where("role", "==", roleFilter));
    }
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;
    console.log('[Firebase Users] 전체 사용자 수:', total);

    // 2. 쿼리 작성
    let q = query(coll, orderBy("createdAt", "desc"));
    
    if (roleFilter !== "ALL") {
      q = query(coll, where("role", "==", roleFilter), orderBy("createdAt", "desc"));
    }
    
    q = query(q, firestoreLimit(limitCount));

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    console.log('[Firebase Users] 쿼리 실행 중...');
    const querySnapshot = await getDocs(q);
    console.log('[Firebase Users] 조회된 사용자 수:', querySnapshot.docs.length);
    
    const users = querySnapshot.docs.map(doc => {
      const user = mapFirestoreToUser(doc.id, doc.data());
      console.log('[Firebase Users] 사용자:', { id: user.id, nickname: user.nickname, role: user.role });
      return user;
    });
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return { 
      users, 
      lastVisible,
      total 
    };
  } catch (error) {
    console.error("[Firebase Users] Error fetching all users from Firestore:", error);
    return { users: [], lastVisible: null, total: 0 };
  }
}

// 사용자 검색 (관리자 전용)
export async function searchUsers(searchQuery: string): Promise<TUser[]> {
  try {
    // Firestore는 full-text search나 ilike를 직접 지원하지 않음
    // 여기서는 닉네임 필드에 대해 간단한 쿼리를 하거나 전체를 가져와 필터링
    // 일단 전체를 가져와서 필터링 (사용자 수가 적을 때 유효)
    const q = query(collection(db, "users"), firestoreLimit(1000));
    const querySnapshot = await getDocs(q);
    const searchLower = searchQuery.toLowerCase();
    
    return querySnapshot.docs
      .map(doc => mapFirestoreToUser(doc.id, doc.data()))
      .filter(user => 
        user.nickname.toLowerCase().includes(searchLower) || 
        user.email.toLowerCase().includes(searchLower)
      );
  } catch (error) {
    console.error("Error searching users in Firestore:", error);
    return [];
  }
}

// 사용자 역할 업데이트
export async function updateUserRole(userId: string, role: string): Promise<boolean> {
  try {
    // Get auth token
    const { auth } = await import('./config');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error("No authenticated user");
      return false;
    }

    const idToken = await currentUser.getIdToken();
    
    const response = await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ userId, role }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error updating user role:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating user role:", error);
    return false;
  }
}

