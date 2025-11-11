interface ClosingProgressProps {
  show: boolean
  timeLeft?: string
}

export function ClosingProgress({ show, timeLeft }: ClosingProgressProps) {
  if (!show) return null

  return (
    <div className="space-y-2">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <p className="text-sm text-orange-700 text-center">투표가 마감되었습니다. 결과 집계 중...</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-orange-500 h-2 rounded-full w-3/4 animate-pulse"></div>
      </div>
    </div>
  )
}
