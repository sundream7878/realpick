// Mission data type definitions for RealPick
export interface TMissionData {
  id: string
  title: string
  type: "prediction" | "majority"
  status: "live" | "onclose" | "done"
  imageUrl: string
  choices: {
    id: string
    text: string
    percentage?: number
  }[]
  timeLeft?: string
  distribution?: { [key: string]: number }
  userChoice?: string
  correct?: string
  majority?: string
}

// Legacy Type Export (하위 호환성)
export type MissionData = TMissionData

