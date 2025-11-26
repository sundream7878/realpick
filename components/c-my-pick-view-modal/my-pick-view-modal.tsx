"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/c-ui/dialog"
import { Badge } from "@/components/c-ui/badge"
import { Check, Heart } from "lucide-react"
import type { TMission, TVoteSubmission } from "@/types/t-vote/vote.types"

interface MyPickViewModalProps {
  isOpen: boolean
  onClose: () => void
  mission: TMission
  userVote: TVoteSubmission | null
}

export default function MyPickViewModal({ isOpen, onClose, mission, userVote }: MyPickViewModalProps) {
  if (!userVote) return null

  const renderBinaryView = () => {
    return (
      <div className="space-y-3">
        {mission.options?.map((option) => {
          const isSelected = userVote.choice === option
          return (
            <div
              key={option}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected ? "border-pink-500 bg-pink-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{option}</span>
                {isSelected && (
                  <Badge className="bg-pink-500 text-white">
                    <Check className="w-3 h-3 mr-1" />내 픽
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderMultiView = () => {
    const selectedChoices = Array.isArray(userVote.choice) ? userVote.choice : [userVote.choice]

    return (
      <div className="space-y-3">
        {mission.options?.map((option) => {
          const isSelected = selectedChoices.includes(option)
          return (
            <div
              key={option}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected ? "border-pink-500 bg-pink-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{option}</span>
                {isSelected && (
                  <Badge className="bg-pink-500 text-white">
                    <Check className="w-3 h-3 mr-1" />내 픽
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderMatchView = () => {
    const userPredictions = userVote.matchPredictions || {}

    return (
      <div className="space-y-4">
        {Object.entries(userPredictions).map(([round, couples]) => (
          <div key={round} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-gray-900">{round}회차</span>
              <Badge variant="secondary" className="text-xs">
                {Array.isArray(couples) ? couples.length : 0}쌍 예측
              </Badge>
            </div>
            <div className="space-y-2">
              {Array.isArray(couples) &&
                couples.map((couple, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-pink-200">
                    <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                    <span className="font-medium text-gray-900">
                      {couple.left} ↔ {couple.right}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">내가 픽한 내역</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">{mission.title}</p>
        </DialogHeader>

        <div className="mt-4">
          {mission.form === "binary" && renderBinaryView()}
          {mission.form === "multi" && renderMultiView()}
          {mission.form === "match" && renderMatchView()}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            픽 완료일: {new Date(userVote.submittedAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

