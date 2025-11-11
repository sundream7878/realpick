"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Check, X } from "lucide-react"

interface MyPicksModalProps {
  isOpen: boolean
  onClose: () => void
  userPredictions: Record<number, Array<{ left: string; right: string }>>
  finalAnswer: Array<{ left: string; right: string }>
}

export default function MyPicksModal({ isOpen, onClose, userPredictions, finalAnswer }: MyPicksModalProps) {
  const getScoreByRound = (round: number) => Math.max(100 - (round - 1) * 10, 30)

  const calculateRoundScore = (round: number, couples: Array<{ left: string; right: string }>) => {
    const pointsForRound = getScoreByRound(round)
    let score = 0
    const results: Array<{ couple: { left: string; right: string }; isCorrect: boolean; points: number }> = []

    for (const couple of couples) {
      const isCorrect = finalAnswer.some((answer) => answer.left === couple.left && answer.right === couple.right)
      const points = isCorrect ? pointsForRound : -pointsForRound
      score += points
      results.push({ couple, isCorrect, points })
    }

    return { score, results }
  }

  const totalScore = Object.entries(userPredictions).reduce((sum, [roundStr, couples]) => {
    const round = Number.parseInt(roundStr)
    const { score } = calculateRoundScore(round, couples)
    return sum + score
  }, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">내가 픽한 결과</DialogTitle>
          <p className="text-sm text-muted-foreground">회차별 커플 매칭 예측 내역과 점수입니다</p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {Object.entries(userPredictions)
            .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
            .map(([roundStr, couples]) => {
              const round = Number.parseInt(roundStr)
              const { score, results } = calculateRoundScore(round, couples)
              const pointsForRound = getScoreByRound(round)

              return (
                <Card key={round} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-base font-semibold">
                          {round}회차
                        </Badge>
                        <span className="text-sm text-muted-foreground">({pointsForRound}점 기준)</span>
                      </div>
                      <div
                        className={`text-lg font-bold ${score > 0 ? "text-green-600" : score < 0 ? "text-red-600" : "text-gray-600"}`}
                      >
                        {score > 0 ? "+" : ""}
                        {score}점
                      </div>
                    </div>

                    <div className="space-y-2">
                      {results.map(({ couple, isCorrect, points }, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isCorrect ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <X className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-medium">
                              {couple.left} ⟷ {couple.right}
                            </span>
                          </div>
                          <span className={`font-semibold ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                            {points > 0 ? "+" : ""}
                            {points}점
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">총 누적 점수</span>
                <span
                  className={`text-2xl font-bold ${totalScore > 0 ? "text-green-600" : totalScore < 0 ? "text-red-600" : "text-gray-600"}`}
                >
                  {totalScore > 0 ? "+" : ""}
                  {totalScore}점
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
