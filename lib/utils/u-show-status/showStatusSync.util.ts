/**
 * 프로그램 상태 실시간 동기화 유틸리티
 * 관리자 페이지에서 상태 변경 시 모든 페이지에 즉시 반영
 */

export function setupShowStatusSync(
  setShowStatuses: (statuses: Record<string, string>) => void,
  setShowVisibility?: (visibility: Record<string, boolean>) => void,
  setCustomShows?: (shows: any[]) => void
): () => void {
  const loadData = () => {
    fetch('/api/public/shows')
      .then(res => res.json())
      .then(data => {
        if (data.statuses) setShowStatuses(data.statuses)
        if (data.visibility && setShowVisibility) setShowVisibility(data.visibility)
        if (setCustomShows) setCustomShows(Array.isArray(data.customShows) ? data.customShows : [])
      })
      .catch(err => console.error("Failed to fetch show data", err))
  }
  
  loadData()

  // 상태 업데이트 핸들러
  const handleStatusUpdate = (event: any) => {
    const { statuses } = event.detail || {}
    if (statuses) setShowStatuses(statuses)
  }

  // 가시성 업데이트 핸들러
  const handleVisibilityUpdate = (event: any) => {
    const { visibility } = event.detail || {}
    if (visibility && setShowVisibility) setShowVisibility(visibility)
  }

  // 커스텀 프로그램 업데이트 핸들러
  const handleCustomShowsUpdate = (event: any) => {
    const { shows } = event.detail || {}
    if (setCustomShows) setCustomShows(Array.isArray(shows) ? shows : [])
  }

  // localStorage 변경 감지 (다른 탭)
  const handleStorageChange = (event: StorageEvent) => {
    if (!event.newValue) return

    try {
      const data = JSON.parse(event.newValue)
      if (event.key === 'show-statuses-update' && data.statuses) {
        setShowStatuses(data.statuses)
      } else if (event.key === 'show-visibility-update' && data.visibility && setShowVisibility) {
        setShowVisibility(data.visibility)
      } else if (event.key === 'custom-shows-update' && setCustomShows) {
        setCustomShows(Array.isArray(data.shows) ? data.shows : [])
      }
    } catch (err) {
      console.error("Failed to parse storage update", err)
    }
  }

  window.addEventListener('show-statuses-updated', handleStatusUpdate)
  window.addEventListener('show-visibility-updated', handleVisibilityUpdate)
  window.addEventListener('custom-shows-updated', handleCustomShowsUpdate)
  window.addEventListener('storage', handleStorageChange)
  
  return () => {
    window.removeEventListener('show-statuses-updated', handleStatusUpdate)
    window.removeEventListener('show-visibility-updated', handleVisibilityUpdate)
    window.removeEventListener('custom-shows-updated', handleCustomShowsUpdate)
    window.removeEventListener('storage', handleStorageChange)
  }
}

