"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/c-ui/avatar"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { formatPoints } from "@/lib/utils/u-format-points/formatPoints.util"
import { useRouter } from "next/navigation"

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
  const router = useRouter()
  
  const handleProfileClick = () => {
    // 자신의 프로필 페이지로 이동
    if (onAvatarClick) {
      onAvatarClick()
    } else {
      router.push('/p-profile')
    }
  }

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 flex-shrink-0 ${className}`}>
      {showFullInfo && (
        <div className="hidden md:flex items-center gap-1.5 text-xs lg:text-sm whitespace-nowrap">
          {/* 1. 포인트 */}
          <span
            className={`font-medium text-gray-900 flex items-center gap-0.5 ${onPointsClick ? "cursor-pointer hover:bg-amber-50 rounded-lg px-1 py-0.5 -mx-1 transition-colors" : ""}`}
            onClick={onPointsClick}
          >
            {formatPoints(points)}
            <span className="text-amber-500 font-bold">P</span>
          </span>
          
          <span className="text-gray-400">|</span>
          
          {/* 2. 닉네임 */}
          <span 
            className="font-medium text-gray-900 cursor-pointer hover:opacity-80 transition-opacity max-w-[80px] lg:max-w-[120px] truncate"
            onClick={handleProfileClick}
          >
            <span className="underline">{nickname}</span>
          </span>
          
          {/* 3. 프로필사진 + 등급 (relative positioning) */}
          <div className="relative cursor-pointer" onClick={handleProfileClick}>
            <Avatar
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-gray-200 hover:opacity-80 transition-opacity flex-shrink-0 border border-gray-100"
            >
              <AvatarImage src={tier?.characterImage || "/placeholder.svg"} alt={nickname || tier?.name || "User"} />
              <AvatarFallback>{(nickname || tier?.name || "U")[0]}</AvatarFallback>
            </Avatar>
            
            {/* 4. 등급명 (프로필 사진 오른쪽 하단) */}
            <span 
              className="absolute -bottom-0.5 -right-0.5 text-[7px] lg:text-[8px] text-pink-600 font-semibold bg-white px-1 py-0.5 rounded-full border border-pink-200 shadow-sm whitespace-nowrap leading-none"
              onClick={handleProfileClick}
            >
              {tier?.name}
            </span>
          </div>
        </div>
      )}
      {/* 모바일/태블릿용 축약 정보 */}
      <div className="flex md:hidden items-center gap-2 text-xs sm:text-sm">
        <span
          className={`font-medium text-gray-900 flex items-center gap-0.5 ${onPointsClick ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
          onClick={onPointsClick}
        >
          {formatPoints(points, true)}
          <span className="text-amber-500 font-bold">P</span>
        </span>
        <div className="relative cursor-pointer" onClick={handleProfileClick}>
          <Avatar
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-200 hover:opacity-80 transition-opacity flex-shrink-0 border border-gray-100"
          >
            <AvatarImage src={tier?.characterImage || "/placeholder.svg"} alt={nickname || tier?.name || "User"} />
            <AvatarFallback>{(nickname || tier?.name || "U")[0]}</AvatarFallback>
          </Avatar>
          {/* 등급명 배지 (모바일) */}
          <span className="absolute -bottom-0.5 -right-0.5 text-[7px] sm:text-[8px] text-pink-600 font-semibold bg-white px-0.5 py-0.5 rounded-full border border-pink-200 shadow-sm whitespace-nowrap leading-none">
            {tier?.name}
          </span>
        </div>
      </div>
    </div>
  )
}

