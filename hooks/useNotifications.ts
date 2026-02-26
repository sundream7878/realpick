"use client"

import { useEffect, useState } from "react"
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/notifications"
import { getUserId } from "@/lib/auth-utils"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteOldNotifications, type TNotification } from "@/lib/firebase/notifications"

// TNotification을 re-export
export type { TNotification } from "@/lib/firebase/notifications"

export function useNotifications() {
    const [notifications, setNotifications] = useState<TNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const userId = getUserId()

    const fetchNotifications = async () => {
        if (!userId) {
            console.warn('[useNotifications] userId가 없습니다')
            setIsLoading(false)
            return
        }
        
        console.log('[useNotifications] 알림 가져오기 시작 - userId:', userId)
        setIsLoading(true)
        const data = await getNotifications(userId)
        console.log('[useNotifications] 가져온 알림 개수:', data.length)
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.isRead).length)
        setIsLoading(false)
    }

    useEffect(() => {
        if (!userId) {
            console.warn('[useNotifications] useEffect - userId가 없습니다')
            setNotifications([])
            setUnreadCount(0)
            setIsLoading(false)
            return
        }

        console.log('[useNotifications] 실시간 리스너 설정 - userId:', userId)
        setIsLoading(true)
        
        // 1. 초기 데이터 로드 및 이전 알림 삭제
        deleteOldNotifications(userId)

        // 2. Firestore 실시간 리스너 설정
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(20)
        )

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            console.log('[useNotifications] 실시간 업데이트 감지 - 문서 개수:', snapshot.docs.length)
            
            const { getUser } = await import("@/lib/firebase/users")
            
            const updatedNotifications = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data()
                const notification: TNotification = {
                    id: docSnapshot.id,
                    userId: data.userId,
                    type: data.type,
                    title: data.title,
                    content: data.content,
                    missionId: data.missionId || data.mission_id,
                    creatorId: data.creatorId,
                    isRead: data.isRead || false,
                    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
                }

                if (data.creatorId) {
                    const creator = await getUser(data.creatorId)
                    if (creator) {
                        notification.creator = {
                            nickname: creator.nickname,
                            tier: creator.tier
                        }
                    }
                }

                return notification
            }))

            setNotifications(updatedNotifications)
            setUnreadCount(updatedNotifications.filter(n => !n.isRead).length)
            setIsLoading(false)
        }, (error) => {
            console.error('[useNotifications] 실시간 리스너 오류:', error)
            setIsLoading(false)
            // 오류 발생 시 폴백으로 1회성 가져오기 시도
            fetchNotifications()
        })

        // 3. 다른 인스턴스에서의 업데이트 감지 (수동 리프레시용)
        const handleRefresh = () => {
            console.log('[useNotifications] 알림 업데이트 이벤트 수신, 리프레시 실행')
            fetchNotifications()
        }

        window.addEventListener('notifications-updated', handleRefresh)

        return () => {
            console.log('[useNotifications] 실시간 리스너 해제')
            unsubscribe()
            window.removeEventListener('notifications-updated', handleRefresh)
        }
    }, [userId])

    const markAsRead = async (notificationId: string) => {
        if (!userId) {
            console.warn('[useNotifications] markAsRead - userId가 없습니다')
            return
        }
        
        console.log('[useNotifications] markAsRead 시작 - notificationId:', notificationId)
        const success = await markNotificationAsRead(notificationId)
        console.log('[useNotifications] markAsRead 결과:', success)

        if (success) {
            setNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
            
            // 다른 인스턴스에 알림
            window.dispatchEvent(new CustomEvent('notifications-updated'))
            console.log('[useNotifications] 읽음 상태 업데이트 완료 및 이벤트 발송')
        } else {
            console.error('[useNotifications] 읽음 상태 업데이트 실패')
        }
    }

    const markAllAsRead = async () => {
        if (!userId) return
        const success = await markAllNotificationsAsRead(userId)

        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
            setUnreadCount(0)
            
            // 다른 인스턴스에 알림
            window.dispatchEvent(new CustomEvent('notifications-updated'))
        }
    }

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteOldNotifications: () => userId && deleteOldNotifications(userId),
        refresh: fetchNotifications
    }
}

