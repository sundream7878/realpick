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
    .maybeSingle()

  if (error) {
    if (error.code === "PGRST116" || error.code === "406") {
      // No rows returned or Not Acceptable (mission might be in t_missions2)
      return null
    }
    console.error("Error fetching vote1:", error)
    return null
  }

  if (!data) {
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
    .select("f_votes, f_mission_id, f_user_id, f_created_at, f_updated_at")
    .eq("f_user_id", userId)
    .eq("f_mission_id", missionId)
    .maybeSingle()

  if (error) {
    if (error.code === "PGRST116" || error.code === "406") {
      // No rows returned or Not Acceptable
      return null
    }
    console.error("Error fetching vote2:", error)
    return null
  }

  if (!data) {
    return null
  }

  const votes = data.f_votes as Record<string, any> || {}
  const episodeVote = votes[episodeNo.toString()]

  if (!episodeVote) {
    return null
  }

  return {
    missionId: data.f_mission_id,
    userId: data.f_user_id,
    pairs: episodeVote.connections || [],
    episodeNo: episodeNo,
    submittedAt: episodeVote.submittedAt || data.f_updated_at || data.f_created_at,
  }
}

// 커플 매칭 투표 전체 조회 (모든 에피소드)
export async function getAllVotes2(userId: string, missionId: string): Promise<TVoteSubmission[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_pickresult2")
    .select("f_votes, f_mission_id, f_user_id, f_created_at, f_updated_at")
    .eq("f_user_id", userId)
    .eq("f_mission_id", missionId)
    .maybeSingle()

  if (error) {
    if (error.code === "PGRST116" || error.code === "406") {
      return []
    }
    console.error("Error fetching votes2:", error)
    return []
  }

  if (!data) {
    return []
  }

  const votes = data.f_votes as Record<string, any> || {}

  return Object.entries(votes).map(([epNo, voteData]: [string, any]) => ({
    missionId: data.f_mission_id,
    userId: data.f_user_id,
    pairs: voteData.connections || [],
    episodeNo: parseInt(epNo),
    submittedAt: voteData.submittedAt || data.f_updated_at || data.f_created_at,
  })).sort((a, b) => a.episodeNo - b.episodeNo)
}

// 모든 사용자의 커플 매칭 투표 집계 (실시간 결과용)
export async function getAggregatedVotes2(missionId: string, episodeNo?: number): Promise<{
  pairCounts: Record<string, number>,
  totalParticipants: number
}> {
  const supabase = createClient()

  // 모든 사용자의 투표 데이터를 가져옴 (f_votes JSONB)
  const { data, error } = await supabase
    .from("t_pickresult2")
    .select("f_votes, f_user_id")
    .eq("f_mission_id", missionId)

  if (error) {
    console.error("Error fetching aggregated votes2:", error)
    return { pairCounts: {}, totalParticipants: 0 }
  }

  const pairCounts: Record<string, number> = {}
  const uniqueUsers = new Set<string>()

  data?.forEach((row) => {
    const votes = row.f_votes as Record<string, any> || {}

    // 특정 에피소드만 집계하거나 모든 에피소드 집계
    const episodesToAggregate = episodeNo
      ? [episodeNo.toString()]
      : Object.keys(votes)

    let hasVotedInTargetEpisodes = false

    episodesToAggregate.forEach(epKey => {
      const voteData = votes[epKey]
      if (voteData && Array.isArray(voteData.connections)) {
        hasVotedInTargetEpisodes = true
        voteData.connections.forEach((pair: { left: string; right: string }) => {
          const pairKey = `${pair.left}-${pair.right}`
          pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1
        })
      }
    })

    if (hasVotedInTargetEpisodes) {
      uniqueUsers.add(row.f_user_id)
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
    .select("f_votes, f_user_id")
    .eq("f_mission_id", missionId)

  if (error) {
    console.error("Error fetching aggregated votes for multiple episodes:", error)
    return { pairCounts: {}, totalParticipants: 0 }
  }

  const pairCounts: Record<string, number> = {}
  const uniqueUsers = new Set<string>()

  data?.forEach((row) => {
    const votes = row.f_votes as Record<string, any> || {}
    let hasVotedInTargetEpisodes = false

    episodeNos.forEach(epNo => {
      const voteData = votes[epNo.toString()]
      if (voteData && Array.isArray(voteData.connections)) {
        hasVotedInTargetEpisodes = true
        voteData.connections.forEach((pair: { left: string; right: string }) => {
          const pairKey = `${pair.left}-${pair.right}`
          pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1
        })
      }
    })

    if (hasVotedInTargetEpisodes) {
      uniqueUsers.add(row.f_user_id)
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

    // 미션 정보 조회 (포인트 즉시 지급을 위해)
    const { data: mission } = await supabase
      .from("t_missions1")
      .select("f_kind, f_title")
      .eq("f_id", submission.missionId)
      .single()

    let pointsEarned = 0
    let isCorrect = null

    // 공감픽(poll/majority)인 경우 즉시 포인트 지급
    if (mission && (mission.f_kind === "poll" || mission.f_kind === "majority")) {
      pointsEarned = 10
      isCorrect = true // 참여 완료 의미로 true
    }

    const voteData = {
      f_user_id: submission.userId,
      f_mission_id: submission.missionId,
      f_selected_option: submission.choice, // 문자열 또는 문자열 배열(다중 선택)로 저장
      f_submitted_at: submission.submittedAt || new Date().toISOString(),
      f_points_earned: pointsEarned,
      f_is_correct: isCorrect
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

    // 포인트 로그 추가 (공감픽인 경우)
    if (pointsEarned > 0 && mission) {
      const { addPointLog } = await import("./points")
      await addPointLog(
        submission.userId,
        pointsEarned,
        `[공감 픽] ${mission.f_title} 참여 보상`,
        submission.missionId,
        "mission1"
      )
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

  // missions.ts의 submitMatchMissionAnswer 함수 사용
  const { submitMatchMissionAnswer } = await import("./missions")

  const result = await submitMatchMissionAnswer(
    submission.userId,
    submission.missionId,
    submission.episodeNo,
    submission.pairs
  )

  if (!result.success) {
    console.error("Error submitting vote2:", result.error)
    return false
  }

  console.log("Vote2 submitted successfully")
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
 
 
// 특정 유저의 여러 미션에 대한 투표 내역을 한꺼번에 조회
export async function getUserVotesMap(userId: string, missionIds: string[]): Promise<Record<string, any>> {
  if (!userId || !missionIds.length) return {}

  const supabase = createClient()
  const votesMap: Record<string, any> = {}

  // 1. t_pickresult1 (일반 미션) 조회
  const { data: votes1, error: error1 } = await supabase
    .from("t_pickresult1")
    .select("f_mission_id, f_selected_option")
    .eq("f_user_id", userId)
    .in("f_mission_id", missionIds)

  if (!error1 && votes1) {
    votes1.forEach(v => {
      const selectedOption = typeof v.f_selected_option === 'string'
        ? v.f_selected_option
        : v.f_selected_option?.option || v.f_selected_option
      votesMap[v.f_mission_id] = selectedOption
    })
  }

  // 2. t_pickresult2 (커플 매칭) 조회
  const { data: votes2, error: error2 } = await supabase
    .from("t_pickresult2")
    .select("f_mission_id, f_votes")
    .eq("f_user_id", userId)
    .in("f_mission_id", missionIds)

  if (!error2 && votes2) {
    votes2.forEach(v => {
      // 커플매칭은 여러 에피소드가 있을 수 있으므로, 참여 여부만 저장하거나 
      // 가장 최근 또는 첫 번째 에피소드 정보를 저장
      const episodes = Object.keys(v.f_votes || {})
      if (episodes.length > 0) {
        votesMap[v.f_mission_id] = { 
          type: 'match', 
          episodeCount: episodes.length,
          lastEpisode: Math.max(...episodes.map(Number))
        }
      }
    })
  }

  return votesMap
}

// 특정 미션의 상위 투표자 조회 (포인트 기준)
export async function getTopVotersByMission(missionId: string, limit: number = 3): Promise<Array<{
  nickname: string
  points: number
  tier: string
}>> {
  const supabase = createClient()

  // t_pickresult1에서 해당 미션에 투표한 유저 ID 목록 가져오기
  const { data: votes, error: votesError } = await supabase
    .from("t_pickresult1")
    .select("f_user_id")
    .eq("f_mission_id", missionId)

  if (votesError || !votes || votes.length === 0) {
    return []
  }

  const userIds = votes.map(v => v.f_user_id)

  // 해당 유저들의 정보를 포인트 순으로 조회
  const { data: users, error: usersError } = await supabase
    .from("t_users")
    .select("f_nickname, f_points, f_tier")
    .in("f_id", userIds)
    .order("f_points", { ascending: false })
    .limit(limit)

  if (usersError || !users) {
    return []
  }

  return users.map(u => ({
    nickname: u.f_nickname,
    points: u.f_points,
    tier: u.f_tier
  }))
}
