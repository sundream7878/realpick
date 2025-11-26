/**
 * 포인트를 포맷팅하는 유틸리티 함수
 * @param points 포인트 숫자
 * @param compact 모바일용 축약 형식 사용 여부 (1000 이상일 때 K 단위)
 * @returns 포맷팅된 포인트 문자열
 */
export function formatPoints(points: number, compact: boolean = false): string {
  if (compact && points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`
  }
  return points.toLocaleString()
}

/**
 * 포인트를 P 접미사와 함께 포맷팅
 * @param points 포인트 숫자
 * @returns "1,250P" 형식의 문자열
 */
export function formatPointsWithSuffix(points: number): string {
  return `${formatPoints(points)}P`
}

