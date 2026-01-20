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
    console.log('[ShowStatusSync] 데이터 로드 시작...')
    // 캐시 무효화를 위해 timestamp 추가 + fetch 옵션으로 캐시 완전 무시
    fetch(`/api/public/shows?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
      .then(res => {
        console.log('[ShowStatusSync] 응답 수신:', res.status, res.headers.get('cache-control'))
        return res.json()
      })
      .then(data => {
        console.log('[ShowStatusSync] 데이터 로드 완료:', data)
        if (data.statuses) {
          console.log('[ShowStatusSync] 상태 업데이트:', data.statuses)
          setShowStatuses(data.statuses)
        }
        if (data.visibility && setShowVisibility) {
          console.log('[ShowStatusSync] 가시성 업데이트:', data.visibility)
          setShowVisibility(data.visibility)
        }
        if (setCustomShows) {
          console.log('[ShowStatusSync] 커스텀 프로그램 업데이트:', data.customShows)
          setCustomShows(Array.isArray(data.customShows) ? data.customShows : [])
        }
      })
      .catch(err => {
        console.error('[ShowStatusSync] 데이터 로드 실패:', err)
      })
  }
  
  // 초기 로드
  loadData()

  // 상태 업데이트 핸들러
  const handleStatusUpdate = (event: any) => {
    const { statuses } = event.detail || {}
    console.log('[ShowStatusSync] 상태 업데이트 이벤트 수신:', statuses)
    if (statuses) setShowStatuses(statuses)
  }

  // 가시성 업데이트 핸들러
  const handleVisibilityUpdate = (event: any) => {
    const { visibility } = event.detail || {}
    console.log('[ShowStatusSync] 가시성 업데이트 이벤트 수신:', visibility)
    if (visibility && setShowVisibility) setShowVisibility(visibility)
  }

  // 커스텀 프로그램 업데이트 핸들러
  const handleCustomShowsUpdate = (event: any) => {
    const { shows } = event.detail || {}
    console.log('[ShowStatusSync] 커스텀 프로그램 업데이트 이벤트 수신:', shows)
    if (setCustomShows) setCustomShows(Array.isArray(shows) ? shows : [])
  }

  // localStorage 변경 감지 (다른 탭)
  const handleStorageChange = (event: StorageEvent) => {
    if (!event.newValue) return

    try {
      const data = JSON.parse(event.newValue)
      console.log('[ShowStatusSync] localStorage 변경 감지:', event.key, data)
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

  // 페이지로 돌아올 때 (focus) 자동으로 다시 로드
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      console.log('[ShowStatusSync] 페이지 다시 표시됨, 데이터 재로드...')
      loadData()
    }
  }

  // 페이지가 포커스를 받을 때도 다시 로드
  const handleFocus = () => {
    console.log('[ShowStatusSync] 페이지 포커스 받음, 데이터 재로드...')
    loadData()
  }

  window.addEventListener('show-statuses-updated', handleStatusUpdate)
  window.addEventListener('show-visibility-updated', handleVisibilityUpdate)
  window.addEventListener('custom-shows-updated', handleCustomShowsUpdate)
  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleFocus)
  
  return () => {
    window.removeEventListener('show-statuses-updated', handleStatusUpdate)
    window.removeEventListener('show-visibility-updated', handleVisibilityUpdate)
    window.removeEventListener('custom-shows-updated', handleCustomShowsUpdate)
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
  }
}

