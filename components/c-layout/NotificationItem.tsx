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
            className={`flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0 ${!f_is_read ? 'bg-blue-50/30' : ''}`}
        >
            {/* 좌측: 딜러 프로필 이미지 또는 시스템 아이콘 */}
            <div className="relative shrink-0 mt-1 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-white">
                    <img 
                        src={creator?.f_avatar_url || tierImage} 
                        alt={creator?.f_nickname || "System"} 
                        className="w-full h-full object-cover"
                    />
                </div>
                <span className="text-[10px] text-gray-500 mt-1 font-medium truncate w-12 text-center">
                    {creator?.f_nickname || "시스템"}
                </span>
                {!f_is_read && (
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"></div>
                )}
            </div>

            {/* 우측: 내용 */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                    <p className={`text-sm ${!f_is_read ? 'font-bold' : 'font-medium'} text-gray-900 line-clamp-2`}>
                        {f_title}
                    </p>
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                    {f_content}
                </p>
                <span className="text-[10px] text-gray-400 mt-2 block">
                    {formatDistanceToNow(new Date(f_created_at), { addSuffix: true, locale: ko })}
                </span>
            </div>
        </div>
    )
}

