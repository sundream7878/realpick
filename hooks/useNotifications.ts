"use client"

import { useEffect, useState } from "react"
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
            return
        }
        
        console.log('[useNotifications] 알림 가져오기 시작 - userId:', userId)
        setIsLoading(true)
        const data = await getNotifications(userId)
        console.log('[useNotifications] 가져온 알림 개수:', data.length)
        console.log('[useNotifications] 알림 데이터:', data)
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.isRead).length)
        setIsLoading(false)
    }

    useEffect(() => {
        if (!userId) {
            console.warn('[useNotifications] useEffect - userId가 없습니다')
            return
        }

        console.log('[useNotifications] useEffect 실행 - userId:', userId)
        fetchNotifications()
        deleteOldNotifications(userId)

        return () => {
            // 클린업 없음
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
            console.log('[useNotifications] 읽음 상태 업데이트 완료')
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

