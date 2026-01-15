import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  updateDoc, 
  doc, 
  writeBatch,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  addDoc
} from "firebase/firestore";
import { db } from "./config";

/**
 * Firestore를 사용한 알림 관리
 */

export interface TNotification {
  id: string;
  userId: string;
  type: 'NEW_MISSION' | 'MISSION_CLOSED' | 'SYSTEM';
  title: string;
  content: string;
  missionId?: string;
  creatorId?: string;
  isRead: boolean;
  createdAt: string;
  creator?: {
    nickname: string;
    avatarUrl?: string;
    tier?: string;
  };
}

export async function getNotifications(userId: string, limitCount: number = 20): Promise<TNotification[]> {
  try {
    console.log('[Firebase Notifications] getNotifications 시작 - userId:', userId)
    
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    
    console.log('[Firebase Notifications] 쿼리 결과:', snap.docs.length, '개')
    
    const notifications = await Promise.all(snap.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      const notification: TNotification = {
        id: docSnapshot.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        content: data.content,
        missionId: data.missionId,
        creatorId: data.creatorId,
        isRead: data.isRead || false,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      };

      if (data.creatorId) {
        // 작성자 정보 가져오기 (비효율적일 수 있으나 일단 구현)
        const { getUser } = await import("./users");
        const creator = await getUser(data.creatorId);
        if (creator) {
          notification.creator = {
            nickname: creator.nickname,
            tier: creator.tier
          };
        }
      }

      return notification;
    }));

    console.log('[Firebase Notifications] 반환할 알림 개수:', notifications.length)
    return notifications;
  } catch (error) {
    console.error("[Firebase Notifications] Error fetching notifications from Firestore:", error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    console.log('[Firebase Notifications] markNotificationAsRead 시작 - notificationId:', notificationId)
    await updateDoc(doc(db, "notifications", notificationId), {
      isRead: true,
      updatedAt: serverTimestamp()
    });
    console.log('[Firebase Notifications] markNotificationAsRead 성공')
    return true;
  } catch (error) {
    console.error("[Firebase Notifications] Error marking notification as read:", error);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    
    const batch = writeBatch(db);
    snap.docs.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, { isRead: true, updatedAt: serverTimestamp() });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
}

export async function deleteOldNotifications(userId: string): Promise<boolean> {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("createdAt", "<", Timestamp.fromDate(oneMonthAgo))
    );
    const snap = await getDocs(q);
    
    const batch = writeBatch(db);
    snap.docs.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error deleting old notifications:", error);
    return false;
  }
}

export async function createNotification(notification: Omit<TNotification, "id" | "createdAt" | "isRead">): Promise<boolean> {
  try {
    await addDoc(collection(db, "notifications"), {
      ...notification,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error creating notification in Firestore:", error);
    return false;
  }
}

/**
 * 알림 설정 (이메일 등) 관리
 */
export async function getNotificationPreferences(userId: string) {
  try {
    const docSnap = await getDoc(doc(db, "notification_preferences", userId));
    if (docSnap.exists()) {
      return { success: true, preferences: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: true, preferences: null };
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return { success: false, error };
  }
}

export async function saveNotificationPreferences(userId: string, preferences: { emailEnabled: boolean, categories: string[] }) {
  try {
    await setDoc(doc(db, "notification_preferences", userId), {
      ...preferences,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error saving notification preferences:", error);
    return { success: false, error };
  }
}

