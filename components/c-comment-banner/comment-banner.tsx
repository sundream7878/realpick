import { getRandomComment } from "@/lib/utils/u-comment-generator/commentGenerator.util"
import type { TMissionData } from "@/types/t-mission/mission.types"

interface CommentBannerProps {
  mission: TMissionData
  userId: string
}

export function CommentBanner({ mission, userId }: CommentBannerProps) {
  if (mission.status !== "done" || !mission.userChoice) return null

  const isSuccess =
    mission.type === "prediction" ? mission.userChoice === mission.correct : mission.userChoice === mission.majority

  const comment = getRandomComment(userId, mission.id, mission.type, isSuccess)

  return (
    <div
      className={`rounded-lg p-4 ${
        isSuccess ? "bg-blue-50 border border-blue-200" : "bg-red-50 border border-red-200"
      }`}
    >
      <div className="text-center">
        <div className={`text-lg font-bold mb-2 ${isSuccess ? "text-blue-700" : "text-red-700"}`}>
          {isSuccess ? "성공!" : "아쉬워요"}
        </div>
        <p className={`text-sm ${isSuccess ? "text-blue-600" : "text-red-600"}`}>{comment}</p>
      </div>
    </div>
  )
}

