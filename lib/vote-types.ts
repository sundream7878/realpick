// RealPick Type Definitions (v9 - plan.md 기반)
// 마지막 업데이트: 2025-01-13
// 
// ⚠️ DEPRECATED: 이 파일은 하위 호환성을 위해 유지됩니다.
// 새 코드는 types/t-vote/vote.types.ts에서 타입을 import하세요.

// 새 타입 파일에서 re-export
export type {
  TUser as User,
  TTier as Tier,
  TMission as Mission,
  TMatchPairs as MatchPairs,
  TMissionResult as MissionResult,
  TEpisode as Episode,
  TEpisodeStatus as EpisodeStatus,
  TVote as Vote,
  TVoteSubmission as VoteSubmission,
  TMatchPick as MatchPick,
  TEpisodePick as EpisodePick,
  TResult as Result,
  TPointLog as PointLog,
  TSuccessComment as SuccessComment,
} from "@/types/t-vote/vote.types"

// ============================================
// 9. Utility Functions
// ============================================
// ⚠️ DEPRECATED: 유틸리티 함수는 lib/utils/u-vote/vote.util.ts로 이동되었습니다.
export {
  getScoreByEpisode,
  findFirstCorrectEpisode,
  getTierByPoints,
  calculateBinaryMultiPoints,
  calculateMatchPoints,
} from "./utils/u-vote/vote.util"
