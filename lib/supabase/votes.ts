import { createClient } from "./client"
import type { TVoteSubmission } from "@/types/t-vote/vote.types"
import { getMission2 } from "./missions"

/**
 * 투표 데이터 읽기/수정 함수
 * t_pickresult1 (binary/multi)와 t_pickresult2 (match)를 통합 관리
 */

// Binary/Multi 투표 조회
export async function getVote1(userId: string, missionId: string): Promise<TVoteSubmission | null> {
  // 먼저 커플매칭 미션인지 확인 (406 에러 방지)
  const mission2Result = await getMission2(missionId)
  if (mission2Result.success && mission2Result.mission) {
    // 커플매칭 미션이면 t_pickresult1에서 조회하지 않음
    return null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_pickresult1")
    .select("*")
    .eq("f_user_id", userId)
    .eq("f_mission_id", missionId)
    .single()

  if (error) {
    if (error.code === "PGRST116" || error.code === "406") {
      // No rows returned or Not Acceptable (mission might be in t_missions2)
      return null
    }
    console.error("Error fetching vote1:", error)
    return null
  }

  // JSONB에서 option 추출 (JSONB 형식: { option: "선택지" } 또는 단순 문자열)
  const selectedOption = typeof data.f_selected_option === 'string' 
    ? data.f_selected_option 
    : data.f_selected_option?.option || data.f_selected_option

  return {
    missionId: data.f_mission_id,
    userId: data.f_user_id,
    choice: selectedOption,
    submittedAt: data.f_submitted_at || data.f_created_at,
  }
}

// 커플 매칭 투표 조회 (특정 에피소드)
export async function getVote2(
  userId: string,
  missionId: string,
  episodeNo: number
): Promise<TVoteSubmission | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_pickresult2")
    .select("*")
    .eq("f_user_id", userId)
    .eq("f_mission_id", missionId)
    .eq("f_episode_no", episodeNo)
    .single()

  if (error) {
    if (error.code === "PGRST116" || error.code === "406") {
      // No rows returned or Not Acceptable
      return null
    }
    console.error("Error fetching vote2:", error)
    return null
  }

  // JSONB 필드가 문자열로 반환되는 경우 파싱 처리
  let pairs = data.f_connections
  if (typeof pairs === 'string') {
    try {
      pairs = JSON.parse(pairs)
    } catch (e) {
      console.error("Failed to parse f_connections:", e)
      pairs = []
    }
  }

  return {
    missionId: data.f_mission_id,
    userId: data.f_user_id,
    pairs: pairs,
    episodeNo: episodeNo,
    submittedAt: data.f_submitted_at || data.f_created_at,
  }
}

// 커플 매칭 투표 전체 조회 (모든 에피소드)
export async function getAllVotes2(userId: string, missionId: string): Promise<TVoteSubmission[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_pickresult2")
    .select("*")
    .eq("f_user_id", userId)
    .eq("f_mission_id", missionId)
    .order("f_episode_no", { ascending: true })

  if (error) {
    if (error.code === "406") {
       return []
    }
    console.error("Error fetching votes2:", error)
    return []
  }

  return (data || []).map((v) => {
    let pairs = v.f_connections
    if (typeof pairs === 'string') {
      try {
        pairs = JSON.parse(pairs)
      } catch (e) {
        console.error("Failed to parse f_connections:", e)
        pairs = []
      }
    }

    return {
      missionId: v.f_mission_id,
      userId: v.f_user_id,
      pairs: pairs,
      episodeNo: v.f_episode_no,
      submittedAt: v.f_submitted_at || v.f_created_at,
    }
  })
}

// 모든 사용자의 커플 매칭 투표 집계 (실시간 결과용)
export async function getAggregatedVotes2(missionId: string, episodeNo?: number): Promise<{ 
  pairCounts: Record<string, number>, 
  totalParticipants: number 
}> {
  const supabase = createClient()
  
  let query = supabase
    .from("t_pickresult2")
    .select("f_connections, f_user_id, f_episode_no")
    .eq("f_mission_id", missionId)
  
  if (episodeNo) {
    query = query.eq("f_episode_no", episodeNo)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching aggregated votes2:", error)
    return { pairCounts: {}, totalParticipants: 0 }
  }

  // 커플별 투표 수 집계
  const pairCounts: Record<string, number> = {}
  const uniqueUsers = new Set<string>()
  
  data?.forEach((vote) => {
    // 유니크 사용자 카운트 (에피소드 상관없이 사용자 ID만으로)
    uniqueUsers.add(vote.f_user_id)
    
    let pairs = vote.f_connections
    if (typeof pairs === 'string') {
      try {
        pairs = JSON.parse(pairs)
      } catch (e) {
        console.error("Failed to parse f_connections:", e)
        return
      }
    }

    if (Array.isArray(pairs)) {
      pairs.forEach((pair: { left: string; right: string }) => {
        const pairKey = `${pair.left}-${pair.right}`
        pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1
      })
    }
  })

  return { 
    pairCounts, 
    totalParticipants: uniqueUsers.size 
  }
}

// 여러 에피소드의 집계 결과 (에피소드 배열 지원)
export async function getAggregatedVotesMultipleEpisodes(missionId: string, episodeNos: number[]): Promise<{ 
  pairCounts: Record<string, number>, 
  totalParticipants: number 
}> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("t_pickresult2")
    .select("f_connections, f_user_id, f_episode_no")
    .eq("f_mission_id", missionId)
    .in("f_episode_no", episodeNos)

  if (error) {
    console.error("Error fetching aggregated votes for multiple episodes:", error)
    return { pairCounts: {}, totalParticipants: 0 }
  }

  // 커플별 투표 수 집계 (여러 에피소드 합산)
  const pairCounts: Record<string, number> = {}
  const uniqueUsers = new Set<string>()
  
  data?.forEach((vote) => {
    // 유니크 사용자 카운트 (에피소드 상관없이 사용자 ID만으로)
    uniqueUsers.add(vote.f_user_id)
    
    let pairs = vote.f_connections
    if (typeof pairs === 'string') {
      try {
        pairs = JSON.parse(pairs)
      } catch (e) {
        console.error("Failed to parse f_connections:", e)
        return
      }
    }

    if (Array.isArray(pairs)) {
      pairs.forEach((pair: { left: string; right: string }) => {
        const pairKey = `${pair.left}-${pair.right}`
        pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1
      })
    }
  })

  return { 
    pairCounts, 
    totalParticipants: uniqueUsers.size 
  }
}

// Binary/Multi 투표 제출
export async function submitVote1(submission: TVoteSubmission): Promise<boolean> {
  try {
    const supabase = createClient()

    // f_selected_option은 JSONB이지만, binary/multi의 경우 단순 문자열로 저장
    // 스키마: binary는 "옵션1", multi는 ["옵션1", "옵션2"]
    // 현재는 단일 선택만 지원하므로 문자열로 저장
    const voteData = {
      f_user_id: submission.userId,
      f_mission_id: submission.missionId,
      f_selected_option: submission.choice, // 단순 문자열로 저장
      f_submitted_at: submission.submittedAt || new Date().toISOString(),
    }

    console.log("submitVote1 - 제출 데이터:", voteData)

    const { data, error } = await supabase.from("t_pickresult1").upsert(voteData, {
      onConflict: "f_user_id,f_mission_id",
    })

    if (error) {
      console.error("Error submitting vote1:", {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        submission,
        voteData
      })
      return false
    }

    console.log("submitVote1 - 제출 성공:", data)
    return true
  } catch (err) {
    console.error("submitVote1 - 예외 발생:", err)
    return false
  }
}

// 커플 매칭 투표 제출
export async function submitVote2(submission: TVoteSubmission): Promise<boolean> {
  const supabase = createClient()

  if (!submission.episodeNo || !submission.pairs) {
    console.error("Missing episodeNo or pairs for vote2", { episodeNo: submission.episodeNo, pairs: submission.pairs })
    return false
  }

  if (!submission.userId || !submission.missionId) {
    console.error("Missing userId or missionId for vote2", { userId: submission.userId, missionId: submission.missionId })
    return false
  }

  if (submission.episodeNo <= 0) {
    console.error("Invalid episodeNo (must be > 0)", { episodeNo: submission.episodeNo })
    return false
  }

  if (!Array.isArray(submission.pairs) || submission.pairs.length === 0) {
    console.error("Invalid pairs (must be non-empty array)", { pairs: submission.pairs })
    return false
  }

  // pairs 배열 검증
  const validPairs = submission.pairs.every(pair => 
    pair && typeof pair === 'object' && 
    typeof pair.left === 'string' && pair.left.trim() !== '' &&
    typeof pair.right === 'string' && pair.right.trim() !== ''
  )

  if (!validPairs) {
    console.error("Invalid pairs format", { pairs: submission.pairs })
    return false
  }

  const voteData = {
    f_user_id: submission.userId,
    f_mission_id: submission.missionId,
    f_episode_no: submission.episodeNo,
    f_connections: submission.pairs, // JSONB 형식으로 자동 변환됨
    f_submitted: true,
    f_submitted_at: submission.submittedAt || new Date().toISOString(),
  }

  console.log("Submitting vote2 data:", JSON.stringify(voteData, null, 2))

  // UPSERT 사용 (unique constraint: t_pickresult2_f_user_id_f_mission_id_f_episode_no_key)
  const { data, error } = await supabase
    .from("t_pickresult2")
    .upsert(voteData, {
      onConflict: "f_user_id,f_mission_id,f_episode_no",
    })
    .select()

  if (error) {
    console.error("Error submitting vote2:", error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    console.error("Vote data:", JSON.stringify(voteData, null, 2))
    return false
  }

  console.log("Vote2 submitted successfully:", data)
  return true
}

// 통합 투표 조회 함수 (미션 타입 자동 확인)
export async function getVote(userId: string, missionId: string): Promise<TVoteSubmission | null> {
  // 먼저 미션 타입 확인 (커플매칭 미션인지 확인)
  const mission2Result = await getMission2(missionId)
  
  if (mission2Result.success && mission2Result.mission) {
    // 커플매칭 미션인 경우 - 첫 번째 에피소드의 투표를 반환 (또는 null)
    // 주의: 커플매칭은 여러 에피소드가 있으므로 getAllVotes2를 사용하는 것이 더 적절할 수 있음
    return null // 커플매칭은 getVote2나 getAllVotes2를 직접 사용해야 함
  }

  // 일반 미션인 경우 t_pickresult1 확인
  return await getVote1(userId, missionId)
}

// 투표 여부 확인
export async function hasUserVoted(userId: string, missionId: string): Promise<boolean> {
  const vote = await getVote(userId, missionId)
  return vote !== null
}