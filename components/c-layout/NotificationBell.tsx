"use client"

import { useState, useRef, useEffect } from "react"
import { Bell } from "lucide-react"
import { NotificationList } from "./NotificationList"
import { useNotifications } from "@/hooks/useNotifications"

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const { unreadCount } = useNotifications()
    const containerRef = useRef<HTMLDivElement>(null)

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
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    relative p-2 rounded-full transition-all duration-200
                    ${isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                `}
            >
                <Bell className="w-6 h-6" />
                
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[10px] sm:text-xs font-bold text-white border-2 border-white shadow-sm">
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
        </div>
    )
}

