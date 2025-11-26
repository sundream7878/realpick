import { createClient } from "./client"
import type { TEpisode } from "@/types/t-vote/vote.types"

/**
 * 에피소드 데이터 읽기/수정 함수
 */

// 에피소드 조회
export async function getEpisode(missionId: string, episodeNo: number): Promise<TEpisode | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_episodes")
    .select("*")
    .eq("f_mission_id", missionId)
    .eq("f_episode_no", episodeNo)
    .single()

  if (error) {
    console.error("Error fetching episode:", error)
    return null
  }

  return {
    id: data.f_id,
    missionId: data.f_mission_id,
    episodeNo: data.f_episode_no,
    status: data.f_status,
    createdAt: data.f_created_at,
    updatedAt: data.f_updated_at,
  }
}

// 미션의 모든 에피소드 조회
export async function getEpisodesByMission(missionId: string): Promise<TEpisode[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_episodes")
    .select("*")
    .eq("f_mission_id", missionId)
    .order("f_episode_no", { ascending: true })

  if (error) {
    console.error("Error fetching episodes:", error)
    return []
  }

  return (data || []).map((e) => ({
    id: e.f_id,
    missionId: e.f_mission_id,
    episodeNo: e.f_episode_no,
    status: e.f_status,
    createdAt: e.f_created_at,
    updatedAt: e.f_updated_at,
  }))
}

// 에피소드 상태 업데이트
export async function updateEpisodeStatus(
  missionId: string,
  episodeNo: number,
  status: "open" | "locked" | "settled"
): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from("t_episodes")
    .update({ f_status: status })
    .eq("f_mission_id", missionId)
    .eq("f_episode_no", episodeNo)

  if (error) {
    console.error("Error updating episode status:", error)
    return false
  }

  return true
}

// 에피소드 집계 데이터 업데이트
export async function updateEpisodeStats(
  missionId: string,
  episodeNo: number,
  stats: {
    totalPicks?: number
    participants?: number
    couplePickCounts?: Record<string, { count: number; percentage: number }>
  }
): Promise<boolean> {
  const supabase = createClient()

  const updateData: any = {}
  if (stats.totalPicks !== undefined) updateData.f_stats_total_picks = stats.totalPicks
  if (stats.participants !== undefined) updateData.f_stats_participants = stats.participants
  if (stats.couplePickCounts !== undefined) updateData.f_couple_pick_counts = stats.couplePickCounts

  const { error } = await supabase
    .from("t_episodes")
    .update(updateData)
    .eq("f_mission_id", missionId)
    .eq("f_episode_no", episodeNo)

  if (error) {
    console.error("Error updating episode stats:", error)
    return false
  }

  return true
}

// 에피소드 생성
export async function createEpisode(
  missionId: string,
  episodeNo: number,
  status: "open" | "locked" | "settled" = "locked"
): Promise<TEpisode | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("t_episodes")
    .insert({
      f_mission_id: missionId,
      f_episode_no: episodeNo,
      f_status: status,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating episode:", error)
    return null
  }

  return {
    id: data.f_id,
    missionId: data.f_mission_id,
    episodeNo: data.f_episode_no,
    status: data.f_status,
    createdAt: data.f_created_at,
    updatedAt: data.f_updated_at,
  }
}
