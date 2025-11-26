import type { TTierInfo } from "@/types/t-tier/tier.types"

export const TIERS: TTierInfo[] = [
  {
    name: "넥서스",
    minPoints: 5000,
    characterImage: "/tier-nexus.png",
  },
  {
    name: "조율사",
    minPoints: 3000,
    characterImage: "/tier-coordinator.png",
  },
  {
    name: "공감 실천가",
    minPoints: 2000,
    characterImage: "/tier-empathy-practitioner.png",
  },
  {
    name: "그린 플래그",
    minPoints: 1000,
    characterImage: "/tier-green-flag.png",
  },
  {
    name: "짝사랑 빌더",
    minPoints: 500,
    characterImage: "/tier-crush-builder.png",
  },
  {
    name: "솔로 지망생",
    minPoints: 200,
    characterImage: "/tier-solo-aspirant.png",
  },
  {
    name: "모태솔로",
    minPoints: 0,
    characterImage: "/tier-motaesolo.png",
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

