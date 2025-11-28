import type { TTier } from "@/types/t-vote/vote.types"

/**
 * 회차별 점수 계산 함수
 * plan.md 규칙: 1회차 100P → 회차가 지날수록 10P씩 감소, 최소 30P
 */
export function getScoreByEpisode(episodeNo: number): number {
  return Math.max(100 - (episodeNo - 1) * 10, 30)
}

/**
 * 첫 번째 정답 회차 찾기
 */
export function findFirstCorrectEpisode(
  userPicks: Record<number, Array<{ left: string; right: string }>>,
  finalAnswer: Array<{ left: string; right: string }>,
  totalEpisodes: number,
): { episodeNo: number; score: number } | null {
  for (let episodeNo = 1; episodeNo <= totalEpisodes; episodeNo++) {
    const picks = userPicks[episodeNo]
    if (!picks || picks.length === 0) continue

    // Check if all final answer pairs are in user's picks
    const allCorrect = finalAnswer.every((answer) =>
      picks.some((pick) => pick.left === answer.left && pick.right === answer.right),
    )

    if (allCorrect) {
      return {
        episodeNo,
        score: getScoreByEpisode(episodeNo),
      }
    }
  }

  return null // No correct episode found
}

/**
 * 티어 계산 함수
 */
export function getTierByPoints(points: number): TTier {
  if (points >= 5000) return "픽마스터"
  if (points >= 3000) return "인사이터"
  if (points >= 2000) return "분석자"
  if (points >= 1000) return "예감러"
  if (points >= 500) return "촉쟁이"
  if (points >= 200) return "워처"
  return "루키"
}

/**
 * 이진/다중 선택 포인트 계산 함수
 */
export function calculateBinaryMultiPoints(
  form: "binary" | "multi",
  optionCount: number,
  isCorrect: boolean,
): number {
  if (!isCorrect) return 0 // 오답은 0점

  if (form === "binary") return 10
  if (form === "multi") {
    // 3지선다: 30P, 4지선다: 40P, 5지선다: 50P
    return optionCount * 10
  }
  return 0
}

/**
 * 커플 매칭 포인트 계산 함수
 */
export function calculateMatchPoints(
  episodeNo: number,
  isCorrect: boolean,
): number {
  const basePoints = getScoreByEpisode(episodeNo)
  return isCorrect ? basePoints : -basePoints
}

