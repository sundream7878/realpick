/**
 * 시간 관련 유틸리티 함수
 */

/**
 * 마감까지 남은 시간을 계산하여 문자열로 반환
 * @param deadline ISO 8601 형식의 마감 시간
 * @returns "X일 Y시간 남음" 또는 "X시간 Y분 남음" 또는 "마감됨"
 */
export function getTimeRemaining(deadline: string): string {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate.getTime() - now.getTime()

  // 이미 마감된 경우
  if (diff <= 0) {
    return "마감됨"
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}일 ${hours}시간 남음`
  } else if (hours > 0) {
    return `${hours}시간 ${minutes}분 남음`
  } else {
    return `${minutes}분 남음`
  }
}

/**
 * 마감 시간이 지났는지 확인
 * @param deadline ISO 8601 형식의 마감 시간
 * @returns 마감 시간이 지났으면 true
 */
export function isDeadlinePassed(deadline: string): boolean {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  return deadlineDate.getTime() <= now.getTime()
}

/**
 * D-Day 계산 (날짜 기준)
 * @param deadline ISO 8601 형식의 마감 시간
 * @returns "D-3" 형태의 문자열
 */
export function getDDay(deadline: string): string {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate.getTime() - now.getTime()

  // 이미 마감된 경우
  if (diff <= 0) {
    return "D-Day"
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return "D-Day"
  }
  
  return `D-${days}`
}

