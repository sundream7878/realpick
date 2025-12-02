// RealPick Type Definitions (v9 - plan.md 기반)
// 마지막 업데이트: 2025-01-13

// ============================================
// 1. User Types
// ============================================
export interface TUser {
  id: string
  email: string
  nickname: string
  points: number
  tier: TTier
  ageRange?: string // 나잇대 (10대, 20대, 30대, 40대, 50대, 60대, 70대, 80대, 90대)
  gender?: string // 성별 (남성, 여성)
  createdAt: string
  updatedAt: string
  role: "PICKER" | "DEALER" | "ADMIN"
}

export interface TDealer {
  id: string
  userId: string
  channelName: string
  channelUrl?: string
  subscriberCount: number
  introMessage?: string
  broadcastSection?: string
  status: "PENDING" | "ACTIVE" | "STOP"
  createdAt: string
  updatedAt: string
}

export type TTier =
  | "루키"
  | "워처"
  | "촉쟁이"
  | "예감러"
  | "분석자"
  | "인사이터"
  | "픽마스터"

// ============================================
// 2. Mission Types
// ============================================
export interface CreateMissionData {
  title: string
  type: "prediction" | "majority"
  format: "binary" | "multiple" | "couple" | "subjective" | "tournament"
  seasonType: "전체" | "기수별"
  seasonNumber?: string
  options?: string[]
  maleOptions?: string[]
  femaleOptions?: string[]
  placeholder?: string
  totalEpisodes?: number
  deadline: string
  resultVisibility: string
  referenceUrl?: string
  description?: string
  imageUrl?: string
  showId?: string
  category?: string
}

export interface TMission {
  id: string
  creatorId?: string
  creatorNickname?: string // 딜러 닉네임
  creatorTier?: string // 작성자 티어 (추가됨)
  kind: "predict" | "majority"
  form: "binary" | "multi" | "match" | "subjective" | "tournament"
  title: string
  description?: string
  seasonType?: "전체" | "기수별"
  showId?: string // 프로그램 ID (예: nasolo)
  category?: string // 프로그램 카테고리 (예: LOVE)
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
  thumbnailUrl?: string // 유튜브 썸네일 URL
  referenceUrl?: string // 원본 레퍼런스 URL (유튜브 링크 등)
  imageUrl?: string // 직접 업로드한 이미지 URL
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

// ============================================
// 10. Comment Types
// ============================================
export interface TComment {
  id: string
  missionId: string
  missionType: string // 'mission1' | 'mission2'
  userId: string
  userNickname: string
  userTier: TTier
  content: string
  parentId: string | null
  createdAt: string
  likesCount: number
  repliesCount: number
  isLiked: boolean // 현재 사용자가 좋아요를 눌렀는지 여부
  isDeleted: boolean
  replies?: TComment[] // 프론트엔드에서 구성할 대댓글 리스트
}
