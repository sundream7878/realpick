"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { CATEGORIES, SHOWS, type TShowCategory } from "@/lib/constants/shows"
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

    // 초기 showStatuses가 변경되면 동기화
    useEffect(() => {
        if (initialShowStatuses) {
            setShowStatuses(initialShowStatuses)
        }
    }, [initialShowStatuses])

    // 프로그램 가시성 로드
    useEffect(() => {
        const loadVisibility = async () => {
            try {
                const response = await fetch('/api/public/shows/visibility')
                if (response.ok) {
                    const data = await response.json()
                    setShowVisibility(data.visibility || {})
                }
            } catch (error) {
                console.error("Failed to load show visibility:", error)
            }
        }
        loadVisibility()
    }, [])

    // 실시간 업데이트 이벤트 리스너
    useEffect(() => {
        const handleStatusUpdate = (event: any) => {
            const { statuses } = event.detail || {}
            if (statuses) {
                setShowStatuses(statuses)
            }
        }

        const handleVisibilityUpdate = (event: any) => {
            const { visibility } = event.detail || {}
            if (visibility) {
                setShowVisibility(visibility)
            }
        }

        window.addEventListener('show-statuses-updated', handleStatusUpdate)
        window.addEventListener('show-visibility-updated', handleVisibilityUpdate)

        return () => {
            window.removeEventListener('show-statuses-updated', handleStatusUpdate)
            window.removeEventListener('show-visibility-updated', handleVisibilityUpdate)
        }
    }, [])

    // 현재 카테고리에 선택된 쇼가 있는지 확인
    const selectedShow = shows.find(s => s.id === selectedShowId)
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

    return (
        <div className="relative z-50" ref={menuRef}>
            {/* 메뉴 버튼 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          relative flex items-center gap-1.5 sm:gap-2 md:gap-2.5 px-2 sm:px-3 md:px-4 py-0.5 sm:py-0.5 md:py-1 rounded-lg font-medium
          transition-all duration-200
          min-w-[65px] sm:min-w-[75px] md:min-w-[85px] lg:min-w-[95px]
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
                    className="hidden md:block w-7 h-7 md:w-9 md:h-9 lg:w-11 lg:h-11 object-contain flex-shrink-0"
                />
                <span className="text-[10px] sm:text-xs md:text-sm lg:text-base whitespace-nowrap flex-1 text-center md:text-left overflow-hidden text-ellipsis font-semibold">
                    {selectedShow ? selectedShow.displayName : categoryInfo.description}
                </span>
                <ChevronDown
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />

                {/* 읽지 않은 미션 배지 - 버튼 내부 우측에 위치 */}
                {hasUnreadMissions && (
                    <div className="ml-0.5 flex-shrink-0 scale-90 sm:scale-100">
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
                        {shows.filter(show => showVisibility[show.id] !== false).slice().sort((a, b) => {
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
                                    {isSelected && (
                                        <div className={`w-1.5 h-1.5 rounded-full ${(() => {
                                            // 카테고리별 선택 표시 색상 추출
                                            switch(category) {
                                                case "LOVE":
                                                    return "bg-rose-500"
                                                case "VICTORY":
                                                    return "bg-blue-600"
                                                case "STAR":
                                                    return "bg-yellow-400"
                                                default:
                                                    return "bg-rose-500"
                                            }
                                        })()}`} />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
