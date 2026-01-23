import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc,
  serverTimestamp,
  updateDoc,
  increment,
  addDoc
} from "firebase/firestore";
import { db } from "./config";
import { TVoteSubmission } from "@/types/t-vote/vote.types";
import { sanitizeFieldKey } from "@/lib/utils/sanitize-firestore-key";

/**
 * Firestore를 사용한 투표 관리
 */

// Binary/Multi 투표 조회
export async function getVote1(userId: string, missionId: string): Promise<TVoteSubmission | null> {
  try {
    const q = query(
      collection(db, "pickresult1"),
      where("userId", "==", userId),
      where("missionId", "==", missionId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const data = snap.docs[0].data();
    return {
      missionId: data.missionId,
      userId: data.userId,
      choice: data.selectedOption,
      submittedAt: data.submittedAt?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching vote1 from Firestore:", error);
    return null;
  }
}

// 커플 매칭 투표 조회 (특정 에피소드)
export async function getVote2(userId: string, missionId: string, episodeNo: number): Promise<TVoteSubmission | null> {
  try {
    const q = query(
      collection(db, "pickresult2"),
      where("userId", "==", userId),
      where("missionId", "==", missionId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const data = snap.docs[0].data();
    const votes = data.votes || {};
    const episodeVote = votes[episodeNo.toString()];

    if (!episodeVote) return null;

    return {
      missionId: data.missionId,
      userId: data.userId,
      pairs: episodeVote.connections || [],
      episodeNo: episodeNo,
      submittedAt: episodeVote.submittedAt,
    };
  } catch (error) {
    console.error("Error fetching vote2 from Firestore:", error);
    return null;
  }
}

// 커플 매칭 투표 전체 조회 (모든 에피소드)
export async function getAllVotes2(userId: string, missionId: string): Promise<TVoteSubmission[]> {
  try {
    const q = query(
      collection(db, "pickresult2"),
      where("userId", "==", userId),
      where("missionId", "==", missionId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return [];

    const data = snap.docs[0].data();
    const votes = data.votes || {};

    return Object.entries(votes).map(([epNo, voteData]: [string, any]) => ({
      missionId: data.missionId,
      userId: data.userId,
      pairs: voteData.connections || [],
      episodeNo: parseInt(epNo),
      submittedAt: voteData.submittedAt,
    })).sort((a, b) => a.episodeNo - b.episodeNo);
  } catch (error) {
    console.error("Error fetching all votes2 from Firestore:", error);
    return [];
  }
}

// 모든 사용자의 커플 매칭 투표 집계 (실시간 결과용 - 최적화 버전)
export async function getAggregatedVotes2(missionId: string, episodeNo?: number): Promise<{
  pairCounts: Record<string, number>,
  totalParticipants: number
}> {
  try {
    // 1. 미션 문서에서 미리 집계된 데이터가 있는지 확인 (가장 효율적)
    const missionSnap = await getDoc(doc(db, "missions2", missionId));
    if (missionSnap.exists()) {
      const data = missionSnap.data();
      if (data.aggregatedStats && episodeNo && data.aggregatedStats[episodeNo.toString()]) {
        return { 
          pairCounts: data.aggregatedStats[episodeNo.toString()], 
          totalParticipants: data.participants || 0 
        };
      }
    }

    // 2. 집계 데이터가 없으면 기존의 무거운 쿼리로 대체 (하위 호환성)
    const q = query(collection(db, "pickresult2"), where("missionId", "==", missionId));
    const snap = await getDocs(q);
    
    const pairCounts: Record<string, number> = {};
    const uniqueUsers = new Set<string>();

    snap.forEach((doc) => {
      const data = doc.data();
      const votes = data.votes || {};
      const episodesToAggregate = episodeNo ? [episodeNo.toString()] : Object.keys(votes);
      
      let hasVotedInTargetEpisodes = false;
      episodesToAggregate.forEach(epKey => {
        const voteData = votes[epKey];
        if (voteData && Array.isArray(voteData.connections)) {
          hasVotedInTargetEpisodes = true;
          voteData.connections.forEach((pair: { left: string; right: string }) => {
            const pairKey = `${pair.left}-${pair.right}`;
            pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
          });
        }
      });

      if (hasVotedInTargetEpisodes) {
        uniqueUsers.add(data.userId);
      }
    });

    return { pairCounts, totalParticipants: uniqueUsers.size };
  } catch (error) {
    console.error("Error fetching aggregated votes2 from Firestore:", error);
    return { pairCounts: {}, totalParticipants: 0 };
  }
}

// 여러 에피소드의 집계 결과
export async function getAggregatedVotesMultipleEpisodes(missionId: string, episodeNos: number[]): Promise<{
  pairCounts: Record<string, number>,
  totalParticipants: number
}> {
  try {
    const q = query(collection(db, "pickresult2"), where("missionId", "==", missionId));
    const snap = await getDocs(q);
    
    const pairCounts: Record<string, number> = {};
    const uniqueUsers = new Set<string>();

    snap.forEach((doc) => {
      const data = doc.data();
      const votes = data.votes || {};
      let hasVotedInTargetEpisodes = false;

      episodeNos.forEach(epNo => {
        const voteData = votes[epNo.toString()];
        if (voteData && Array.isArray(voteData.connections)) {
          hasVotedInTargetEpisodes = true;
          voteData.connections.forEach((pair: { left: string; right: string }) => {
            const pairKey = `${pair.left}-${pair.right}`;
            pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
          });
        }
      });

      if (hasVotedInTargetEpisodes) {
        uniqueUsers.add(data.userId);
      }
    });

    return { pairCounts, totalParticipants: uniqueUsers.size };
  } catch (error) {
    console.error("Error fetching aggregated votes multiple episodes from Firestore:", error);
    return { pairCounts: {}, totalParticipants: 0 };
  }
}

// Binary/Multi 투표 제출
export async function submitVote1(submission: TVoteSubmission): Promise<boolean> {
  try {
    console.log('[Firebase Votes] submitVote1 시작:', {
      userId: submission.userId,
      missionId: submission.missionId,
      choice: submission.choice
    })

    // 미션 정보 조회 (missions1 또는 ai_mission에서 검색)
    let missionRef = doc(db, "missions1", submission.missionId);
    let missionSnap = await getDoc(missionRef);
    let missionCollection = "missions1";
    
    // missions1에 없으면 ai_mission에서 검색
    if (!missionSnap.exists()) {
      console.log('[Firebase Votes] missions1에 없음, ai_mission에서 검색 중...')
      missionRef = doc(db, "ai_mission", submission.missionId);
      missionSnap = await getDoc(missionRef);
      missionCollection = "ai_mission";
    }
    
    if (!missionSnap.exists()) {
      console.error('[Firebase Votes] 미션을 찾을 수 없습니다:', submission.missionId)
      return false;
    }
    
    const missionData = missionSnap.data();
    console.log('[Firebase Votes] 미션 찾음:', { collection: missionCollection });
    console.log('[Firebase Votes] 미션 데이터:', {
      kind: missionData.kind,
      title: missionData.title,
      currentParticipants: missionData.participants,
      currentTotalVotes: missionData.stats?.totalVotes,
      currentOptionVoteCounts: missionData.optionVoteCounts
    })

    let pointsEarned = 0;
    if (missionData && (missionData.kind === "poll" || missionData.kind === "majority")) {
      pointsEarned = 50;
    }

    const voteId = `${submission.userId}_${submission.missionId}`;
    const voteData = {
      userId: submission.userId,
      missionId: submission.missionId,
      selectedOption: submission.choice,
      submittedAt: serverTimestamp(),
      pointsEarned,
      createdAt: serverTimestamp(),
    };

    console.log('[Firebase Votes] pickresult1에 투표 저장 중...')
    await setDoc(doc(db, "pickresult1", voteId), voteData);
    console.log('[Firebase Votes] pickresult1 저장 완료')

    // 참여자 수 및 옵션별 투표 수 업데이트 (원자적 연산)
    const updateData: any = {
      participants: increment(1),
      "stats.totalVotes": increment(1)
    };

    // 옵션별 투표 수 업데이트 (배열인 경우 처리)
    if (submission.choice) {
      const choices = Array.isArray(submission.choice) ? submission.choice : [submission.choice];
      const missionOptions = missionData.options || [];
      
      choices.forEach(opt => {
        if (!opt) return;
        
        let targetOption = opt;
        
        // 미션에 정의된 옵션이 있는 경우, 대소문자/공백 무시하고 매칭 시도
        if (missionOptions.length > 0) {
          const matchedOption = missionOptions.find((mOpt: string) => 
            mOpt.trim().toLowerCase() === String(opt).trim().toLowerCase()
          );
          if (matchedOption) {
            console.log(`[Firebase Votes] 옵션 매칭 성공: "${opt}" -> "${matchedOption}"`);
            targetOption = matchedOption;
          } else {
            console.warn(`[Firebase Votes] 옵션 매칭 실패 (정의되지 않은 옵션): "${opt}"`);
          }
        }
        
        const safeKey = sanitizeFieldKey(String(targetOption));
        updateData[`optionVoteCounts.${safeKey}`] = increment(1);
      });
    }

    console.log('[Firebase Votes] missions1 업데이트 데이터:', updateData)
    await updateDoc(missionRef, updateData);
    console.log('[Firebase Votes] missions1 업데이트 완료')

    // 업데이트 후 데이터 확인
    const updatedSnap = await getDoc(missionRef);
    if (updatedSnap.exists()) {
      const updated = updatedSnap.data();
      console.log('[Firebase Votes] 업데이트 후 미션 데이터:', {
        participants: updated.participants,
        totalVotes: updated.stats?.totalVotes,
        optionVoteCounts: updated.optionVoteCounts
      })
    }

    // 포인트 지급 (공감픽인 경우)
    if (pointsEarned > 0) {
      const { addPointLog } = await import("./points");
      await addPointLog(
        submission.userId,
        pointsEarned,
        `[공감 픽] ${missionData?.title} 참여 보상`,
        submission.missionId,
        "mission1"
      );
    }

    console.log('[Firebase Votes] submitVote1 완료')
    return true;
  } catch (error) {
    console.error("[Firebase Votes] Error submitting vote1 to Firestore:", error);
    return false;
  }
}

// 커플 매칭 투표 제출
export async function submitVote2(submission: TVoteSubmission): Promise<boolean> {
  try {
    if (!submission.episodeNo || !submission.pairs) return false;

    const voteId = `${submission.userId}_${submission.missionId}`;
    const voteRef = doc(db, "pickresult2", voteId);
    const voteSnap = await getDoc(voteRef);

    const currentVotes = voteSnap.exists() ? (voteSnap.data().votes || {}) : {};
    currentVotes[submission.episodeNo.toString()] = {
      connections: submission.pairs,
      submittedAt: new Date().toISOString()
    };

    await setDoc(voteRef, {
      userId: submission.userId,
      missionId: submission.missionId,
      votes: currentVotes,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // 실시간 집계 업데이트 (Atomic Increments)
    const missionRef = doc(db, "missions2", submission.missionId);
    const updateData: any = {
      updatedAt: serverTimestamp()
    };

    if (submission.pairs && Array.isArray(submission.pairs)) {
      submission.pairs.forEach((pair: { left: string; right: string }) => {
        const pairKey = `${pair.left}-${pair.right}`;
        // 주의: Firestore 필드 이름에 특수문자나 공백이 포함될 수 있으므로 pairKey 생성 시 주의
        // 여기서는 ID-ID 형식이므로 안전할 것으로 보임
        updateData[`aggregatedStats.${submission.episodeNo}.${pairKey}`] = increment(1);
      });
    }

    // 처음 투표하는 경우 미션 참여자 수 증가
    if (!voteSnap.exists()) {
      updateData.participants = increment(1);
    }
    
    await updateDoc(missionRef, updateData);

    return true;
  } catch (error) {
    console.error("Error submitting vote2 to Firestore:", error);
    return false;
  }
}

// 유저가 특정 미션들에 투표했는지 확인 (Map 반환) - 최적화 버전
export async function getUserVotesMap(userId: string, missionIds: string[]): Promise<Record<string, any>> {
  try {
    if (!missionIds.length) return {};
    
    const votesMap: Record<string, any> = {};
    
    // 1. pickresult1 조회 (in 쿼리 사용하여 필요한 데이터만 가져옴)
    for (let i = 0; i < missionIds.length; i += 30) {
      const chunk = missionIds.slice(i, i + 30);
      const q1 = query(
        collection(db, "pickresult1"),
        where("userId", "==", userId),
        where("missionId", "in", chunk)
      );
      const snap1 = await getDocs(q1);
      snap1.forEach(doc => {
        const data = doc.data();
        votesMap[data.missionId] = data.selectedOption;
      });
    }
    
    // 2. pickresult2 조회 (in 쿼리 사용)
    for (let i = 0; i < missionIds.length; i += 30) {
      const chunk = missionIds.slice(i, i + 30);
      const q2 = query(
        collection(db, "pickresult2"),
        where("userId", "==", userId),
        where("missionId", "in", chunk)
      );
      const snap2 = await getDocs(q2);
      snap2.forEach(doc => {
        const data = doc.data();
        const episodes = Object.keys(data.votes || {});
        if (episodes.length > 0) {
          votesMap[data.missionId] = { 
            type: 'match', 
            episodeCount: episodes.length 
          };
        }
      });
    }

    return votesMap;
  } catch (error) {
    console.error("Error fetching user votes map from Firestore:", error);
    return {};
  }
}

// 특정 미션에 투표했는지 확인
export async function hasUserVoted(userId: string, missionId: string): Promise<boolean> {
  const voteId = `${userId}_${missionId}`;
  const snap1 = await getDoc(doc(db, "pickresult1", voteId));
  if (snap1.exists()) return true;
  
  const snap2 = await getDoc(doc(db, "pickresult2", voteId));
  return snap2.exists();
}
