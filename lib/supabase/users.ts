import { createClient } from "./client"
import type { TUser, TTier } from "@/types/t-vote/vote.types"
import { getTierFromPoints } from "@/lib/utils/u-tier-system/tierSystem.util"

/**
 * 사용자 데이터 읽기/수정 함수
 */

// 사용자 정보 조회
export async function getUser(userId: string): Promise<TUser | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from("t_users").select("*").eq("f_id", userId).single()

  if (error) {
    console.error("Error fetching user:", error)
    return null
  }

  // DB 컬럼명(f_)을 TypeScript 타입으로 변환
  return {
    id: data.f_id,
    email: data.f_email,
    nickname: data.f_nickname,
    avatarUrl: data.f_avatar_url,
    points: data.f_points,
    tier: data.f_tier,
    createdAt: data.f_created_at,
    updatedAt: data.f_updated_at,
  } as TUser
}

// 사용자 포인트 업데이트 (티어도 자동 업데이트)
export async function updateUserPoints(userId: string, newPoints: number): Promise<boolean> {
  const supabase = createClient()
  
  // 포인트에 따른 티어 계산 (TypeScript 코드 기준)
  const tierInfo = getTierFromPoints(newPoints)
  const tierName = tierInfo.name as TTier
  
  // 포인트와 티어를 함께 업데이트
  const { error } = await supabase
    .from("t_users")
    .update({ 
      f_points: newPoints,
      f_tier: tierName
    })
    .eq("f_id", userId)

  if (error) {
    console.error("Error updating user points:", error)
    return false
  }

  return true
}

// 사용자 티어 업데이트
export async function updateUserTier(userId: string, tier: TTier): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from("t_users").update({ f_tier: tier }).eq("f_id", userId)

  if (error) {
    console.error("Error updating user tier:", error)
    return false
  }

  return true
}

// 사용자 프로필 업데이트
export async function updateUserProfile(
  userId: string,
  updates: { nickname?: string; avatarUrl?: string }
): Promise<boolean> {
  const supabase = createClient()
  const dbUpdates: Record<string, any> = {}
  if (updates.nickname !== undefined) dbUpdates.f_nickname = updates.nickname
  if (updates.avatarUrl !== undefined) dbUpdates.f_avatar_url = updates.avatarUrl
  
  const { error } = await supabase.from("t_users").update(dbUpdates).eq("f_id", userId)

  if (error) {
    console.error("Error updating user profile:", error)
    return false
  }

  return true
}

// 사용자 생성
export async function createUser(user: Omit<TUser, "createdAt" | "updatedAt">): Promise<TUser | null> {
  const supabase = createClient()
  const dbUser = {
    f_id: user.id,
    f_email: user.email,
    f_nickname: user.nickname,
    f_avatar_url: user.avatarUrl,
    f_points: user.points,
    f_tier: user.tier,
  }
  const { data, error } = await supabase.from("t_users").insert(dbUser).select().single()

  if (error) {
    console.error("Error creating user:", error)
    return null
  }

  return {
    id: data.f_id,
    email: data.f_email,
    nickname: data.f_nickname,
    avatarUrl: data.f_avatar_url,
    points: data.f_points,
    tier: data.f_tier,
    createdAt: data.f_created_at,
    updatedAt: data.f_updated_at,
  } as TUser
}

// 포인트 랭킹 조회
export async function getUserRanking(limit: number = 100): Promise<TUser[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("t_users")
    .select("*")
    .order("f_points", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching user ranking:", error)
    return []
  }

  return (data || []).map((d) => ({
    id: d.f_id,
    email: d.f_email,
    nickname: d.f_nickname,
    avatarUrl: d.f_avatar_url,
    points: d.f_points,
    tier: d.f_tier,
    createdAt: d.f_created_at,
    updatedAt: d.f_updated_at,
  })) as TUser[]
}

