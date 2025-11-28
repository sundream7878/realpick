import type { TTierInfo } from "@/types/t-tier/tier.types"

export const TIERS: TTierInfo[] = [
  {
    name: "픽마스터",
    minPoints: 5000,
    characterImage: "/tier-pickmaster.png",
  },
  {
    name: "인사이터",
    minPoints: 3000,
    characterImage: "/tier-insighter.png",
  },
  {
    name: "분석자",
    minPoints: 2000,
    characterImage: "/tier-analyzer.png",
  },
  {
    name: "예감러",
    minPoints: 1000,
    characterImage: "/tier-predictor.png",
  },
  {
    name: "촉쟁이",
    minPoints: 500,
    characterImage: "/tier-intuition.png",
  },
  {
    name: "워처",
    minPoints: 200,
    characterImage: "/tier-watcher.png",
  },
  {
    name: "루키",
    minPoints: 0,
    characterImage: "/tier-rookie.png",
  },
]

export function getTierFromPoints(points: number): TTierInfo {
  // Find the highest tier that the user qualifies for
  for (const tier of TIERS) {
    if (points >= tier.minPoints) {
      return tier
    }
  }
  // Fallback to lowest tier
  return TIERS[TIERS.length - 1]
}

export function getGradeFromPoints(points: number): string {
  return getTierFromPoints(points).name
}

export function getTierImageFromPoints(points: number): string {
  return getTierFromPoints(points).characterImage
}

/**
 * DB의 티어를 우선 사용하되, 없거나 유효하지 않은 경우 포인트로 계산
 * @param dbTier DB에 저장된 티어 (선택적)
 * @param points 사용자 포인트
 * @returns TTierInfo
 */
export function getTierFromDbOrPoints(dbTier: string | null | undefined, points: number): TTierInfo {
  // DB 티어가 있고 유효한 경우 사용
  if (dbTier) {
    const tier = TIERS.find(t => t.name === dbTier)
    if (tier) {
      // DB 티어가 포인트와 일치하는지 확인 (일치하지 않으면 포인트 기준으로 재계산)
      const calculatedTier = getTierFromPoints(points)
      if (tier.name === calculatedTier.name) {
        return tier
      }
      // DB 티어가 오래된 경우 포인트 기준으로 재계산
      return calculatedTier
    }
  }
  
  // DB 티어가 없거나 유효하지 않은 경우 포인트로 계산
  return getTierFromPoints(points)
}

