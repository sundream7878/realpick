import { useEffect, useState } from "react"
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { normalizeShowId } from "@/lib/constants/shows"

interface NewMissionData {
    id: string
    category: string
    showId: string
    createdAt: number
}

const UNREAD_KEY = "rp_unread_missions_v3" // 버전 업데이트
const LAST_CHECK_KEY = "rp_last_mission_check"

function getUnreadMissions(): NewMissionData[] {
    if (typeof window === "undefined") return []
    try {
        const stored = localStorage.getItem(UNREAD_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

function setUnreadMissions(missions: NewMissionData[]) {
    if (typeof window === "undefined") return
    localStorage.setItem(UNREAD_KEY, JSON.stringify(missions))
}

export function useNewMissionNotifications() {
    const [unreadMissions, setUnreadMissionsState] = useState<NewMissionData[]>([])

    useEffect(() => {
        const initialUnread = getUnreadMissions()
        setUnreadMissionsState(initialUnread)

        const lastCheckStr = localStorage.getItem(LAST_CHECK_KEY)
        const lastCheckTime = lastCheckStr ? parseInt(lastCheckStr) : Date.now() - (24 * 60 * 60 * 1000)

        // Firestore 실시간 리스너 (AI 미션은 missions1에 포함)
        const collections = ["missions1", "missions2"]
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

                        if (createdAt > lastCheckTime) {
                            // 💡 showId 정규화 추가 (한글 이름 대응)
                            const normalizedId = normalizeShowId(data.showId) || data.showId || ""
                            
                            console.log(`[Notification] 새 미션 상세 감지 (${colName}):`, { missionId, showId: normalizedId })
                            
                            setUnreadMissionsState(prev => {
                                if (prev.some(m => m.id === missionId)) return prev
                                const newMission: NewMissionData = {
                                    id: missionId,
                                    showId: normalizedId,
                                    category: data.category || "",
                                    createdAt
                                }
                                const updated = [...prev, newMission]
                                setUnreadMissions(updated)
                                return updated
                            })
                        }
                    }
                })
            })
        })

        const handleMarkAsRead = (event: any) => {
            const { missionIds } = event.detail || {}
            console.log('[useNewMissionNotifications] mark-missions-as-read 이벤트 수신:', missionIds)
            if (missionIds && missionIds.length > 0) {
                setUnreadMissionsState(prev => {
                    const updated = prev.filter(m => !missionIds.includes(m.id))
                    console.log(`[useNewMissionNotifications] 상태 업데이트: ${prev.length} -> ${updated.length}`)
                    setUnreadMissions(updated)
                    
                    // 읽음 처리 시 마지막 확인 시간 업데이트 (새로고침 시 다시 뜨는 것 방지)
                    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
                    
                    return updated
                })
            }
        }

        window.addEventListener('mark-missions-as-read', handleMarkAsRead)
        window.addEventListener('storage', (e) => {
            if (e.key === UNREAD_KEY && e.newValue) {
                setUnreadMissionsState(JSON.parse(e.newValue))
            }
        })

        return () => {
            unsubscribes.forEach(unsub => unsub())
            window.removeEventListener('mark-missions-as-read', handleMarkAsRead)
        }
    }, [])

    const markAsRead = (missionId: string) => {
        const updated = unreadMissions.filter(m => m.id !== missionId)
        setUnreadMissions(updated)
        setUnreadMissionsState(updated)
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
    }

    const markAllAsRead = () => {
        setUnreadMissions([])
        setUnreadMissionsState([])
        localStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
    }

    return {
        unreadMissions,
        unreadMissionIds: unreadMissions.map(m => m.id),
        markAsRead,
        markAllAsRead,
        hasUnread: unreadMissions.length > 0,
        getUnreadCountForShow: (showId: string) => unreadMissions.filter(m => m.showId === showId).length,
        getHasUnreadForCategory: (category: string) => unreadMissions.some(m => m.category === category)
    }
}
