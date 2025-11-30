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

interface TAppHeaderProps {
  selectedShow: "나는솔로" | "돌싱글즈"
  onShowChange: (show: "나는솔로" | "돌싱글즈") => void
  userNickname: string
  userPoints: number
  userTier: TTierInfo
  onAvatarClick?: () => void
  logoClassName?: string
  className?: string
}

export function AppHeader({
  selectedShow,
  onShowChange,
  userNickname,
  userPoints,
  userTier,
  onAvatarClick,
  logoClassName = "w-auto cursor-pointer hover:opacity-80 transition-opacity h-8 md:h-10",
  className = "",
}: TAppHeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

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
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-gray-200 h-16 ${className}`}
    >
      <div className="container mx-auto px-2 sm:px-4 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
          {/* 로고 */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/">
              <img src="/realpick-logo-new.png" alt="RealPick" className={logoClassName} />
            </Link>
          </div>

          {/* 3대 메인 메뉴 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ShowMenu category="LOVE" />
            <ShowMenu category="VICTORY" />
            <ShowMenu category="STAR" />
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
                className="border-rose-200 text-rose-600 hover:bg-rose-50 bg-white/70"
              >
                <User className="w-4 h-4 mr-2" />
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
