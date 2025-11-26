import { createClient } from "./client"
import type { TPointLog } from "@/types/t-vote/vote.types"

/**
 * 포인트 로그 읽기/수정 함수
 */

// 사용자의 포인트 로그 조회
export async function getUserPointLogs(userId: string, limit: number = 100): Promise<TPointLog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_pointlogs")
    .select("*")
    .eq("f_user_id", userId)
    .order("f_created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching point logs:", error)
    return []
  }

  return (data || []).map((log) => ({
    id: log.f_id,
    userId: log.f_user_id,
    missionId: log.f_mission_id || undefined,
    diff: log.f_diff,
    reason: log.f_reason,
    createdAt: log.f_created_at,
  }))
}

// 포인트 로그 추가
export async function addPointLog(
  userId: string,
  diff: number,
  reason: string,
  missionId?: string,
  missionType?: "mission1" | "mission2",
  metadata?: Record<string, any>
): Promise<TPointLog | null> {
  const supabase = createClient()

  const logData = {
    f_user_id: userId,
    f_mission_id: missionId || null,
    f_mission_type: missionType || null,
    f_diff: diff,
    f_reason: reason,
    f_metadata: metadata || null,
  }

  const { data, error } = await supabase.from("t_pointlogs").insert(logData).select().single()

  if (error) {
    console.error("Error adding point log:", error)
    return null
  }

  // 사용자 포인트 업데이트
  const { data: user } = await supabase.from("t_users").select("f_points").eq("f_id", userId).single()
  if (user) {
    const newPoints = Math.max(0, user.f_points + diff)
    await supabase.from("t_users").update({ f_points: newPoints }).eq("f_id", userId)
  }

  return {
    id: data.f_id,
    userId: data.f_user_id,
    missionId: data.f_mission_id || undefined,
    diff: data.f_diff,
    reason: data.f_reason,
    createdAt: data.f_created_at,
  }
}

// 사용자 총 포인트 조회
export async function getUserTotalPoints(userId: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.from("t_users").select("f_points").eq("f_id", userId).single()

  if (error) {
    console.error("Error fetching user points:", error)
    return 0
  }

  return data?.f_points || 0
}

// 미션별 포인트 로그 조회
export async function getPointLogsByMission(missionId: string): Promise<TPointLog[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_pointlogs")
    .select("*")
    .eq("f_mission_id", missionId)
    .order("f_created_at", { ascending: false })

  if (error) {
    console.error("Error fetching point logs by mission:", error)
    return []
  }

  return (data || []).map((log) => ({
    id: log.f_id,
    userId: log.f_user_id,
    missionId: log.f_mission_id || undefined,
    diff: log.f_diff,
    reason: log.f_reason,
    createdAt: log.f_created_at,
  }))
}
