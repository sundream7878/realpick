import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  getDocs,
  where,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { db } from "./config";

/**
 * Firestore를 사용한 관리자 설정 관리
 */

export async function setMainMissionId(missionId: string | null) {
  try {
    await setDoc(doc(db, "admin_settings", "MAIN_MISSION_ID"), {
      value: missionId,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error setting main mission:", error);
    return { success: false, error };
  }
}

export async function getMainMissionId() {
  try {
    const docSnap = await getDoc(doc(db, "admin_settings", "MAIN_MISSION_ID"));
    if (docSnap.exists()) {
      return { success: true, missionId: docSnap.data().value };
    }
    return { success: true, missionId: null };
  } catch (error) {
    console.error("Error getting main mission ID:", error);
    return { success: false, error };
  }
}

export async function getAllOpenMissions() {
  try {
    const q1 = query(collection(db, "missions1"), orderBy("createdAt", "desc"));
    const q2 = query(collection(db, "missions2"), orderBy("createdAt", "desc"));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const m1 = snap1.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(), 
      type: "mission1" 
    }));
    const m2 = snap2.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(), 
      type: "mission2" 
    }));
    
    return { success: true, missions: [...m1, ...m2] };
  } catch (error) {
    console.error("Error fetching all open missions:", error);
    return { success: false, error };
  }
}

export async function getShowStatuses() {
  try {
    const docSnap = await getDoc(doc(db, "admin_settings", "SHOW_STATUSES"));
    if (docSnap.exists()) {
      return { success: true, statuses: docSnap.data().value || {} };
    }
    return { success: true, statuses: {} };
  } catch (error) {
    console.error("Error getting show statuses:", error);
    return { success: false, error };
  }
}

export async function updateShowStatuses(statuses: Record<string, string>) {
  try {
    await setDoc(doc(db, "admin_settings", "SHOW_STATUSES"), {
      value: statuses,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating show statuses:", error);
    return { success: false, error };
  }
}

export async function getShowVisibility() {
  try {
    const docSnap = await getDoc(doc(db, "admin_settings", "SHOW_VISIBILITY"));
    if (docSnap.exists()) {
      return { success: true, visibility: docSnap.data().value || {} };
    }
    return { success: true, visibility: {} };
  } catch (error) {
    console.error("Error getting show visibility:", error);
    return { success: false, error };
  }
}

export async function updateShowVisibility(visibility: Record<string, boolean>) {
  try {
    await setDoc(doc(db, "admin_settings", "SHOW_VISIBILITY"), {
      value: visibility,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error updating show visibility:", error);
    return { success: false, error };
  }
}

export async function getCustomShows() {
  try {
    const docSnap = await getDoc(doc(db, "admin_settings", "CUSTOM_SHOWS"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      const shows = data.value;
      return { 
        success: true, 
        shows: Array.isArray(shows) ? shows : [] 
      };
    }
    return { success: true, shows: [] };
  } catch (error) {
    console.error("Error getting custom shows:", error);
    return { success: false, error, shows: [] };
  }
}

export async function addCustomShow(show: {
  id: string
  name: string
  displayName: string
  category: string
  officialUrl?: string
}) {
  try {
    const { success, shows } = await getCustomShows();
    if (!success) return { success: false, error: "Failed to fetch existing shows" };

    if (shows.some((s: any) => s.id === show.id)) {
      return { success: false, error: "프로그램 ID가 이미 존재합니다." };
    }

    const updatedShows = [...shows, show];
    await setDoc(doc(db, "admin_settings", "CUSTOM_SHOWS"), {
      value: updatedShows,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Error adding custom show:", error);
    return { success: false, error };
  }
}

export async function deleteCustomShow(showId: string) {
  try {
    const { success, shows } = await getCustomShows();
    if (!success) return { success: false, error: "Failed to fetch existing shows" };

    const updatedShows = shows.filter((s: any) => s.id !== showId);
    await setDoc(doc(db, "admin_settings", "CUSTOM_SHOWS"), {
      value: updatedShows,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Error deleting custom show:", error);
    return { success: false, error };
  }
}

// 프로그램 정보 수정 (이름, 표시 이름, 카테고리 등)
export async function updateShowInfo(showId: string, updatedData: { name: string, displayName: string, category: string, officialUrl?: string }) {
  try {
    const { success, shows } = await getCustomShows();
    if (!success) return { success: false, error: "Failed to fetch existing shows" };

    let updatedShows = [...shows];
    const showIndex = updatedShows.findIndex((s: any) => s.id === showId);
    
    if (showIndex > -1) {
      // 기존 커스텀 프로그램 수정
      updatedShows[showIndex] = { ...updatedShows[showIndex], ...updatedData };
    } else {
      // 기본 프로그램(SHOWS)에 있는 것을 처음 수정하는 경우, 커스텀 목록에 추가하여 덮어쓰기 효과
      updatedShows.push({ id: showId, ...updatedData });
    }

    await setDoc(doc(db, "admin_settings", "CUSTOM_SHOWS"), {
      value: updatedShows,
      updatedAt: serverTimestamp()
    }, { merge: true });    return { success: true };
  } catch (error) {
    console.error("Error updating show info:", error);
    return { success: false, error };
  }
}