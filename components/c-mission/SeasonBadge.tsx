"use client"

import { Badge } from "@/components/c-ui/badge"

interface TSeasonBadgeProps {
  seasonType?: "전체" | "기수별"
  seasonNumber?: number
  className?: string
  variant?: "default" | "secondary" | "outline"
}

export function SeasonBadge({
  seasonType,
  seasonNumber,
  className = "",
  variant = "default",
}: TSeasonBadgeProps) {
  if (seasonType === "기수별" && seasonNumber) {
    return (
      <Badge className={`bg-purple-100 text-purple-700 font-medium ${className}`} variant={variant}>
        [{seasonNumber}기]
      </Badge>
    )
  }
  return null
}

export function getSeasonBadgeText(mission: {
  seasonType?: "전체" | "기수별"
  seasonNumber?: number
}): string | null {
  if (mission.seasonType === "기수별" && mission.seasonNumber) {
    return `${mission.seasonNumber}기`
  }
  return null
}

