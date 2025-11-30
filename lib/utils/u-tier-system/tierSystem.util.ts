import type { TTierInfo } from "@/types/t-tier/tier.types"

export const TIERS: TTierInfo[] = [
  {
    name: "픽마스터",
    minPoints: 5000,
    characterImage: "/tier-pickmaster.png",
    description: "최상위 관찰자. 시즌 전체 흐름을 읽고, 최종 커플·최종 우승자·최종 생존자 등 결말 예측 정확도가 압도적으로 높은 유저.",
  },
  {
    name: "인사이터",
    minPoints: 3000,
    characterImage: "/tier-insighter.png",
    description: "내용·감정·전략을 종합 판단해서 심층적 예측을 지속적으로 성공시키는 단계.",
  },
  {
    name: "분석자",
    minPoints: 2000,
    characterImage: "/tier-analyzer.png",
    description: "출연자의 행동 패턴, 분위기 흐름, 제작진 편집의 의도 등을 읽어내는 능력이 높은 유저.",
  },
  {
    name: "예감러",
    minPoints: 1000,
    characterImage: "/tier-predictor.png",
    description: "감으로 빠르게 선택하지만 정확도가 평균 이상. 행동·말투·분위기에서 결정적 힌트를 잘 캐치하는 사람.",
  },
  {
    name: "촉쟁이",
    minPoints: 500,
    characterImage: "/tier-intuition.png",
    description: "무언가 \"이럴 것 같다\"는 촉이 종종 맞아떨어지는 단계.",
  },
  {
    name: "워처",
    minPoints: 200,
    characterImage: "/tier-watcher.png",
    description: "시청은 열심히 하고 선택도 꾸준히 하지만, 아직 패턴·전략 분석은 부족한 상태.",
  },
  {
    name: "루키",
    minPoints: 0,
    characterImage: "/tier-rookie.png",
    description: "입문자. 처음 들어온 유저로, 기본 참여만으로 빠르게 단계 상승 가능.",
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

