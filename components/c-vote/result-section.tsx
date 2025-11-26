import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Progress } from "@/components/c-ui/progress"
import type { TMission } from "@/types/t-vote/vote.types"
import { getSuccessComment } from "@/lib/mock-vote-data"

interface ResultSectionProps {
  mission: TMission
  userChoice?: string
  userPairs?: Array<{ left: string; right: string }>
  userId: string
}

export function ResultSection({ mission, userChoice, userPairs, userId }: ResultSectionProps) {
  const isOpen = mission.status === "open"
  const isRealtime = mission.revealPolicy === "realtime"
  const shouldShowResults = !isOpen || isRealtime

  if (isOpen && !isRealtime) {
    return null
  }

  // For open + realtime missions, show interim results
  if (isOpen && isRealtime) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">중간 현황</CardTitle>
          <p className="text-sm text-muted-foreground">중간 현황입니다. 최종 결과는 마감 후 확정돼요.</p>
        </CardHeader>
        <CardContent>
          <ResultChart mission={mission} userChoice={userChoice} userPairs={userPairs} />
        </CardContent>
      </Card>
    )
  }

  // For settled missions, show final results
  if (!isOpen) {
    const isSuccess = getIsSuccess(mission, userChoice, userPairs)
    const commentType = getCommentType(mission, isSuccess)
    const comment = getSuccessComment(userId, mission.id, commentType)

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">최종 결과</CardTitle>
            {mission.result?.correct && (
              <Badge variant="default" className="w-fit">
                정답: {mission.result.correct}
              </Badge>
            )}
            {mission.result?.majority && (
              <Badge variant="default" className="w-fit">
                최종 다수: {mission.result.majority}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {mission.result?.distribution ? (
              <ResultChart mission={mission} userChoice={userChoice} userPairs={userPairs} highlight />
            ) : (
              <div className="text-center text-muted-foreground py-4">
                아직 집계된 결과가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success/Failure Banner */}
        {comment && (
          <Card
            className={isSuccess ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}
            style={{
              borderColor: isSuccess ? "#22C55E" : "#EF4444",
              backgroundColor: isSuccess ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            }}
          >
            <CardContent className="p-4">
              <p className="text-sm font-medium" style={{ color: isSuccess ? "#22C55E" : "#EF4444" }}>
                {comment}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return null
}

function ResultChart({
  mission,
  userChoice,
  userPairs,
  highlight = false,
}: {
  mission: TMission
  userChoice?: string
  userPairs?: Array<{ left: string; right: string }>
  highlight?: boolean
}) {
  if (!mission.result?.distribution) return null

  const entries = Object.entries(mission.result.distribution).sort(([, a], [, b]) => b - a)

  if (mission.form === "binary") {
    return (
      <div className="space-y-3">
        {entries.map(([option, percentage]) => (
          <div key={option} className="space-y-2">
            <div className="flex justify-between items-center">
              <span
                className={`font-medium ${highlight && userChoice === option ? "text-blue-600" : "text-foreground"}`}
              >
                {option}
              </span>
              <span className="text-sm font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        ))}
      </div>
    )
  }

  if (mission.form === "multi") {
    return (
      <div className="space-y-3">
        {entries.map(([option, percentage]) => (
          <div key={option} className="space-y-2">
            <div className="flex justify-between items-center">
              <span
                className={`font-medium ${highlight && userChoice === option ? "text-blue-600" : "text-foreground"}`}
              >
                {option}
              </span>
              <span className="text-sm font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        ))}
      </div>
    )
  }

  if (mission.form === "match") {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-foreground">커플 랭킹</h4>
        {entries.map(([pair, percentage], index) => (
          <div key={pair} className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                {index + 1}
              </Badge>
              <span
                className={`font-medium ${
                  highlight && userPairs?.some((p) => `${p.left}-${p.right}` === pair)
                    ? "text-blue-600"
                    : "text-foreground"
                }`}
              >
                {pair}
              </span>
            </div>
            <span className="text-sm font-medium">{percentage}%</span>
          </div>
        ))}
      </div>
    )
  }

  return null
}

function getIsSuccess(
  mission: TMission,
  userChoice?: string,
  userPairs?: Array<{ left: string; right: string }>,
): boolean {
  if (mission.kind === "predict") {
    if (mission.form === "match") {
      return userPairs?.some((p) => `${p.left}-${p.right}` === mission.result?.correct) || false
    }
    return userChoice === mission.result?.correct
  }

  if (mission.kind === "majority") {
    if (!mission.result?.distribution) return false

    // Find the option with the highest percentage
    const entries = Object.entries(mission.result.distribution)
    if (entries.length === 0) return false

    const [actualMajority] = entries.reduce((max, current) => (current[1] > max[1] ? current : max))

    if (mission.form === "match") {
      return userPairs?.some((p) => `${p.left}-${p.right}` === actualMajority) || false
    }
    return userChoice === actualMajority
  }

  return false
}

function getCommentType(mission: TMission, isSuccess: boolean): string {
  if (mission.kind === "predict") {
    return isSuccess ? "predict-success" : "predict-fail"
  }
  return isSuccess ? "majority-success" : "majority-fail"
}
