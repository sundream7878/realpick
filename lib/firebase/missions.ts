import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
  setDoc,
  increment,
  writeBatch
} from "firebase/firestore";
import { db } from "./config";
import { CreateMissionData } from "@/types/t-vote/vote.types";

/**
 * Firestore를 사용한 미션 관리
 */

// 미션 생성
export async function createMission(missionData: CreateMissionData, userId: string): Promise<{ success: boolean; missionId?: string; error?: string }> {
  try {
    const isCouple = missionData.format === "couple";
    const collectionName = isCouple ? "missions2" : "missions1";
    
    const missionPayload: any = {
      title: missionData.title,
      kind: isCouple ? "predict" : (missionData.type === "prediction" ? "predict" : missionData.type),
      form: missionData.format,
      deadline: missionData.deadline,
      revealPolicy: missionData.resultVisibility === "realtime" ? "realtime" : "onClose",
      creatorId: userId,
      status: "open",
      thumbnailUrl: missionData.imageUrl || null,
      isLive: missionData.isLive || false,
      showId: missionData.showId || null,
      category: missionData.category || null,
      seasonType: missionData.seasonType || null,
      seasonNumber: missionData.seasonNumber ? parseInt(missionData.seasonNumber) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      participants: 0,
    };

    if (isCouple) {
      missionPayload.matchPairs = {
        left: missionData.maleOptions || [],
        right: missionData.femaleOptions || []
      };
      missionPayload.totalEpisodes = missionData.totalEpisodes || 8;
      missionPayload.episodeStatuses = {};
    } else {
      missionPayload.options = missionData.options || [];
      missionPayload.submissionType = missionData.submissionType || "selection";
      missionPayload.requiredAnswerCount = missionData.requiredAnswerCount || 1;
      if (missionData.placeholder) missionPayload.subjectivePlaceholder = missionData.placeholder;
      missionPayload.optionVoteCounts = {};
    }

    const docRef = await addDoc(collection(db, collectionName), missionPayload);
    
    // 이메일 알림 발송 (비동기)
    import("./email-notification").then(({ sendMissionNotification }) => {
      sendMissionNotification({
        missionId: docRef.id,
        missionTitle: missionData.title,
        category: missionData.category || undefined,
        showId: missionData.showId || undefined,
        creatorId: userId
      }).catch(err => console.error("Email notification failed:", err));
    });
    
    return { success: true, missionId: docRef.id };
  } catch (error: any) {
    console.error("Firebase 미션 생성 실패:", error);
    return { success: false, error: error.message };
  }
}

// 미션 목록 조회
export async function getMissions(type: 'missions1' | 'missions2' = 'missions1', limitCount: number = 20): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const q = query(
      collection(db, type),
      orderBy("createdAt", "desc"),
      firestoreLimit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const missions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return { success: true, missions };
  } catch (error: any) {
    console.error("Firebase 미션 목록 조회 실패:", error);
    return { success: false, error: error.message };
  }
}

// 특정 미션 조회
export async function getMission(type: 'missions1' | 'missions2', missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> {
  try {
    const docSnap = await getDoc(doc(db, type, missionId));
    if (docSnap.exists()) {
      return { success: true, mission: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: "미션을 찾을 수 없습니다." };
  } catch (error: any) {
    console.error("Firebase 미션 조회 실패:", error);
    return { success: false, error: error.message };
  }
}

// 특정 미션 조회 (통합 - missions1 먼저 검색 후 missions2)
export async function getMissionById(missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> {
  try {
    let docSnap = await getDoc(doc(db, "missions1", missionId));
    if (docSnap.exists()) {
      return { success: true, mission: { id: docSnap.id, ...docSnap.data(), __table: "missions1" } };
    }
    
    docSnap = await getDoc(doc(db, "missions2", missionId));
    if (docSnap.exists()) {
      return { success: true, mission: { id: docSnap.id, ...docSnap.data(), __table: "missions2" } };
    }
    
    return { success: false, error: "미션을 찾을 수 없습니다." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 딜러 전용 특정 미션 조회
export async function getMission2(missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> {
  return getMission("missions2", missionId);
}

// 내가 만든 미션 조회
export async function getMissionsByCreator(userId: string): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const q1 = query(collection(db, "missions1"), where("creatorId", "==", userId));
    const q2 = query(collection(db, "missions2"), where("creatorId", "==", userId));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const m1 = snap1.docs.map(doc => ({ id: doc.id, ...doc.data(), __table: "missions1" }));
    const m2 = snap2.docs.map(doc => ({ id: doc.id, ...doc.data(), __table: "missions2" }));
    
    return { success: true, missions: [...m1, ...m2] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 내가 참여한 미션 조회
export async function getMissionsByParticipant(userId: string): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const q1 = query(collection(db, "pickresult1"), where("userId", "==", userId));
    const q2 = query(collection(db, "pickresult2"), where("userId", "==", userId));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const missionIds = new Set<string>();
    snap1.docs.forEach(doc => missionIds.add(doc.data().missionId));
    snap2.docs.forEach(doc => missionIds.add(doc.data().missionId));
    
    if (missionIds.size === 0) return { success: true, missions: [] };
    
    // 미션 상세 정보 가져오기 (비효율적일 수 있으나 일단 구현)
    const missionPromises = Array.from(missionIds).map(id => getMissionById(id));
    const results = await Promise.all(missionPromises);
    const missions = results.filter(r => r.success).map(r => r.mission);
    
    return { success: true, missions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 미션 정산 (일반 미션)
export async function settleMissionWithFinalAnswer(missionId: string, correctAnswer: string): Promise<{ success: boolean; error?: string }> {
  try {
    const missionRef = doc(db, "missions1", missionId);
    await updateDoc(missionRef, {
      status: "settled",
      correctAnswer,
      updatedAt: serverTimestamp()
    });
    
    // 포인트 정산 로직은 별도 트리거 또는 배치 작업 권장
    // 여기서는 상태만 업데이트
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 에피소드 상태 업데이트 (커플매칭)
export async function updateEpisodeStatuses(missionId: string, episodeNo: number, status: string): Promise<{ success: boolean; error?: string }> {
  try {
    const missionRef = doc(db, "missions2", missionId);
    const snap = await getDoc(missionRef);
    const statuses = snap.data()?.episodeStatuses || {};
    statuses[episodeNo] = status;
    
    await updateDoc(missionRef, {
      episodeStatuses: statuses,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 미션 정산 (커플매칭)
export async function settleMatchMission(missionId: string, finalAnswer: any[]): Promise<{ success: boolean; error?: string }> {
  try {
    const missionRef = doc(db, "missions2", missionId);
    await updateDoc(missionRef, {
      status: "settled",
      finalAnswer,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 참여자 수 증가 (incrementParticipants는 이미 구현됨)
export async function incrementParticipants(type: 'missions1' | 'missions2', missionId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, type, missionId), {
      participants: increment(1),
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error incrementing participants:", error);
    return false;
  }
}

/**
 * 미션 참여자 수 증가 (t_missions1 호환)
 */
export async function incrementMissionParticipants(missionId: string): Promise<{ success: boolean; error?: string }> {
  const success = await incrementParticipants('missions1', missionId);
  return success ? { success: true } : { success: false, error: "참여자 수 업데이트 실패" };
}

/**
 * 커플 매칭 미션 참여자 수 증가 (t_missions2 호환)
 */
export async function incrementMissionParticipants2(missionId: string): Promise<{ success: boolean; error?: string }> {
  const success = await incrementParticipants('missions2', missionId);
  return success ? { success: true } : { success: false, error: "참여자 수 업데이트 실패" };
}

/**
 * 투표 수 업데이트 및 미션 정산 (Firebase 버전)
 */
export async function updateOptionVoteCounts(missionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 미션 정보 조회
    const missionRes = await getMissionById(missionId);
    if (!missionRes.success || !missionRes.mission) return { success: false, error: "미션을 찾을 수 없습니다." };
    
    const mission = missionRes.mission;
    const isTextMission = mission.submissionType === 'text';
    const allOptions: string[] = mission.options || [];

    // 2. 투표 내역 조회
    const q = query(collection(db, "pickresult1"), where("missionId", "==", missionId));
    const querySnapshot = await getDocs(q);
    const votes = querySnapshot.docs.map(doc => doc.data());

    const voteCounts: { [key: string]: number } = {};
    if (!isTextMission) {
      allOptions.forEach(option => { voteCounts[option] = 0 });
    }

    const totalVotes = votes.length;
    votes.forEach((vote) => {
      let selectedOptions: string[] = [];
      const rawOption = vote.choice;

      if (Array.isArray(rawOption)) {
        selectedOptions = rawOption;
      } else if (typeof rawOption === 'string') {
        selectedOptions = [rawOption];
      }

      selectedOptions.forEach(option => {
        if (option && typeof option === 'string') {
          if (isTextMission || allOptions.includes(option)) {
            voteCounts[option] = (voteCounts[option] || 0) + 1;
          }
        }
      });
    });

    const votePercentages: { [key: string]: number } = {};
    Object.keys(voteCounts).forEach((option) => {
      votePercentages[option] = totalVotes > 0 ? Math.round((voteCounts[option] / totalVotes) * 100) : 0;
    });

    let majorityOption: string | null = null;
    let maxCount = 0;
    for (const option in voteCounts) {
      if (voteCounts[option] > maxCount) {
        maxCount = voteCounts[option];
        majorityOption = option;
      }
    }

    // 3. 미션 데이터 업데이트
    const updateData: any = { 
      optionVoteCounts: votePercentages,
      "stats.totalVotes": totalVotes,
      updatedAt: serverTimestamp()
    };
    if (totalVotes > 0 && majorityOption) updateData.majorityOption = majorityOption;

    const table = mission.__table === "t_missions1" || mission.__table === "missions1" ? "missions1" : "missions2";
    await updateDoc(doc(db, table, missionId), updateData);

    return { success: true };
  } catch (error: any) {
    console.error("Firebase 투표 수 업데이트 중 오류:", error);
    return { success: false, error: error.message };
  }
}

// 예측 미션 답변 제출 (UI에서 사용)
export async function submitPredictMissionAnswer(userId: string, missionId: string, answer: any): Promise<{ success: boolean; error?: string }> {
  const { submitVote1 } = await import("./votes");
  const success = await submitVote1({ userId, missionId, choice: answer });
  return success ? { success: true } : { success: false, error: "투표 제출 실패" };
}

// 예측 미션 답변 수정 (UI에서 사용)
export async function updatePredictMissionAnswer(userId: string, missionId: string, answer: any): Promise<{ success: boolean; error?: string }> {
  // Firestore에서는 upsert와 같음
  return submitPredictMissionAnswer(userId, missionId, answer);
}
