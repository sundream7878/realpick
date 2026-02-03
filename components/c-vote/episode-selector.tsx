"use client"

import { Lock, Heart } from "lucide-react"
import { cn } from "@/lib/utils/u-utils/utils.util"

interface EpisodeSelectorProps {
  totalEpisodes: number
  selectedEpisodes: Set<number>
  savedEpisodes: Set<number>
  episodeStatuses?: Record<number, "open" | "settled" | "locked" | "preview">
  onEpisodeToggle: (episodeNo: number) => void
  disabled?: boolean
}

export function EpisodeSelector({
  totalEpisodes,
  selectedEpisodes,
  savedEpisodes, // This now receives submittedEpisodes from parent
  episodeStatuses = {},
  onEpisodeToggle,
  disabled = false,
}: EpisodeSelectorProps) {
  const getEpisodeStatus = (episodeNo: number) => {
    const episodeStatus = episodeStatuses[episodeNo] || "open"
    const isSaved = savedEpisodes.has(episodeNo)

    if (episodeStatus === "locked" || episodeStatus === "preview") return "preview"
    if (episodeStatus === "settled" && isSaved) return "closed-participated"
    if (episodeStatus === "settled" && !isSaved) return "closed-not-participated"
    if (episodeStatus === "open" && isSaved) return "open-participated"
    return "open-not-participated"
  }

  const getHeartStyles = (status: string) => {
    switch (status) {
      case "open-participated":
        return {
          fill: "fill-pink-500", // Pink filled heart for in-progress & participated
          stroke: "stroke-pink-600",
          badge: null,
        }
      case "open-not-participated":
        return {
          fill: "fill-none", // Empty heart for in-progress & not participated
          stroke: "stroke-pink-400 stroke-[2]",
          badge: null,
        }
      case "closed-participated":
        return {
          fill: "fill-gray-700", // Dark gray filled heart for closed & participated
          stroke: "stroke-gray-800",
          badge: null,
        }
      case "closed-not-participated":
        return {
          fill: "fill-gray-400", // Light gray filled heart for closed & not participated
          stroke: "stroke-gray-500",
          badge: null,
        }
      case "preview":
        return {
          fill: "fill-none", // Empty with lock icon for preview
          stroke: "stroke-gray-400 stroke-[2]",
          badge: <Lock className="w-3 h-3 text-gray-500" />,
        }
      default:
        return {
          fill: "fill-none",
          stroke: "stroke-gray-300",
          badge: null,
        }
    }
  }

  return (
    <div className="bg-white border-t border-rose-200 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">회차 선택</h3>
          <p className="text-sm text-gray-600 mb-4">하트를 클릭하여 회차를 선택하세요(여러 개 선택 가능)</p>

          <div className="flex flex-wrap justify-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-pink-500 stroke-pink-600" />
              <span className="text-gray-600">진행중·참여</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-none stroke-pink-400 stroke-[2]" />
              <span className="text-gray-600">진행중·미참여</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-gray-700 stroke-gray-800" />
              <span className="text-gray-600">마감·참여</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-gray-400 stroke-gray-500" />
              <span className="text-gray-600">마감·미참여</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Heart className="w-4 h-4 fill-none stroke-gray-400 stroke-[2]" />
                <Lock className="w-2 h-2 text-gray-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-gray-600">잠금</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-4 flex-wrap">
          {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((episodeNo) => {
            const isSelected = selectedEpisodes.has(episodeNo)
            const status = getEpisodeStatus(episodeNo)
            const styles = getHeartStyles(status)
            const isLocked = status === "preview"

            return (
              <button
                key={episodeNo}
                onClick={() => !disabled && !isLocked && onEpisodeToggle(episodeNo)}
                disabled={disabled || isLocked}
                className={cn(
                  "relative flex flex-col items-center gap-2 transition-all duration-200",
                  !isLocked && "hover:scale-110 active:scale-95 cursor-pointer",
                  isLocked && "cursor-not-allowed opacity-70",
                )}
                aria-label={`${episodeNo}회차`}
              >
                <div className="relative">
                  <Heart
                    className={cn(
                      "w-12 h-12 transition-all duration-200",
                      styles.fill,
                      styles.stroke,
                      isSelected && "ring-2 ring-pink-500 ring-offset-2 rounded-full",
                    )}
                  />
                  {styles.badge && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">{styles.badge}</div>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-700">{episodeNo}회</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
