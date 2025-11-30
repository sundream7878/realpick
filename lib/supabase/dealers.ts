import { createClient } from "./client"
import type { TDealer } from "@/types/t-vote/vote.types"

/**
 * 딜러 데이터 읽기/수정 함수
 */

// 딜러 정보 조회 (User ID 기반)
export async function getDealer(userId: string): Promise<TDealer | null> {
    const supabase = createClient()
    const { data, error } = await supabase.from("t_dealers").select("*").eq("f_user_id", userId).single()

    if (error) {
        // 딜러 정보가 없는 경우 (일반 유저)
        if (error.code === "PGRST116") return null
        console.error("Error fetching dealer:", error)
        return null
    }

    return {
        id: data.f_id,
        userId: data.f_user_id,
        channelName: data.f_channel_name,
        channelUrl: data.f_channel_url || undefined,
        subscriberCount: data.f_subscriber_count,
        introMessage: data.f_intro_message || undefined,
        broadcastSection: data.f_broadcast_section || undefined,
        status: data.f_status,
        createdAt: data.f_created_at,
        updatedAt: data.f_updated_at,
    } as TDealer
}

// 딜러 정보 생성
export async function createDealer(dealer: Omit<TDealer, "id" | "createdAt" | "updatedAt">): Promise<TDealer | null> {
    const supabase = createClient()
    const dbDealer = {
        f_user_id: dealer.userId,
        f_channel_name: dealer.channelName,
        f_channel_url: dealer.channelUrl || null,
        f_subscriber_count: dealer.subscriberCount || 0,
        f_intro_message: dealer.introMessage || null,
        f_broadcast_section: dealer.broadcastSection || null,
        f_status: dealer.status || "PENDING",
    }

    const { data, error } = await supabase.from("t_dealers").insert(dbDealer).select().single()

    if (error) {
        console.error("Error creating dealer:", error)
        return null
    }

    return {
        id: data.f_id,
        userId: data.f_user_id,
        channelName: data.f_channel_name,
        channelUrl: data.f_channel_url || undefined,
        subscriberCount: data.f_subscriber_count,
        introMessage: data.f_intro_message || undefined,
        broadcastSection: data.f_broadcast_section || undefined,
        status: data.f_status,
        createdAt: data.f_created_at,
        updatedAt: data.f_updated_at,
    } as TDealer
}

// 딜러 정보 업데이트
export async function updateDealer(userId: string, updates: Partial<TDealer>): Promise<boolean> {
    const supabase = createClient()
    const dbUpdates: Record<string, any> = {}

    if (updates.channelName !== undefined) dbUpdates.f_channel_name = updates.channelName
    if (updates.channelUrl !== undefined) dbUpdates.f_channel_url = updates.channelUrl
    if (updates.subscriberCount !== undefined) dbUpdates.f_subscriber_count = updates.subscriberCount
    if (updates.introMessage !== undefined) dbUpdates.f_intro_message = updates.introMessage
    if (updates.broadcastSection !== undefined) dbUpdates.f_broadcast_section = updates.broadcastSection
    if (updates.status !== undefined) dbUpdates.f_status = updates.status

    const { error } = await supabase.from("t_dealers").update(dbUpdates).eq("f_user_id", userId)

    if (error) {
        console.error("Error updating dealer:", error)
        return false
    }

    return true
}
