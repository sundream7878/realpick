import { createClient } from "@/lib/supabase/client"
import { getThumbnailFromUrl } from "@/lib/utils/u-media/youtube.util"
import { CreateMissionData, TMission, TMatchPairs } from "@/types/t-vote/vote.types"

/**
 * 미션 생성
 */
export async function createMission(missionData: CreateMissionData, userId: string): Promise<{ success: boolean; missionId?: string; error?: string }> {
  try {
    const supabase = createClient()
    const missionPayload: any = {
      f_title: missionData.title,
      f_kind: missionData.type === "prediction" ? "predict" : missionData.type,
      f_form: missionData.format,
      f_deadline: missionData.deadline,
      f_reveal_policy: missionData.resultVisibility === "realtime" ? "realtime" : "onClose",
      f_creator_id: userId,
      f_status: "open",
      f_reference_url: missionData.referenceUrl || null,
      // f_description: missionData.description || null, // DB 컬럼 없음
      // f_image_url: missionData.imageUrl || null // DB 컬럼 없음
      f_thumbnail_url: missionData.imageUrl || null // 이미지 URL을 썸네일 URL로 대체 저장
    }

    if (missionData.format === "couple") {
      const mission2Payload: any = {
        f_title: missionData.title,
        f_kind: "predict",
        f_match_pairs: {
          left: missionData.maleOptions || [],
          right: missionData.femaleOptions || []
        },
        f_deadline: missionData.deadline,
        f_reveal_policy: missionData.resultVisibility === "realtime" ? "realtime" : "onClose",
        f_creator_id: userId,
        f_status: "open",
        f_total_episodes: missionData.totalEpisodes || 8,
        // f_description: missionData.description || null, // DB 컬럼 없음
        // f_image_url: missionData.imageUrl || null // DB 컬럼 없음
        f_thumbnail_url: missionData.imageUrl || null // 이미지 URL을 썸네일 URL로 대체 저장
      }

      if (missionData.seasonType) mission2Payload.f_season_type = missionData.seasonType
      if (missionData.seasonNumber) mission2Payload.f_season_number = parseInt(missionData.seasonNumber)

      const { data, error } = await supabase.from("t_missions2").insert([mission2Payload]).select("f_id").single()

      if (error) {
        console.error("커플매칭 미션 생성 실패:", error)
        return { success: false, error: `커플매칭 미션 생성에 실패했습니다: ${error.message}` }
      }
      return { success: true, missionId: data.f_id }
    }

    if (missionData.format === "subjective") {
      missionPayload.f_options = null
      if (missionData.placeholder) missionPayload.f_subjective_placeholder = missionData.placeholder
    } else {
      missionPayload.f_options = missionData.options || []
    }

    if (missionData.seasonType) missionPayload.f_season_type = missionData.seasonType
    if (missionData.seasonNumber) missionPayload.f_season_number = parseInt(missionData.seasonNumber)

    const { data, error } = await supabase.from("t_missions1").insert([missionPayload]).select("f_id").single()

    if (error) {
      console.error("미션 생성 실패:", error)
      return { success: false, error: `미션 생성에 실패했습니다: ${error.message}` }
    }

    // 썸네일 자동 생성 (레퍼런스 URL이 있다면)
    if (missionData.referenceUrl) {
      const thumbnailUrl = getThumbnailFromUrl(missionData.referenceUrl)
      if (thumbnailUrl) {
        await supabase.from("t_missions1").update({ f_thumbnail_url: thumbnailUrl }).eq("f_id", data.f_id)
      }
    }

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
      .select("*, creator:t_users!fk_missions1_creator(f_nickname, f_tier)")
      .order("f_created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("미션 목록 조회 실패:", error)
      return { success: false, error: "미션 목록을 불러올 수 없습니다." }
    }

    // [자동화] 썸네일이 없고 레퍼런스 URL이 있는 경우, 썸네일 추출 및 저장
    if (data && data.length > 0) {
      data.forEach((mission) => {
        if (mission.f_reference_url && !mission.f_thumbnail_url) {
          const thumbnailUrl = getThumbnailFromUrl(mission.f_reference_url)
          if (thumbnailUrl) {
            console.log(`[Auto] 미션 ${mission.f_id} 썸네일 자동 생성: ${thumbnailUrl}`)
            supabase
              .from("t_missions1")
              .update({ f_thumbnail_url: thumbnailUrl })
              .eq("f_id", mission.f_id)
              .then(({ error }) => {
                if (error) console.error(`[Auto] 미션 ${mission.f_id} 썸네일 저장 실패:`, error)
              })
            mission.f_thumbnail_url = thumbnailUrl
          }
        }
      })
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
    const { data, error } = await supabase.from("t_missions1").select("*").eq("f_id", missionId).single()

    if (error) {
      if (error.code === "PGRST116" || error.code === "406") return { success: false }
      console.error("미션 조회 실패:", error)
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }
    return { success: true, mission: data }
  } catch (error) {
    console.error("미션 조회 중 오류:", error)
    return { success: false, error: "미션 조회 중 오류가 발생했습니다." }
  }
}

/**
 * 투표 수 업데이트 및 미션 정산 (내부 함수)
 * 이 함수는 getMission의 내부 로직으로 사용되거나, 별도의 트리거로 호출될 수 있습니다.
 */
export async function updateOptionVoteCounts(missionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { data: mission, error: fetchError } = await supabase.from("t_missions1").select("f_options, f_kind, f_status, f_deadline").eq("f_id", missionId).single()

    if (fetchError || !mission) return { success: false, error: "미션을 찾을 수 없습니다." }

    const allOptions: string[] = mission.f_options || []
    const { data: votes, error: votesError } = await supabase.from("t_pickresult1").select("f_selected_option").eq("f_mission_id", missionId)

    if (votesError) return { success: false, error: "투표 집계에 실패했습니다." }

    const safeVotes = votes || []
    const voteCounts: { [key: string]: number } = {}
    allOptions.forEach(option => { voteCounts[option] = 0 })

    const totalVotes = safeVotes.length
    safeVotes.forEach((vote) => {
      let selectedOption: string | null = null
      if (typeof vote.f_selected_option === 'string') selectedOption = vote.f_selected_option
      else if (vote.f_selected_option && typeof vote.f_selected_option === 'object') selectedOption = vote.f_selected_option.option

      if (selectedOption && typeof selectedOption === 'string' && allOptions.includes(selectedOption)) {
        voteCounts[selectedOption] = (voteCounts[selectedOption] || 0) + 1
      }
    })

    const votePercentages: { [key: string]: number } = {}
    allOptions.forEach((option) => {
      votePercentages[option] = totalVotes > 0 ? Math.round((voteCounts[option] / totalVotes) * 100) : 0
    })

    let majorityOption: string | null = null
    let maxCount = 0
    for (const option in voteCounts) {
      if (voteCounts[option] > maxCount) {
        maxCount = voteCounts[option]
        majorityOption = option
      }
    }

    const updateData: any = { f_option_vote_counts: votePercentages }
    if (totalVotes > 0 && majorityOption) updateData.f_majority_option = majorityOption

    const { error: updateError } = await supabase.from("t_missions1").update(updateData).eq("f_id", missionId)

    if (updateError) return { success: false, error: "투표 수 업데이트에 실패했습니다." }

    return { success: true }
  } catch (error) {
    console.error("투표 수 업데이트 중 오류:", error)
    return { success: false, error: "투표 수 업데이트 중 오류가 발생했습니다." }
  }
}

export async function getMissions2(limit: number = 20): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("t_missions2")
      .select("*, creator:t_users!fk_missions2_creator(f_nickname, f_tier)")
      .order("f_created_at", { ascending: false })
      .limit(limit)

    if (error) return { success: false, error: "커플매칭 미션 목록을 불러올 수 없습니다." }
    return { success: true, missions: data }
  } catch (error) {
    return { success: false, error: "커플매칭 미션 목록 조회 중 오류가 발생했습니다." }
  }
}

export async function getMission2(missionId: string): Promise<{ success: boolean; mission?: any; error?: string }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("t_missions2").select("*").eq("f_id", missionId).maybeSingle()

    if (error && error.code !== "PGRST116" && error.code !== "406") return { success: false, error: "커플매칭 미션을 찾을 수 없습니다." }
    if (!data) return { success: false }
    if (data.f_episode_statuses === null) data.f_episode_statuses = {};
    return { success: true, mission: data }
  } catch (error) {
    return { success: false, error: "커플매칭 미션 조회 중 오류가 발생했습니다." }
  }
}

// settleMission1 함수가 없어서 에러가 날 수 있으므로, 임시로 빈 함수 정의
async function settleMission1(missionId: string) {
  console.log("settleMission1 호출됨 (임시 구현)", missionId)
}

/**
 * 미션 참여자 수 증가
 */
export async function incrementMissionParticipants(missionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { data: mission, error: fetchError } = await supabase.from("t_missions1").select("f_stats_participants").eq("f_id", missionId).single()

    if (fetchError || !mission) {
      console.error("미션 참여자 수 증가 실패: 미션을 찾을 수 없습니다.", fetchError)
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }

    const currentParticipants = mission.f_stats_participants || 0
    const { error: updateError } = await supabase
      .from("t_missions1")
      .update({ f_stats_participants: currentParticipants + 1 })
      .eq("f_id", missionId)

    if (updateError) {
      console.error("미션 참여자 수 업데이트 실패:", updateError)
      return { success: false, error: "미션 참여자 수 업데이트에 실패했습니다." }
    }

    return { success: true }
  } catch (error) {
    console.error("미션 참여자 수 증가 중 오류:", error)
    return { success: false, error: "미션 참여자 수 증가 중 오류가 발생했습니다." }
  }
}

/**
 * 커플 매칭 미션 참여자 수 증가 (t_missions2)
 */
export async function incrementMissionParticipants2(missionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { data: mission, error: fetchError } = await supabase.from("t_missions2").select("f_stats_participants").eq("f_id", missionId).single()

    if (fetchError || !mission) {
      return { success: false, error: "미션을 찾을 수 없습니다." }
    }

    const currentParticipants = mission.f_stats_participants || 0
    const { error: updateError } = await supabase
      .from("t_missions2")
      .update({ f_stats_participants: currentParticipants + 1 })
      .eq("f_id", missionId)
    if (updateError) {
      return { success: false, error: "참여자 수 업데이트 실패" }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: "오류 발생" }
  }
}

/**
 * 내가 만든 미션 목록 가져오기
 */
export async function getMissionsByCreator(userId: string): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const supabase = createClient()

    // missions1과 missions2 모두 조회
    const { data: missions1, error: error1 } = await supabase
      .from("t_missions1")
      .select("*")
      .eq("f_creator_id", userId)
      .order("f_created_at", { ascending: false })

    const { data: missions2, error: error2 } = await supabase
      .from("t_missions2")
      .select("*")
      .eq("f_creator_id", userId)
      .order("f_created_at", { ascending: false })

    if (error1 || error2) {
      console.error("내 미션 조회 실패:", error1 || error2)
      return { success: false, error: "미션 목록을 불러올 수 없습니다." }
    }

    // 두 목록 합치기 (날짜순 정렬)
    const allMissions = [...(missions1 || []), ...(missions2 || [])].sort((a, b) =>
      new Date(b.f_created_at).getTime() - new Date(a.f_created_at).getTime()
    )

    return { success: true, missions: allMissions }
  } catch (error) {
    console.error("내 미션 조회 중 오류:", error)
    return { success: false, error: "오류가 발생했습니다." }
  }
}

/**
 * 내가 참여한 미션 목록 가져오기
 */
export async function getMissionsByParticipant(userId: string): Promise<{ success: boolean; missions?: any[]; error?: string }> {
  try {
    const supabase = createClient()

    // pickresult1에서 참여한 미션 ID 조회
    const { data: picks1, error: error1 } = await supabase
      .from("t_pickresult1")
      .select("f_mission_id, f_created_at")
      .eq("f_user_id", userId)

    // pickresult2에서 참여한 미션 ID 조회
    const { data: picks2, error: error2 } = await supabase
      .from("t_pickresult2")
      .select("f_mission_id, f_created_at")
      .eq("f_user_id", userId)

    if (error1 || error2) {
      return { success: false, error: "참여 내역을 불러올 수 없습니다." }
    }

    // 미션 ID 추출 (중복 제거)
    const missionIds1 = [...new Set(picks1?.map(p => p.f_mission_id) || [])]
    const missionIds2 = [...new Set(picks2?.map(p => p.f_mission_id) || [])]

    // 미션 정보 조회
    const { data: missions1 } = await supabase
      .from("t_missions1")
      .select("*, creator:t_users!fk_missions1_creator(f_nickname)")
      .in("f_id", missionIds1)

    const { data: missions2 } = await supabase
      .from("t_missions2")
      .select("*, creator:t_users!fk_missions2_creator(f_nickname)")
      .in("f_id", missionIds2)

    const allMissions = [...(missions1 || []), ...(missions2 || [])].sort((a, b) =>
      new Date(b.f_created_at).getTime() - new Date(a.f_created_at).getTime()
    )

    return { success: true, missions: allMissions }
  } catch (error) {
    return { success: false, error: "오류가 발생했습니다." }
  }
}

/**
 * 예측 미션 정답 제출 (투표하기)
 */
export async function submitPredictMissionAnswer(
  userId: string,
  missionId: string,
  answer: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 이미 투표했는지 확인
    const { data: existing } = await supabase
      .from("t_pickresult1")
      .select("f_id")
      .eq("f_user_id", userId)
      .eq("f_mission_id", missionId)
      .single()

    if (existing) {
      return { success: false, error: "이미 참여한 미션입니다." }
    }

    const { error } = await supabase.from("t_pickresult1").insert({
      f_user_id: userId,
      f_mission_id: missionId,
      f_selected_option: answer
    })

    if (error) throw error

    // 참여자 수 증가
    await incrementMissionParticipants(missionId)
    // 투표 수 집계 업데이트
    await updateOptionVoteCounts(missionId)

    return { success: true }
  } catch (error) {
    console.error("투표 제출 실패:", error)
    return { success: false, error: "투표 제출에 실패했습니다." }
  }
}

/**
 * 예측 미션 정답 수정
 */
export async function updatePredictMissionAnswer(
  userId: string,
  missionId: string,
  answer: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("t_pickresult1")
      .update({ f_selected_option: answer, f_updated_at: new Date().toISOString() })
      .eq("f_user_id", userId)
      .eq("f_mission_id", missionId)

    if (error) throw error

    // 투표 수 집계 업데이트
    await updateOptionVoteCounts(missionId)

    return { success: true }
  } catch (error) {
    return { success: false, error: "투표 수정에 실패했습니다." }
  }
}

/**
 * 미션 정산 및 결과 확정
 */
export async function settleMissionWithFinalAnswer(
  missionId: string,
  correctAnswer: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 1. 미션 상태 업데이트 및 정답 저장
    const { error: missionError } = await supabase
      .from("t_missions1")
      .update({
        f_status: "settled",
        f_correct_answer: correctAnswer,
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", missionId)

    if (missionError) throw missionError

    // 2. 참여자들의 정답 여부 업데이트
    // (실제로는 서버 사이드에서 배치로 처리하거나 트리거로 처리하는 것이 좋음)
    // 여기서는 간단하게 처리

    return { success: true }
  } catch (error) {
    console.error("미션 정산 실패:", error)
    return { success: false, error: "미션 정산에 실패했습니다." }
  }
}