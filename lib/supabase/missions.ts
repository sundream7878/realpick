/**
 * Supabase 미션 관련 API 함수들
 */

import { createClient } from "@/lib/supabase/client"
import { getUserId } from "@/lib/auth-utils"
import { addPointLog } from "./points"
import { calculateBinaryMultiPoints, calculateMatchPoints } from "@/lib/utils/u-vote/vote.util"

export interface CreateMissionData {
  title: string
  type: "prediction" | "majority"
  format: "binary" | "multiple" | "couple" | "subjective"
  seasonType: "전체" | "기수별"
  seasonNumber?: string
  options?: string[]
  maleOptions?: string[]
  femaleOptions?: string[]
  placeholder?: string
  totalEpisodes?: number // 커플매칭 미션의 총 회차 수
  deadline: string
  resultVisibility: string
}

/**
 * 새 미션 생성
 */
export async function createMission(missionData: CreateMissionData): Promise<{ success: boolean; missionId?: string; error?: string }> {
  try {
    const supabase = createClient()
    const userId = getUserId()

    if (!userId) {
      return { success: false, error: "로그인이 필요합니다." }
    }

    // 미션 데이터 준비 (실제 테이블 스키마에 맞춤)
    const missionPayload: any = {
      f_title: missionData.title,
      f_kind: missionData.type === "prediction" ? "predict" : "majority", // type -> kind
      f_form: missionData.format === "multiple" ? "multi" : missionData.format === "couple" ? "match" : missionData.format, // format -> form
      f_deadline: missionData.deadline,
      f_reveal_policy: missionData.resultVisibility === "realtime" ? "realtime" : "onClose", // result_visibility -> reveal_policy
      f_creator_id: userId,
      f_status: "open" // active -> open
    }

    // 커플매칭 형식일 때는 t_missions2에 저장
    if (missionData.format === "couple") {
      const mission2Payload: any = {
        f_title: missionData.title,
        f_kind: "predict", // 커플매칭은 항상 predict
        f_match_pairs: {
          left: missionData.maleOptions || [],
          right: missionData.femaleOptions || []
        },
        f_deadline: missionData.deadline, // 회차별 관리이므로 먼 미래 날짜로 설정됨
        f_reveal_policy: missionData.resultVisibility === "realtime" ? "realtime" : "onClose",
        f_creator_id: userId,
        f_status: "open",
        f_total_episodes: missionData.totalEpisodes || 8 // 사용자 입력값 또는 기본값 8
      }

      // 선택적 필드들
      if (missionData.seasonType) {
        mission2Payload.f_season_type = missionData.seasonType
      }
      
      if (missionData.seasonNumber) {
        mission2Payload.f_season_number = parseInt(missionData.seasonNumber)
      }

      // t_missions2에 삽입
      const { data, error } = await supabase
        .from("t_missions2")
        .insert([mission2Payload])
        .select("f_id")
        .single()

      if (error) {
        console.error("커플매칭 미션 생성 실패:", error)
        console.error("에러 상세:", JSON.stringify(error, null, 2))
        console.error("미션 데이터:", JSON.stringify(mission2Payload, null, 2))
        return { success: false, error: `커플매칭 미션 생성에 실패했습니다: ${error.message}` }
      }

      console.log("커플매칭 미션 생성 성공:", data)
      return { success: true, missionId: data.f_id }
    }

    // 주관식 형식일 때는 f_options를 null로, 아닐 때는 배열로 설정
    if (missionData.format === "subjective") {
      missionPayload.f_options = null
      if (missionData.placeholder) {
        missionPayload.f_subjective_placeholder = missionData.placeholder
      }
    } else {
      missionPayload.f_options = missionData.options || [] // JSONB 필드, 빈 배열이라도 필요
    }

    // 선택적 필드들
    if (missionData.seasonType) {
      missionPayload.f_season_type = missionData.seasonType
    }
    
    if (missionData.seasonNumber) {
      missionPayload.f_season_number = parseInt(missionData.seasonNumber)
    }

    // t_missions1에 미션 삽입
    const { data, error } = await supabase
      .from("t_missions1")
      .insert([missionPayload])
      .select("f_id")
      .single()

    if (error) {
      console.error("미션 생성 실패:", error)
      console.error("에러 상세:", JSON.stringify(error, null, 2))
      console.error("미션 데이터:", JSON.stringify(missionPayload, null, 2))
      return { success: false, error: `미션 생성에 실패했습니다: ${error.message}` }
    }

    console.log("미션 생성 성공:", data)
    return { success: true, missionId: data.f_id }

  } catch (error) {
    console.error("미션 생성 중 오류:", error)
    return { success: false, error: "미션 생성 중 오류가 발생했습니다." }
  }
}

/**
 * 미션 목록 가져오기
 */
export async function getMissions(limit: number = 20): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("t_missions1")
      .select("*")
      // .eq("f_status", "open") // 모든 상태의 미션을 가져오도록 주석 처리 (마감된 미션도 표시)
      .order("f_created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("미션 목록 조회 실패:", error)
      return { success: false, error: "미션 목록을 불러올 수 없습니다." }
    }

    return { success: true, missions: data }

  } catch (error) {
    console.error("미션 목록 조회 중 오류:", error)
    return { success: false, error: "미션 목록 조회 중 오류가 발생했습니다." }
  }
}

/**
 * 특정 미션 가져오기
 */
export async function getMission(missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("t_missions1")
      .select("*")
      .eq("f_id", missionId)
      .single()

    if (error) {
      // 406 에러나 PGRST116 (No rows) 에러는 정상적인 경우일 수 있음 (커플매칭 미션일 수 있음)
      if (error.code === "PGRST116" || error.code === "406") {
        return { success: false } // 에러가 아니고 단순히 없음
      }
      console.error("미션 조회 실패:", error)
      console.error("에러 상세:", JSON.stringify(error, null, 2))
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }

    return { success: true, mission: data }

  } catch (error) {
    console.error("미션 조회 중 오류:", error)
    return { success: false, error: "미션 조회 중 오류가 발생했습니다." }
  }
}

/**
 * 미션 참여자 수 증가
 */
export async function incrementMissionParticipants(missionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 현재 참여자 수 가져오기
    const { data: mission, error: fetchError } = await supabase
      .from("t_missions1")
      .select("f_stats_participants")
      .eq("f_id", missionId)
      .single()

    if (fetchError) {
      console.error("미션 조회 실패:", fetchError)
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }

    // 참여자 수 증가
    const newCount = (mission.f_stats_participants || 0) + 1

    const { error: updateError } = await supabase
      .from("t_missions1")
      .update({ 
        f_stats_participants: newCount,
        f_stats_total_votes: newCount // totalVotes도 함께 업데이트
      })
      .eq("f_id", missionId)

    if (updateError) {
      console.error("참여자 수 업데이트 실패:", updateError)
      return { success: false, error: "참여자 수 업데이트에 실패했습니다." }
    }

    return { success: true }

  } catch (error) {
    console.error("참여자 수 업데이트 중 오류:", error)
    return { success: false, error: "참여자 수 업데이트 중 오류가 발생했습니다." }
  }
}

/**
 * 미션의 선택지별 투표 수 업데이트
 */
export async function updateOptionVoteCounts(missionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 1. 미션의 모든 옵션 가져오기
    const { data: mission, error: missionError } = await supabase
      .from("t_missions1")
      .select("f_options")
      .eq("f_id", missionId)
      .single()

    if (missionError) {
      console.error("미션 조회 실패:", missionError)
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }

    const allOptions: string[] = mission.f_options || []

    // 2. t_pickresult1에서 해당 미션의 모든 투표 집계
    const { data: votes, error: votesError } = await supabase
      .from("t_pickresult1")
      .select("f_selected_option")
      .eq("f_mission_id", missionId)

    if (votesError) {
      console.error("투표 집계 실패:", votesError)
      return { success: false, error: "투표 집계에 실패했습니다." }
    }

    // 3. 선택지별 투표 수 계산 (모든 옵션을 0으로 초기화)
    const voteCounts: { [key: string]: number } = {}
    allOptions.forEach(option => {
      voteCounts[option] = 0
    })

    const totalVotes = votes.length

    votes.forEach((vote) => {
      // JSONB에서 option 추출
      let selectedOption: string | null = null
      
      if (typeof vote.f_selected_option === 'string') {
        // 이미 문자열인 경우
        selectedOption = vote.f_selected_option
      } else if (vote.f_selected_option && typeof vote.f_selected_option === 'object') {
        // JSONB 객체인 경우
        selectedOption = vote.f_selected_option.option
      }
      
      console.log('투표 데이터:', vote.f_selected_option, '→ 추출된 값:', selectedOption)
      
      if (selectedOption && typeof selectedOption === 'string' && allOptions.includes(selectedOption)) {
        voteCounts[selectedOption] = (voteCounts[selectedOption] || 0) + 1
      }
    })

    // 4. 퍼센트로 변환
    const votePercentages: { [key: string]: number } = {}
    allOptions.forEach((option) => {
      votePercentages[option] = totalVotes > 0 ? Math.round((voteCounts[option] / totalVotes) * 100) : 0
    })

    // 5. 가장 많은 득표를 받은 옵션 찾기 (다수픽을 위함)
    let majorityOption: string | null = null
    let maxCount = 0
    
    for (const option in voteCounts) {
      if (voteCounts[option] > maxCount) {
        maxCount = voteCounts[option]
        majorityOption = option
      }
    }

    // 6. 미션 업데이트
    const updateData: any = { 
      f_option_vote_counts: votePercentages 
    }
    
    // 투표가 있을 때만 majority_option 업데이트
    if (totalVotes > 0 && majorityOption) {
      updateData.f_majority_option = majorityOption
    }

    // 미션 정보 가져오기 (kind 확인용)
    const { data: missionInfo } = await supabase
      .from("t_missions1")
      .select("f_kind, f_status, f_deadline")
      .eq("f_id", missionId)
      .single()

    const { error: updateError } = await supabase
      .from("t_missions1")
      .update(updateData)
      .eq("f_id", missionId)

    if (updateError) {
      console.error("투표 수 업데이트 실패:", updateError)
      return { success: false, error: "투표 수 업데이트에 실패했습니다." }
    }

    // 다수픽 미션이고 아직 확정되지 않았으며, majority_option이 설정되고 마감 시간이 지난 경우 자동 확정
    if (missionInfo && missionInfo.f_kind === "majority" && missionInfo.f_status !== "settled" && majorityOption) {
      // 마감 시간 확인
      const isDeadlinePassed = missionInfo.f_deadline ? new Date(missionInfo.f_deadline) < new Date() : false
      
      if (isDeadlinePassed) {
        // 다수픽 미션은 majority_option이 설정되고 마감 시간이 지나면 자동으로 확정
        // settleMission1 함수를 통해 확정 및 포인트 지급
        await settleMission1(missionId)
      }
    }

    return { success: true }

  } catch (error) {
    console.error("투표 수 업데이트 중 오류:", error)
    return { success: false, error: "투표 수 업데이트 중 오류가 발생했습니다." }
  }
}

/**
 * 특정 사용자가 생성한 미션 목록 가져오기
 */
export async function getMissionsByCreator(userId: string): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const supabase = createClient()

    const [missions1Result, missions2Result] = await Promise.all([
      supabase
        .from("t_missions1")
        .select("*")
        .eq("f_creator_id", userId)
        .order("f_created_at", { ascending: false }),
      supabase
        .from("t_missions2")
        .select("*")
        .eq("f_creator_id", userId)
        .order("f_created_at", { ascending: false }),
    ])

    if (missions1Result.error || missions2Result.error) {
      console.error("생성한 미션 목록 조회 실패:", missions1Result.error || missions2Result.error)
      return { success: false, error: "생성한 미션 목록을 불러올 수 없습니다." }
    }

    const missions = [
      ...(missions1Result.data || []).map((mission) => ({ ...mission, __table: "t_missions1" as const })),
      ...(missions2Result.data || []).map((mission) => ({ ...mission, __table: "t_missions2" as const })),
    ].sort((a, b) => {
      const dateA = new Date(a.f_created_at || a.created_at || 0).getTime()
      const dateB = new Date(b.f_created_at || b.created_at || 0).getTime()
      return dateB - dateA
    })

    return { success: true, missions }
  } catch (error) {
    console.error("생성한 미션 목록 조회 중 오류:", error)
    return { success: false, error: "생성한 미션 목록 조회 중 오류가 발생했습니다." }
  }
}

/**
 * 특정 사용자가 참여한 미션 목록 가져오기
 */
export async function getMissionsByParticipant(userId: string): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const supabase = createClient()

    // 1. 사용자가 투표한 미션 ID 목록 가져오기
    const { data: votes, error: votesError } = await supabase
      .from("t_pickresult1")
      .select("f_mission_id")
      .eq("f_user_id", userId)

    if (votesError) {
      console.error("참여한 미션 목록 조회 실패:", votesError)
      return { success: false, error: "참여한 미션 목록을 불러올 수 없습니다." }
    }

    if (!votes || votes.length === 0) {
      return { success: true, missions: [] }
    }

    // 2. 중복 제거된 미션 ID 목록
    const missionIds = [...new Set(votes.map(vote => vote.f_mission_id))]

    // 3. 해당 미션들의 상세 정보 가져오기
    const { data: missions, error: missionsError } = await supabase
      .from("t_missions1")
      .select("*")
      .in("f_id", missionIds)
      .order("f_created_at", { ascending: false })

    if (missionsError) {
      console.error("미션 상세 정보 조회 실패:", missionsError)
      return { success: false, error: "미션 상세 정보를 불러올 수 없습니다." }
    }

    return { success: true, missions: missions || [] }

  } catch (error) {
    console.error("참여한 미션 목록 조회 중 오류:", error)
    return { success: false, error: "참여한 미션 목록 조회 중 오류가 발생했습니다." }
  }
}

/**
 * 커플매칭 미션 참여자 수 증가 (t_missions2)
 */
export async function incrementMissionParticipants2(missionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 참여자 수 계산 (중복 제거를 위해 실제 투표 수로 계산)
    const { data: votes, error: votesError } = await supabase
      .from("t_pickresult2")
      .select("f_user_id")
      .eq("f_mission_id", missionId)

    if (votesError) {
      console.error("투표 조회 실패:", votesError)
      // 투표가 없어도 에러로 처리하지 않음 (첫 투표일 수 있음)
      console.warn("투표 조회 실패, 참여자 수를 0으로 설정합니다.")
    }

    // 중복 제거된 사용자 수 계산
    const uniqueUsers = new Set((votes || []).map(v => v.f_user_id))
    const newCount = uniqueUsers.size

    // 참여자 수 업데이트 (RLS 정책 문제를 피하기 위해 직접 업데이트)
    const { error: updateError } = await supabase
      .from("t_missions2")
      .update({ 
        f_stats_participants: newCount
      })
      .eq("f_id", missionId)

    if (updateError) {
      console.error("참여자 수 업데이트 실패:", updateError)
      console.error("에러 상세:", JSON.stringify(updateError, null, 2))
      // 참여자 수 업데이트 실패해도 투표 제출은 성공으로 처리
      console.warn("참여자 수 업데이트 실패했지만 투표는 저장되었습니다.")
      return { success: true } // 투표는 성공했으므로 true 반환
    }

    return { success: true }

  } catch (error) {
    console.error("참여자 수 업데이트 중 오류:", error)
    // 에러가 발생해도 투표 제출은 성공으로 처리
    return { success: true }
  }
}

/**
 * 모든 미션의 투표 수를 재계산 (잘못된 통계 수정용)
 */
export async function recalculateAllMissionVotes(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 모든 미션 가져오기
    const { data: missions, error: missionsError } = await supabase
      .from("t_missions1")
      .select("f_id")

    if (missionsError) {
      console.error("미션 목록 조회 실패:", missionsError)
      return { success: false, error: "미션 목록 조회에 실패했습니다." }
    }

    // 각 미션의 투표 수 재계산
    for (const mission of missions || []) {
      await updateOptionVoteCounts(mission.f_id)
    }

    console.log(`${missions?.length || 0}개 미션의 투표 수를 재계산했습니다.`)
    return { success: true }

  } catch (error) {
    console.error("투표 수 재계산 중 오류:", error)
    return { success: false, error: "투표 수 재계산 중 오류가 발생했습니다." }
  }
}

/**
 * 커플매칭 미션 목록 가져오기 (t_missions2)
 */
export async function getMissions2(limit: number = 20): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("t_missions2")
      .select("*")
      // .eq("f_status", "open") // 모든 상태의 미션을 가져오도록 주석 처리
      .order("f_created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("커플매칭 미션 목록 조회 실패:", error)
      return { success: false, error: "커플매칭 미션 목록을 불러올 수 없습니다." }
    }

    console.log("🔍 t_missions2에서 가져온 데이터:", data?.length, "개")
    if (data && data.length > 0) {
      console.log("📋 첫 번째 미션:", {
        id: data[0].f_id,
        title: data[0].f_title,
        status: data[0].f_status,
        seasonNumber: data[0].f_season_number
      })
    }

    return { success: true, missions: data }

  } catch (error) {
    console.error("커플매칭 미션 목록 조회 중 오류:", error)
    return { success: false, error: "커플매칭 미션 목록 조회 중 오류가 발생했습니다." }
  }
}

/**
 * 특정 커플매칭 미션 가져오기 (t_missions2)
 */
export async function getMission2(missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("t_missions2")
      .select("*")
      .eq("f_id", missionId)
      .maybeSingle()

    if (error && error.code !== "PGRST116" && error.code !== "406") {
      console.error("커플매칭 미션 조회 실패:", error)
      console.error("에러 상세:", JSON.stringify(error, null, 2))
      return { success: false, error: "커플매칭 미션을 찾을 수 없습니다." }
    }

    if (!data) {
      return { success: false }
    }

    // f_episode_statuses가 null이면 빈 객체로 초기화
    if (data.f_episode_statuses === null) {
      data.f_episode_statuses = {};
    }

    return { success: true, mission: data }

  } catch (error) {
    console.error("커플매칭 미션 조회 중 오류:", error)
    return { success: false, error: "커플매칭 미션 조회 중 오류가 발생했습니다." }
  }
}

/**
 * 미션 상태를 settled로 변경하고 최종 커플 결과 설정
 */
export async function submitPredictMissionAnswer(
  missionId: string,
  answer: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const userId = getUserId()

    if (!userId) {
      return { success: false, error: "로그인이 필요합니다." }
    }

    const trimmedAnswer = answer.trim()
    if (!trimmedAnswer) {
      return { success: false, error: "정답을 입력해주세요." }
    }

    // 정답 저장
    const { data, error } = await supabase
      .from("t_missions1")
      .update({
        f_correct_answer: trimmedAnswer,
        f_updated_at: new Date().toISOString(),
      })
      .eq("f_id", missionId)
      .eq("f_creator_id", userId)
      .neq("f_status", "settled")
      .select("f_id")
      .single()

    if (error) {
      console.error("정답 확정 실패:", error)
      return { success: false, error: "정답을 저장하지 못했습니다." }
    }

    if (!data) {
      return { success: false, error: "이미 결과가 확정된 미션입니다." }
    }

    // 미션 확정 및 포인트 지급 (통합 함수 사용)
    await settleMission1(missionId)

    return { success: true }
  } catch (error) {
    console.error("정답 확정 중 오류:", error)
    return { success: false, error: "정답 확정 중 오류가 발생했습니다." }
  }
}

export async function updatePredictMissionAnswer(
  missionId: string,
  answer: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const userId = getUserId()

    if (!userId) {
      return { success: false, error: "로그인이 필요합니다." }
    }

    const trimmedAnswer = answer.trim()
    if (!trimmedAnswer) {
      return { success: false, error: "정답을 입력해주세요." }
    }

    const { data, error } = await supabase
      .from("t_missions1")
      .update({
        f_correct_answer: trimmedAnswer,
        f_updated_at: new Date().toISOString(),
      })
      .eq("f_id", missionId)
      .eq("f_creator_id", userId)
      .eq("f_status", "settled")
      .select("f_id")
      .single()

    if (error) {
      console.error("정답 수정 실패:", error)
      return { success: false, error: "정답을 수정하지 못했습니다." }
    }

    if (!data) {
      return { success: false, error: "정답을 수정할 수 없습니다." }
    }

    return { success: true }
  } catch (error) {
    console.error("정답 수정 중 오류:", error)
    return { success: false, error: "정답 수정 중 오류가 발생했습니다." }
  }
}

export async function settleMissionWithFinalAnswer(
  missionId: string,
  finalAnswer: Array<{ left: string; right: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const userId = getUserId()

    if (!userId) {
      return { success: false, error: "로그인이 필요합니다." }
    }

    const sanitizedAnswer = (finalAnswer || []).filter(
      (pair) => pair.left?.trim() && pair.right?.trim()
    )

    if (sanitizedAnswer.length === 0) {
      return { success: false, error: "최소 한 쌍 이상의 커플을 입력해주세요." }
    }

    const normalizedAnswer = sanitizedAnswer.map((pair) => ({
      left: pair.left.trim(),
      right: pair.right.trim(),
    }))

    const { data, error } = await supabase
      .from("t_missions2")
      .update({
        f_status: "settled",
        f_final_answer: normalizedAnswer,
        f_updated_at: new Date().toISOString(),
      })
      .eq("f_id", missionId)
      .eq("f_creator_id", userId)
      .neq("f_status", "settled")
      .select("f_id")
      .single()

    if (error) {
      console.error("커플 최종 결과 저장 실패:", error)
      return { success: false, error: "최종 커플 결과를 저장하지 못했습니다." }
    }

    if (!data) {
      return { success: false, error: "이미 결과가 확정된 미션입니다." }
    }

    // 포인트 지급: 모든 참여자의 투표 확인 및 포인트 지급
    await distributePointsForMission2(missionId, normalizedAnswer)

    return { success: true }
  } catch (error) {
    console.error("커플 최종 결과 저장 중 오류:", error)
    return { success: false, error: "커플 최종 결과 저장 중 오류가 발생했습니다." }
  }
}

/**
 * 커플 매칭 미션의 포인트 지급
 */
async function distributePointsForMission2(
  missionId: string,
  finalAnswer: Array<{ left: string; right: string }>
) {
  try {
    const supabase = createClient()
    
    console.log(`[distributePointsForMission2] 미션 ${missionId} 포인트 지급 시작`)
    console.log(`[distributePointsForMission2] 최종 정답:`, finalAnswer)
    
    // 1. 미션 정보 가져오기 (총 회차 수)
    const { data: mission, error: missionError } = await supabase
      .from("t_missions2")
      .select("f_total_episodes")
      .eq("f_id", missionId)
      .single()

    if (missionError || !mission) {
      console.error("[distributePointsForMission2] 미션 정보 조회 실패:", missionError)
      return
    }

    const totalEpisodes = mission.f_total_episodes || 8
    console.log(`[distributePointsForMission2] 총 회차: ${totalEpisodes}`)

    // 2. 모든 참여자의 투표 가져오기 (모든 회차)
    const { data: votes, error: votesError } = await supabase
      .from("t_pickresult2")
      .select("f_user_id, f_episode_no, f_connections")
      .eq("f_mission_id", missionId)
      .eq("f_submitted", true)

    if (votesError) {
      console.error("[distributePointsForMission2] 투표 조회 실패:", votesError)
      return
    }

    if (!votes || votes.length === 0) {
      console.log("[distributePointsForMission2] 참여자가 없어 포인트 지급을 건너뜁니다.")
      return
    }
    
    console.log(`[distributePointsForMission2] 총 투표 수: ${votes.length}`)

    // 3. 사용자별로 회차별 투표 그룹화
    const userVotes: Record<string, Array<{ episodeNo: number; pairs: Array<{ left: string; right: string }> }>> = {}

    for (const vote of votes) {
      const userId = vote.f_user_id
      const episodeNo = vote.f_episode_no
      
      // connections 파싱
      let pairs: Array<{ left: string; right: string }> = []
      if (typeof vote.f_connections === 'string') {
        try {
          pairs = JSON.parse(vote.f_connections)
        } catch (e) {
          console.error("connections 파싱 실패:", e)
          continue
        }
      } else if (Array.isArray(vote.f_connections)) {
        pairs = vote.f_connections
      }

      if (!userVotes[userId]) {
        userVotes[userId] = []
      }
      userVotes[userId].push({ episodeNo, pairs })
    }

    // 4. 각 사용자에게 회차별 포인트 지급
    let successCount = 0
    let errorCount = 0
    
    for (const userId in userVotes) {
      const userVoteList = userVotes[userId]
      
      console.log(`[distributePointsForMission2] 사용자 ${userId}: ${userVoteList.length}개 회차 투표`)
      
      // 회차별로 정답 확인 및 포인트 지급
      for (const userVote of userVoteList) {
        const { episodeNo, pairs } = userVote
        
        // 정답 확인: 모든 최종 커플이 사용자의 선택에 포함되어 있는지 확인
        const isCorrect = finalAnswer.every((answer) =>
          pairs.some((pair) => pair.left === answer.left && pair.right === answer.right)
        )

        // 포인트 계산 (정답: +회차 점수, 오답: -회차 점수)
        const points = calculateMatchPoints(episodeNo, isCorrect)

        console.log(`[distributePointsForMission2] 사용자 ${userId} ${episodeNo}회차: 정답여부=${isCorrect}, 포인트=${points}`)

        // 포인트 지급
        const result = await addPointLog(
          userId,
          points,
          isCorrect 
            ? `커플 매칭 정답 보상 (${episodeNo}회차)` 
            : `커플 매칭 오답 (${episodeNo}회차)`,
          missionId,
          "mission2",
          { episodeNo }
        )
        
        if (result) {
          successCount++
          console.log(`[distributePointsForMission2] ✅ 사용자 ${userId} ${episodeNo}회차 포인트 지급 성공: ${points}P`)
        } else {
          errorCount++
          console.error(`[distributePointsForMission2] ❌ 사용자 ${userId} ${episodeNo}회차 포인트 지급 실패`)
        }
      }
    }

    console.log(`[distributePointsForMission2] ✅ 포인트 지급 완료: 성공 ${successCount}건, 실패 ${errorCount}건 / 총 ${Object.keys(userVotes).length}명의 참여자`)
  } catch (error) {
    console.error("포인트 지급 중 오류:", error)
  }
}

/**
 * 이진/다중 선택 미션 확정 및 포인트 지급 (통합 함수)
 * 모든 미션 확정 경로에서 이 함수를 사용하여 일관성 보장
 */
async function settleMission1(missionId: string): Promise<void> {
  try {
    const supabase = createClient()
    
    console.log(`[settleMission1] 미션 ${missionId} 확정 시작`)
    
    // 1. 미션 상태를 settled로 변경
    const { error: updateError } = await supabase
      .from("t_missions1")
      .update({
        f_status: "settled",
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", missionId)
      .neq("f_status", "settled")

    if (updateError) {
      console.error("[settleMission1] 미션 확정 실패:", updateError)
      return
    }

    console.log(`[settleMission1] 미션 ${missionId} 상태를 settled로 변경 완료`)

    // 2. 포인트 지급
    await distributePointsForMission1(missionId)
    
    console.log(`[settleMission1] 미션 ${missionId} 확정 및 포인트 지급 완료`)
  } catch (error) {
    console.error("[settleMission1] 미션 확정 중 오류:", error)
  }
}

/**
 * 이진/다중 선택 미션의 포인트 지급
 */
async function distributePointsForMission1(missionId: string) {
  try {
    const supabase = createClient()
    
    console.log(`[distributePointsForMission1] 미션 ${missionId} 포인트 지급 시작`)
    
    // 1. 미션 정보 가져오기 (kind도 함께 조회)
    const { data: mission, error: missionError } = await supabase
      .from("t_missions1")
      .select("f_kind, f_form, f_options, f_correct_answer, f_majority_option")
      .eq("f_id", missionId)
      .single()

    if (missionError || !mission) {
      console.error("[distributePointsForMission1] 미션 정보 조회 실패:", missionError)
      return
    }
    
    console.log(`[distributePointsForMission1] 미션 정보:`, {
      kind: mission.f_kind,
      form: mission.f_form,
      correct_answer: mission.f_correct_answer,
      majority_option: mission.f_majority_option
    })

    // 2. 모든 참여자의 투표 가져오기
    const { data: votes, error: votesError } = await supabase
      .from("t_pickresult1")
      .select("f_user_id, f_selected_option")
      .eq("f_mission_id", missionId)

    if (votesError) {
      console.error("투표 조회 실패:", votesError)
      return
    }

    if (!votes || votes.length === 0) {
      console.log("참여자가 없어 포인트 지급을 건너뜁니다.")
      return
    }

    // 3. 정답/다수 옵션 결정
    const missionKind = mission.f_kind as "predict" | "majority"
    let answerToCompare: string | null = null
    
    if (missionKind === "majority") {
      // 다수픽: f_majority_option 사용
      answerToCompare = mission.f_majority_option || null
    } else {
      // 예측픽: f_correct_answer 사용
      answerToCompare = mission.f_correct_answer || null
    }

    if (!answerToCompare) {
      console.error("[distributePointsForMission1] 정답/다수 옵션이 없어 포인트 지급을 건너뜁니다.")
      return
    }

    console.log(`[distributePointsForMission1] 정답/다수 옵션: ${answerToCompare}, 참여자 수: ${votes.length}`)

    // 4. 각 참여자에게 포인트 지급
    const form = mission.f_form as "binary" | "multi"
    const optionCount = (mission.f_options as string[])?.length || 0

    let successCount = 0
    let errorCount = 0

    for (const vote of votes) {
      const userId = vote.f_user_id
      
      // 선택한 옵션 추출
      let selectedOption: string | null = null
      if (typeof vote.f_selected_option === 'string') {
        selectedOption = vote.f_selected_option
      } else if (vote.f_selected_option && typeof vote.f_selected_option === 'object') {
        selectedOption = vote.f_selected_option.option || vote.f_selected_option
      }

      // 정답/다수 확인
      const isCorrect = selectedOption === answerToCompare
      
      // 포인트 계산
      const points = calculateBinaryMultiPoints(form, optionCount, isCorrect)

      console.log(`[distributePointsForMission1] 사용자 ${userId}: 선택=${selectedOption}, 정답=${answerToCompare}, 정답여부=${isCorrect}, 포인트=${points}`)

      if (points !== 0) {
        // 포인트 지급
        const reason = isCorrect 
          ? `미션 ${missionKind === "majority" ? "다수픽" : "정답"} 보상 (${form === "binary" ? "이진" : "다중"})`
          : "미션 오답"
        
        const result = await addPointLog(
          userId,
          points,
          reason,
          missionId,
          "mission1"
        )
        
        if (result) {
          successCount++
          console.log(`[distributePointsForMission1] ✅ 사용자 ${userId} 포인트 지급 성공: ${points}P`)
        } else {
          errorCount++
          console.error(`[distributePointsForMission1] ❌ 사용자 ${userId} 포인트 지급 실패`)
        }
      }
    }

    console.log(`[distributePointsForMission1] ✅ 포인트 지급 완료: 성공 ${successCount}명, 실패 ${errorCount}명 / 총 ${votes.length}명의 참여자 (${missionKind === "majority" ? "다수픽" : "예측픽"})`)
  } catch (error) {
    console.error("포인트 지급 중 오류:", error)
  }
}

/**
 * 커플 매칭 미션의 마감 여부 확인 (모든 회차 완료 기준)
 */
export function isCoupleMissionClosed(mission: any): boolean {
  // 상태가 settled면 마감
  if (mission.f_status === "settled" || mission.status === "settled") {
    return true
  }
  
  // episodeStatuses가 있는 경우 모든 회차가 settled인지 확인
  const episodeStatuses = mission.f_episode_statuses || mission.episodeStatuses || {}
  const totalEpisodes = mission.f_total_episodes || mission.episodes || 8
  
  // 모든 회차(1~totalEpisodes)가 settled인지 확인
  for (let i = 1; i <= totalEpisodes; i++) {
    if (episodeStatuses[i] !== "settled") {
      return false // 하나라도 settled가 아니면 아직 진행중
    }
  }
  
  return true // 모든 회차가 settled면 마감
}

/**
 * 커플 매칭 미션의 자동 마감 체크 및 처리
 */
export async function checkAndAutoSettleCoupleMission(missionId: string): Promise<{ success: boolean; settled?: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // 미션 정보 가져오기
    const { data: mission, error: fetchError } = await supabase
      .from("t_missions2")
      .select("*")
      .eq("f_id", missionId)
      .single()
    
    if (fetchError) {
      console.error("미션 조회 실패:", fetchError)
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }
    
    // 이미 settled 상태면 패스
    if (mission.f_status === "settled") {
      return { success: true, settled: true }
    }
    
    const episodeStatuses = mission.f_episode_statuses || {}
    const totalEpisodes = mission.f_total_episodes || 8
    
    // 모든 회차가 settled인지 확인
    let allEpisodesSettled = true
    for (let i = 1; i <= totalEpisodes; i++) {
      if (episodeStatuses[i] !== "settled") {
        allEpisodesSettled = false
        break
      }
    }
    
    // 모든 회차가 완료되면 자동 마감
    if (allEpisodesSettled) {
      console.log(`🎉 ${mission.f_title}: 모든 회차 완료 → 자동 마감 처리`)
      
      const { error: updateError } = await supabase
        .from("t_missions2")
        .update({
          f_status: "settled",
          f_updated_at: new Date().toISOString()
        })
        .eq("f_id", missionId)
      
      if (updateError) {
        console.error("자동 마감 처리 실패:", updateError)
        return { success: false, error: "자동 마감 처리에 실패했습니다." }
      }
      
      // 최종 정답이 있으면 포인트 지급
      if (mission.f_final_answer) {
        await distributePointsForMission2(missionId, mission.f_final_answer)
      }
      
      return { success: true, settled: true }
    }
    
    return { success: true, settled: false }
    
  } catch (error) {
    console.error("자동 마감 체크 중 오류:", error)
    return { success: false, error: "자동 마감 체크 중 오류가 발생했습니다." }
  }
}
/**
 * 27기 미션 생성 및 즉시 마감 처리 (실제 운영용)
 */
export async function createAndSettle27Mission(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // 1. 먼저 27기 미션이 있는지 확인
    const { data: existingMission } = await supabase
      .from("t_missions2")
      .select("f_id, f_status, f_episode_statuses")
      .eq("f_season_number", 27)
      .single()
    
    let missionId: string
    
    if (existingMission) {
      console.log("✅ 27기 미션이 이미 존재합니다:", existingMission.f_id)
      missionId = existingMission.f_id
    } else {
      // 2. 27기 미션 생성
      const { data: newMission, error: createError } = await supabase
        .from("t_missions2")
        .insert({
          f_title: "나는솔로 27기 커플 매칭 예측",
          f_description: "최종 커플을 예측해보세요",
          f_kind: "predict",
          f_season_type: "기수별",
          f_season_number: 27,
          f_match_pairs: {
            left: ["광수", "영수", "영식", "영철", "상철", "민수"],
            right: ["영순", "정숙", "순자", "영자", "옥순", "현숙"]
          },
          f_total_episodes: 8,
          f_deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1년 후 (의미없음)
          f_reveal_policy: "realtime",
          f_status: "open",
          f_episode_statuses: {}, // 빈 객체로 시작
          f_stats_participants: 0
        })
        .select("f_id")
        .single()
      
      if (createError) {
        console.error("27기 미션 생성 실패:", createError)
        return { success: false, error: "27기 미션 생성에 실패했습니다." }
      }
      
      missionId = newMission.f_id
      console.log("✅ 27기 미션 생성 완료:", missionId)
    }
    
    // 3. 모든 회차를 settled로 설정하여 즉시 마감
    const allEpisodesSettled: Record<number, string> = {}
    for (let i = 1; i <= 8; i++) {
      allEpisodesSettled[i] = "settled"
    }
    
    const finalCouples = [
      { left: "광수", right: "영순" },
      { left: "영수", right: "정숙" },
      { left: "상철", right: "현숙" }
    ]
    
    const { error: settleError } = await supabase
      .from("t_missions2")
      .update({
        f_episode_statuses: allEpisodesSettled,
        f_status: "settled",
        f_final_answer: finalCouples,
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", missionId)
    
    if (settleError) {
      console.error("27기 미션 마감 처리 실패:", settleError)
      return { success: false, error: "27기 미션 마감 처리에 실패했습니다." }
    }
    
    console.log("🎉 27기 미션 생성 및 마감 완료!")
    console.log("📺 모든 회차(1~8차): settled")
    console.log("💕 최종 커플:", finalCouples.map(c => `${c.left}-${c.right}`).join(", "))
    
    return { success: true }
    
  } catch (error) {
    console.error("27기 미션 생성/마감 처리 중 오류:", error)
    return { success: false, error: "27기 미션 처리 중 오류가 발생했습니다." }
  }
}

/**
 * 특정 미션의 지정된 회차들을 settled로 설정
 */
export async function settleSpecificEpisodes(
  missionId: string, 
  episodesToSettle: number[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // 미션 정보 가져오기
    const { data: mission, error: findError } = await supabase
      .from("t_missions2")
      .select("f_id, f_title, f_episode_statuses, f_total_episodes")
      .eq("f_id", missionId)
      .single()
    
    if (findError) {
      console.error("미션 조회 실패:", findError)
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }
    
    console.log("✅ 미션 발견:", mission.f_title)
    console.log("📋 미션 ID:", mission.f_id)
    
    const currentStatuses = mission.f_episode_statuses || {}
    const newStatuses = { ...currentStatuses }
    
    // 지정된 회차들을 settled로 설정
    episodesToSettle.forEach(ep => {
      const oldStatus = currentStatuses[ep] || 'undefined'
      newStatuses[ep] = "settled"
      console.log(`   ${ep}차: ${oldStatus} → settled`)
    })
    
    const { error: updateError } = await supabase
      .from("t_missions2")
      .update({
        f_episode_statuses: newStatuses,
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", missionId)
    
    if (updateError) {
      console.error("회차 마감 처리 실패:", updateError)
      return { success: false, error: "회차 마감 처리에 실패했습니다." }
    }
    
    console.log("🎉 지정된 회차 마감 완료!")
    console.log(`📺 ${episodesToSettle.join(", ")}차 → settled`)
    
    return { success: true }
    
  } catch (error) {
    console.error("회차 마감 처리 중 오류:", error)
    return { success: false, error: "회차 마감 처리 중 오류가 발생했습니다." }
  }
}

/**
 * 특정 미션의 회차 상태를 변경 (테스트용)
 */
export async function updateEpisodeStatuses(
  missionId: string,
  episodeNo: number,
  status: "open" | "locked" | "settled"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // 미션 정보 가져오기
    const { data: mission, error: findError } = await supabase
      .from("t_missions2")
      .select("f_id, f_title, f_episode_statuses, f_total_episodes, f_status")
      .eq("f_id", missionId)
      .single()
    
    if (findError) {
      console.error("미션 조회 실패:", findError)
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }
    
    const currentStatuses = mission.f_episode_statuses || {}
    const newStatuses = { ...currentStatuses }
    const oldStatus = currentStatuses[episodeNo] || 'undefined'
    newStatuses[episodeNo] = status
    
    console.log(`📺 ${episodeNo}차: ${oldStatus} → ${status}`)
    
    const { error: updateError } = await supabase
      .from("t_missions2")
      .update({
        f_episode_statuses: newStatuses,
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", missionId)
    
    if (updateError) {
      console.error("회차 상태 변경 실패:", updateError)
      return { success: false, error: "회차 상태 변경에 실패했습니다." }
    }
    
    // 모든 회차가 settled면 자동으로 미션 상태도 settled로 변경
    const totalEpisodes = mission.f_total_episodes || 8
    let allEpisodesSettled = true
    for (let i = 1; i <= totalEpisodes; i++) {
      if (newStatuses[i] !== "settled") {
        allEpisodesSettled = false
        break
      }
    }
    
    if (allEpisodesSettled && mission.f_status !== "settled") {
      // 미션 상태를 settled로 변경
      const { error: statusUpdateError } = await supabase
        .from("t_missions2")
        .update({
          f_status: "settled",
          f_updated_at: new Date().toISOString()
        })
        .eq("f_id", missionId)
      
      if (statusUpdateError) {
        console.error("미션 상태 업데이트 실패:", statusUpdateError)
        // 회차 상태는 변경되었으므로 성공으로 처리
      } else {
        console.log("🎉 모든 회차 마감 → 미션 자동 마감 처리")
        
        // 최종 정답이 있으면 포인트 지급
        const { data: missionWithAnswer } = await supabase
          .from("t_missions2")
          .select("f_final_answer")
          .eq("f_id", missionId)
          .single()
        
        if (missionWithAnswer?.f_final_answer) {
          await distributePointsForMission2(missionId, missionWithAnswer.f_final_answer)
        }
      }
    }
    
    return { success: true }
    
  } catch (error) {
    console.error("회차 상태 변경 중 오류:", error)
    return { success: false, error: "회차 상태 변경 중 오류가 발생했습니다." }
  }
}

/**
 * 27기 모든 회차를 settled로 설정하여 마감 처리
 */
export async function settle27AllEpisodes(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // 27기 미션 찾기
    const { data: mission, error: findError } = await supabase
      .from("t_missions2")
      .select("f_id, f_title, f_episode_statuses, f_total_episodes")
      .eq("f_season_number", 27)
      .single()
    
    if (findError) {
      if (findError.code === "PGRST116") {
        console.log("27기 미션이 없습니다. 새로 생성합니다.")
        return await create27MissionAndSettle()
      }
      console.error("27기 미션 조회 실패:", findError)
      return { success: false, error: "27기 미션 조회에 실패했습니다." }
    }
    
    console.log("✅ 27기 미션 발견:", mission.f_title)
    
    const totalEpisodes = mission.f_total_episodes || 8
    const currentStatuses = mission.f_episode_statuses || {}
    
    // 모든 회차를 settled로 설정
    const newStatuses: Record<number, string> = {}
    for (let i = 1; i <= totalEpisodes; i++) {
      newStatuses[i] = "settled"
    }
    
    console.log(`📺 모든 회차(1~${totalEpisodes}차)를 settled로 설정합니다.`)
    
    // 최종 커플 설정
    const finalCouples = [
      { left: "광수", right: "영순" },
      { left: "영수", right: "정숙" },
      { left: "상철", right: "현숙" }
    ]
    
    const { error: updateError } = await supabase
      .from("t_missions2")
      .update({
        f_episode_statuses: newStatuses,
        f_status: "settled",
        f_final_answer: finalCouples,
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", mission.f_id)
    
    if (updateError) {
      console.error("27기 미션 회차 마감 처리 실패:", updateError)
      return { success: false, error: "27기 미션 회차 마감 처리에 실패했습니다." }
    }
    
    console.log("🎉 27기 모든 회차 마감 완료!")
    console.log("💕 최종 커플:", finalCouples.map(c => `${c.left}-${c.right}`).join(", "))
    console.log("📋 이제 최종 결과보기 페이지를 확인할 수 있습니다!")
    
    return { success: true }
    
  } catch (error) {
    console.error("27기 미션 회차 마감 처리 중 오류:", error)
    return { success: false, error: "27기 미션 회차 마감 처리 중 오류가 발생했습니다." }
  }
}

/**
 * 27기 미션 마감일을 현재 시간으로 업데이트 (즉시 마감)
 */
export async function update27MissionDeadline(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // 27기 미션 찾기
    const { data: mission, error: findError } = await supabase
      .from("t_missions2")
      .select("f_id, f_title, f_deadline, f_status")
      .eq("f_season_number", 27)
      .single()
    
    if (findError) {
      if (findError.code === "PGRST116") {
        console.log("27기 미션이 없습니다. 새로 생성합니다.")
        // 27기 미션이 없으면 생성 및 마감 처리
        return await create27MissionAndSettle()
      }
      console.error("27기 미션 조회 실패:", findError)
      return { success: false, error: "27기 미션 조회에 실패했습니다." }
    }
    
    console.log("✅ 27기 미션 발견:", mission.f_title)
    console.log("📅 현재 마감일:", mission.f_deadline)
    console.log("📊 현재 상태:", mission.f_status)
    
    // 마감일을 현재 시간 - 1시간으로 설정 (확실히 마감되도록)
    const newDeadline = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
    
    const { error: updateError } = await supabase
      .from("t_missions2")
      .update({
        f_deadline: newDeadline,
        f_status: "settled", // 마감 상태로 변경
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", mission.f_id)
    
    if (updateError) {
      console.error("27기 미션 마감일 업데이트 실패:", updateError)
      return { success: false, error: "27기 미션 마감일 업데이트에 실패했습니다." }
    }
    
    console.log("🎉 27기 미션 마감 완료!")
    console.log("📅 새 마감일:", newDeadline)
    console.log("💕 이제 최종 결과보기 페이지를 확인할 수 있습니다!")
    
    return { success: true }
    
  } catch (error) {
    console.error("27기 미션 마감일 업데이트 중 오류:", error)
    return { success: false, error: "27기 미션 마감일 업데이트 중 오류가 발생했습니다." }
  }
}
export async function create27MissionAndSettle(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // 1. 먼저 27기 미션이 있는지 확인
    const { data: existingMission } = await supabase
      .from("t_missions2")
      .select("f_id, f_status")
      .eq("f_season_number", 27)
      .single()
    
    let missionId: string
    
    if (existingMission) {
      console.log("✅ 27기 미션이 이미 존재합니다:", existingMission.f_id)
      missionId = existingMission.f_id
    } else {
      // 2. 27기 미션 생성
      const { data: newMission, error: createError } = await supabase
        .from("t_missions2")
        .insert({
          f_title: "나는솔로 27기 커플 매칭 예측",
          f_description: "최종 커플을 예측해보세요",
          f_kind: "predict",
          f_season_type: "기수별",
          f_season_number: 27,
          f_match_pairs: {
            left: ["광수", "영수", "영식", "영철", "상철", "민수"],
            right: ["영순", "정숙", "순자", "영자", "옥순", "현숙"]
          },
          f_total_episodes: 8,
          f_deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 어제 마감
          f_reveal_policy: "realtime",
          f_status: "open",
          f_stats_participants: 1247
        })
        .select("f_id")
        .single()
      
      if (createError) {
        console.error("27기 미션 생성 실패:", createError)
        return { success: false, error: "27기 미션 생성에 실패했습니다." }
      }
      
      missionId = newMission.f_id
      console.log("✅ 27기 미션 생성 완료:", missionId)
    }
    
    // 3. 최종 커플 설정 및 마감 처리
    const finalCouples = [
      { left: "광수", right: "영순" },
      { left: "영수", right: "정숙" },
      { left: "상철", right: "현숙" }
    ]
    
    const { error: settleError } = await supabase
      .from("t_missions2")
      .update({
        f_status: "settled",
        f_final_answer: finalCouples,
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", missionId)
    
    if (settleError) {
      console.error("27기 미션 마감 처리 실패:", settleError)
      return { success: false, error: "27기 미션 마감 처리에 실패했습니다." }
    }
    
    console.log("🎉 27기 미션 마감 완료!")
    console.log("💕 최종 커플:", finalCouples.map(c => `${c.left}-${c.right}`).join(", "))
    
    return { success: true }
    
  } catch (error) {
    console.error("27기 미션 처리 중 오류:", error)
    return { success: false, error: "27기 미션 처리 중 오류가 발생했습니다." }
  }
}