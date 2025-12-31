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
  const { unreadMissionIds } = useNewMissionNotifications()

  //  각 카테고리별 읽지 않은 미션 개수 계산
  const hasUnreadLove = missions.some(m => m.showId && unreadMissionIds.includes(m.id) && getShowById(m.showId)?.category === "LOVE")
  const hasUnreadVictory = missions.some(m => m.showId && unreadMissionIds.includes(m.id) && getShowById(m.showId)?.category === "VICTORY")
  const hasUnreadStar = missions.some(m => m.showId && unreadMissionIds.includes(m.id) && getShowById(m.showId)?.category === "STAR")

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
      <div className="mx-auto px-2 sm:px-3 md:px-4 lg:px-6 h-full max-w-full">
        <div className="grid grid-cols-3 items-center h-full gap-2">
          {/* 좌측 - 로고 */}
          <div className="flex items-center justify-start">
            <img 
              src="/realpick-logo-new.png" 
              alt="리얼픽" 
              className={logoClassName}
              onClick={() => {
                const homeUrl = selectedShowId ? `/?show=${selectedShowId}` : "/"
                router.push(homeUrl)
              }}
            />
          </div>

          {/* 중앙 - 3대 메인 메뉴 */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
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

          {/* 우측 - 로그인 상태에 따라 다르게 표시 (모바일에서는 숨김) */}
          <div className="hidden md:flex items-center justify-end">
            {isLoggedIn ? (
              <UserInfo
                nickname={userNickname}
                points={userPoints}
                tier={userTier}
                onAvatarClick={onAvatarClick}
                onPointsClick={() => setShowPointHistoryModal(true)}
                showFullInfo={true}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoginModal(true)}
                className="border-[#3E757B]/30 text-[#3E757B] hover:bg-[#3E757B]/10 bg-white text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-5 h-9 sm:h-10 md:h-11 whitespace-nowrap"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 mr-1 sm:mr-1.5 md:mr-2" />
                로그인
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
