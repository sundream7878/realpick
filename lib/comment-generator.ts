const PREDICTION_SUCCESS_COMMENTS = [
  "당신의 직감이 정확했어요!",
  "예측 성공! 연애 촉이 날카롭네요 🎯",
  "이번에도 결과를 꿰뚫어봤군요 ✨",
  "정확한 예측! 당신은 연애의 점술가 🔮",
  "연애 레이더 ON! 정답 적중!",
]

const PREDICTION_FAILURE_COMMENTS = [
  "이번엔 예측이 빗나갔지만, 시도 자체가 멋졌습니다 💪",
  "결과는 달랐지만, 도전하는 눈빛이 돋보였어요 👀",
  "촉이 흔들렸지만, 경험이 또 하나 쌓였네요 📚",
  "당장은 틀려도, 언젠간 통찰이 빛을 발할 겁니다 💡",
  "연애는 늘 예측 불허, 다음 기회에 또 도전하세요 🚀",
]

const MAJORITY_SUCCESS_COMMENTS = [
  "집단지성과 함께했네요!",
  "당신의 선택 = 대중의 선택 👥",
  "이번에는 다수의 마음을 읽었군요 💭",
  "공감력 만점! 모두와 같은 흐름을 탔네요! 🌊",
  "다수의 흐름을 제대로 캐치했습니다 📡",
]

const MAJORITY_FAILURE_COMMENTS = [
  "공감대는 놓쳤지만, 독창적인 해석을 보여줬습니다",
  "다수와는 달랐지만, 당신의 시선이 특별합니다 ⭐",
  "모두와 다르게 생각했지만, 그것도 용기 있는 선택이에요 💪",
  "소수의 길을 걸었지만, 언젠가 그 선택이 빛날 겁니다 ✨",
  "다수와 달랐지만, 차별화된 눈으로 바라봤군요 👁️",
]

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export function getRandomComment(
  userId: string,
  missionId: string,
  type: "prediction" | "majority",
  success: boolean,
): string {
  const seed = `${userId}:${missionId}`
  const hash = simpleHash(seed)

  let comments: string[]
  if (type === "prediction") {
    comments = success ? PREDICTION_SUCCESS_COMMENTS : PREDICTION_FAILURE_COMMENTS
  } else {
    comments = success ? MAJORITY_SUCCESS_COMMENTS : MAJORITY_FAILURE_COMMENTS
  }

  return comments[hash % comments.length]
}
