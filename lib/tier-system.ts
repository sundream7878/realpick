// Tier system configuration for RealPick
// ⚠️ DEPRECATED: 이 파일은 하위 호환성을 위해 유지됩니다.
// 타입은 types/t-tier/tier.types.ts에서, 함수는 lib/utils/u-tier-system/tierSystem.util.ts에서 import하세요.

export type { TTierInfo as TierInfo } from "@/types/t-tier/tier.types"
export { TIERS, getTierFromPoints, getGradeFromPoints, getTierImageFromPoints } from "./utils/u-tier-system/tierSystem.util"
