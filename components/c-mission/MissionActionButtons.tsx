"use client"

import { Button } from "@/components/c-ui/button"
import Link from "next/link"
import { TMission } from "@/types/t-vote/vote.types"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import { getThemeColors } from "@/lib/utils/u-theme/themeUtils"
import { TShowCategory } from "@/lib/constants/shows"
import { Check } from "lucide-react"

interface TMissionActionButtonsProps {
  missionId: string
  shouldShowResults: boolean
  onViewPick?: () => void
  className?: string
  mission?: TMission
  category?: TShowCategory
  userChoice?: any
}

export function MissionActionButtons({
  missionId,
  shouldShowResults,
  onViewPick,
  className = "",
  mission,
  category,
  userChoice,
}: TMissionActionButtonsProps) {
  const theme = getThemeColors(category)

  if (shouldShowResults) {
    // 마감 여부 확인
    const isClosed = (() => {
      if (!mission) return false

      // 커플 매칭 미션인 경우: 회차별 완료 상태로 판단
      if (mission.form === "match") {
        // status가 settled 또는 closed이면 마감
        if (mission.status === "settled" || mission.status === "closed") return true

        // 모든 회차가 settled인지 확인
        if (mission.episodeStatuses) {
          const episodeNos = Object.keys(mission.episodeStatuses).map(Number)
          if (episodeNos.length === 0) return false
          for (const epNo of episodeNos) {
            if (mission.episodeStatuses[epNo] !== "settled") {
              return false // 하나라도 settled가 아니면 진행중
            }
          }
          return true // 모든 회차가 settled면 마감
        }
        return false
      }

      // 일반 미션인 경우: 기존 로직 사용
      return mission.deadline ? isDeadlinePassed(mission.deadline) : mission.status === "settled"
    })()

    const resultUrl = isClosed
      ? `/p-mission/${missionId}/results`  // 마감 후: 최종 결과 페이지
      : `/p-mission/${missionId}/vote`     // 진행 중: 투표 페이지의 중간 결과

    // 마감 여부에 따른 버튼 스타일
    const buttonStyle = isClosed
      ? `w-full ${theme.subBadgeBorder} ${theme.subBadgeText} ${theme.subBadge} hover:opacity-90 font-medium shadow-sm`
      : `w-full ${theme.iconBorder} ${theme.iconText} ${theme.iconBg} hover:opacity-90 font-medium shadow-sm`

    const buttonText = isClosed ? "결과보기" : "결과보기"

    return (
      <Link href={resultUrl} className="w-full flex">
        <Button
          size="sm"
          variant="outline"
          className={`py-1 ${!className.includes('h-') ? 'h-8' : ''} ${className ? `${buttonStyle} ${className}` : buttonStyle} flex items-center gap-2`}
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-gray-600 font-medium">MY PICK</span>
            <div className="relative">
              <div className="w-3 h-3 border-2 border-gray-400 bg-white"></div>
              {userChoice && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-500 font-bold stroke-[3] transform rotate-[-8deg]" />
                </div>
              )}
            </div>
          </div>
          <span className="ml-2">{isClosed ? "(마감) " : "(진행중) "}{buttonText}</span>
        </Button>
      </Link>
    )
  }

  // shouldShowResults가 false여도, 미션이 마감되었으면 결과보기 버튼을 보여줘야 함
  const isClosed = (() => {
    if (!mission) return false
    if (mission.form === "match") {
      if (mission.status === "settled") return true
      if (mission.episodeStatuses) {
        const totalEpisodes = mission.episodes || 8
        for (let i = 1; i <= totalEpisodes; i++) {
          if (mission.episodeStatuses[i] !== "settled") return false
        }
        return true
      }
      return false
    }
    return mission.deadline ? isDeadlinePassed(mission.deadline) : mission.status === "settled"
  })()

  if (isClosed) {
    const closedButtonStyle = `w-full ${theme.subBadgeBorder} ${theme.subBadgeText} ${theme.subBadge} hover:opacity-90 font-medium shadow-sm`
    return (
      <Link href={`/p-mission/${missionId}/results`} className="w-full flex">
        <Button
          size="sm"
          variant="outline"
          className={`py-1 ${!className.includes('h-') ? 'h-8' : ''} ${className ? `${closedButtonStyle} ${className}` : closedButtonStyle} flex items-center gap-2`}
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-gray-600 font-medium">MY PICK</span>
            <div className="relative">
              <div className="w-3 h-3 border-2 border-gray-400 bg-white"></div>
              {userChoice && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center">
                  <Check className="w-4 h-4 text-green-500 font-bold stroke-[3] transform rotate-[-8deg]" />
                </div>
              )}
            </div>
          </div>
          <span className="ml-2">(마감) 결과보기</span>
        </Button>
      </Link>
    )
  }

  const pickButtonStyle = `w-full ${theme.button} ${theme.buttonHover} text-white font-medium`
  return (
    <Link href={`/p-mission/${missionId}/vote`} className="w-full flex">
      <Button 
        size="sm" 
        className={`py-1 ${!className.includes('h-') ? 'h-8' : ''} ${className ? `${pickButtonStyle} ${className}` : pickButtonStyle} text-[10px] sm:text-xs md:text-sm`}
      >
        PICK하기
      </Button>
    </Link>
  )
}

