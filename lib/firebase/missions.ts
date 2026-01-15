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
      stats: {
        totalVotes: 0
      }
    };

    if (isCouple) {
      missionPayload.matchPairs = {
        left: missionData.maleOptions || [],
        right: missionData.femaleOptions || []
      };
      missionPayload.totalEpisodes = missionData.totalEpisodes || 8;
      missionPayload.episodeStatuses = {};
      missionPayload.aggregatedStats = {}; // Initialize aggregatedStats
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
    
    console.log(`[Firebase] ${type} fetched:`, missions.length);
    
    return { success: true, missions };
  } catch (error: any) {
    console.error(`Firebase ${type} 목록 조회 실패:`, error);
    return { success: false, error: error.message };
  }
}

// 미션 목록 조회 (missions2 전용 - 하위 호환성 유지)
export async function getMissions2(limitCount: number = 20): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  return getMissions("missions2", limitCount);
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

import { cache } from "react";

// 특정 미션 조회 (통합 - missions1과 missions2 병렬 검색) - 서버 사이드 캐싱 적용
export const getMissionById = cache(async (missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> => {
  try {
    const [snap1, snap2] = await Promise.all([
      getDoc(doc(db, "missions1", missionId)),
      getDoc(doc(db, "missions2", missionId))
    ]);

    if (snap1.exists()) {
      return { success: true, mission: { id: snap1.id, ...snap1.data(), __table: "missions1" } };
    }
    
    if (snap2.exists()) {
      return { success: true, mission: { id: snap2.id, ...snap2.data(), __table: "missions2" } };
    }
    
    return { success: false, error: "미션을 찾을 수 없습니다." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 딜러 전용 특정 미션 조회
export async function getMission2(missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> {
  return getMission("missions2", missionId);
}

// 내가 만든 미션 조회
export async function getMissionsByCreator(userId: string): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    console.log('[Firebase] getMissionsByCreator 시작 - userId:', userId)
    
    const q1 = query(collection(db, "missions1"), where("creatorId", "==", userId));
    const q2 = query(collection(db, "missions2"), where("creatorId", "==", userId));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    console.log('[Firebase] missions1 결과:', snap1.docs.length, '개')
    console.log('[Firebase] missions2 결과:', snap2.docs.length, '개')
    
    const m1 = snap1.docs.map(doc => ({ id: doc.id, ...doc.data(), __table: "missions1" }));
    const m2 = snap2.docs.map(doc => ({ id: doc.id, ...doc.data(), __table: "missions2" }));
    
    console.log('[Firebase] 총 반환 미션:', m1.length + m2.length, '개')
    
    return { success: true, missions: [...m1, ...m2] };
  } catch (error: any) {
    console.error('[Firebase] getMissionsByCreator 에러:', error)
    return { success: false, error: error.message };
  }
}

// 내가 참여한 미션 조회 - 최적화
export async function getMissionsByParticipant(userId: string): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const q1 = query(collection(db, "pickresult1"), where("userId", "==", userId));
    const q2 = query(collection(db, "pickresult2"), where("userId", "==", userId));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const m1Ids = snap1.docs.map(doc => doc.data().missionId);
    const m2Ids = snap2.docs.map(doc => doc.data().missionId);
    
    if (m1Ids.length === 0 && m2Ids.length === 0) return { success: true, missions: [] };
    
    const missions: any[] = [];

    // missions1 상세 정보 가져오기 (in 쿼리 사용)
    if (m1Ids.length > 0) {
      for (let i = 0; i < m1Ids.length; i += 30) {
        const chunk = m1Ids.slice(i, i + 30);
        const mq = query(collection(db, "missions1"), where("__name__", "in", chunk));
        const mSnap = await getDocs(mq);
        missions.push(...mSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), __table: "missions1" })));
      }
    }

    // missions2 상세 정보 가져오기 (in 쿼리 사용)
    if (m2Ids.length > 0) {
      for (let i = 0; i < m2Ids.length; i += 30) {
        const chunk = m2Ids.slice(i, i + 30);
        const mq = query(collection(db, "missions2"), where("__name__", "in", chunk));
        const mSnap = await getDocs(mq);
        missions.push(...mSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), __table: "missions2" })));
      }
    }
    
    return { success: true, missions: missions.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) };
  } catch (error: any) {
    console.error("Error in getMissionsByParticipant:", error);
    return { success: false, error: error.message };
  }
}

// 미션 정산 (일반 미션)
export async function settleMissionWithFinalAnswer(missionId: string, correctAnswer: string): Promise<{ success: boolean; error?: string }> {
  try {
    const missionRef = doc(db, "missions1", missionId);
    const missionSnap = await getDoc(missionRef);
    
    if (!missionSnap.exists()) {
      return { success: false, error: "미션을 찾을 수 없습니다." };
    }
    
    const missionData = missionSnap.data();
    
    // 미션 상태 업데이트
    await updateDoc(missionRef, {
      status: "settled",
      correctAnswer,
      updatedAt: serverTimestamp()
    });
    
    // 포인트 분배 실행
    try {
      await distributePointsForMission1(missionId, correctAnswer, missionData);
    } catch (pointError: any) {
      console.error("포인트 분배 중 오류:", pointError);
      // 포인트 분배 실패해도 미션은 settled 상태로 유지
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 미션 포인트 분배 (missions1)
 * 
 * 점수 규칙 (plan2.md 기준):
 * - 공감 픽 (Poll/Majority): 참여 보상 +10P (오답 개념 없음)
 * - 예측 픽 (Predict - Binary/Multi/Text): 정답 +100P / 오답 -50P
 */
async function distributePointsForMission1(
  missionId: string, 
  correctAnswer: string, 
  missionData: any
): Promise<void> {
  try {
    // 1. 미션 타입 확인
    const missionKind = missionData.kind || missionData.type || "predict"; // predict or poll
    
    // 2. 모든 투표 조회
    const votesQuery = query(
      collection(db, "pickresult1"),
      where("missionId", "==", missionId)
    );
    const votesSnap = await getDocs(votesQuery);
    
    if (votesSnap.empty) {
      console.log("투표가 없어 포인트 분배를 건너뜁니다.");
      return;
    }
    
    // 3. 포인트 계산 규칙
    let pointsForCorrect = 10;
    let pointsForIncorrect = 0;
    
    if (missionKind === "poll" || missionKind === "majority") {
      // 공감 픽: 참여만 해도 +10P (오답 개념 없음)
      pointsForCorrect = 10;
      pointsForIncorrect = 10; // 오답도 +10P
    } else {
      // 예측 픽 (predict): 정답 +100P / 오답 -50P
      pointsForCorrect = 100;
      pointsForIncorrect = -50;
    }
    
    console.log(`[포인트 분배] 미션 ${missionId}, 타입: ${missionKind}, 정답: ${correctAnswer}`);
    console.log(`[포인트 규칙] 정답: ${pointsForCorrect}P, 오답: ${pointsForIncorrect}P`);
    
    // 4. 각 투표자에게 포인트 분배
    const { addPointLog } = await import("./points");
    
    for (const voteDoc of votesSnap.docs) {
      const voteData = voteDoc.data();
      const userId = voteData.userId;
      const userChoice = voteData.choice || voteData.selectedOption;
      
      // 정답 비교
      let isCorrect = false;
      
      if (Array.isArray(userChoice)) {
        // 배열인 경우 (다중 선택 가능성)
        isCorrect = userChoice.includes(correctAnswer);
      } else if (typeof userChoice === "string") {
        // 문자열 비교 (대소문자 무시, 공백 제거)
        isCorrect = userChoice.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      }
      
      // 포인트 지급 (공감 픽은 무조건 +10P, 예측 픽은 정답/오답 구분)
      const pointDiff = isCorrect ? pointsForCorrect : pointsForIncorrect;
      const reason = missionKind === "poll" || missionKind === "majority"
        ? `미션 참여: ${missionData.title || "미션"}`
        : `미션 ${isCorrect ? "정답" : "오답"}: ${missionData.title || "미션"}`;
      
      await addPointLog(
        userId,
        pointDiff,
        reason,
        missionId,
        "mission1"
      );
      
      console.log(`[포인트 지급] 사용자 ${userId}에게 ${pointDiff}P 지급 (${isCorrect ? "정답" : "오답"})`);
    }
    
    console.log(`[포인트 분배 완료] 미션 ${missionId}`);
  } catch (error) {
    console.error("포인트 분배 중 오류:", error);
    throw error;
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
    const missionSnap = await getDoc(missionRef);
    
    if (!missionSnap.exists()) {
      return { success: false, error: "미션을 찾을 수 없습니다." };
    }
    
    const missionData = missionSnap.data();
    
    // 미션 상태 업데이트
    await updateDoc(missionRef, {
      status: "settled",
      finalAnswer,
      updatedAt: serverTimestamp()
    });
    
    // 포인트 분배 실행
    try {
      await distributePointsForMission2(missionId, finalAnswer, missionData);
    } catch (pointError: any) {
      console.error("포인트 분배 중 오류:", pointError);
      // 포인트 분배 실패해도 미션은 settled 상태로 유지
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 커플 매칭 미션 포인트 분배 (missions2)
 * 
 * 점수 규칙 (plan2.md 기준 - 역주행 채점):
 * - 최종 정답/오답을 몇 회차부터 계속 유지했는지 확인
 * - 가장 빠른 회차의 포인트만 1회 지급/감점
 * - 회차별 점수:
 *   1회차: +1000P / -500P
 *   2회차: +900P / -450P
 *   3회차: +800P / -400P
 *   4회차: +700P / -350P
 *   5회차: +600P / -300P
 *   6회차: +500P / -250P
 *   7회차: +400P / -200P
 *   8회차: +300P / -150P
 */
async function distributePointsForMission2(
  missionId: string,
  finalAnswer: any[],
  missionData: any
): Promise<void> {
  try {
    // 1. 회차별 포인트 맵 (plan2.md 기준)
    const episodePoints: Record<number, { correct: number; incorrect: number }> = {
      1: { correct: 1000, incorrect: -500 },
      2: { correct: 900, incorrect: -450 },
      3: { correct: 800, incorrect: -400 },
      4: { correct: 700, incorrect: -350 },
      5: { correct: 600, incorrect: -300 },
      6: { correct: 500, incorrect: -250 },
      7: { correct: 400, incorrect: -200 },
      8: { correct: 300, incorrect: -150 },
    };
    
    // 2. 모든 투표 조회 (통합 f_votes 구조)
    const votesQuery = query(
      collection(db, "pickresult2"),
      where("missionId", "==", missionId)
    );
    const votesSnap = await getDocs(votesQuery);
    
    if (votesSnap.empty) {
      console.log("투표가 없어 포인트 분배를 건너뜁니다.");
      return;
    }
    
    console.log(`[포인트 분배] 커플 매칭 미션 ${missionId}, 정답: ${JSON.stringify(finalAnswer)}`);
    
    // 3. 정답 비교 함수
    const compareConnections = (userConnections: any[], correctAnswer: any[]): boolean => {
      if (!Array.isArray(userConnections) || !Array.isArray(correctAnswer)) return false;
      if (userConnections.length !== correctAnswer.length) return false;
      
      // 순서 무관 비교 (정렬 후 JSON 비교)
      const sortedUser = JSON.stringify(
        userConnections.map((c: any) => ({ man: c.man, woman: c.woman })).sort((a, b) => 
          a.man.localeCompare(b.man) || a.woman.localeCompare(b.woman)
        )
      );
      const sortedAnswer = JSON.stringify(
        correctAnswer.map((c: any) => ({ man: c.man, woman: c.woman })).sort((a, b) => 
          a.man.localeCompare(b.man) || a.woman.localeCompare(b.woman)
        )
      );
      
      return sortedUser === sortedAnswer;
    };
    
    // 4. 각 투표자별로 역주행 채점
    const { addPointLog } = await import("./points");
    
    // 사용자별로 투표 데이터 그룹화 (구 구조 호환)
    const userVotes: Record<string, Record<number, any>> = {};
    
    for (const voteDoc of votesSnap.docs) {
      const voteData = voteDoc.data();
      const userId = voteData.userId;
      
      // 신규 구조 (f_votes JSONB) vs 구 구조 (episodeNo)
      if (voteData.votes && typeof voteData.votes === "object") {
        // 신규 구조: f_votes JSONB
        userVotes[userId] = voteData.votes;
      } else if (voteData.episodeNo) {
        // 구 구조: episodeNo별 개별 row
        if (!userVotes[userId]) {
          userVotes[userId] = {};
        }
        userVotes[userId][voteData.episodeNo] = {
          connections: voteData.connections || [],
          submitted_at: voteData.submittedAt || voteData.createdAt
        };
      }
    }
    
    // 5. 각 사용자별로 역주행 채점
    for (const [userId, votes] of Object.entries(userVotes)) {
      // 역주행 채점: 8회차부터 1회차로 거슬러 올라가며 연속성 확인
      let streakEpisode: number | null = null;
      let isFinalCorrect: boolean | null = null;
      
      // 최종 회차부터 역순으로 확인
      const episodeNos = Object.keys(votes).map(Number).sort((a, b) => b - a); // 내림차순
      
      if (episodeNos.length === 0) {
        console.log(`[포인트 지급 스킵] 사용자 ${userId}: 투표 기록 없음`);
        continue;
      }
      
      for (const ep of episodeNos) {
        const episodeVote = votes[ep];
        if (!episodeVote || !episodeVote.connections) continue;
        
        const isCorrect = compareConnections(episodeVote.connections, finalAnswer);
        
        if (isFinalCorrect === null) {
          // 최종 회차의 정답 여부 확인
          isFinalCorrect = isCorrect;
          streakEpisode = ep;
        } else if (isFinalCorrect === isCorrect) {
          // 연속성 유지 중
          streakEpisode = ep;
        } else {
          // 연속성 끊김
          break;
        }
      }
      
      // 포인트 계산 (streakEpisode의 점수만 지급)
      if (streakEpisode && isFinalCorrect !== null) {
        const points = episodePoints[streakEpisode] || episodePoints[8]; // 8회차 이상은 8회차 점수
        const pointDiff = isFinalCorrect ? points.correct : points.incorrect;
        
        await addPointLog(
          userId,
          pointDiff,
          `${missionData.title || "커플 매칭"} ${streakEpisode}회차부터 ${isFinalCorrect ? "정답" : "오답"} 유지`,
          missionId,
          "mission2"
        );
        
        console.log(`[포인트 지급] 사용자 ${userId}: ${streakEpisode}회차부터 ${isFinalCorrect ? "정답" : "오답"} 유지 → ${pointDiff}P`);
      } else {
        console.log(`[포인트 지급 스킵] 사용자 ${userId}: 투표 기록 없음`);
      }
    }
    
    console.log(`[포인트 분배 완료] 커플 매칭 미션 ${missionId}`);
  } catch (error) {
    console.error("커플 매칭 포인트 분배 중 오류:", error);
    throw error;
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
      optionVoteCounts: voteCounts, // percentages가 아닌 실제 count 저장
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
