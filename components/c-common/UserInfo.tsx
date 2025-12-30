"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/c-ui/avatar"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { formatPoints } from "@/lib/utils/u-format-points/formatPoints.util"

interface TUserInfoProps {
  nickname: string
  points: number
  tier: TTierInfo
  onAvatarClick?: () => void
  onPointsClick?: () => void
  showFullInfo?: boolean
  className?: string
}

export function UserInfo({
  nickname,
  points,
  tier,
  onAvatarClick,
  onPointsClick,
  showFullInfo = true,
  className = "",
}: TUserInfoProps) {
  const avatarElement = (
    <Avatar
      className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 border border-gray-100"
      onClick={onAvatarClick}
    >
      <AvatarImage src={tier.characterImage || "/placeholder.svg"} alt={nickname || tier.name} />
      <AvatarFallback>{(nickname || tier.name)[0]}</AvatarFallback>
    </Avatar>
  )

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 flex-shrink-0 ${className}`}>
      {showFullInfo && (
        <div className="hidden md:flex items-center gap-2 text-sm lg:text-base">
          <span className="font-medium text-gray-900">
            <span className="underline">{nickname}</span>님
          </span>
          <span
            className={`font-medium text-gray-900 flex items-center gap-0.5 ${onPointsClick ? "cursor-pointer hover:bg-amber-50 rounded-lg px-1.5 py-0.5 -mx-1.5 transition-colors" : ""}`}
            onClick={onPointsClick}
          >
            {formatPoints(points)}
            <span className="text-amber-500">P</span>
          </span>
          <span className="text-gray-400">|</span>
          {avatarElement}
          <span className="text-pink-600 font-medium">{tier.name}</span>
        </div>
      )}
      {/* 모바일/태블릿용 축약 정보 */}
      <div className="flex md:hidden items-center gap-2 text-xs sm:text-sm">
        <span
          className={`font-medium text-gray-900 flex items-center gap-0.5 ${onPointsClick ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
          onClick={onPointsClick}
        >
          {formatPoints(points, true)}
          <span className="text-amber-500">P</span>
        </span>
        {avatarElement}
      </div>
    </div>
  )
}

