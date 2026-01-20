"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

interface NewMissionData {
    id: string
    category: string
    showId: string
    createdAt: any
}

const UNREAD_KEY = "rp_unread_missions"
const LAST_CHECK_KEY = "rp_last_mission_check"

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
 * Firestore onSnapshot을 사용하여 실시간으로 새 미션 감지
 */
export function useNewMissionNotifications() {
    const [unreadMissionIds, setUnreadMissionIds] = useState<string[]>([])

    useEffect(() => {
        // 1. 초기 로드: localStorage에서 읽지 않은 미션 목록 가져오기
        const initialUnread = getUnreadMissions()
        setUnreadMissionIds(initialUnread)

        // 2. 마지막 확인 시간 가져오기 (이 시간 이후의 미션만 "New"로 간주)
        const lastCheckStr = localStorage.getItem(LAST_CHECK_KEY)
        const lastCheckTime = lastCheckStr ? parseInt(lastCheckStr) : Date.now() - (24 * 60 * 60 * 1000) // 기본값 24시간 전

        // 3. 브라우저 내부 이벤트 리스너 (기존 호환성 유지)
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

        const handleNewMissionCreated = (event: any) => {
            const { missionId } = event.detail || {}
            if (missionId) {
                setUnreadMissionIds(prev => {
                    if (prev.includes(missionId)) return prev
                    const updated = [...prev, missionId]
                    setUnreadMissions(updated)
                    return updated
                })
            }
        }

        // 4. Firestore 실시간 리스너 설정 (missions1, missions2, ai_mission)
        const collections = ["missions1", "missions2", "ai_mission"]
        const unsubscribes = collections.map(colName => {
            const q = query(
                collection(db, colName),
                orderBy("createdAt", "desc"),
                limit(5)
            )

            return onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const data = change.doc.data()
                        const missionId = change.doc.id
                        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now()

                        // 컴포넌트 마운트 시점 또는 마지막 확인 시점 이후에 생성된 것만 처리
                        if (createdAt > lastCheckTime) {
                            console.log(`[Notification] 실시간 새 미션 감지 (${colName}):`, missionId)
                            setUnreadMissionIds(prev => {
                                if (prev.includes(missionId)) return prev
                                const updated = [...prev, missionId]
                                setUnreadMissions(updated)
                                return updated
                            })
                        }
                    }
                })
            })
        })

        window.addEventListener('mark-missions-as-read', handleMarkAsRead)
        window.addEventListener('new-mission-created', handleNewMissionCreated)
        window.addEventListener('storage', (e) => {
            if (e.key === UNREAD_KEY && e.newValue) {
                setUnreadMissionIds(JSON.parse(e.newValue))
            }
        })

        return () => {
            unsubscribes.forEach(unsub => unsub())
            window.removeEventListener('mark-missions-as-read', handleMarkAsRead)
            window.removeEventListener('new-mission-created', handleNewMissionCreated)
        }
    }, [])

    /**
     * 미션을 읽음 처리
     */
    const markAsRead = (missionId: string) => {
        const updated = unreadMissionIds.filter(id => id !== missionId)
        setUnreadMissions(updated)
        setUnreadMissionIds(updated)
        // 마지막 확인 시간 업데이트
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
    }

    const markAllAsRead = () => {
        setUnreadMissions([])
        setUnreadMissionIds([])
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
    }

    return {
        unreadMissionIds,
        markAsRead,
        markAllAsRead,
        hasUnread: unreadMissionIds.length > 0
    }
}
