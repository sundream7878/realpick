export interface Mission {
  id: string
  kind: "predict" | "majority"
  form: "binary" | "multi" | "match"
  title: string
  description?: string
  seasonType?: "전체" | "기수별"
  seasonNumber?: number
  revealPolicy: "realtime" | "onClose"
  deadline: string // ISO string
  status: "open" | "settled"
  options?: string[] // for binary/multi
  matchPairs?: { left: string[]; right: string[] } // for match
  episodes?: number // Number of episodes (e.g., 7-8 for couple matching)
  episodeStatuses?: Record<number, "open" | "locked" | "settled"> // Status per episode
  finalAnswer?: Array<{ left: string; right: string }> // Final correct answer for match missions
  result?: {
    correct?: string // for predict
    majority?: string // for majority
    distribution: Record<string, number> // label -> %
  }
  stats: { participants: number }
}

export interface Episode {
  id: string
  missionId: string
  episodeNo: number
  status: "open" | "locked" | "settled"
}

export interface EpisodePick {
  missionId: string
  episodeNo: number
  pairs: Array<{ maleId: string; femaleId: string }>
}

export interface VoteSubmission {
  missionId: string
  userId: string
  choice?: string // for binary/multi
  pairs?: Array<{ left: string; right: string }> // for match
  episodeNo?: number // Episode number for multi-episode missions
  submittedAt: string
}

export interface SuccessComment {
  type: "predict-success" | "predict-fail" | "majority-success" | "majority-fail"
  messages: string[]
}

export function getScoreByEpisode(episodeNo: number): number {
  return Math.max(100 - (episodeNo - 1) * 10, 0)
}

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
