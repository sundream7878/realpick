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

  // 현재 탭에서의 커스텀 이벤트 리스너
  const handleStatusUpdate = (event: any) => {
    const { statuses } = event.detail || {}
    if (statuses) {
      setShowStatuses(statuses)
    }
  }

  // 다른 탭에서의 localStorage 변경 감지
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'show-statuses-update' && event.newValue) {
      try {
        const data = JSON.parse(event.newValue)
        if (data.statuses) {
          setShowStatuses(data.statuses)
        }
      } catch (err) {
        console.error("Failed to parse show statuses update", err)
      }
    }
  }

  window.addEventListener('show-statuses-updated', handleStatusUpdate)
  window.addEventListener('storage', handleStorageChange)
  
  // cleanup 함수 반환
  return () => {
    window.removeEventListener('show-statuses-updated', handleStatusUpdate)
    window.removeEventListener('storage', handleStorageChange)
  }
}

