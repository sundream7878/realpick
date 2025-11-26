"use client"

import { ReactNode } from "react"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { SidebarNavigation } from "./SidebarNavigation"
import { AppHeader } from "./AppHeader"
import type { TTierInfo } from "@/types/t-tier/tier.types"

interface TSeasonOption {
  value: string
  label: string
  href: string
}

interface TAppLayoutProps {
  children: ReactNode
  selectedShow: "나는솔로" | "돌싱글즈"
  onShowChange: (show: "나는솔로" | "돌싱글즈") => void
  selectedSeason: string
  isMissionStatusOpen: boolean
  onMissionStatusToggle: () => void
  onSeasonSelect: (season: string) => void
  onMissionModalOpen: () => void
  userNickname: string
  userPoints: number
  userTier: TTierInfo
  onAvatarClick?: () => void
  activeNavItem?: "home" | "missions" | "mypage"
  seasonOptions?: TSeasonOption[]
  showSidebar?: boolean
  showHeader?: boolean
  showBottomNav?: boolean
  mainClassName?: string
}

export function AppLayout({
  children,
  selectedShow,
  onShowChange,
  selectedSeason,
  isMissionStatusOpen,
  onMissionStatusToggle,
  onSeasonSelect,
  onMissionModalOpen,
  userNickname,
  userPoints,
  userTier,
  onAvatarClick,
  activeNavItem = "home",
  seasonOptions,
  showSidebar = true,
  showHeader = true,
  showBottomNav = true,
  mainClassName = "",
}: TAppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {showSidebar && (
        <SidebarNavigation
          selectedShow={selectedShow}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={onMissionStatusToggle}
          onSeasonSelect={onSeasonSelect}
          onMissionModalOpen={onMissionModalOpen}
          activeNavItem={activeNavItem}
          seasonOptions={seasonOptions}
        />
      )}

      <div className="flex-1 flex flex-col">
        {showHeader && (
          <AppHeader
            selectedShow={selectedShow}
            onShowChange={onShowChange}
            userNickname={userNickname}
            userPoints={userPoints}
            userTier={userTier}
            onAvatarClick={onAvatarClick}
          />
        )}

        <main
          className={`flex-1 px-4 lg:px-8 py-6 ${showSidebar ? "md:ml-64" : ""} max-w-full overflow-hidden pb-20 md:pb-6 ${mainClassName}`}
        >
          {children}
        </main>
      </div>

      {showBottomNav && <BottomNavigation />}
    </div>
  )
}

