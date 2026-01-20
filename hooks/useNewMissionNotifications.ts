"use client"

import { useEffect, useState } from "react"

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

        // 읽음 처리 이벤트 리스너
        const handleMarkAsRead = (event: any) => {
            const { missionIds } = event.detail || {}
            if (missionIds && missionIds.length > 0) {
                setUnreadMissionIds(prev => {
                    const updated = prev.filter(id => !missionIds.includes(id))
                    setUnreadMissions(updated)
                    return updated
                })
            }
        }

        // 새 미션 생성 이벤트 리스너
        const handleNewMission = (event: any) => {
            const { missionId } = event.detail || {}
            if (missionId) {
                console.log('[Notification] 새 미션 감지:', missionId)
                setUnreadMissionIds(prev => {
                    // 중복 체크
                    if (prev.includes(missionId)) return prev
                    const updated = [...prev, missionId]
                    setUnreadMissions(updated)
                    return updated
                })
            }
        }

        // localStorage 변경 감지 (다른 탭에서의 변경사항)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === UNREAD_KEY && e.newValue) {
                try {
                    const newUnread = JSON.parse(e.newValue)
                    setUnreadMissionIds(newUnread)
                } catch (error) {
                    console.error('[Notification] localStorage 파싱 실패:', error)
                }
            }
        }

        window.addEventListener('mark-missions-as-read', handleMarkAsRead)
        window.addEventListener('new-mission-created', handleNewMission)
        window.addEventListener('storage', handleStorageChange)

        console.log("[Notification] 실시간 알림 활성화")
        
        return () => {
            window.removeEventListener('mark-missions-as-read', handleMarkAsRead)
            window.removeEventListener('new-mission-created', handleNewMission)
            window.removeEventListener('storage', handleStorageChange)
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

    // 초기화 시 너무 오래된 미션 아이디 삭제 (선택사항)
    // 여기서는 단순히 50개까지만 유지하도록 제한하여 무한히 늘어나는 것을 방지
    useEffect(() => {
        if (unreadMissionIds.length > 50) {
            const limited = unreadMissionIds.slice(-50)
            setUnreadMissions(limited)
            setUnreadMissionIds(limited)
        }
    }, [unreadMissionIds])

    return {
        unreadMissionIds,
        markAsRead,
        markManyAsRead,
        markAllAsRead,
        hasUnread: unreadMissionIds.length > 0
    }
}
