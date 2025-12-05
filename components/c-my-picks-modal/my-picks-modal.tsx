"use client"


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/c-ui/dialog"
import { Badge } from "@/components/c-ui/badge"
import { Card, CardContent } from "@/components/c-ui/card"
import { Check, X, Minus } from "lucide-react"
import { POINT_TABLE } from "@/lib/utils/u-points/matchPointSystem.util"

interface MyPicksModalProps {
  isOpen: boolean
  onClose: () => void
  userPredictions: Record<number, Array<{ left: string; right: string }>>
  finalAnswer: Array<{ left: string; right: string }>
  maxRounds?: number
}

export default function MyPicksModal({ isOpen, onClose, userPredictions, finalAnswer, maxRounds = 8 }: MyPicksModalProps) {

  const processedMaleIds = new Set<string>()

  // Calculate scores per couple based on streak logic
  const coupleResults = finalAnswer.map((finalCouple) => {
    const maleId = finalCouple.left
    const finalFemaleId = finalCouple.right
    processedMaleIds.add(maleId)

    // Check final round (Round 8)
    const finalRoundPicks = userPredictions[maxRounds] || []
    const finalPick = finalRoundPicks.find(p => p.left === maleId)
    const finalPickFemaleId = finalPick?.right

    const isFinalCorrect = finalPickFemaleId === finalFemaleId
    let rScore = maxRounds

    if (isFinalCorrect) {
      // Correct Streak: Find earliest round where streak started
      for (let r = maxRounds; r >= 1; r--) {
        const roundPicks = userPredictions[r] || []
        const roundPick = roundPicks.find(p => p.left === maleId)
        if (roundPick?.right !== finalFemaleId) {
          break
        }
        rScore = r
      }
    } else {
      // Incorrect Streak: Find earliest round where incorrect streak started
      for (let r = maxRounds; r >= 1; r--) {
        const roundPicks = userPredictions[r] || []
        const roundPick = roundPicks.find(p => p.left === maleId)
        if (roundPick?.right === finalFemaleId) {
          break
        }
        rScore = r
      }
    }

    const pointItem = POINT_TABLE.find(p => p.round === rScore)
    const points = isFinalCorrect ? (pointItem?.correct || 0) : (pointItem?.penalty || 0)

    return {
      maleId,
      finalFemaleId,
      userPickedFemaleId: finalPickFemaleId,
      isFinalCorrect,
      streakStartRound: rScore,
      points,
      history: Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => {
        const roundPicks = userPredictions[round] || []
        const pick = roundPicks.find(p => p.left === maleId)
        return {
          round,
          pickedFemaleId: pick?.right,
          isCorrect: pick?.right === finalFemaleId
        }
      })
    }
  })

  // Handle "Ghost Picks" (User picked a couple, but the male is actually single/not in final result)
  const finalRoundPicks = userPredictions[maxRounds] || []
  finalRoundPicks.forEach((pick) => {
    const maleId = pick.left
    if (!processedMaleIds.has(maleId)) {
      // User picked this male, but he is not in the final result (Single)
      // This is automatically an Incorrect Pick
      let rScore = maxRounds

      for (let r = maxRounds; r >= 1; r--) {
        const roundPicks = userPredictions[r] || []
        const roundPick = roundPicks.find(p => p.left === maleId)
        // If user didn't pick anyone for this male in round r, they were "correct" (or at least not wrong)
        // So the streak of "wrongly picking someone" stops.
        if (!roundPick) {
          break
        }
        rScore = r
      }

      const pointItem = POINT_TABLE.find(p => p.round === rScore)
      const points = pointItem?.penalty || 0

      coupleResults.push({
        maleId,
        finalFemaleId: undefined, // No final match
        userPickedFemaleId: pick.right,
        isFinalCorrect: false,
        streakStartRound: rScore,
        points,
        history: Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => {
          const roundPicks = userPredictions[round] || []
          const p = roundPicks.find(item => item.left === maleId)
          return {
            round,
            pickedFemaleId: p?.right,
            isCorrect: false // Always false since no final match
          }
        })
      })
    }
  })

  const successResults = coupleResults.filter(r => r.isFinalCorrect)
  const failureResults = coupleResults.filter(r => !r.isFinalCorrect)

  const successTotal = successResults.reduce((sum, res) => sum + res.points, 0)
  const failureTotal = failureResults.reduce((sum, res) => sum + res.points, 0)
  const totalScore = successTotal + failureTotal

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">내가 픽한 결과</DialogTitle>
          <p className="text-sm text-muted-foreground">최종 정답 기준 역주행 채점 결과입니다</p>
        </DialogHeader>

        <div className="space-y-8 mt-4">
          {/* Total Score Summary */}
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-purple-900">총 획득 포인트</h3>
                <p className="text-sm text-purple-700">성공(+{successTotal.toLocaleString()}) + 실패({failureTotal.toLocaleString()})</p>
              </div>
              <div className={`text-3xl font-black ${totalScore > 0 ? "text-green-600" : totalScore < 0 ? "text-red-600" : "text-gray-600"}`}>
                {totalScore > 0 ? "+" : ""}
                {totalScore.toLocaleString()} P
              </div>
            </CardContent>
          </Card>

          {/* Success Section */}
          {successResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xl font-bold text-green-700 flex items-center gap-2">
                  <Check className="w-6 h-6" />
                  성공한 픽
                </h3>
                <span className="text-lg font-bold text-green-600">+{successTotal.toLocaleString()} P</span>
              </div>
              {successResults.map((result, index) => (
                <ResultCard key={`success-${index}`} result={result} />
              ))}
            </div>
          )}

          {/* Failure Section */}
          {failureResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xl font-bold text-red-700 flex items-center gap-2">
                  <X className="w-6 h-6" />
                  실패한 픽
                </h3>
                <span className="text-lg font-bold text-red-600">{failureTotal.toLocaleString()} P</span>
              </div>
              {failureResults.map((result, index) => (
                <ResultCard key={`failure-${index}`} result={result} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResultCard({ result }: { result: any }) {
  // Determine display female: Final Answer (if exists) or User Pick (if Ghost Pick)
  const displayFemaleId = result.finalFemaleId || result.userPickedFemaleId

  return (
    <Card className={`border-2 overflow-hidden ${result.isFinalCorrect ? "border-green-100" : "border-red-100"}`}>
      <div className={`p-4 flex items-center justify-between ${result.isFinalCorrect ? "bg-green-50" : "bg-red-50"}`}>
        <div className="flex items-center gap-3">
          <Badge className={`text-sm px-2 py-1 ${result.isFinalCorrect ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
            {result.isFinalCorrect ? "성공" : "실패"}
          </Badge>
          <span className="font-bold text-lg text-gray-800">
            {result.maleId} ❤️ {displayFemaleId}
            {!result.finalFemaleId && <span className="text-xs ml-2 text-red-500">(실제: 미매칭)</span>}
          </span>
        </div>
        <div className={`text-xl font-bold ${result.points > 0 ? "text-green-600" : "text-red-600"}`}>
          {result.points > 0 ? "+" : ""}
          {result.points} P
        </div>
      </div>

      <CardContent className="p-4 bg-white">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {result.isFinalCorrect
              ? `🎉 ${result.streakStartRound}회차부터 계속 정답을 맞췄어요!`
              : `😢 ${result.streakStartRound}회차부터 정답을 놓쳤어요...`}
          </p>
        </div>

        {/* History Timeline */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar">
          {result.history.map((h: any) => {
            const isStreak = h.round >= result.streakStartRound
            const isCorrect = h.isCorrect

            // Determine style based on state
            let circleStyle = "bg-gray-50 border-gray-200 text-gray-300" // Default (Past Wrong)
            let Icon = null

            if (result.isFinalCorrect) {
              if (isStreak) {
                // Active Success Streak
                circleStyle = "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-200"
                Icon = Check
              } else if (isCorrect) {
                // Past Correct (Broken Streak)
                circleStyle = "bg-gray-50 border-gray-400 text-gray-400"
                Icon = Check
              } else {
                // Past Wrong
                circleStyle = "bg-gray-50 border-gray-200"
                Icon = null
              }
            } else {
              if (isStreak) {
                // Active Failure Streak
                circleStyle = "bg-red-100 border-red-500 text-red-700 ring-2 ring-red-200"
                Icon = X
              } else if (isCorrect) {
                // Past Correct (Broken Streak)
                circleStyle = "bg-gray-50 border-gray-400 text-gray-400"
                Icon = Check
              } else {
                // Past Wrong
                circleStyle = "bg-gray-50 border-gray-200"
                Icon = null
              }
            }

            return (
              <div key={h.round} className="flex flex-col items-center min-w-[2.5rem]">
                <div className="text-xs text-gray-400 mb-1">{h.round}회</div>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold mb-1 transition-all ${circleStyle}`}
                  title={h.pickedFemaleId || "미참여"}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
