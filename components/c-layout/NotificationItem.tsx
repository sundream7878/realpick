"use client"

import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { TNotification } from "@/hooks/useNotifications"
import { TIERS } from "@/lib/utils/u-tier-system/tierSystem.util"
import { useRouter } from "next/navigation"

interface NotificationItemProps {
    notification: TNotification
    onClick: () => void
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
    const router = useRouter()
    const { f_type, f_title, f_content, f_mission_id, f_created_at, f_is_read, creator } = notification

    const handleItemClick = () => {
        onClick()
        if (f_mission_id) {
            const path = f_type === 'MISSION_CLOSED' 
                ? `/p-mission/${f_mission_id}/results` 
                : `/p-mission/${f_mission_id}/vote`
            router.push(path)
        }
    }

    const tierImage = creator?.f_tier 
        ? TIERS.find(t => t.name === creator.f_tier)?.characterImage || "/tier-rookie.png"
        : "/tier-rookie.png"

    return (
        <div 
            onClick={handleItemClick}
            className={`relative flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-0 ${!f_is_read ? 'bg-blue-50/60' : 'bg-white'}`}
        >
            {/* 안읽음 강조 왼쪽 바 */}
            {!f_is_read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
            )}

            {/* 좌측: 딜러 프로필 이미지 또는 시스템 아이콘 */}
            <div className="relative shrink-0 mt-1">
                <div className={`w-11 h-11 rounded-full overflow-hidden border-2 ${!f_is_read ? 'border-blue-400' : 'border-gray-100'} bg-white transition-colors duration-200`}>
                    <img 
                        src={creator?.f_avatar_url || tierImage} 
                        alt={creator?.f_nickname || "System"} 
                        className={`w-full h-full object-cover transition-all duration-300 ${f_is_read ? 'grayscale opacity-40' : 'grayscale-0 opacity-100'}`}
                    />
                </div>
                {!f_is_read && (
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                )}
            </div>

            {/* 우측: 내용 */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                    <p className={`text-sm leading-snug transition-colors duration-200 ${!f_is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-400'} line-clamp-2`}>
                        {f_title}
                    </p>
                </div>
                <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed transition-colors duration-200 ${!f_is_read ? 'text-gray-700' : 'text-gray-300'}`}>
                    {f_content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] transition-colors duration-200 ${!f_is_read ? 'text-gray-500' : 'text-gray-300'}`}>
                        {formatDistanceToNow(new Date(f_created_at), { addSuffix: true, locale: ko })}
                    </span>
                    {f_is_read && (
                        <span className="text-[10px] text-gray-300 font-medium">읽음</span>
                    )}
                </div>
            </div>
        </div>
    )
}

