"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Clock } from "lucide-react"
import type { TMission } from "@/types/t-vote/vote.types"
import { SeasonBadge, getSeasonBadgeText } from "./SeasonBadge"
import { MissionActionButtons } from "./MissionActionButtons"
import { getTimeRemaining, isDeadlinePassed, getDDay } from "@/lib/utils/u-time/timeUtils.util"
import { getShowByName, getShowById } from "@/lib/constants/shows"
import { TIERS } from "@/lib/utils/u-tier-system/tierSystem.util"
import { calculatePotentialPoints } from "@/lib/utils/u-points/pointSystem.util"

interface TMissionCardProps {
  mission: TMission
  shouldShowResults: boolean
  onViewPick?: () => void
  variant?: "default" | "hot"
  timeLeft?: string
  className?: string
}

export function MissionCard({
  mission,
  shouldShowResults,
  onViewPick,
  variant = "default",
  timeLeft,
  className = "",
}: TMissionCardProps) {
  const seasonBadgeText = getSeasonBadgeText(mission)

  // 프로그램 정보 조회 (showId로 검색) - 안전하게 처리
  let showInfo = undefined
  try {
    if (mission.showId) {
      showInfo = getShowById(mission.showId)
    } else {
      // [Legacy Support] showId가 없는 기존 데이터는 '나는 SOLO'로 간주
      showInfo = getShowById('nasolo')
    }
  } catch (e) {
    console.error("getShowById error:", e)
  }

  // 클릭 시 이동할 URL 결정 (유튜브 링크가 없으면 공식 홈페이지로)
  const targetUrl = mission.referenceUrl || showInfo?.officialUrl

  // 표시할 썸네일 결정 (입력된 썸네일이 없으면 기본 포스터 사용)
  const displayThumbnailUrl = mission.thumbnailUrl || showInfo?.defaultThumbnail

  console.log(`Mission: ${mission.title}, showId: ${mission.showId}, showInfo:`, showInfo, "thumb:", displayThumbnailUrl)

  // 실제 마감 여부 확인
  const isClosed = (() => {
    // 커플 매칭 미션인 경우: 회차별 완료 상태로 판단
    if (mission.form === "match") {
      // status가 settled이거나 closed이면 마감
      if (mission.status === "settled" || mission.status === "closed") return true

      // 마감일이 지났으면 마감
      if (mission.deadline && isDeadlinePassed(mission.deadline)) return true

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
    return mission.deadline ? isDeadlinePassed(mission.deadline) : (mission.status === "settled" || mission.status === "closed")
  })()

  const statusText = (() => {
    if (isClosed) return "마감됨"

    // 커플 매칭 미션인 경우: 마감되지 않았으면 진행중
    if (mission.form === "match") {
      return "진행중"
    }

    // 일반 미션인 경우: 마감일 표시
    return mission.deadline ? getTimeRemaining(mission.deadline) : "진행중"
  })()

  const kindText = mission.kind === "predict" ? "예측픽" : "다수픽"

  const cardClassName =
    variant === "hot"
      ? "border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100 shadow-sm hover:shadow-lg hover:border-pink-300 transition-all duration-200"
      : "hover:shadow-lg hover:border-pink-300 transition-all duration-200 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200"

  // 마감된 미션은 투명도 적용
  const closedOpacity = isClosed ? "opacity-80" : ""

  return (
    <Card className={`${cardClassName} ${closedOpacity} ${className} flex flex-col py-0 gap-0`}>
      <CardHeader className="p-3 pb-1">
        <div className="flex justify-between items-start gap-3">
          {/* 좌측: 배지 + 제목 */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {/* 배지 그룹 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {variant === "hot" && (
                <Badge className="bg-pink-500 hover:bg-pink-600 text-white h-5 px-1.5 text-[10px]">HOT</Badge>
              )}

              {/* 포인트 배지 */}
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 h-5 px-1.5 text-[10px] font-bold border">
                💰 {(() => {
                  let type: 'binary' | 'multi' | 'match' = 'binary';
                  let optionsCount = 2;

                  if (mission.form === 'match') {
                    type = 'match';
                  } else if (Array.isArray(mission.options)) {
                    optionsCount = mission.options.length;
                    if (optionsCount >= 3) type = 'multi';
                  }

                  return calculatePotentialPoints(type, optionsCount).label;
                })()}
              </Badge>

              {variant !== "hot" && (
                <Badge
                  className={`font-medium h-5 px-1.5 text-[10px] ${mission.kind === "predict"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-green-100 text-green-700 border-green-200"
                    }`}
                >
                  {kindText}
                </Badge>
              )}
              {seasonBadgeText && (
                <SeasonBadge
                  seasonType={mission.seasonType}
                  seasonNumber={mission.seasonNumber}
                  variant="default"
                  className="h-5 px-1.5 text-[10px]"
                />
              )}
            </div>

            {/* 제목 */}
            <CardTitle className="text-sm text-gray-900 font-semibold line-clamp-2 leading-snug">
              {mission.title}
            </CardTitle>
          </div>

          {/* 우측: 딜러 정보 + 썸네일 */}
          {(mission.creatorNickname || displayThumbnailUrl) && (
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {/* 캐릭터 + 닉네임 */}
              {mission.creatorNickname && (
                <div className="flex items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center overflow-hidden">
                    <img
                      src={mission.creatorTier ? TIERS.find(t => t.name === mission.creatorTier)?.characterImage || "/tier-rookie.png" : "/tier-rookie.png"}
                      alt="딜러 캐릭터"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-purple-600">{mission.creatorNickname}</span>
                </div>
              )}

              {/* 썸네일 - 명시적 렌더링 */}
              {displayThumbnailUrl ? (
                <div
                  key="thumbnail-container"
                  className={`w-24 h-[54px] rounded-md overflow-hidden border border-gray-200 shadow-sm ${targetUrl ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                  onClick={(e) => {
                    if (targetUrl) {
                      e.stopPropagation()
                      window.open(targetUrl, "_blank")
                    }
                  }}
                >
                  <img
                    src={displayThumbnailUrl}
                    alt="썸네일"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Image load error:", displayThumbnailUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-1 flex flex-col flex-1">
        {/* 도표/상태(좌측) + 참여자 수(우측) */}
        <div className="flex items-center justify-between h-10 mb-2">

          {/* 좌측: 차트 및 상태 표시 */}
          <div className="flex items-center h-full">
            {/* 실시간 공개: 투표 그래프 표시 (커플 매칭 제외) */}
            {mission.revealPolicy === "realtime" && mission.form !== "match" && (
              <div className="flex items-end gap-1 h-full">
                {mission.result?.distribution && Object.keys(mission.result.distribution).length > 0 ? (
                  Object.entries(mission.result.distribution)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([option, percentage], index) => {
                      const height = Math.max(30, percentage as number)
                      const colorClass = `bg-gradient-to-t ${index === 0 ? "from-purple-400 to-purple-500" :
                        index === 1 ? "from-pink-400 to-pink-500" :
                          "from-purple-300 to-pink-300"
                        }${!isClosed ? " animate-pulse" : ""}`

                      return (
                        <div
                          key={option}
                          className={`w-5 rounded-t-md transition-all duration-700 ease-in-out ${colorClass}`}
                          style={{
                            height: `${height}%`,
                            animationDuration: isClosed ? undefined : `${1.5 + index * 0.3}s`
                          }}
                        />
                      )
                    })
                ) : (
                  // 데이터가 없으면 기본 도표 표시
                  (mission.options && Array.isArray(mission.options) ? mission.options.slice(0, 5) : Array.from({ length: 5 })).map((_, index) => (
                    <div
                      key={index}
                      className="w-5 rounded-t-md bg-gradient-to-t from-purple-300 to-pink-300 opacity-60"
                      style={{ height: `${30 + index * 15}%` }}
                    />
                  ))
                )}
              </div>
            )}

            {/* 마감 후 공개: 미스터리 박스 표시 (일반 미션만) */}
            {mission.revealPolicy === "onClose" && mission.form !== "match" && mission.deadline && !isClosed && (
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-md px-2 py-1 border border-dashed border-purple-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />

                <div className="relative flex items-center gap-1.5">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-md animate-bounce">
                    <span className="text-white text-sm font-bold">?</span>
                  </div>

                  <div className="flex flex-col">
                    <div className="text-purple-700 font-bold text-xs leading-tight">
                      {getDDay(mission.deadline)}
                    </div>
                    <div className="text-[9px] text-purple-600 font-medium whitespace-nowrap leading-tight">
                      마감 후 공개
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 커플 매칭 미션 진행중: 회차별 진행 상태 표시 */}
            {mission.form === "match" && !isClosed && (
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-md px-2 py-1 border border-dashed border-purple-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />

                <div className="relative flex items-center gap-1.5">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-md">
                    <span className="text-white text-xs font-bold">💕</span>
                  </div>

                  <div className="flex flex-col">
                    <div className="text-purple-700 font-bold text-xs leading-tight">
                      회차별 진행
                    </div>
                    <div className="text-[9px] text-purple-600 font-medium whitespace-nowrap leading-tight">
                      모든 회차 완료시 마감
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 마감된 경우: 체크 아이콘 박스 (보라/핑크 색상) */}
            {((mission.revealPolicy === "onClose" && mission.form !== "match" && mission.deadline && isClosed) ||
              (mission.form === "match" && isClosed)) && (
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-md px-2 py-1 border border-purple-300">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-md">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>

                    <div className="flex flex-col">
                      <div className="text-purple-700 font-bold text-xs leading-tight">
                        마감됨
                      </div>
                      <div className="text-[9px] text-purple-600 font-medium whitespace-nowrap leading-tight">
                        결과 공개
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* 우측: 참여자 수 */}
          <div className="text-sm text-gray-600 text-right">
            <span className="text-gray-900 font-semibold">
              {mission.stats?.participants?.toLocaleString() || 0}
            </span>
            명 참여
          </div>
        </div>

        <div className="mt-auto">
          <MissionActionButtons
            missionId={mission.id}
            shouldShowResults={shouldShowResults}
            onViewPick={onViewPick}
            mission={mission}
          />
        </div>
      </CardContent>
    </Card>
  )
}
