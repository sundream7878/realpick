"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/c-ui/button"
import { User } from "lucide-react"
import { ShowMenu } from "@/components/c-common/ShowMenu"
import { UserInfo } from "@/components/c-common/UserInfo"
import { PointHistoryModal } from "@/components/c-common/PointHistoryModal"
import LoginModal from "@/components/c-login-modal/login-modal"
import { isAuthenticated } from "@/lib/auth-utils"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { useNewMissionNotifications } from "@/hooks/useNewMissionNotifications"
import { getShowById } from "@/lib/constants/shows"
import type { TMission } from "@/types/t-vote/vote.types"
import { NotificationBell } from "./NotificationBell"

interface TAppHeaderProps {
  selectedShow: "나는솔로" | "돌싱글즈"
  onShowChange: (show: "나는솔로" | "돌싱글즈") => void
  userNickname: string
  userPoints: number
  userTier: TTierInfo
  onAvatarClick?: () => void
  logoClassName?: string
  className?: string
  selectedShowId?: string | null
  onShowSelect?: (showId: string) => void
  activeShowIds?: Set<string>
  showStatuses?: Record<string, string>
  missions?: TMission[]
}


export function AppHeader({
  selectedShow,
  onShowChange,
  userNickname,
  userPoints,
  userTier,
  onAvatarClick,
  logoClassName = "w-auto cursor-pointer hover:opacity-80 transition-opacity h-10 sm:h-12 md:h-14 lg:h-16",
  className = "",
  selectedShowId,
  onShowSelect,
  activeShowIds,
  showStatuses,
  missions = [],
}: TAppHeaderProps) {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPointHistoryModal, setShowPointHistoryModal] = useState(false)
  const { unreadMissionIds, getHasUnreadForCategory } = useNewMissionNotifications()

  // 각 카테고리별 읽지 않은 미션 개수 계산 (메모리상의 미션 목록 + 실시간 감지 목록 통합 체크)
  const hasUnreadLove = getHasUnreadForCategory("LOVE") || missions.some(m => m.showId && unreadMissionIds.includes(m.id) && getShowById(m.showId)?.category === "LOVE")
  const hasUnreadVictory = getHasUnreadForCategory("VICTORY") || missions.some(m => m.showId && unreadMissionIds.includes(m.id) && getShowById(m.showId)?.category === "VICTORY")
  const hasUnreadStar = getHasUnreadForCategory("STAR") || missions.some(m => m.showId && unreadMissionIds.includes(m.id) && getShowById(m.showId)?.category === "STAR")

  useEffect(() => {
    setIsLoggedIn(isAuthenticated())

    const handleAuthChange = () => {
      setIsLoggedIn(isAuthenticated())
    }

    window.addEventListener("auth-change", handleAuthChange)
    window.addEventListener("storage", handleAuthChange)

    return () => {
      window.removeEventListener("auth-change", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
    }
  }, [])

  return (
    <header
      className={`md:sticky md:top-0 z-50 bg-white border-b border-gray-200 h-14 sm:h-16 md:h-18 lg:h-20 shadow-sm ${className}`}
    >
      <div className="mx-auto px-4 sm:px-6 h-full max-w-[1600px] relative">
        <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
          {/* 좌측 - 로고 영역 (사이드바 너비와 맞추어 메뉴 시작점 정렬) */}
          <div className="flex-shrink-0 w-[60px] xs:w-[80px] md:w-[264px] flex items-center justify-start z-10">
            <img 
              src="/realpick-logo-new.png" 
              alt="리얼픽" 
              className="w-auto cursor-pointer hover:opacity-80 transition-opacity h-8 sm:h-10 md:h-14 lg:h-16"
              onClick={() => {
                const homeUrl = selectedShowId ? `/?show=${selectedShowId}` : "/"
                router.push(homeUrl)
              }}
            />
          </div>

          {/* 중앙 - 3대 메인 메뉴 (사이드바 끝나는 지점부터 시작되도록 배치) */}
          <div className="flex-1 flex items-center justify-start gap-0.5 sm:gap-2 md:gap-4 lg:gap-6 z-0 min-w-0">
            <ShowMenu 
              category="LOVE" 
              selectedShowId={selectedShowId} 
              onShowSelect={onShowSelect} 
              activeShowIds={activeShowIds} 
              showStatuses={showStatuses} 
              hasUnreadMissions={hasUnreadLove}
              unreadMissionIds={unreadMissionIds}
              missions={missions}
            />
            <ShowMenu 
              category="VICTORY" 
              selectedShowId={selectedShowId} 
              onShowSelect={onShowSelect} 
              activeShowIds={activeShowIds} 
              showStatuses={showStatuses} 
              hasUnreadMissions={hasUnreadVictory}
              unreadMissionIds={unreadMissionIds}
              missions={missions}
            />
            <ShowMenu 
              category="STAR" 
              selectedShowId={selectedShowId} 
              onShowSelect={onShowSelect} 
              activeShowIds={activeShowIds} 
              showStatuses={showStatuses} 
              hasUnreadMissions={hasUnreadStar}
              unreadMissionIds={unreadMissionIds}
              missions={missions}
            />
          </div>

          {/* 우측 - 알림/프로필/로그인 (줄바꿈 방지 및 충분한 공간 확보) */}
          <div className="flex-shrink-0 flex items-center justify-end z-10 gap-1 sm:gap-2 ml-auto min-w-fit">
            {isLoggedIn ? (
              <>
                <NotificationBell />
                <div className="hidden lg:block whitespace-nowrap">
                  <UserInfo
                    nickname={userNickname}
                    points={userPoints}
                    tier={userTier}
                    onAvatarClick={onAvatarClick}
                    onPointsClick={() => setShowPointHistoryModal(true)}
                    showFullInfo={true}
                  />
                </div>
                <button
                  onClick={onAvatarClick}
                  className="lg:hidden relative p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <img 
                    src={userTier?.characterImage || "/placeholder.svg"} 
                    alt={userNickname || userTier?.name || "User"}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain border border-gray-200"
                  />
                  {/* 등급명 배지 (모바일) */}
                  <span className="absolute -bottom-0.5 -right-0.5 text-[7px] sm:text-[8px] text-pink-600 font-semibold bg-white px-0.5 py-0.5 rounded-full border border-pink-200 shadow-sm whitespace-nowrap leading-none">
                    {userTier?.name}
                  </span>
                </button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoginModal(true)}
                className="border-[#3E757B]/30 text-[#3E757B] hover:bg-[#3E757B]/10 bg-white text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8 whitespace-nowrap"
              >
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                <span className="hidden sm:inline">로그인</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => setShowLoginModal(false)}
      />

      <PointHistoryModal
        isOpen={showPointHistoryModal}
        onClose={() => setShowPointHistoryModal(false)}
        totalPoints={userPoints}
      />
    </header>
  )
}
