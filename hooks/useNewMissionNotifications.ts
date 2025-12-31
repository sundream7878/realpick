"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface NewMissionData {
    id: string
    category: string
    showId: string
    createdAt: string
}

const UNREAD_KEY = "rp_unread_missions"

/**
 * 읽지 않은 미션 목록 가져오기 (localStorage)
 */
function getUnreadMissions(): string[] {
    if (typeof window === "undefined") return []
    try {
        const stored = localStorage.getItem(UNREAD_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

/**
 * 읽지 않은 미션 목록 저장 (localStorage)
 */
function setUnreadMissions(ids: string[]) {
    if (typeof window === "undefined") return
    localStorage.setItem(UNREAD_KEY, JSON.stringify(ids))
}

/**
 * 새로운 미션 생성 알림을 감지하는 커스텀 훅
 * Supabase Realtime을 사용하여 t_missions1, t_missions2의 INSERT 이벤트 구독
 */
export function useNewMissionNotifications() {
    const [unreadMissionIds, setUnreadMissionIds] = useState<string[]>([])

    useEffect(() => {
        // 초기 로드: localStorage에서 읽지 않은 미션 목록 가져오기
        const initialUnread = getUnreadMissions()
        setUnreadMissionIds(initialUnread)

        const supabase = createClient()
        
        // Realtime 연결 상태 확인
        console.log("[Realtime] Supabase 클라이언트 초기화 완료")

        // 고유한 채널 이름 생성 (타임스탬프 기반으로 충돌 방지)
        const channelId1 = `mission1-inserts-${Date.now()}`
        const channelId2 = `mission2-inserts-${Date.now()}`

        // t_missions1 INSERT 이벤트 구독
        const channel1 = supabase
            .channel(channelId1)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "t_missions1"
                },
                (payload) => {
                    console.log("[Realtime] 새 미션 생성 감지 (t_missions1):", payload.new)
                    const newMission = payload.new as any

                    // 읽지 않은 미션 목록에 추가
                    const updated = [...getUnreadMissions(), newMission.f_id]
                    const uniqueIds = Array.from(new Set(updated))
                    setUnreadMissions(uniqueIds)
                    setUnreadMissionIds(uniqueIds)

                    // 토스트 알림 (선택사항)
                    console.log(`🔔 새 미션: ${newMission.f_title}`)
                }
            )
            .subscribe((status, err) => {
                console.log("[Realtime] t_missions1 구독 상태:", status, "채널:", channelId1)
                if (err) {
                    console.error("[Realtime] t_missions1 구독 에러:", err)
                }
                if (status === "SUBSCRIBED") {
                    console.log("✅ t_missions1 구독 성공!")
                } else if (status === "TIMED_OUT" || status === "CLOSED") {
                    console.warn("[Realtime] t_missions1 구독이 종료되었습니다. 상태:", status)
                }
            })

        // t_missions2 INSERT 이벤트 구독
        const channel2 = supabase
            .channel(channelId2)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "t_missions2"
                },
                (payload) => {
                    console.log("[Realtime] 새 미션 생성 감지 (t_missions2):", payload.new)
                    const newMission = payload.new as any

                    // 읽지 않은 미션 목록에 추가
                    const updated = [...getUnreadMissions(), newMission.f_id]
                    const uniqueIds = Array.from(new Set(updated))
                    setUnreadMissions(uniqueIds)
                    setUnreadMissionIds(uniqueIds)

                    // 토스트 알림 (선택사항)
                    console.log(`🔔 새 미션: ${newMission.f_title}`)
                }
            )
            .subscribe((status, err) => {
                console.log("[Realtime] t_missions2 구독 상태:", status, "채널:", channelId2)
                if (err) {
                    console.error("[Realtime] t_missions2 구독 에러:", err)
                }
                if (status === "SUBSCRIBED") {
                    console.log("✅ t_missions2 구독 성공!")
                } else if (status === "TIMED_OUT" || status === "CLOSED") {
                    console.warn("[Realtime] t_missions2 구독이 종료되었습니다. 상태:", status)
                }
            })

        // 클린업
        return () => {
            supabase.removeChannel(channel1)
            supabase.removeChannel(channel2)
        }
    }, [])

    /**
     * 미션을 읽음 처리
     */
    const markAsRead = (missionId: string) => {
        const updated = unreadMissionIds.filter(id => id !== missionId)
        setUnreadMissions(updated)
        setUnreadMissionIds(updated)
    }

    /**
     * 여러 미션을 한 번에 읽음 처리
     */
    const markManyAsRead = (missionIds: string[]) => {
        const updated = unreadMissionIds.filter(id => !missionIds.includes(id))
        setUnreadMissions(updated)
        setUnreadMissionIds(updated)
    }

    /**
     * 모든 미션을 읽음 처리
     */
    const markAllAsRead = () => {
        setUnreadMissions([])
        setUnreadMissionIds([])
    }

    return {
        unreadMissionIds,
        markAsRead,
        markManyAsRead,
        markAllAsRead,
        hasUnread: unreadMissionIds.length > 0
    }
}
