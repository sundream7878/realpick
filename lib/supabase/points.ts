import { createClient } from "./client"
import type { TPointLog } from "@/types/t-vote/vote.types"
import { getTierFromPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import type { TTier } from "@/types/t-vote/vote.types"

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

  try {
    // RPC 함수 호출 (Security Definier로 RLS 우회)
    const { data, error } = await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_diff: diff,
      p_reason: reason,
      p_mission_id: missionId || null,
      p_mission_type: missionType || null,
      p_metadata: metadata || null
    })

    if (error) {
      console.error("[addPointLog] RPC 호출 실패:", error)
      // RPC가 없거나 실패하면 기존 로직으로 폴백 (선택 사항, 여기서는 에러 로그만 남김)
      // return null
      throw error
    }

    if (!data || !data.success) {
      console.error("[addPointLog] 포인트 업데이트 실패:", data?.error)
      return null
    }

    console.log(`[addPointLog] 포인트 업데이트 성공: ${userId}, ${diff}P`)

    // 성공 시 로그 데이터 반환 (RPC가 반환한 log_id 사용 가능하지만, 여기서는 간단히 구성)
    return {
      id: data.log_id,
      userId: userId,
      missionId: missionId,
      diff: diff,
      reason: reason,
      createdAt: new Date().toISOString()
    }

  } catch (rpcError) {
    console.error("[addPointLog] RPC 에러, 기존 방식으로 시도:", rpcError)

    // Fallback: 기존 방식 (RLS 문제 가능성 있음)
    const logData = {
      f_user_id: userId,
      f_mission_id: missionId || null,
      f_mission_type: missionType || null,
      f_diff: diff,
      f_reason: reason,
      f_metadata: metadata || null,
    }

    const { data: log, error: logError } = await supabase.from("t_pointlogs").insert(logData).select().single()

    if (logError) {
      console.error("[addPointLog] 포인트 로그 저장 실패 (Fallback):", logError)
      return null
    }

    // 사용자 포인트 업데이트
    const { data: user } = await supabase.from("t_users").select("f_points").eq("f_id", userId).single()
    if (user) {
      const newPoints = Math.max(0, user.f_points + diff)
      const tierInfo = getTierFromPoints(newPoints)
      await supabase.from("t_users").update({ f_points: newPoints, f_tier: tierInfo.name }).eq("f_id", userId)
    }

    return {
      id: log.f_id,
      userId: log.f_user_id,
      missionId: log.f_mission_id || undefined,
      diff: log.f_diff,
      reason: log.f_reason,
      createdAt: log.f_created_at,
    }
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
