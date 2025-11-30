import type { TMission, TVoteSubmission } from "@/types/t-vote/vote.types"
import type { SuccessComment } from "./vote-types"

export const mockMissions: Record<string, TMission> = {
  "1": {
    id: "1",
    creatorNickname: "불타는바다",
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    kind: "predict",
    form: "binary",
    title: "나는솔로 29기 광수와 영숙 ",
    description: "광수와 영숙이 커플이 될까요?",
    seasonType: "기수별",
    seasonNumber: 29,
    revealPolicy: "realtime",
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Changed to future date for open status
    status: "open", // Changed from "settled" to "open"
    options: ["커플 성사", "커플 실패"],
    result: {
      correctAnswer: "커플 성사",
      distribution: { "커플 성사": 62, "커플 실패": 38 },
      totalVotes: 8432,
    },
    stats: { participants: 8432 },
    createdAt: new Date().toISOString(),
  },
  "3": {
    id: "3",
    kind: "predict",
    form: "match",
    title: "나는솔로 29기 커플 매칭 예측",
    description: "최종 커플을 예측해보세요",
    seasonType: "기수별",
    seasonNumber: 29,
    revealPolicy: "realtime",
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Past date for settled status
    status: "settled",
    episodes: 8,
    episodeStatuses: {
      1: "settled",
      2: "settled",
      3: "settled",
      4: "settled",
      5: "settled",
      6: "settled",
      7: "settled",
      8: "settled",
    },
    matchPairs: {
      left: ["영수", "영호", "영식", "영철", "광수", "상철"],
      right: ["영순", "정숙", "순자", "영자", "옥순", "현숙"],
    },
    finalAnswer: [
      { left: "광수", right: "영순" },
      { left: "영수", right: "정숙" },
      { left: "상철", right: "현숙" },
    ],
    result: {
      finalAnswer: [
        { left: "광수", right: "영순" },
        { left: "영수", right: "정숙" },
        { left: "상철", right: "현숙" },
      ],
      distribution: {
        "광수-영순": 28,
        "영수-정숙": 24,
        "영호-순자": 20,
        "영식-영자": 15,
        "영철-옥순": 10,
        "상철-현숙": 3,
      },
      totalVotes: 12847,
    },
    stats: { participants: 12847 },
  },
  "4": {
    id: "4",
    kind: "majority",
    form: "multi",
    title: "나는솔로 역대 최고 커플은?",
    description: "역대 최고의 커플을 선택해주세요",
    seasonType: "전체",
    revealPolicy: "realtime",
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Changed to future date for open status
    status: "open", // Changed from "settled" to "open"
    options: ["1기 현우-지영", "3기 대훈-미정", "5기 상철-지현", "8기 정식-현숙"],
    result: {
      majorityOption: "1기 현우-지영",
      distribution: { "1기 현우-지영": 40, "3기 대훈-미정": 30, "5기 상철-지현": 20, "8기 정식-현숙": 10 },
      totalVotes: 7123,
    },
    stats: { participants: 7123 },
  },
  "5": {
    id: "5",
    kind: "predict",
    form: "binary",
    title: "나는솔로 29기 최고 명장면",
    description: "가장 인상 깊었던 장면은?",
    seasonType: "기수별",
    seasonNumber: 29,
    revealPolicy: "onClose",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "open",
    options: ["광수의 고백 장면", "영숙의 눈물 장면"],
    result: {
      distribution: { "광수의 고백 장면": 55, "영숙의 눈물 장면": 45 },
      totalVotes: 4567,
    },
    stats: { participants: 4567 },
  },
  "6": {
    id: "6",
    kind: "majority",
    form: "multi",
    title: "나는솔로 28기 출연진 스타일 투표",
    description: "가장 스타일리시한 출연자는?",
    seasonType: "기수별",
    seasonNumber: 28,
    revealPolicy: "realtime",
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "open",
    options: ["광수", "영숙", "민호", "지은", "태현"],
    result: {
      distribution: { 광수: 25, 영숙: 35, 민호: 20, 지은: 15, 태현: 5 },
      totalVotes: 6789,
    },
    stats: { participants: 6789 },
  },
}

export const successComments: Record<string, SuccessComment> = {
  "predict-success": {
    type: "predict-success",
    messages: [
      "당신의 직감이 정확했어요!",
      "예측 성공! 연애 촉이 날카롭네요 ",
      "이번에도 결과를 꿰뚫어봤군요 ",
      "정확한 예측! 당신은 연애의 점술가 ",
      "연애는 늘 예측 불허, 다음 기회에 또 도전하세요 ",
    ],
  },
  "predict-fail": {
    type: "predict-fail",
    messages: [
      "이번엔 예측이 빗나갔지만, 시도 자체가 멋졌습니다 ",
      "결과는 달랐지만, 도전하는 눈빛이 돋보였어요 ",
      "촉이 흔들렸지만, 경험이 또 하나 쌓였네요 ",
      "당장은 틀려도, 언젠가 통찰이 빛을 발할 겁니다 ",
      "연애는 늘 예측 불허, 다음 기회에 또 도전하세요 ",
    ],
  },
  "majority-success": {
    type: "majority-success",
    messages: [
      "집단지성과 함께했네요!",
      "당신의 선택 = 대중의 선택 ",
      "이번에는 다수의 마음을 읽었군요 ",
      "공감력 만점! 모두와 같은 흐름을 탔네요! ",
      "다수의 흐름을 제대로 캐치했습니다 ",
    ],
  },
  "majority-fail": {
    type: "majority-fail",
    messages: [
      "공감대는 놓쳤지만, 독창적인 해석을 보여줬습니다",
      "다수와는 달랐지만, 당신의 시선이 특별합니다 ",
      "소수의 길을 걸었지만, 그것도 용기 있는 선택이에요 ",
      "언젠가 그 선택이 빛날 겁니다 ",
      "다수와 달랐지만, 차별화된 눈으로 바라봤군요 ",
    ],
  },
}

// Utility function to get deterministic comment based on user and mission
export function getSuccessComment(userId: string, missionId: string, type: SuccessComment["type"]): string {
  const comments = successComments[type]
  if (!comments) return ""

  // Create deterministic seed from userId and missionId
  const seed = `${userId}:${missionId}`
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  const index = Math.abs(hash) % comments.messages.length
  return comments.messages[index]
}

export function generateMockUserRanking(
  finalAnswer: Array<{ left: string; right: string }>,
  totalParticipants: number,
): Array<{
  rank: number
  nickname: string
  totalScore: number
  correctRounds: number[]
  tierInfo: { name: string; characterImage: string }
  tierUpgraded: boolean
  isCurrentUser: boolean
}> {
  const mockUsers = [
    {
      nickname: "연애고수123",
      predictions: {
        1: [
          { left: "광수", right: "영순" },
          { left: "영수", right: "정숙" },
          { left: "상철", right: "현숙" },
        ],
      },
      upgraded: true,
    },
    {
      nickname: "커플매칭왕",
      predictions: {
        1: [
          { left: "광수", right: "영순" },
          { left: "영수", right: "정숙" },
        ],
      },
      upgraded: false,
    },
    {
      nickname: "예측의신",
      predictions: {
        1: [
          { left: "광수", right: "영순" },
          { left: "영수", right: "정숙" },
        ],
      },
      upgraded: false,
    },
    {
      nickname: "솔로탈출",
      predictions: {
        2: [
          { left: "광수", right: "영순" },
          { left: "영호", right: "순자" },
        ],
      },
      upgraded: true,
    },
    {
      nickname: "리얼픽마스터",
      predictions: {
        1: [
          { left: "영호", right: "순자" },
          { left: "영식", right: "영자" },
        ],
      },
      upgraded: false,
    },
    {
      nickname: "Sundream",
      predictions: {
        1: [
          { left: "광수", right: "영순" },
          { left: "영수", right: "정숙" },
        ],
        2: [
          { left: "광수", right: "영순" },
          { left: "상철", right: "현숙" },
        ],
        3: [{ left: "영호", right: "순자" }],
      },
      isCurrentUser: true,
      upgraded: false,
    },
    { nickname: "연애초보", predictions: { 4: [{ left: "영호", right: "순자" }] }, upgraded: false },
    { nickname: "픽잘하는사람", predictions: { 5: [{ left: "광수", right: "영순" }] }, upgraded: false },
    {
      nickname: "처음해봄",
      predictions: {
        8: [
          { left: "영호", right: "순자" },
          { left: "영식", right: "영자" },
          { left: "영철", right: "옥순" },
        ],
      },
      upgraded: false,
    },
  ]

  const getScoreByRound = (round: number) => Math.max(100 - (round - 1) * 10, 30)

  const calculateScore = (predictions: Partial<Record<number, Array<{ left: string; right: string }>>>) => {
    let totalScore = 0
    const correctRounds: number[] = []

    for (const [roundStr, couples] of Object.entries(predictions)) {
      if (!couples) continue
      const round = Number.parseInt(roundStr)
      const pointsForRound = getScoreByRound(round)
      let hasCorrectInRound = false

      for (const couple of couples) {
        const isCorrect = finalAnswer.some((answer) => answer.left === couple.left && answer.right === couple.right)

        if (isCorrect) {
          totalScore += pointsForRound
          hasCorrectInRound = true
        } else {
          totalScore -= pointsForRound
        }
      }

      if (hasCorrectInRound) {
        correctRounds.push(round)
      }
    }

    return { totalScore, correctRounds }
  }

  const getTierFromScore = (score: number) => {
    if (score >= 5000) return { name: "픽마스터", characterImage: "/placeholder.svg?height=48&width=48" }
    if (score >= 3000) return { name: "인사이터", characterImage: "/placeholder.svg?height=48&width=48" }
    if (score >= 2000) return { name: "분석자", characterImage: "/placeholder.svg?height=48&width=48" }
    if (score >= 1000) return { name: "예감러", characterImage: "/placeholder.svg?height=48&width=48" }
    if (score >= 500) return { name: "촉쟁이", characterImage: "/placeholder.svg?height=48&width=48" }
    if (score >= 200) return { name: "워처", characterImage: "/placeholder.svg?height=48&width=48" }
    return { name: "루키", characterImage: "/placeholder.svg?height=48&width=48" }
  }

  const rankedUsers = mockUsers
    .map((user) => {
      const { totalScore, correctRounds } = calculateScore(user.predictions)
      return {
        nickname: user.nickname,
        totalScore,
        correctRounds,
        tierInfo: getTierFromScore(totalScore),
        tierUpgraded: user.upgraded || false,
        isCurrentUser: user.isCurrentUser || false,
      }
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((user, index) => ({
      ...user,
      rank: index + 1,
    }))

  return rankedUsers
}

export class MockVoteRepo {
  private static userVotes: Record<string, TVoteSubmission> = {
    "user123:1": {
      userId: "user123",
      missionId: "1",
      choice: "커플 성사",
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    "user123:4": {
      userId: "user123",
      missionId: "4",
      choice: "1기 현우-지영",
      submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  }

  static getMission(id: string): TMission | null {
    return mockMissions[id] || null
  }

  static async submitVote(submission: TVoteSubmission): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.userVotes[`${submission.userId}:${submission.missionId}`] = submission
        resolve(true)
      }, 1000)
    })
  }

  static getUserVote(userId: string, missionId: string): TVoteSubmission | null {
    return this.userVotes[`${userId}:${missionId}`] || null
  }

  static hasUserVoted(userId: string, missionId: string): boolean {
    return !!this.userVotes[`${userId}:${missionId}`]
  }

  static updateUserVote(userId: string, missionId: string, updatedVote: TVoteSubmission): void {
    this.userVotes[`${userId}:${missionId}`] = updatedVote
  }
}
