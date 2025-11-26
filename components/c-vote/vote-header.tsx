import { Badge } from "@/components/c-ui/badge"
import { Clock, Users } from "lucide-react"
import type { TMission } from "@/types/t-vote/vote.types"

interface VoteHeaderProps {
  mission: TMission
}

export function VoteHeader({ TMission }: VoteHeaderProps) {
  const getFormBadgeText = (form: string) => {
    switch (form) {
      case "binary":
        return "?‘ì"
      case "multi":
        return "?¤ìˆ˜"
      case "match":
        return "ì»¤í”Œ"
      default:
        return form
    }
  }

  const getKindBadgeText = (kind: string) => {
    switch (kind) {
      case "predict":
        return "?ˆì¸¡??
      case "majority":
        return "?¤ìˆ˜??
      default:
        return kind
    }
  }

  const getPolicyBadgeText = (policy: string) => {
    switch (policy) {
      case "realtime":
        return "?¤ì‹œê°?
      case "onClose":
        return "ë§ˆê°??
      default:
        return policy
    }
  }

  const getTimeLeft = () => {
    const deadline = new Date(mission.deadline)
    const now = new Date()
    const diff = deadline.getTime() - now.getTime()

    if (diff <= 0) return "ë§ˆê°"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}??${hours}?œê°„`
    return `${hours}?œê°„`
  }

  return (
    <div className="space-y-4">
      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default" className="bg-pink-500 hover:bg-pink-600">
          {getKindBadgeText(mission.kind)}
        </Badge>
        <Badge variant="secondary">{getFormBadgeText(mission.form)}</Badge>
        <Badge
          variant="outline"
          className={
            mission.revealPolicy === "realtime"
              ? "border-green-500 text-green-700"
              : "border-orange-500 text-orange-700"
          }
        >
          {getPolicyBadgeText(mission.revealPolicy)}
        </Badge>
        {mission.status === "open" && (
          <Badge variant="outline" className="border-blue-500 text-blue-700">
            <Clock className="w-3 h-3 mr-1" />
            {getTimeLeft()} ?¨ìŒ
          </Badge>
        )}
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold text-foreground text-balance">{mission.title}</h1>

      {/* Description */}
      {mission.description && <p className="text-muted-foreground text-sm">{mission.description}</p>}

      {/* Stats */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span className="font-medium text-foreground">{mission.stats.participants.toLocaleString()}</span>ëª?ì°¸ì—¬
      </div>
    </div>
  )
}
