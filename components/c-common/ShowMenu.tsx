"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { CATEGORIES, SHOWS, type TShowCategory, getShowById } from "@/lib/constants/shows"
import { useRouter, useSearchParams } from "next/navigation"
import BreathingLightBadge from "@/components/c-ui/BreathingLightBadge"
import type { TMission } from "@/types/t-vote/vote.types"
import { useNewMissionNotifications } from "@/hooks/useNewMissionNotifications"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"

interface TShowMenuProps {
    category: TShowCategory
    selectedShowId?: string | null
    onShowSelect?: (showId: string) => void
    activeShowIds?: Set<string>
    showStatuses?: Record<string, string>
    hasUnreadMissions?: boolean
    unreadMissionIds?: string[]
    missions?: TMission[]
    aliveCount?: number
    showCounts?: Record<string, number>
}

export function ShowMenu({ category, selectedShowId, onShowSelect, activeShowIds, showStatuses: initialShowStatuses, hasUnreadMissions, unreadMissionIds: propUnreadIds, missions, aliveCount, showCounts }: TShowMenuProps) {
    const { getUnreadCountForShow: getRealtimeUnreadCount, unreadMissionIds: hookUnreadIds, unreadMissions: hookUnreadMissions } = useNewMissionNotifications()
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const categoryInfo = CATEGORIES[category]
    const shows = SHOWS[category] || []
    
    // URL에서 category 파라미터 확인
    const urlCategory = searchParams.get('category')
    
    // Props와 Hook에서 온 ID들 통합
    const unreadMissionIds = Array.from(new Set([...(propUnreadIds || []), ...(hookUnreadIds || [])]))
    
    // 실시간 업데이트를 위한 상태
    const [showStatuses, setShowStatuses] = useState<Record<string, string>>(initialShowStatuses || {})
    const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
    const [customShows, setCustomShows] = useState<any[]>([])

    // 초기 showStatuses가 변경되면 동기화
    useEffect(() => {
        console.log('[ShowMenu] initialShowStatuses 변경 감지:', initialShowStatuses)
        if (initialShowStatuses) {
            setShowStatuses(initialShowStatuses)
            console.log('[ShowMenu] showStatuses 업데이트 완료:', initialShowStatuses)
        }
    }, [initialShowStatuses])

    // 실시간 업데이트 이벤트 리스너 및 데이터 로드
    useEffect(() => {
        console.log('[ShowMenu] setupShowStatusSync 초기화 시작')
        const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
        const cleanup = setupShowStatusSync(
            (statuses: Record<string, string>) => {
                console.log('[ShowMenu] showStatuses 업데이트됨:', statuses)
                setShowStatuses(statuses)
            },
            (visibility: Record<string, boolean>) => {
                console.log('[ShowMenu] showVisibility 업데이트됨:', visibility)
                setShowVisibility(visibility)
            },
            (shows: any[]) => {
                console.log('[ShowMenu] customShows 업데이트됨:', shows)
                setCustomShows(shows)
            }
        )

        return cleanup
    }, [])

    // 현재 카테고리에 선택된 쇼가 있는지 또는 카테고리 페이지인지 확인 (기본 쇼 + 커스텀 쇼 통합)
    const validCustomShows = Array.isArray(customShows) ? customShows : []
    const allShowsInCategory = [...shows, ...validCustomShows.filter(s => s.category === category)]
    const selectedShow = allShowsInCategory.find(s => s.id === selectedShowId)
    // 프로그램이 선택되었거나 카테고리 전체 페이지인 경우 활성화
    const isCategoryActive = !!selectedShow || urlCategory === category
    
    // 각 프로그램별 읽지 않은 미션 개수 계산 (실시간 감지 목록 + Props 통합)
    const getUnreadCountForShow = (showId: string) => {
        // 1. Hook에서 관리하는 실시간 미션들 중 해당 프로그램의 것
        const realtimeIds = hookUnreadMissions
            .filter(m => m.showId === showId)
            .map(m => m.id)
            
        // 2. Props로 전달된 미션들 중 해당 프로그램의 것
        const propIds = missions && propUnreadIds
            ? missions.filter(m => m.showId === showId && propUnreadIds.includes(m.id)).map(m => m.id)
            : []
            
        // 통합 (중복 제거)
        const combinedIds = Array.from(new Set([...realtimeIds, ...propIds]))
        
        if (combinedIds.length > 0) {
            console.log(`[ShowMenu] ${showId} unread count:`, combinedIds.length, combinedIds)
        }
        
        return combinedIds.length
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
        
        // 1. Props로 전달된 미션들 중 해당 프로그램의 미션들
        const unreadFromProps = missions 
            ? missions.filter(m => m.showId === showId && propUnreadIds?.includes(m.id)).map(m => m.id)
            : []
            
        // 2. Hook(실시간)에서 감지된 해당 프로그램의 미션들
        const unreadFromHook = hookUnreadMissions
            .filter(m => m.showId === showId)
            .map(m => m.id)
            
        const allUnreadIds = Array.from(new Set([...unreadFromProps, ...unreadFromHook]))
        
        if (allUnreadIds.length > 0) {
            window.dispatchEvent(new CustomEvent('mark-missions-as-read', {
                detail: { missionIds: allUnreadIds }
            }))
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
        if (nextState && (hasUnreadMissions || hookUnreadMissions.some(m => m.category === category))) {
            // 1. Props 기준
            const unreadFromProps = missions
                ? missions.filter(m => m.showId && getShowById(m.showId)?.category === category && propUnreadIds?.includes(m.id)).map(m => m.id)
                : []
            
            // 2. Hook 기준
            const unreadFromHook = hookUnreadMissions
                .filter(m => m.category === category)
                .map(m => m.id)
                
            const allUnreadIds = Array.from(new Set([...unreadFromProps, ...unreadFromHook]))
            
            if (allUnreadIds.length > 0) {
                window.dispatchEvent(new CustomEvent('mark-missions-as-read', {
                    detail: { missionIds: allUnreadIds }
                }))
            }
        }
    }
    
    // 카테고리 이모지 클릭 핸들러 (프로그램 필터 해제, 카테고리 전체 보기)
    const handleCategoryIconClick = (e: React.MouseEvent) => {
        e.stopPropagation() // 메뉴 토글 방지
        setIsOpen(false)
        
        // 카테고리 페이지로 이동 (프로그램 필터 없이)
        router.push(`/?category=${category}`)
    }

    return (
        <div className="relative z-50" ref={menuRef}>
            {/* 메뉴 버튼 */}
            <button
                onClick={toggleMenu}
                className={`
          relative flex items-center gap-1 sm:gap-1 md:gap-1.5 px-1 sm:px-1.5 md:px-2 py-1 sm:py-0.5 md:py-1 rounded-lg font-medium
          transition-all duration-200
          min-w-[45px] sm:min-w-[55px] md:min-w-[65px] lg:min-w-[75px]
          h-8 sm:h-auto
          cursor-pointer
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
                    className="hidden md:block w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 object-contain flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                    onClick={handleCategoryIconClick}
                    title={`${categoryInfo.description} 전체 미션 보기`}
                />
                <span className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm whitespace-nowrap flex-1 text-center md:text-left overflow-hidden text-ellipsis font-semibold">
                    {selectedShow ? selectedShow.displayName : (urlCategory === category ? categoryInfo.description : categoryInfo.description)}
                </span>
                <ChevronDown
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 lg:w-4 lg:h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />

                {/* 카테고리별 또는 선택된 프로그램별 살아있는 미션 개수 배지 (Trendy UI) */}
                {((isCategoryActive && selectedShowId && showCounts?.[selectedShowId]) || (!isCategoryActive && (aliveCount || 0) > 0)) && (
                    <div className="relative ml-1 flex-shrink-0">
                        <span className={`
                            inline-flex items-center justify-center 
                            min-w-[16px] h-[16px] md:min-w-[20px] md:h-[20px] px-1
                            text-[9px] md:text-[11px] font-bold text-white
                            ${isOpen || isCategoryActive ? 'bg-black/20' : 'bg-gray-100 text-gray-700'}
                            backdrop-blur-sm border border-white/20
                            rounded-full shadow-sm
                            transition-all duration-300
                            cursor-pointer
                        `}>
                            {isCategoryActive && selectedShowId ? (showCounts?.[selectedShowId] || 0) : (aliveCount || 0)}
                        </span>
                        {/* 새로운 미션(안 읽음)이 있을 경우 표시되는 포인트 도트 */}
                        {hasUnreadMissions && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
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
                            const getStatus = (id: string) => {
                                const status = showStatuses?.[id] || 'ACTIVE'
                                console.log(`[ShowMenu] ${id} 상태:`, status)
                                return status
                            }
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
                      ${shouldDisable 
                        ? 'text-gray-400 cursor-not-allowed opacity-60' 
                        : isSelected
                            ? 'bg-gray-50 font-bold text-gray-900 cursor-pointer'
                            : `text-gray-700 hover:bg-gradient-to-r ${theme.itemHover} cursor-pointer`
                      }
                    `}
                                >
                                    <span className="flex items-center gap-1">
                                        <span className="truncate">{show.displayName}</span>
                                        {isUpcoming && <span className="text-[10px] sm:text-xs text-gray-400 font-normal whitespace-nowrap">(예정)</span>}
                                        {isUndecided && <span className="text-[10px] sm:text-xs text-gray-400 font-normal whitespace-nowrap">(미정)</span>}
                                        
                                        <div className="flex items-center gap-1.5 ml-auto pl-2">
                                            {/* 프로그램별 살아있는 미션 개수 - 텍스트형 배지 */}
                                            {showCounts && showCounts[show.id] > 0 && (
                                                <span className={`
                                                    inline-flex items-center justify-center 
                                                    min-w-[16px] h-[16px] px-1 
                                                    text-[9px] font-bold 
                                                    ${isSelected ? 'text-gray-900 bg-gray-200' : 'text-gray-500 bg-gray-100'}
                                                    rounded-md transition-colors
                                                `}>
                                                    {showCounts[show.id]}
                                                </span>
                                            )}
                                            {/* 새로운 미션(안 읽음)이 있을 경우의 강렬한 레드 닷 */}
                                            {unreadCount > 0 && (
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                                </span>
                                            )}
                                        </div>
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
