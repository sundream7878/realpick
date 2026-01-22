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
    const { type, title, content, missionId, createdAt, isRead, creator } = notification

    const handleItemClick = (e: React.MouseEvent) => {
        // 이벤트 전파 및 기본 동작 방지
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[NotificationItem] 클릭 이벤트 발생 - missionId:', missionId);
        console.log('[NotificationItem] 전체 notification 데이터:', notification);
        
        // 1. 안 읽은 알림일 경우에만 읽음 처리 실행
        if (!isRead) {
            console.log('[NotificationItem] 읽음 처리 호출');
            onClick();
        }
        
        // 2. 페이지 이동 (읽음 여부와 상관없이 항상 실행)
        // missionId가 직접 없을 경우를 대비해 한 번 더 체크
        const finalMissionId = missionId || (notification as any).mission_id;

        if (finalMissionId) {
            const path = (type === 'MISSION_CLOSED' || type === 'MISSION_SETTLED' || type === 'mission_settled' || type === 'mission_closed')
                ? `/p-mission/${finalMissionId}/results` 
                : `/p-mission/${finalMissionId}/vote`;
            
            console.log('[NotificationItem] 페이지 이동 시도:', path);
            
            // Next.js router와 window.location 둘 다 시도
            try {
                router.push(path);
            } catch (err) {
                console.error('[NotificationItem] router.push 실패, window.location 사용:', err);
                window.location.href = path;
            }
        } else {
            console.error('[NotificationItem] missionId가 없어 이동할 수 없습니다. 데이터 구조를 확인해주세요.');
        }
    };

    const tierImage = creator?.tier 
        ? (TIERS.find(t => t.name === creator.tier)?.characterImage || "/tier-rookie.png")
        : "/tier-rookie.png"

    return (
        <div 
            onClick={handleItemClick}
            className={`relative flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-0 ${!isRead ? 'bg-blue-50/60' : 'bg-white'}`}
        >
            {/* 안읽음 강조 왼쪽 바 */}
            {!isRead && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
            )}

            {/* 좌측: 딜러 프로필 이미지 또는 시스템 아이콘 */}
            <div className="relative shrink-0 mt-1">
                <div className={`w-11 h-11 rounded-full overflow-hidden border-2 ${!isRead ? 'border-blue-400' : 'border-gray-100'} bg-white transition-colors duration-200`}>
                    <img 
                        src={creator?.avatarUrl || tierImage} 
                        alt={creator?.nickname || "System"} 
                        className={`w-full h-full object-cover transition-all duration-300 ${isRead ? 'grayscale opacity-40' : 'grayscale-0 opacity-100'}`}
                    />
                </div>
                {!isRead && (
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>
                )}
            </div>

            {/* 우측: 내용 */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                    <p className={`text-sm leading-snug transition-colors duration-200 ${!isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-400'} line-clamp-2`}>
                        {title}
                    </p>
                </div>
                <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed transition-colors duration-200 ${!isRead ? 'text-gray-700' : 'text-gray-300'}`}>
                    {content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] transition-colors duration-200 ${!isRead ? 'text-gray-500' : 'text-gray-300'}`}>
                        {(() => {
                            try {
                                // createdAt이 문자열인 경우 (ISO 형식)
                                const date = new Date(createdAt)
                                if (isNaN(date.getTime())) {
                                    return '방금 전'
                                }
                                return formatDistanceToNow(date, { addSuffix: true, locale: ko })
                            } catch (error) {
                                console.error('[NotificationItem] 날짜 포맷 에러:', error)
                                return '방금 전'
                            }
                        })()}
                    </span>
                    {isRead && (
                        <span className="text-[10px] text-gray-300 font-medium">읽음</span>
                    )}
                </div>
            </div>
        </div>
    )
}

