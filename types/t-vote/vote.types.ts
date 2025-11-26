// RealPick Type Definitions (v9 - plan.md 기반)
// 마지막 업데이트: 2025-01-13

// ============================================
// 1. User Types
// ============================================
export interface TUser {
  id: string
  email: string
  nickname: string
  avatarUrl?: string
  points: number
  tier: TTier
  createdAt: string
  updatedAt: string
}

export type TTier =
  | "모태솔로"
  | "솔로 지망생"
  | "짝사랑 빌더"
  | "그린 플래그"
  | "공감 실천가"
  | "조율사"
  | "넥서스"

// ============================================
// 2. Mission Types
// ============================================
export interface TMission {
  id: string
  creatorId?: string
  kind: "predict" | "majority"
  form: "binary" | "multi" | "match" | "subjective"
  title: string
  description?: string
  seasonType?: "전체" | "기수별"
  seasonNumber?: number
  options?: string[] | TMatchPairs // binary/multi: string[], match: TMatchPairs
  subjectivePlaceholder?: string // 주관식 안내 문구
  deadline: string // ISO string
  revealPolicy: "realtime" | "onClose"
  status: "open" | "closed" | "settled"
  episodes?: number // Number of episodes (for match missions)
  episodeStatuses?: Record<number, "open" | "locked" | "settled"> // Status per episode
  finalAnswer?: Array<{ left: string; right: string }> // Final correct answer for match missions
  result?: TMissionResult
  stats: {
    participants: number
    totalVotes?: number
  }
  thumbnailUrl?: string
  createdAt: string
  updatedAt?: string
}

export interface TMatchPairs {
  left: string[] // 남성 출연자 리스트
  right: string[] // 여성 출연자 리스트
}

export interface TMissionResult {
  correctAnswer?: string // for predict missions
  majorityOption?: string // for majority missions
  finalAnswer?: Array<{ left: string; right: string }> // for match missions
  distribution: Record<string, number> // option -> percentage
  totalVotes: number
}

// ============================================
// 3. Episode Types
// ============================================
export interface TEpisode {
  id: string
  missionId: string
  episodeNo: number
  status: "open" | "locked" | "settled"
  createdAt: string
  updatedAt: string
}

export interface TEpisodeStatus {
  episodeNo: number
  status: "open" | "locked" | "settled"
}

// ============================================
// 4. Vote Types
// ============================================
export interface TVote {
  id: string
  userId: string
  missionId: string
  selectedOption: string | string[] // binary: string, multi: string[]
  createdAt: string
}

export interface TVoteSubmission {
  missionId: string
  userId: string
  choice?: string | string[] // for binary/multi
  pairs?: Array<{ left: string; right: string }> // for match
  matchPredictions?: Record<string, Array<{ left: string; right: string }>> // for match missions with episodes
  episodeNo?: number // Episode number for multi-episode missions
  submittedAt: string
  timestamp?: string // deprecated, use submittedAt
}

// ============================================
// 5. Match Pick Types
// ============================================
export interface TMatchPick {
  id: string
  userId: string
  missionId: string
  episodeNo: number
  connections: Array<{ left: string; right: string }>
  submitted: boolean
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TEpisodePick {
  missionId: string
  episodeNo: number
  pairs: Array<{ left: string; right: string }>
}

// ============================================
// 6. Result Types
// ============================================
export interface TResult {
  id: string
  missionId: string
  correctAnswer?: string // for predict missions
  majorityOption?: string // for majority missions
  finalAnswer?: Array<{ left: string; right: string }> // for match missions
  distribution: Record<string, number> // option -> percentage
  totalVotes: number
  createdAt: string
  updatedAt: string
}

// ============================================
// 7. Point Log Types
// ============================================
export interface TPointLog {
  id: string
  userId: string
  missionId?: string
  diff: number // positive: earned, negative: deducted
  reason: string
  createdAt: string
}

// ============================================
// 8. Comment Types
// ============================================
export interface TSuccessComment {
  type: "predict-success" | "predict-fail" | "majority-success" | "majority-fail"
  messages: string[]
}

// ============================================
// 9. Legacy Type Exports (하위 호환성)
// ============================================
// 기존 코드와의 호환성을 위해 별칭 제공 (점진적 마이그레이션용)
export type User = TUser
export type Tier = TTier
export type Mission = TMission
export type MatchPairs = TMatchPairs
export type MissionResult = TMissionResult
export type Episode = TEpisode
export type EpisodeStatus = TEpisodeStatus
export type Vote = TVote
export type VoteSubmission = TVoteSubmission
export type MatchPick = TMatchPick
export type EpisodePick = TEpisodePick
export type Result = TResult
export type PointLog = TPointLog
export type SuccessComment = TSuccessComment

