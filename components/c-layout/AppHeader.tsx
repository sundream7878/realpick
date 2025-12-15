"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/c-ui/button"
import { User } from "lucide-react"
import { ShowMenu } from "@/components/c-common/ShowMenu"
import { UserInfo } from "@/components/c-common/UserInfo"
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
  logoClassName = "w-auto cursor-pointer hover:opacity-80 transition-opacity h-8 sm:h-10 md:h-14",
  className = "",
  selectedShowId,
  onShowSelect,
  activeShowIds,
  showStatuses,
  missions = [],
}: TAppHeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
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
      className={`sticky top-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-gray-200 h-14 sm:h-16 ${className}`}
    >
      <div className="container mx-auto px-2 sm:px-4 lg:px-8 h-full max-w-full">
        <div className="flex items-center justify-between h-full gap-1 sm:gap-2 md:gap-4 relative overflow-x-hidden">
          {/* 로고 */}
          <div className="flex items-center flex-shrink-0 min-w-0">
            <Link href="/">
              <img src="/realpick-logo-new.png" alt="리얼픽" className={logoClassName} />
            </Link>
          </div>

          {/* 3대 메인 메뉴 */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 md:absolute md:left-1/2 md:transform md:-translate-x-1/2 flex-shrink min-w-0">
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

          {/* 우측 영역 - 로그인 상태에 따라 다르게 표시 */}
          <div className="flex items-center flex-shrink-0">
            {isLoggedIn ? (
              <UserInfo
                nickname={userNickname}
                points={userPoints}
                tier={userTier}
                onAvatarClick={onAvatarClick}
                showFullInfo={true}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoginModal(true)}
                className="border-[#3E757B]/30 text-[#3E757B] hover:bg-[#3E757B]/10 bg-white/70 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9"
              >
                <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
    </header>
  )
}
