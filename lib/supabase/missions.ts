import { createClient } from "@/lib/supabase/client"
import { getThumbnailFromUrl } from "@/lib/utils/u-media/youtube.util"
import { CreateMissionData, TMission, TMatchPairs } from "@/types/t-vote/vote.types"
import { addPointLog } from "@/lib/supabase/points"
import { sendMissionNotification } from "@/lib/supabase/email-notification"

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
      f_thumbnail_url: missionData.imageUrl || null, // 이미지 URL을 썸네일 URL로 대체 저장
      f_submission_type: missionData.submissionType || "selection",
      f_required_answer_count: missionData.requiredAnswerCount || 1,
      f_is_live: missionData.isLive || false,
      f_show_id: missionData.showId || null,
      f_category: missionData.category || null
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
        f_thumbnail_url: missionData.imageUrl || null, // 이미지 URL을 썸네일 URL로 대체 저장
        f_is_live: missionData.isLive || false,
        f_show_id: missionData.showId || null,
        f_category: missionData.category || null
      }

      if (missionData.seasonType) mission2Payload.f_season_type = missionData.seasonType
      if (missionData.seasonNumber) mission2Payload.f_season_number = parseInt(missionData.seasonNumber)

      const { data, error } = await supabase.from("t_missions2").insert([mission2Payload]).select("f_id").single()

      if (error) {
        console.error("커플매칭 미션 생성 실패:", error)
        return { success: false, error: `커플매칭 미션 생성에 실패했습니다: ${error.message}` }
      }

      // [New] Generate and save embedding
      fetch('/api/missions/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.f_id,
          title: missionData.title,
          table: 't_missions2'
        })
      }).catch(err => console.error("Embedding generation failed:", err))

      // 이메일 알림 발송 (비동기, 에러 무시)
      sendMissionNotification({
        missionId: data.f_id,
        missionTitle: missionData.title,
        category: missionData.category,
        showId: missionData.showId,
        creatorId: userId
      }).catch(err => console.error("Email notification failed:", err))

      return { success: true, missionId: data.f_id }
    }

    missionPayload.f_options = missionData.options || []
    if (missionData.placeholder) missionPayload.f_subjective_placeholder = missionData.placeholder

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

    // [New] Generate and save embedding
    fetch('/api/missions/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: data.f_id,
        title: missionData.title,
        table: 't_missions1'
      })
    }).catch(err => console.error("Embedding generation failed:", err))

    // 이메일 알림 발송 (비동기, 에러 무시)
    sendMissionNotification({
      missionId: data.f_id,
      missionTitle: missionData.title,
      category: missionData.category,
      showId: missionData.showId,
      creatorId: userId
    }).catch(err => console.error("Email notification failed:", err))

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
 */
export async function updateOptionVoteCounts(missionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { data: mission, error: fetchError } = await supabase.from("t_missions1").select("f_options, f_kind, f_status, f_deadline, f_submission_type").eq("f_id", missionId).single()

    if (fetchError || !mission) return { success: false, error: "미션을 찾을 수 없습니다." }

    const allOptions: string[] = mission.f_options || []
    const isTextMission = mission.f_submission_type === 'text'

    const { data: votes, error: votesError } = await supabase.from("t_pickresult1").select("f_selected_option").eq("f_mission_id", missionId)

    if (votesError) return { success: false, error: "투표 집계에 실패했습니다." }

    const safeVotes = votes || []
    const voteCounts: { [key: string]: number } = {}

    // 선택형 미션인 경우 미리 옵션 키 초기화
    if (!isTextMission) {
      allOptions.forEach(option => { voteCounts[option] = 0 })
    }

    const totalVotes = safeVotes.length
    safeVotes.forEach((vote) => {
      let selectedOptions: string[] = []
      const rawOption = vote.f_selected_option

      if (Array.isArray(rawOption)) {
        selectedOptions = rawOption
      } else if (typeof rawOption === 'string') {
        selectedOptions = [rawOption]
      } else if (rawOption && typeof rawOption === 'object' && rawOption.option) {
        selectedOptions = [rawOption.option]
      }

      selectedOptions.forEach(option => {
        if (option && typeof option === 'string') {
          // 텍스트 미션이거나, 선택형 미션의 유효한 옵션인 경우 카운트
          if (isTextMission || allOptions.includes(option)) {
            voteCounts[option] = (voteCounts[option] || 0) + 1
          }
        }
      })
    })

    const votePercentages: { [key: string]: number } = {}

    // 텍스트 미션은 상위 5개만 저장하거나 전체 저장 (여기서는 전체 저장하되 UI에서 자름)
    Object.keys(voteCounts).forEach((option) => {
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
    const formattedMissions1 = (missions1 || []).map(m => ({ ...m, __table: 't_missions1' }))
    const formattedMissions2 = (missions2 || []).map(m => ({ ...m, __table: 't_missions2' }))

    const allMissions = [...formattedMissions1, ...formattedMissions2].sort((a, b) =>
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
      .maybeSingle()

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

    // 1. 미션 정보 조회
    const { data: mission, error: fetchError } = await supabase
      .from("t_missions1")
      .select("f_kind, f_submission_type, f_title, f_form, f_category, f_show_id")
      .eq("f_id", missionId)
      .single()

    if (fetchError || !mission) {
      return { success: false, error: "미션 정보를 찾을 수 없습니다." }
    }

    // 2. 미션 상태 업데이트 및 정답 저장
    const { error: missionError } = await supabase
      .from("t_missions1")
      .update({
        f_status: "settled",
        f_correct_answer: correctAnswer,
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", missionId)

    if (missionError) throw missionError

    // 미션 마감 알림 발송 (비동기, 에러 무시)
    const { sendDeadlineNotification } = await import("./email-notification")
    sendDeadlineNotification({
      missionId: missionId,
      missionTitle: mission.f_title,
      category: mission.f_category,
      showId: mission.f_show_id
    }).catch(err => console.error("Deadline notification failed:", err))

    // 3. 참여자 투표 내역 조회
    const { data: votes, error: votesError } = await supabase
      .from("t_pickresult1")
      .select("f_user_id, f_selected_option, f_points_earned")
      .eq("f_mission_id", missionId)

    if (votesError) {
      console.error("투표 내역 조회 실패:", votesError)
      // 미션 상태는 업데이트 되었으므로 성공으로 처리하되 로그 남김
      return { success: true }
    }

    // 4. 포인트 정산
    const pointPromises = votes.map(async (vote) => {
      // 이미 포인트가 지급된 경우 (f_points_earned > 0) 중복 지급 방지
      if (vote.f_points_earned && vote.f_points_earned > 0) {
        return
      }

      let points = 0
      let reason = ""

      if (mission.f_kind === "poll" || mission.f_kind === "majority") {
        // 공감 픽 (참여만 해도 +10)
        points = 10
        reason = `[공감 픽] ${mission.f_title} 참여 보상`
      } else if (mission.f_kind === "predict") {
        // 예측 픽
        if (mission.f_form === "multi" || mission.f_submission_type === "text") {
          // 다중 선택 / 주관식
          let correctAnswers: string[] = []
          try {
            const parsed = JSON.parse(correctAnswer)
            correctAnswers = Array.isArray(parsed) ? parsed : [correctAnswer]
          } catch (e) {
            correctAnswers = [correctAnswer]
          }

          let userAnswers: string[] = []
          if (Array.isArray(vote.f_selected_option)) {
            userAnswers = vote.f_selected_option
          } else if (typeof vote.f_selected_option === "string") {
            try {
              const parsed = JSON.parse(vote.f_selected_option)
              userAnswers = Array.isArray(parsed) ? parsed : [vote.f_selected_option]
            } catch (e) {
              userAnswers = [vote.f_selected_option]
            }
          } else if (vote.f_selected_option !== null && vote.f_selected_option !== undefined) {
            userAnswers = [String(vote.f_selected_option)]
          }

          let correctCount = 0
          let incorrectCount = 0

          userAnswers.forEach(ans => {
            if (correctAnswers.includes(ans)) correctCount++
            else incorrectCount++
          })

          points = (correctCount * 100) - (incorrectCount * 50)
          reason = `[예측 픽] ${mission.f_title} 결과 정산 (정답 ${correctCount} 개, 오답 ${incorrectCount}개)`

        } else {
          // 단일 선택 (바이너리 등)
          const isCorrect = vote.f_selected_option === correctAnswer
          points = isCorrect ? 100 : -50
          reason = `[예측 픽] ${mission.f_title} ${isCorrect ? "정답 성공" : "정답 실패"} `
        }
      }

      if (points !== 0) {
        await addPointLog(vote.f_user_id, points, reason, missionId, "mission1")
      }

      // t_pickresult1 업데이트 (정답 여부 및 획득 포인트)
      // 예측 픽인 경우에만 정답 여부 판단 (공감 픽은 null 또는 true?)
      // 공감 픽은 정답/오답 개념이 모호하므로 null로 두거나 true로 처리
      const isCorrect = mission.f_kind === "predict" ? points > 0 : true

      await supabase
        .from("t_pickresult1")
        .update({
          f_is_correct: isCorrect,
          f_points_earned: points,
          f_updated_at: new Date().toISOString()
        })
        .eq("f_user_id", vote.f_user_id)
        .eq("f_mission_id", missionId)
    })

    await Promise.all(pointPromises)

    return { success: true }
  } catch (error) {
    console.error("미션 정산 실패:", error)
    return { success: false, error: "미션 정산에 실패했습니다." }
  }
}

/**
 * 에피소드 상태 업데이트 (커플 매칭)
 */
export async function updateEpisodeStatuses(
  missionId: string,
  episodeNo: number,
  status: "open" | "locked" | "settled"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // 1. 기존 상태 조회
    const { data: mission, error: fetchError } = await supabase
      .from("t_missions2")
      .select("f_episode_statuses")
      .eq("f_id", missionId)
      .single()

    if (fetchError) throw fetchError

    const currentStatuses = mission.f_episode_statuses || {}

    // 2. 상태 업데이트
    const nextStatuses = {
      ...currentStatuses,
      [episodeNo]: status
    }

    // 3. 저장
    const { error } = await supabase
      .from("t_missions2")
      .update({ f_episode_statuses: nextStatuses })
      .eq("f_id", missionId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("에피소드 상태 업데이트 실패:", error)
    return { success: false, error: "상태 업데이트에 실패했습니다." }
  }
}

/**
 * 커플 매칭 미션 정답 제출 (투표하기) - UPSERT 방식
 */
export async function submitMatchMissionAnswer(
  userId: string,
  missionId: string,
  episodeNo: number,
  connections: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🚀 커플매칭 투표 시작:", { userId, missionId, episodeNo, connections })
    const supabase = createClient()

    // 1. 기존 투표 내역 조회
    console.log("📊 기존 투표 조회 중...")
    const startTime = Date.now()
    const { data: existing, error: fetchError } = await supabase
      .from("t_pickresult2")
      .select("f_votes")
      .eq("f_user_id", userId)
      .eq("f_mission_id", missionId)
      .maybeSingle()
    
    console.log(`⏱️ 기존 투표 조회 완료: ${Date.now() - startTime}ms`)

    if (fetchError) {
      console.error("❌ 기존 투표 조회 실패:", fetchError)
      throw fetchError
    }

    // 2. votes JSON 업데이트
    console.log("🔄 JSON 데이터 업데이트 중...")
    const currentVotes = existing?.f_votes || {}
    currentVotes[episodeNo.toString()] = {
      connections: connections,
      submittedAt: new Date().toISOString()
    }
    console.log("📝 업데이트된 투표 데이터:", currentVotes)

    // 3. UPSERT 실행
    console.log("💾 데이터베이스 저장 중...")
    const upsertStartTime = Date.now()
    const { error: upsertError } = await supabase
      .from("t_pickresult2")
      .upsert({
        f_user_id: userId,
        f_mission_id: missionId,
        f_votes: currentVotes,
        f_updated_at: new Date().toISOString()
      }, { onConflict: 'f_user_id, f_mission_id' })
    
    console.log(`⏱️ 데이터베이스 저장 완료: ${Date.now() - upsertStartTime}ms`)

    if (upsertError) {
      console.error("❌ 데이터베이스 저장 실패:", upsertError)
      throw upsertError
    }

    // 4. 참여자 수 증가 (처음 투표하는 경우에만)
    if (!existing) {
      console.log("👥 참여자 수 증가 중...")
      const participantStartTime = Date.now()
      await incrementMissionParticipants2(missionId)
      console.log(`⏱️ 참여자 수 증가 완료: ${Date.now() - participantStartTime}ms`)
    } else {
      console.log("✅ 기존 투표 업데이트 (참여자 수 증가 생략)")
    }

    console.log("🎉 커플매칭 투표 완료!")
    return { success: true }
  } catch (error) {
    console.error("❌ 커플 매칭 투표 제출 실패:", error)
    return { success: false, error: "투표 제출에 실패했습니다." }
  }
}

/**
 * 커플 매칭 미션 정산 및 결과 확정
 */
export async function settleMatchMission(
  missionId: string,
  finalAnswer: any[] // TFinalMatchResult format
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    const { calculateMatchVotePoints } = await import("@/lib/utils/u-points/matchPointSystem.util")
    const { addPointLog } = await import("./points")

    // 1. 미션 정보 조회 (t_missions2)
    const { data: mission, error: fetchError } = await supabase
      .from("t_missions2")
      .select("f_id, f_title, f_status, f_total_episodes, f_category, f_show_id")
      .eq("f_id", missionId)
      .single()

    if (fetchError || !mission) {
      return { success: false, error: "미션 정보를 찾을 수 없습니다." }
    }

    // 2. 미션 상태 업데이트 및 정답 저장
    const { error: missionError } = await supabase
      .from("t_missions2")
      .update({
        f_status: "settled",
        f_final_answer: finalAnswer,
        f_updated_at: new Date().toISOString()
      })
      .eq("f_id", missionId)

    if (missionError) throw missionError

    // 미션 마감 알림 발송 (비동기, 에러 무시)
    const { sendDeadlineNotification } = await import("./email-notification")
    sendDeadlineNotification({
      missionId: missionId,
      missionTitle: mission.f_title,
      category: mission.f_category,
      showId: mission.f_show_id
    }).catch(err => console.error("Match deadline notification failed:", err))

    // 3. 모든 참여자 투표 내역 조회 (t_pickresult2)
    // 이제 유저당 1개의 Row만 가져오면 됨
    const { data: votes, error: votesError } = await supabase
      .from("t_pickresult2")
      .select("f_user_id, f_votes")
      .eq("f_mission_id", missionId)

    if (votesError) {
      console.error("투표 내역 조회 실패:", votesError)
      return { success: true }
    }

    // 4. 데이터 변환 및 포인트 계산

    // 4-1. Final Answer 변환 (Array -> Map)
    const finalResultMap: Record<string, string> = {};
    finalAnswer.forEach((pair: { left: string; right: string }) => {
      finalResultMap[pair.left] = pair.right;
    });

    // 5. 포인트 계산 및 지급
    const pointPromises = votes?.map(async (vote) => {
      const userId = vote.f_user_id
      const userVotes = vote.f_votes || {} // {"1": {connections: ...}, "2": ...}

      // userPicks 구조로 변환: Record<number, Record<string, string>>
      const userPicks: Record<number, Record<string, string>> = {}

      Object.entries(userVotes).forEach(([epStr, data]: [string, any]) => {
        const episodeNo = parseInt(epStr)
        const pairs = data.connections || []

        const roundPicksMap: Record<string, string> = {}
        if (Array.isArray(pairs)) {
          pairs.forEach((pair: { left: string; right: string }) => {
            roundPicksMap[pair.left] = pair.right
          })
        }
        userPicks[episodeNo] = roundPicksMap
      })

      // 포인트 계산 (미션의 총 회차 수 전달)
      const points = calculateMatchVotePoints(finalResultMap, userPicks, mission.f_total_episodes || 8)

      if (points !== 0) {
        await addPointLog(
          userId,
          points,
          `[커플 매칭] ${mission.f_title} 결과 정산`,
          missionId,
          "mission2"
        )

        // t_pickresult2에 획득 포인트 업데이트
        await supabase
          .from("t_pickresult2")
          .update({ f_points_earned: points })
          .eq("f_user_id", userId)
          .eq("f_mission_id", missionId)
      }
    }) || []

    await Promise.all(pointPromises)

    return { success: true }
  } catch (error) {
    console.error("커플 매칭 미션 정산 실패:", error)
    return { success: false, error: "미션 정산에 실패했습니다." }
  }
}
