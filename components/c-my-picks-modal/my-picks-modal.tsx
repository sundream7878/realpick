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

  // Calculate scores per couple based on streak logic
  const coupleResults = finalAnswer.map((finalCouple) => {
    const maleId = finalCouple.left
    const finalFemaleId = finalCouple.right

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

  const totalScore = coupleResults.reduce((sum, res) => sum + res.points, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">내가 픽한 결과</DialogTitle>
          <p className="text-sm text-muted-foreground">최종 정답 기준 역주행 채점 결과입니다</p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Total Score Card */}
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-purple-900">총 획득 포인트</h3>
                <p className="text-sm text-purple-700">모든 커플 매칭 점수 합계</p>
              </div>
              <div className={`text-3xl font-black ${totalScore > 0 ? "text-green-600" : totalScore < 0 ? "text-red-600" : "text-gray-600"}`}>
                {totalScore > 0 ? "+" : ""}
                {totalScore.toLocaleString()} P
              </div>
            </CardContent>
          </Card>

          {/* Couple Results List */}
          <div className="space-y-4">
            {coupleResults.map((result, index) => (
              <Card key={index} className={`border-2 overflow-hidden ${result.isFinalCorrect ? "border-green-100" : "border-red-100"}`}>
                <div className={`p-4 flex items-center justify-between ${result.isFinalCorrect ? "bg-green-50" : "bg-red-50"}`}>
                  <div className="flex items-center gap-3">
                    <Badge className={`text-sm px-2 py-1 ${result.isFinalCorrect ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
                      {result.isFinalCorrect ? "성공" : "실패"}
                    </Badge>
                    <span className="font-bold text-lg text-gray-800">
                      {result.maleId} ❤️ {result.finalFemaleId}
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
                    {result.history.map((h) => (
                      <div key={h.round} className="flex flex-col items-center min-w-[3rem]">
                        <div className="text-xs text-gray-400 mb-1">{h.round}회</div>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold mb-1
                            ${h.isCorrect
                              ? "bg-green-100 border-green-300 text-green-700"
                              : h.pickedFemaleId
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-gray-50 border-gray-200 text-gray-400"
                            }
                            ${h.round >= result.streakStartRound ? "ring-2 ring-offset-1 " + (result.isFinalCorrect ? "ring-green-400" : "ring-red-400") : ""}
                          `}
                          title={h.pickedFemaleId || "미참여"}
                        >
                          {h.isCorrect ? <Check className="w-4 h-4" /> : h.pickedFemaleId ? <X className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[3rem] text-center">
                          {h.pickedFemaleId || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

