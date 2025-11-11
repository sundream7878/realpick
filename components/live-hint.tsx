interface LiveHintProps {
  show: boolean
}

export function LiveHint({ show }: LiveHintProps) {
  if (!show) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p className="text-sm text-blue-700 text-center">중간 현황! 최종 결과는 마감 후 확정돼요</p>
    </div>
  )
}
