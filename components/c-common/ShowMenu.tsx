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

export function ShowMenu({ category, selectedShowId, onShowSelect, activeShowIds, showStatuses, hasUnreadMissions, unreadMissionIds, missions }: TShowMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const categoryInfo = CATEGORIES[category]
    const shows = SHOWS[category] || []

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
        <div className="relative" ref={menuRef}>
            {/* 메뉴 버튼 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm
          transition-all duration-200 overflow-visible
          ${isOpen || isCategoryActive
                        ? `${theme.buttonOpen} text-white shadow-lg`
                        : "bg-white/70 text-gray-700 hover:bg-white hover:shadow-md"
                    }
        `}
            >
                {/* 모바일: 텍스트만, 데스크톱: 아이콘 + 텍스트 */}
                <img
                    src={(categoryInfo as any).iconPath}
                    alt={categoryInfo.label}
                    className="hidden sm:block w-7 h-7 object-contain"
                />
                <span className="text-sm sm:text-base whitespace-nowrap">
                    {selectedShow ? selectedShow.displayName : (isOpen ? categoryInfo.label : categoryInfo.description)}
                </span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />

                {/* 읽지 않은 미션 배지 - 버튼 내부 우측에 위치 */}
                {hasUnreadMissions && (
                    <div className="ml-1 flex-shrink-0">
                        <BreathingLightBadge />
                    </div>
                )}
            </button>

            {/* 드롭다운 메뉴 */}
            {isOpen && (
                <div
                    className="
            absolute top-full left-0 mt-2 w-56
            bg-white rounded-xl shadow-2xl border border-gray-100
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
            z-50
          "
                >
                    {/* 프로그램 목록 (헤더 제거) */}
                    {/* 프로그램 목록 (헤더 제거) */}
                    <div className="py-2 max-h-96 overflow-y-auto">
                        {shows.slice().sort((a, b) => {
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
                      relative w-full px-4 py-2.5 text-left text-sm
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
                                    <span className="flex items-center gap-1.5">
                                        {show.displayName}
                                        {isUpcoming && <span className="ml-1 text-xs text-gray-400 font-normal">(예정)</span>}
                                        {isUndecided && <span className="ml-1 text-xs text-gray-400 font-normal">(미정)</span>}
                                        {/* 프로그램별 읽지 않은 미션 배지 - 크기 50% 축소 */}
                                        {unreadCount > 0 && (
                                            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
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
