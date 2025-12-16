"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/c-ui/avatar"
import { Star } from "lucide-react"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { formatPoints, formatPointsWithSuffix } from "@/lib/utils/u-format-points/formatPoints.util"

interface TUserInfoProps {
  nickname: string
  points: number
  tier: TTierInfo
  onAvatarClick?: () => void
  showFullInfo?: boolean
  className?: string
}

export function UserInfo({
  nickname,
  points,
  tier,
  onAvatarClick,
  showFullInfo = true,
  className = "",
}: TUserInfoProps) {
  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 flex-shrink-0 ${className}`}>
      {showFullInfo && (
        <div className="hidden md:flex items-center gap-2 text-sm lg:text-base">
          <span className="font-medium text-gray-900">
            <span className="underline">{nickname}</span>님
          </span>
          <Star className="w-4 h-4 lg:w-4.5 lg:h-4.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-gray-900">{formatPointsWithSuffix(points)}</span>
          <span className="text-gray-400">|</span>
          <span className="text-pink-600 font-medium">{tier.name}</span>
        </div>
      )}
      {/* 모바일/태블릿용 축약 정보 */}
      <div className="flex md:hidden items-center gap-1 text-xs sm:text-sm">
        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
        <span className="font-medium text-gray-900">{formatPoints(points, true)}</span>
      </div>
      <Avatar
        className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 border border-gray-100"
        onClick={onAvatarClick}
      >
        <AvatarImage src={tier.characterImage || "/placeholder.svg"} alt={nickname || tier.name} />
        <AvatarFallback>{(nickname || tier.name)[0]}</AvatarFallback>
      </Avatar>
    </div>
  )
}

