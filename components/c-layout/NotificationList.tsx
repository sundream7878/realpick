"use client"

import { Settings, Check } from "lucide-react"
import { useNotifications, TNotification } from "@/hooks/useNotifications"
import { NotificationItem } from "./NotificationItem"
import { Button } from "@/components/c-ui/button"
import { useRouter } from "next/navigation"

interface NotificationListProps {
    onClose: () => void
}

export function NotificationList({ onClose }: NotificationListProps) {
    const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications()
    const router = useRouter()

    return (
        <div className="flex flex-col h-full max-h-[500px] w-[320px] sm:w-[380px] bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
                <h3 className="font-bold text-gray-900">알림</h3>
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-gray-500"
                        onClick={() => {
                            onClose();
                            router.push('/p-profile');
                        }}
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* 목록 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-white min-h-[200px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500">알림을 불러오는 중...</p>
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="flex flex-col">
                        {notifications.map((notification) => (
                            <NotificationItem 
                                key={notification.id} 
                                notification={notification} 
                                onClick={() => {
                                    console.log('[NotificationList] 알림 클릭 - id:', notification.id)
                                    markAsRead(notification.id)
                                    onClose()
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <button 
                            className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => {
                                onClose();
                                router.push('/p-profile');
                            }}
                        >
                            <Settings className="w-8 h-8 text-gray-300" />
                        </button>
                        <p className="text-gray-900 font-semibold mb-1">새로운 알림이 없습니다</p>
                        <p className="text-xs text-gray-500">새로운 미션이 등록되거나 참여하신 미션이 마감되면 알려드릴게요!</p>
                    </div>
                )}
            </div>

            {/* 푸터 (선택사항) */}
            {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-center">
                    <button className="text-[11px] text-gray-500 hover:text-gray-700 font-medium">
                        최근 30일간의 알림만 표시됩니다
                    </button>
                </div>
            )}
        </div>
    )
}

