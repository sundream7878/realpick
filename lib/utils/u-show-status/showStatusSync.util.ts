/**
 * 프로그램 상태 실시간 동기화 유틸리티
 * 관리자 페이지에서 상태 변경 시 모든 페이지에 즉시 반영
 */

export function setupShowStatusSync(
  setShowStatuses: (statuses: Record<string, string>) => void
): () => void {
  const loadShowStatuses = () => {
    fetch('/api/public/shows')
      .then(res => res.json())
      .then(data => setShowStatuses(data.statuses || {}))
      .catch(err => console.error("Failed to fetch show statuses", err))
  }
  
  loadShowStatuses()

  // 실시간 업데이트 이벤트 리스너
  const handleStatusUpdate = (event: any) => {
    const { statuses } = event.detail || {}
    if (statuses) {
      setShowStatuses(statuses)
    }
  }

  window.addEventListener('show-statuses-updated', handleStatusUpdate)
  
  // cleanup 함수 반환
  return () => window.removeEventListener('show-statuses-updated', handleStatusUpdate)
}

