"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserId } from "@/lib/auth-utils"

export interface TNotification {
    f_id: string
    f_user_id: string
    f_type: 'NEW_MISSION' | 'MISSION_CLOSED' | 'SYSTEM'
    f_title: string
    f_content: string
    f_mission_id?: string
    f_creator_id?: string
    f_is_read: boolean
    f_created_at: string
    creator?: {
        f_nickname: string
        f_avatar_url?: string
        f_tier?: string
    }
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<TNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const userId = getUserId()

    const fetchNotifications = async () => {
        if (!userId) return
        
        setIsLoading(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
            .from('t_notifications')
            .select(`
                *,
                creator:t_users!f_creator_id(f_nickname, f_avatar_url, f_tier)
            `)
            .eq('f_user_id', userId)
            .order('f_created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Failed to fetch notifications:', error)
        } else {
            setNotifications(data || [])
            setUnreadCount(data?.filter(n => !n.f_is_read).length || 0)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        if (!userId) return

        fetchNotifications()
        deleteOldNotifications() // 오래된 알림 삭제 실행

        const supabase = createClient()
        
        // Realtime 구독 임시 비활성화 (성능 최적화)
        console.log("[Notifications] Realtime 구독 임시 비활성화됨")
        
        // 빈 클린업 함수 반환
        return () => {
            // 클린업 없음
        }
        
        /* 기존 Realtime 구독 코드 임시 주석 처리
        const channel = supabase
            .channel(`user-notifications-${userId}`)
            .on('postgres_changes', ...)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        */
    }, [userId])

    const markAsRead = async (notificationId: string) => {
        if (!userId) return
        const supabase = createClient()
        
        const { error } = await supabase
            .from('t_notifications')
            .update({ f_is_read: true })
            .eq('f_id', notificationId)

        if (error) {
            console.error('Failed to mark notification as read:', error)
        } else {
            setNotifications(prev => 
                prev.map(n => n.f_id === notificationId ? { ...n, f_is_read: true } : n)
            )
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
    }

    const markAllAsRead = async () => {
        if (!userId) return
        const supabase = createClient()
        
        const { error } = await supabase
            .from('t_notifications')
            .update({ f_is_read: true })
            .eq('f_user_id', userId)
            .eq('f_is_read', false)

        if (error) {
            console.error('Failed to mark all notifications as read:', error)
        } else {
            setNotifications(prev => prev.map(n => ({ ...n, f_is_read: true })))
            setUnreadCount(0)
        }
    }

    /**
     * 30일이 지난 알림 자동 삭제
     */
    const deleteOldNotifications = async () => {
        if (!userId) return
        const supabase = createClient()
        
        // 한 달 전 날짜 계산
        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
        
        const { error } = await supabase
            .from('t_notifications')
            .delete()
            .eq('f_user_id', userId)
            .lt('f_created_at', oneMonthAgo.toISOString())

        if (error) {
            console.error('Failed to delete old notifications:', error)
        }
    }

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteOldNotifications,
        refresh: fetchNotifications
    }
}

