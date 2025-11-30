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
    <div className={`flex items-center gap-2 sm:gap-4 flex-shrink-0 ${className}`}>
      {showFullInfo && (
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-900">
            <span className="underline">{nickname}</span>님
          </span>
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="font-medium text-gray-900">{formatPointsWithSuffix(points)}</span>
          <span className="text-gray-400">|</span>
          <span className="text-pink-600 font-medium">{tier.name}</span>
        </div>
      )}
      {/* 모바일용 축약 정보 */}
      <div className="flex sm:hidden items-center gap-1 text-xs">
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        <span className="font-medium text-gray-900">{formatPoints(points, true)}</span>
      </div>
      <Avatar
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0 border border-gray-100"
        onClick={onAvatarClick}
      >
        <AvatarImage src={tier.characterImage || "/placeholder.svg"} alt={nickname || tier.name} />
        <AvatarFallback>{(nickname || tier.name)[0]}</AvatarFallback>
      </Avatar>
    </div>
  )
}

