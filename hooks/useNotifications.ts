"use client"

import { useEffect, useState } from "react"
import { getUserId } from "@/lib/auth-utils"
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteOldNotifications, type TNotification } from "@/lib/firebase/notifications"

export function useNotifications() {
    const [notifications, setNotifications] = useState<TNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const userId = getUserId()

    const fetchNotifications = async () => {
        if (!userId) return
        
        setIsLoading(true)
        const data = await getNotifications(userId)
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.isRead).length)
        setIsLoading(false)
    }

    useEffect(() => {
        if (!userId) return

        fetchNotifications()
        deleteOldNotifications(userId)

        return () => {
            // 클린업 없음
        }
    }, [userId])

    const markAsRead = async (notificationId: string) => {
        if (!userId) return
        const success = await markNotificationAsRead(notificationId)

        if (success) {
            setNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
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

