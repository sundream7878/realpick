"use client"

import { Button } from "@/components/c-ui/button"
import Link from "next/link"
import { TMission } from "@/types/t-vote/vote.types"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"

interface TMissionActionButtonsProps {
  missionId: string
  shouldShowResults: boolean
  onViewPick?: () => void
  className?: string
  mission?: TMission
}

export function MissionActionButtons({
  missionId,
  shouldShowResults,
  onViewPick,
  className = "",
  mission,
}: TMissionActionButtonsProps) {
  if (shouldShowResults) {
    // 마감 여부 확인
    const isClosed = (() => {
      if (!mission) return false

      // 커플 매칭 미션인 경우: 회차별 완료 상태로 판단
      if (mission.form === "match") {
        // status가 settled이면 마감
        if (mission.status === "settled") return true

        // 모든 회차가 settled인지 확인
        if (mission.episodeStatuses) {
          const totalEpisodes = mission.episodes || 8
          for (let i = 1; i <= totalEpisodes; i++) {
            if (mission.episodeStatuses[i] !== "settled") {
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
      ? "w-full border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 font-medium shadow-sm"
      : "w-full border-purple-300 text-purple-700 bg-purple-100 hover:bg-purple-200 font-medium shadow-sm"

    const buttonText = isClosed ? "(마감) 결과보기" : "(진행중) 결과보기"

    return (
      <Link href={resultUrl} className={className}>
        <Button
          size="sm"
          variant="outline"
          className={buttonStyle}
        >
          {buttonText}
        </Button>
      </Link>
    )
  }

  return (
    <Link href={`/p-mission/${missionId}/vote`} className={className}>
      <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium">
        (진행중) PIC하기
      </Button>
    </Link>
  )
}

