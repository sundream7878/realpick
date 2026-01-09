"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { CATEGORIES, SHOWS, type TShowCategory, getShowById } from "@/lib/constants/shows"
import { useRouter } from "next/navigation"
import BreathingLightBadge from "@/components/c-ui/BreathingLightBadge"
import type { TMission } from "@/types/t-vote/vote.types"

interface TShowMenuProps {
    category: TShowCategory
    selectedShowId?: string | null
    onShowSelect?: (showId: string) => void
    activeShowIds?: Set<string>
    showStatuses?: Record<string, string>
    hasUnreadMissions?: boolean
    unreadMissionIds?: string[]
    missions?: TMission[]
}

export function ShowMenu({ category, selectedShowId, onShowSelect, activeShowIds, showStatuses: initialShowStatuses, hasUnreadMissions, unreadMissionIds, missions }: TShowMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const categoryInfo = CATEGORIES[category]
    const shows = SHOWS[category] || []
    
    // 실시간 업데이트를 위한 상태
    const [showStatuses, setShowStatuses] = useState<Record<string, string>>(initialShowStatuses || {})
    const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
    const [customShows, setCustomShows] = useState<any[]>([])

    // 초기 showStatuses가 변경되면 동기화
    useEffect(() => {
        if (initialShowStatuses) {
            setShowStatuses(initialShowStatuses)
        }
    }, [initialShowStatuses])

    // 실시간 업데이트 이벤트 리스너 및 데이터 로드
    useEffect(() => {
        const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
        const cleanup = setupShowStatusSync(
            setShowStatuses,
            setShowVisibility,
            setCustomShows
        )

        return cleanup
    }, [])

    // 현재 카테고리에 선택된 쇼가 있는지 확인 (기본 쇼 + 커스텀 쇼 통합)
    const allShowsInCategory = [...shows, ...customShows.filter(s => s.category === category)]
    const selectedShow = allShowsInCategory.find(s => s.id === selectedShowId)
    const isCategoryActive = !!selectedShow
    
    // 각 프로그램별 읽지 않은 미션 개수 계산
    const getUnreadCountForShow = (showId: string) => {
        if (!missions || !unreadMissionIds) return 0
        return missions.filter(m => m.showId === showId && unreadMissionIds.includes(m.id)).length
    }

    // 외부 클릭 감지
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

    const handleShowClick = (showId: string) => {
        setIsOpen(false)
        
        // 해당 프로그램의 모든 읽지 않은 미션들을 읽음 처리
        if (unreadMissionIds && missions) {
            const unreadIdsForShow = missions
                .filter(m => m.showId === showId && unreadMissionIds.includes(m.id))
                .map(m => m.id)
            
            if (unreadIdsForShow.length > 0) {
                // 이벤트를 발생시켜 useNewMissionNotifications에서 상태 업데이트 유도
                window.dispatchEvent(new CustomEvent('mark-missions-as-read', {
                    detail: { missionIds: unreadIdsForShow }
                }))
            }
        }

        if (onShowSelect) {
            onShowSelect(showId)
        }
    }

    const getThemeColors = (cat: TShowCategory) => {
        switch (cat) {
            case "LOVE":
                return {
                    buttonOpen: "bg-gradient-to-r from-rose-500 to-pink-500",
                    itemHover: "hover:from-rose-50 hover:to-pink-50 hover:text-rose-600"
                }
            case "VICTORY":
                return {
                    buttonOpen: "bg-gradient-to-r from-blue-600 to-cyan-500",
                    itemHover: "hover:from-blue-50 hover:to-cyan-50 hover:text-blue-600"
                }
            case "STAR":
                return {
                    buttonOpen: "bg-gradient-to-r from-yellow-400 to-orange-400",
                    itemHover: "hover:from-yellow-50 hover:to-orange-50 hover:text-orange-600"
                }
            default:
                return {
                    buttonOpen: "bg-gradient-to-r from-rose-500 to-pink-500",
                    itemHover: "hover:from-rose-50 hover:to-pink-50 hover:text-rose-600"
                }
        }
    }

    const theme = getThemeColors(category)

    const toggleMenu = () => {
        const nextState = !isOpen
        setIsOpen(nextState)
        
        // 메뉴를 열 때 해당 카테고리의 모든 미션을 읽음 처리
        if (nextState && hasUnreadMissions && unreadMissionIds && missions) {
            const unreadIdsForCategory = missions
                .filter(m => m.showId && getShowById(m.showId)?.category === category && unreadMissionIds.includes(m.id))
                .map(m => m.id)
            
            if (unreadIdsForCategory.length > 0) {
                window.dispatchEvent(new CustomEvent('mark-missions-as-read', {
                    detail: { missionIds: unreadIdsForCategory }
                }))
            }
        }
    }

    return (
        <div className="relative z-50" ref={menuRef}>
            {/* 메뉴 버튼 */}
            <button
                onClick={toggleMenu}
                className={`
          relative flex items-center gap-1 sm:gap-1.5 md:gap-2 px-1.5 sm:px-2 md:px-3 py-1 sm:py-0.5 md:py-1 rounded-lg font-medium
          transition-all duration-200
          min-w-[50px] sm:min-w-[60px] md:min-w-[75px] lg:min-w-[85px]
          h-9 sm:h-auto
          ${isOpen || isCategoryActive
                        ? `${theme.buttonOpen} text-white shadow-lg`
                        : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md"
                    }
        `}
            >
                {/* 모바일: 텍스트만, 데스크톱: 아이콘 + 텍스트 */}
                <img
                    src={(categoryInfo as any).iconPath}
                    alt={categoryInfo.label}
                    className="hidden md:block w-6 h-6 md:w-7 md:h-7 lg:w-9 lg:h-9 object-contain flex-shrink-0"
                />
                <span className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm whitespace-nowrap flex-1 text-center md:text-left overflow-hidden text-ellipsis font-semibold">
                    {selectedShow ? selectedShow.displayName : categoryInfo.description}
                </span>
                <ChevronDown
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />

                {/* 읽지 않은 미션 배지 - 버튼 내부 우측에 위치 */}
                {hasUnreadMissions && (
                    <div className="ml-0.5 flex-shrink-0 scale-75 sm:scale-90">
                        <BreathingLightBadge />
                    </div>
                )}
            </button>

            {/* 드롭다운 메뉴 */}
            {isOpen && (
                <div
                    className="
            absolute top-full left-0 mt-1 w-36 sm:w-44 md:w-52
            bg-white rounded-lg shadow-xl border border-gray-100
            animate-in fade-in slide-in-from-top-2 duration-200
            z-[100]
          "
                >
                    {/* 프로그램 목록 (헤더 제거) */}
                    {/* 프로그램 목록 (헤더 제거) */}
                    <div className="py-1 sm:py-1.5">
                        {allShowsInCategory.filter(show => showVisibility[show.id] !== false).slice().sort((a, b) => {
                            // Status Priority: ACTIVE (0) > UNDECIDED (1) > UPCOMING (2)
                            const getStatus = (id: string) => showStatuses?.[id] || 'ACTIVE'
                            const getPriority = (status: string) => {
                                if (status === 'ACTIVE') return 0
                                if (status === 'UNDECIDED') return 1
                                if (status === 'UPCOMING') return 2
                                return 0
                            }

                            const priorityA = getPriority(getStatus(a.id))
                            const priorityB = getPriority(getStatus(b.id))

                            if (priorityA !== priorityB) return priorityA - priorityB

                            // Fallback to legacy logic if priorities are equal (e.g. both ACTIVE)
                            // Keep original order or use activeShowIds if needed
                            return 0
                        }).map((show) => {
                            const status = showStatuses?.[show.id] || 'ACTIVE'
                            const isUpcoming = status === 'UPCOMING'
                            const isUndecided = status === 'UNDECIDED'
                            const isActive = status === 'ACTIVE'

                            // Legacy fallback: if specific shows were hardcoded as inactive, we can keep that logic OR rely entirely on admin.
                            // User asked to "set in admin", so we rely on admin.
                            // Default is ACTIVE.

                            const shouldDisable = !isActive
                            const isSelected = show.id === selectedShowId
                            const unreadCount = getUnreadCountForShow(show.id)

                            return (
                                <button
                                    key={show.id}
                                    onClick={() => !shouldDisable && handleShowClick(show.id)}
                                    disabled={shouldDisable}
                                    className={`
                      relative w-full px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm
                      transition-all duration-150
                      flex items-center justify-between
                      ${isSelected
                                            ? 'bg-gray-50 font-bold text-gray-900'
                                            : shouldDisable
                                                ? 'text-gray-400 cursor-not-allowed opacity-60'
                                                : `text-gray-700 hover:bg-gradient-to-r ${theme.itemHover}`
                                        }
                    `}
                                >
                                    <span className="flex items-center gap-1">
                                        <span className="truncate">{show.displayName}</span>
                                        {isUpcoming && <span className="text-[10px] sm:text-xs text-gray-400 font-normal whitespace-nowrap">(예정)</span>}
                                        {isUndecided && <span className="text-[10px] sm:text-xs text-gray-400 font-normal whitespace-nowrap">(미정)</span>}
                                        {/* 프로그램별 읽지 않은 미션 배지 - 크기 축소 */}
                                        {unreadCount > 0 && (
                                            <span className="inline-flex items-center justify-center min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-[16px] px-0.5 sm:px-1 text-[8px] sm:text-[9px] font-bold text-white bg-red-500 rounded-full animate-pulse">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
