"use client"

import { useState, useRef, useEffect } from "react"
import { Bell } from "lucide-react"
import { NotificationList } from "./NotificationList"
import { useNotifications } from "@/hooks/useNotifications"
import { isAuthenticated } from "@/lib/auth-utils"
import LoginModal from "@/components/c-login-modal/login-modal"

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const { unreadCount, markAllAsRead } = useNotifications()
    const containerRef = useRef<HTMLDivElement>(null)

    // 알림창 토글
    const handleToggle = () => {
        if (!isAuthenticated()) {
            setShowLoginModal(true)
            return
        }
        setIsOpen(!isOpen)
    }

    // 외부 클릭 시 닫기
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    return (
        <div className="relative" ref={containerRef}>
            {/* 종 아이콘 버튼 */}
            <button
                onClick={handleToggle}
                className={`
                    relative p-1 sm:p-1.5 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer
                    ${isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
            >
                <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-red-500 text-[8px] sm:text-[10px] font-bold text-white border-2 border-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* 알림 드롭다운 */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 z-[60]">
                    <NotificationList onClose={() => setIsOpen(false)} />
                </div>
            )}

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title="알림을 확인하고 싶다면?"
                description="로그인하고 나에게 온 알림을 확인해보세요!"
            />
        </div>
    )
}

