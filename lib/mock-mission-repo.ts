// ⚠️ DEPRECATED: 이 파일은 하위 호환성을 위해 유지됩니다.
// 새 코드는 lib/utils/u-mock-mission-repo/mock-mission-repo.util.ts에서 import하세요.
export * from "./utils/u-mock-mission-repo/mock-mission-repo.util"

const mockMissions: Record<string, TMissionData> = {
  live: {
    id: "live",
    title: "광수의 리액션, 매너 좋다 vs 눈치 없다",
    type: "prediction",
    status: "live",
    imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-LUTNNFq1X0nngumz3c9rPYeGJPsZuP.png",
    choices: [
      { id: "good", text: "매너 좋다", percentage: 62 },
      { id: "bad", text: "눈치 없다", percentage: 38 },
    ],
    timeLeft: "2일 3시간",
    userChoice: "good",
  },
  onclose: {
    id: "onclose",
    title: "광수의 리액션, 매너 좋다 vs 눈치 없다",
    type: "majority",
    status: "onclose",
    imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-LUTNNFq1X0nngumz3c9rPYeGJPsZuP.png",
    choices: [
      { id: "good", text: "매너 좋다" },
      { id: "bad", text: "눈치 없다" },
    ],
    timeLeft: "2일 3시간",
  },
  done: {
    id: "done",
    title: "광수의 리액션, 매너 좋다 vs 눈치 없다",
    type: "prediction",
    status: "done",
    imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-LUTNNFq1X0nngumz3c9rPYeGJPsZuP.png",
    choices: [
      { id: "good", text: "매너 좋다", percentage: 62 },
      { id: "bad", text: "눈치 없다", percentage: 38 },
    ],
    distribution: { good: 62, bad: 38 },
    userChoice: "good",
    correct: "good",
    majority: "good",
  },
  interactive: {
    id: "interactive",
    title: "광수의 리액션, 매너 좋다 vs 눈치 없다",
    type: "prediction",
    status: "live",
    imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-LUTNNFq1X0nngumz3c9rPYeGJPsZuP.png",
    choices: [
      { id: "good", text: "매너 좋다" },
      { id: "bad", text: "눈치 없다" },
    ],
    timeLeft: "2일 3시간",
  },
}

export class MockMissionRepo {
  static getMission(id: string): TMissionData | null {
    return mockMissions[id] || null
  }

  static submitVote(missionId: string, choiceId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (mockMissions[missionId]) {
          mockMissions[missionId].userChoice = choiceId

          if (mockMissions[missionId].status === "onclose") {
            mockMissions[missionId].status = "live"
            mockMissions[missionId].choices = mockMissions[missionId].choices.map((choice) => ({
              ...choice,
              percentage: choice.id === choiceId ? 65 : 35,
            }))
          }
        }
        resolve(true)
      }, 1000)
    })
  }
}
