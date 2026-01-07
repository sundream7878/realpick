"use client"

import { Card, CardTitle } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Clock } from "lucide-react"
import type { TMission } from "@/types/t-vote/vote.types"
import { MissionActionButtons } from "./MissionActionButtons"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import { getShowById } from "@/lib/constants/shows"
import { TIERS } from "@/lib/utils/u-tier-system/tierSystem.util"
import { calculatePotentialPoints } from "@/lib/utils/u-points/pointSystem.util"
import { getThemeColors } from "@/lib/utils/u-theme/themeUtils"

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
  let showInfo = undefined
  try {
    if (mission.showId) {
      showInfo = getShowById(mission.showId)
    } else {
      showInfo = getShowById('nasolo')
    }
  } catch (e) {
    console.error("getShowById error:", e)
  }

  const category = showInfo?.category
  const theme = getThemeColors(category)
  const targetUrl = mission.referenceUrl || showInfo?.officialUrl
  const displayThumbnailUrl = mission.thumbnailUrl || showInfo?.defaultThumbnail

  const isClosed = (() => {
    if (mission.form === "match") {
      if (mission.status === "settled" || mission.status === "closed") return true
      if (mission.deadline && isDeadlinePassed(mission.deadline)) return true
      if (mission.episodeStatuses) {
        const totalEpisodes = mission.episodes || 8
        for (let i = 1; i <= totalEpisodes; i++) {
          if (mission.episodeStatuses[i] !== "settled") return false
        }
        return true
      }
      return false
    }
    return mission.deadline ? isDeadlinePassed(mission.deadline) : (mission.status === "settled" || mission.status === "closed")
  })()

  const kindText = mission.kind === "predict" ? "예측픽" : "공감픽"

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${month}.${day} ${hours}:${minutes}`
    } catch {
      return dateString
    }
  }

  const getPointLabel = () => {
    let type: 'binary' | 'multi' | 'match' = 'binary';
    let optionsCount = 2;
    if (mission.form === 'match') type = 'match';
    else if (mission.submissionType === 'text') type = 'multi';
    else if (Array.isArray(mission.options)) {
      optionsCount = mission.options.length;
      if (optionsCount >= 3) type = 'multi';
    }
    return calculatePotentialPoints(mission.kind, type, optionsCount).label;
  }

  const closedOpacity = isClosed ? "opacity-80" : ""

  return (
    <Card className={`bg-gradient-to-br ${theme.bgGradient} ${theme.border} rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ${closedOpacity} ${className} flex flex-col overflow-hidden relative aspect-[2/1] min-h-[170px] p-0`}>
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col h-full justify-between">
        
        {/* 1. 상단 영역: 배지 & 날짜 */}
        <div className="flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 border border-yellow-200 rounded px-1.5 py-0.5">
              <span className="text-[10px] font-bold">{getPointLabel()}</span>
            </div>
            <Badge className={`font-semibold h-5 px-2 text-[10px] rounded ${mission.kind === "predict" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-green-100 text-green-700 border-green-200"}`}>
              {kindText}
            </Badge>
          </div>
          <div className="text-[11px] sm:text-xs text-gray-400 font-medium flex gap-2.5">
            <span>게시: {formatDate(mission.createdAt)}</span>
            {mission.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-500" />
                <span className="text-gray-600 font-bold">마감:</span>
                <span className="text-gray-900">{formatDate(mission.deadline)}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. 중앙 영역: 제목과 썸네일 (살짝 위로 배치) */}
        <div className="flex justify-between items-start gap-4 flex-1 pt-1 pb-2">
          <CardTitle className="text-base sm:text-lg md:text-xl text-gray-900 font-bold leading-tight line-clamp-2">
            {(showInfo?.id === 'nasolo' || showInfo?.id === 'nasolsagye') && mission.seasonNumber 
              ? `[${mission.seasonNumber}기] ${mission.title}` 
              : mission.title}
          </CardTitle>

          <div className="flex flex-col items-end gap-1 shrink-0">
            {displayThumbnailUrl && (
              <div 
                className="w-28 h-18 sm:w-32 sm:h-20 rounded-lg overflow-hidden border border-gray-100 shadow-sm cursor-pointer"
                onClick={(e) => { if (targetUrl) { e.stopPropagation(); window.open(targetUrl, "_blank"); } }}
              >
                <img src={displayThumbnailUrl} alt="thumb" className="w-full h-full object-cover" />
              </div>
            )}
            {mission.creatorNickname && (
              <div className="flex items-center gap-1 pr-1">
                <div className="w-4 h-4 rounded-full overflow-hidden border border-gray-200">
                  <img src={mission.creatorTier ? TIERS.find(t => t.name === mission.creatorTier)?.characterImage || "/tier-rookie.png" : "/tier-rookie.png"} className="w-full h-full object-cover" />
                </div>
                <span className={`text-[11px] sm:text-xs font-bold ${theme.iconText}`}>{mission.creatorNickname}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. 하단 영역: 그래프와 버튼 */}
        <div className="flex items-end gap-4 shrink-0 mt-auto">
          {/* 그래프 영역: 4개 막대 기준 고정 너비 부여하여 버튼 시작점 고정 */}
          <div className="flex items-end gap-2 h-12 sm:h-14 w-[104px] sm:w-[120px] shrink-0">
            {(() => {
              const distribution = mission.result?.distribution || {};
              const options = Array.isArray(mission.options) ? mission.options : [];
              
              // 1. 표시할 막대 개수 결정 (최대 4개)
              let barCount = 3; 
              if (mission.form === 'binary') barCount = 2;
              else if (mission.form === 'match') barCount = 3;
              else if (options.length > 0) {
                barCount = Math.min(options.length, 4);
              }
              
              // 2. 실제 투표 데이터 추출 및 높이 계산
              const counts: number[] = [];
              for (let i = 0; i < barCount; i++) {
                let count = 0;
                if (mission.form === 'match') {
                  // 매치 미션은 시각적 재미를 위해 임의의 비율 사용 (또는 stats 기반)
                  count = [40, 70, 90][i] || 0;
                } else {
                  const optionText = options[i];
                  // f_option_vote_counts는 옵션 텍스트를 키로 가짐
                  count = (optionText ? (distribution[optionText] || 0) : 0) as number;
                }
                counts.push(count);
              }

              const maxCount = Math.max(...counts, 0);
              
              let heights: number[] = [];
              if (maxCount === 0) {
                // 투표가 없으면 시각적 생동감을 위해 기본 랜덤 느낌의 높이 제공
                heights = [40, 65, 90, 75].slice(0, barCount);
              } else {
                // 투표 비율 계산 (가장 높은 것을 100% 기준으로, 최소 15% 높이 보장)
                heights = counts.map(count => Math.max(15, (count / maxCount) * 100));
              }
              
              // 3. 색상 및 투명도: 첫 번째가 가장 진하고 뒤로 갈수록 연해짐
              // 테마의 첫 번째 색상을 사용하여 통일감을 주고 투명도로 변화를 줌
              const opacities = ['opacity-100', 'opacity-80', 'opacity-60', 'opacity-40'];
              
              return heights.map((h, i) => (
                <div 
                  key={i} 
                  className={`w-5 sm:w-6 rounded-t-md bg-gradient-to-t ${theme.progressBar[0]} ${opacities[i] || 'opacity-30'}`} 
                  style={{ height: `${h}%` }} 
                />
              ));
            })()}
          </div>

          <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
            {/* items-start로 변경하여 참여자 수 문구를 버튼 왼쪽 끝에 정렬 */}
            <div className="text-[11px] sm:text-[13px] text-gray-500 font-medium pl-1 leading-none truncate w-full">
              <span className="text-gray-900 font-bold">{mission.stats?.participants || 0}</span>명 참여
            </div>
            <MissionActionButtons
              missionId={mission.id}
              shouldShowResults={shouldShowResults}
              onViewPick={onViewPick}
              mission={mission}
              category={category}
              className="w-full h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-bold shadow-sm"
            />
          </div>
        </div>

      </div>
    </Card>
  )
}
