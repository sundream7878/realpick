"use client"
import { Button } from "@/components/c-ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import type { TMission } from "@/types/t-vote/vote.types"

interface SubmissionSheetProps {
  mission: TMission
  selectedChoice?: string
  selectedPairs?: Array<{ left: string; right: string }>
  onSubmit: () => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function SubmissionSheet({
  mission,
  selectedChoice,
  selectedPairs,
  onSubmit,
  onCancel,
  isSubmitting,
}: SubmissionSheetProps) {
  const getPolicyText = () => {
    if (mission.revealPolicy === "realtime") {
      return "실시간으로 중간 현황을 확인할 수 있습니다."
    }
    return "마감 후에 결과가 공개됩니다."
  }

  const getSelectionText = () => {
    if (mission.form === "match" && selectedPairs) {
      return selectedPairs.map((p) => `${p.left} - ${p.right}`).join(", ")
    }
    return selectedChoice || ""
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pb-24">
      <Card className="w-full max-w-md rounded-xl border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900">제출 확인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">선택한 항목:</p>
            <p className="font-semibold text-gray-900 bg-white/80 p-3 rounded-lg border border-rose-200">
              {getSelectionText()}
            </p>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200 space-y-2">
            <p className="text-sm font-semibold text-gray-900">안내사항</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 제출 후 변경이 불가능합니다</li>
              <li>• {getPolicyText()}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async () => {
                console.log("SubmissionSheet - 제출 버튼 클릭됨")
                if (isSubmitting) {
                  console.warn("SubmissionSheet - 이미 제출 중입니다")
                  return
                }
                try {
                  console.log("SubmissionSheet - onSubmit 호출 시작")
                  await onSubmit()
                  console.log("SubmissionSheet - onSubmit 완료")
                } catch (error) {
                  console.error("SubmissionSheet - 제출 에러:", error)
                  // 에러는 handleSubmitVote에서 이미 처리되므로 여기서는 로깅만
                }
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  제출 중...
                </div>
              ) : (
                "제출하기"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
