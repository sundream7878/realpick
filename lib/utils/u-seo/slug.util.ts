/**
 * 제목을 URL에 적합한 슬러그로 변환합니다.
 * 예: "나는 솔로 22기 최종 예측" -> "nasolo-22-final-predict"
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, '') // 특수문자 제거
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .replace(/-+/g, '-') // 중복 하이픈 제거
    .trim()
}
