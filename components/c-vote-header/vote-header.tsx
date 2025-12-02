import { Badge } from "@/components/c-ui/badge"
import { Clock } from "lucide-react"
import type { TMissionData } from "@/types/t-mission/mission.types"

interface VoteHeaderProps {
  mission: TMissionData
}

export function VoteHeader({ mission }: VoteHeaderProps) {
  const getTypeBadge = () => {
    if (mission.type === "prediction") {
      return <Badge className="bg-blue-500 text-white">예측픽</Badge>
    }
    return <Badge className="bg-purple-500 text-white">공감픽</Badge>
  }

  const getStatusBadge = () => {
    if (mission.status === "live") {
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          실시간 공개
        </Badge>
      )
    }
    if (mission.status === "onclose") {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          마감 후 공개
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-gray-500 text-gray-600">
        실시간 공개
      </Badge>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {getTypeBadge()}
        {getStatusBadge()}
      </div>

      <h1 className="text-xl font-bold text-balance">{mission.title}</h1>

      {mission.timeLeft && mission.status !== "done" && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>마감까지 {mission.timeLeft}</span>
        </div>
      )}
    </div>
  )
}

