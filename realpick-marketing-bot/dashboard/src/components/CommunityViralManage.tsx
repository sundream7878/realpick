
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Search, MessageSquare, ExternalLink, RefreshCw, Loader2, CheckCircle2, Trash2, Calendar, X, ChevronDown, LogIn, Lock, User } from "lucide-react"
import { AutoCommentButton } from "./AutoCommentButton"
import { useToast } from "../hooks/useToast"
import { getShowById, SHOWS, CATEGORIES } from "../lib/shows"
import type { TShow } from "../lib/shows"
import { Input } from "./ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"

interface ViralPost {
  id: string
  source: string
  sourceName: string
  title: string
  content: string
  url: string
  viewCount: number
  commentCount: number
  showId: string
  suggestedComment: string
  status: "pending" | "completed"
  publishedAt: string
  createdAt: string
}

interface CrawlProgress {
  id: string
  status: "running" | "processing" | "completed" | "failed"
  current: number
  total: number
  message: string
  startedAt?: string
  completedAt?: string
  logs?: Array<{ timestamp: string; message: string }>
}

export function CommunityViralManage() {
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<CrawlProgress | null>(null)
  const [progressId, setProgressId] = useState<string | null>(null)
  const [limit, setLimit] = useState<number>(10) // 테스트용 기본값 10개
  const [selectedShows, setSelectedShows] = useState<TShow[]>([]) // 선택된 프로그램들
  const [isDropdownOpen, setIsDropdownOpen] = useState(false) // 드롭다운 열림 상태
  const [selectedSites, setSelectedSites] = useState<string[]>([]) // 선택된 커뮤니티들
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false) // 커뮤니티 드롭다운 열림 상태
  const [isManualLoggingIn, setIsManualLoggingIn] = useState<string | null>(null)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [currentLoginSite, setCurrentLoginSite] = useState<{id: string, name: string, url: string} | null>(null)
  const [loginId, setLoginId] = useState("")
  const [loginPw, setLoginPw] = useState("")
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1) // 기본값: 1일 전
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0] // 기본값: 오늘
  })
  
  // Firebase에서 실시간 프로그램 상태 가져오기
  const [showStatuses, setShowStatuses] = useState<Record<string, boolean>>({})
  const [isLoadingShows, setIsLoadingShows] = useState(true)
  
  const { toast } = useToast()

  // 프로그램 상태 로드
  const loadShowStatuses = async () => {
    setIsLoadingShows(true)
    try {
      const base = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:3001' : ''
      const res = await fetch(`${base}/api/public/shows`)
      const contentType = res.headers.get('content-type') ?? ''
      const text = await res.text()
      let data: { statuses?: Record<string, boolean> } = {}
      if (res.ok && text && (contentType.includes('application/json') || text.trim().startsWith('{'))) {
        try {
          data = JSON.parse(text)
        } catch (_) {}
      }
      
      if (data.statuses) {
        setShowStatuses(data.statuses)
        console.log('[CommunityViral] 프로그램 상태 로드:', data.statuses)
      }
    } catch (error) {
      console.error('[CommunityViral] 프로그램 상태 로드 실패:', error)
    } finally {
      setIsLoadingShows(false)
    }
  }

  useEffect(() => {
    loadShowStatuses()
  }, [])

  // 활성화된(open) 프로그램만 필터링
  const activeShows = Object.values(SHOWS).flatMap(category => 
    category.filter(show => {
      // Firebase에서 가져온 상태 확인 (open = true)
      // showStatuses가 비어있거나 로드되지 않은 경우 isActive를 기본값으로 사용
      const hasStatusData = Object.keys(showStatuses).length > 0
      const isOpen = hasStatusData ? showStatuses[show.id] === true : show.isActive !== false
      return isOpen
    })
  )

  // 데이터 로드
  const loadPosts = async () => {
    try {
      console.log("[CommunityViral] 게시글 목록 로딩 시작...")
      // 캐시 방지를 위해 timestamp 추가
      const timestamp = Date.now()
      const base = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:3001' : ''
      const res = await fetch(`${base}/api/community/posts?_t=${timestamp}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      console.log("[CommunityViral] 로드된 게시글 수:", data.posts?.length || 0)
      if (data.success) {
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error("[CommunityViral] 게시글 로드 실패:", error)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container-community')) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // 프로그램 선택/해제 토글
  const toggleShow = (show: TShow) => {
    setSelectedShows(prev => {
      const exists = prev.find(s => s.id === show.id)
      if (exists) {
        return prev.filter(s => s.id !== show.id)
      } else {
        return [...prev, show]
      }
    })
  }

  // 전체 선택
  const selectAllShows = () => {
    setSelectedShows(activeShows)
    toast({
      title: "전체 선택 완료",
      description: `${activeShows.length}개 프로그램이 선택되었습니다.`
    })
  }

  // 선택 초기화
  const clearAllShows = () => {
    setSelectedShows([])
  }

  // 진행 상황 폴링
  useEffect(() => {
    if (!progressId) return

    const pollProgress = async () => {
      try {
        const base = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:3001' : ''
        const res = await fetch(`${base}/api/community/crawl?progressId=${progressId}`)
        const data = await res.json()
        
        if (data.success && data.progress) {
          setProgress(data.progress)
          
          // 완료 또는 실패 시 폴링 중지
          if (data.progress.status === "completed" || data.progress.status === "failed") {
            setProgressId(null)
            setIsLoading(false)
            
            if (data.progress.status === "completed") {
              await loadPosts()
              toast({
                title: "이슈 수집 완료",
                description: data.progress.message || "본문 내용을 분석하여 새로운 이슈를 수집하고 저장했습니다."
              })
            } else {
              toast({
                title: "수집 실패",
                description: data.progress.message || "크롤링 중 오류가 발생했습니다.",
                variant: "destructive"
              })
            }
          }
        }
      } catch (error) {
        console.error("진행 상황 조회 실패:", error)
      }
    }

    // 즉시 한 번 실행
    pollProgress()

    // 1초마다 폴링
    const interval = setInterval(pollProgress, 1000)

    return () => clearInterval(interval)
  }, [progressId, toast])

  const handleSearch = async () => {
    if (selectedShows.length === 0) {
      toast({
        title: "프로그램을 선택하세요",
        description: "크롤링할 프로그램을 최소 1개 이상 선택해주세요.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    setProgress({
      id: "initial",
      status: "running",
      current: 0,
      total: limit,
      message: `🔍 디시인사이드, 에펨코리아, 클리앙 등 커뮤니티 검색 시작...`,
      startedAt: new Date().toISOString()
    })
    setProgressId(null)
    
    try {
      // 선택된 프로그램의 키워드 생성
      const keywords = selectedShows.map(show => show.displayName).join(',')
      
      const base = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:3001' : ''
      const res = await fetch(`${base}/api/community/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          keywords: keywords,
          limit: limit, // 크롤링 개수 제한
          selectedShowIds: selectedShows.map(s => s.id).join(','),
          startDate: startDate,
          endDate: endDate,
          target_sites: selectedSites.join(',') // 선택된 커뮤니티 전달
        })
      })
      const data = await res.json()
      
      if (data.progressId) {
        // 진행 상황 추적 시작
        setProgressId(data.progressId)
        setProgress({
          id: data.progressId,
          status: "running",
          current: 0,
          total: 0,
          message: "크롤링 시작...",
          startedAt: new Date().toISOString()
        })
      } else if (data.success) {
        // 즉시 완료된 경우
        await loadPosts()
        setIsLoading(false)
        toast({
          title: "이슈 수집 완료",
          description: "본문 내용을 분석하여 새로운 이슈를 수집하고 저장했습니다."
        })
      } else {
        setIsLoading(false)
        toast({
          title: "수집 실패",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      setIsLoading(false)
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return
    
    try {
      console.log("[CommunityViral] 삭제 시작 - ID:", id)
      console.log("[CommunityViral] 현재 게시글 수:", posts.length)
      
      const base = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:3001' : ''
      const res = await fetch(`${base}/api/community/posts/${id}`, {
        method: "DELETE"
      })
      
      console.log("[CommunityViral] API 응답 상태:", res.status)
      const data = await res.json()
      console.log("[CommunityViral] API 응답 데이터:", data)
      
      if (data.success || res.status === 200) {
        console.log("[CommunityViral] 삭제 성공, UI 업데이트 시작")
        
        // UI에서 즉시 제거 - 더 명확한 로직
        const newPosts = posts.filter(p => p.id !== id)
        console.log("[CommunityViral] 필터링 후 게시글 수:", newPosts.length)
        setPosts(newPosts)
        
        toast({ title: "삭제 완료", description: "게시글이 삭제되었습니다." })
        
        // 확실한 새로고침을 위해 즉시 실행
        console.log("[CommunityViral] 목록 새로고침 시작")
        setTimeout(() => {
          loadPosts()
        }, 500)
      } else {
        throw new Error(data.error || "삭제 실패")
      }
    } catch (error: any) {
      console.error("[CommunityViral] 삭제 오류:", error)
      toast({ 
        title: "삭제 실패", 
        description: error.message || "게시글 삭제 중 오류가 발생했습니다.",
        variant: "destructive" 
      })
      // 오류가 발생해도 목록 새로고침 시도
      loadPosts()
    }
  }

  const handleComplete = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "completed" } : p))
    toast({ title: "작성 완료 처리" })
  }

  const handleManualLogin = async (siteId: string, url: string, userId?: string, userPw?: string) => {
    setIsManualLoggingIn(siteId)
    try {
      const base = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:3001' : ''
      const res = await fetch(`${base}/api/auto-comment/manual-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          siteId, 
          url,
          userId: userId || "",
          userPw: userPw || ""
        })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "로그인 성공", description: `${siteId} 쿠키가 저장되었습니다.` })
        setLoginDialogOpen(false)
      } else {
        throw new Error(data.error)
      }
    } catch (error: any) {
      toast({ title: "로그인 실패", description: error.message, variant: "destructive" })
    } finally {
      setIsManualLoggingIn(null)
    }
  }

  const openLoginDialog = (site: {id: string, name: string, url: string}) => {
    setCurrentLoginSite(site)
    setLoginId("")
    setLoginPw("")
    setLoginDialogOpen(true)
  }

  const COMMUNITY_LOGINS = [
    { id: 'clien', name: '클리앙', url: 'https://www.clien.net/service/auth/login' },
    { id: 'dcinside', name: '디시인사이드', url: 'https://www.dcinside.com' },
    { id: 'fmkorea', name: '에펨코리아', url: 'https://www.fmkorea.com' },
    { id: 'ruliweb', name: '루리웹', url: 'https://user.ruliweb.com/login' },
    { id: 'ppomppu', name: '뽐뿌', url: 'https://www.ppomppu.co.kr/login.php' },
    { id: 'nate', name: '네이트판', url: 'https://auth.nate.com/login' },
  ]

  const COMMUNITIES = [
    { id: 'dcinside', name: '디시인사이드' },
    { id: 'fmkorea', name: '에펨코리아' },
    { id: 'clien', name: '클리앙' },
    { id: 'nate', name: '네이트판' },
    { id: 'ruliweb', name: '루리웹' },
    { id: 'ppomppu', name: '뽐뿌' },
    { id: 'theqoo', name: '더쿠' },
    { id: '82cook', name: '82쿡' },
    { id: 'mlbpark', name: '엠팍' },
    { id: 'inven', name: '인벤' },
    { id: 'mamacafe', name: '맘카페' },
  ]

  // 커뮤니티 선택/해제 토글
  const toggleSite = (siteId: string) => {
    setSelectedSites(prev => {
      if (prev.includes(siteId)) {
        return prev.filter(id => id !== siteId)
      } else {
        return [...prev, siteId]
      }
    })
  }

  // 커뮤니티 전체 선택
  const selectAllSites = () => {
    setSelectedSites(COMMUNITIES.map(c => c.id))
  }

  // 커뮤니티 선택 초기화
  const clearAllSites = () => {
    setSelectedSites([])
  }

  // 드롭다운 외부 클릭 시 닫기 (커뮤니티)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container-site')) {
        setIsSiteDropdownOpen(false)
      }
    }

    if (isSiteDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSiteDropdownOpen])

  return (
    <div className="space-y-6">
      <Card className="border-orange-200 overflow-visible relative z-50">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 overflow-visible">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <Search className="w-5 h-5" />
                  커뮤니티 이슈 모니터링 & 바이럴
                </CardTitle>
                <CardDescription>
                  게시글 본문 내용을 분석하여 어그로를 걸러내고 진성 유저 반응을 포착합니다.
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Button variant="outline" onClick={loadPosts} className="border-orange-200 text-orange-700" disabled={isLoading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  목록 갱신
                </Button>
                <Button onClick={handleSearch} disabled={isLoading || selectedShows.length === 0} className="bg-orange-600 hover:bg-orange-700">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  본문 기반 이슈 수집
                </Button>
              </div>
            </div>

            {/* 커뮤니티 수동 로그인 영역 */}
            <div className="bg-white/50 p-4 rounded-xl border border-orange-100 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <LogIn className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-bold text-gray-700">커뮤니티 계정 로그인 관리 (쿠키 저장)</span>
                <span className="text-[10px] text-gray-400 font-normal ml-2">* 자동 댓글이 안 달릴 때 한 번씩 수동으로 로그인해주세요.</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMUNITY_LOGINS.map((site) => (
                  <Button
                    key={site.id}
                    variant="outline"
                    size="sm"
                    onClick={() => openLoginDialog(site)}
                    disabled={isManualLoggingIn !== null}
                    className={`h-9 px-4 text-xs font-bold rounded-lg border transition-all ${
                      isManualLoggingIn === site.id 
                        ? "bg-orange-100 border-orange-300 text-orange-700" 
                        : "bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-orange-50"
                    }`}
                  >
                    {isManualLoggingIn === site.id ? (
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    ) : (
                      <LogIn className="w-3 h-3 mr-2" />
                    )}
                    {site.name} 로그인
                  </Button>
                ))}
              </div>
            </div>

            {/* 로그인 정보 입력 다이얼로그 */}
            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
              <DialogContent className="sm:max-w-[400px] border-orange-100 bg-white shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-orange-700">
                    <LogIn className="w-5 h-5" />
                    {currentLoginSite?.name} 로그인 정보 입력
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500">
                    입력하신 정보로 자동 로그인을 시도합니다. <br/>
                    로그인 완료 후 브라우저가 자동으로 닫히며 쿠키가 저장됩니다.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" /> 아이디
                    </label>
                    <Input 
                      placeholder="아이디를 입력하세요" 
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="border-orange-100 focus:border-orange-300 bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-400" /> 비밀번호
                    </label>
                    <Input 
                      type="password"
                      placeholder="비밀번호를 입력하세요" 
                      value={loginPw}
                      onChange={(e) => setLoginPw(e.target.value)}
                      className="border-orange-100 focus:border-orange-300 bg-white"
                    />
                  </div>
                </div>
                <DialogFooter className="bg-gray-50/50 -mx-6 -mb-6 p-4 rounded-b-lg border-t border-gray-100">
                  <Button variant="ghost" onClick={() => setLoginDialogOpen(false)} disabled={isManualLoggingIn !== null}>
                    취소
                  </Button>
                  <Button 
                    onClick={() => currentLoginSite && handleManualLogin(currentLoginSite.id, currentLoginSite.url, loginId, loginPw)}
                    disabled={!loginId || !loginPw || isManualLoggingIn !== null}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md"
                  >
                    {isManualLoggingIn ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 로그인 중...</>
                    ) : (
                      "로그인 시도 및 쿠키 저장"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 프로그램 선택 드롭다운 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 프로그램 선택 */}
              <div className="relative dropdown-container-community overflow-visible">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">크롤링할 프로그램:</label>
                    <span className="text-xs text-gray-500">({selectedShows.length}개)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllShows}
                      disabled={isLoading || selectedShows.length === activeShows.length}
                      className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      전체
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllShows}
                      disabled={isLoading || selectedShows.length === 0}
                      className="h-7 px-2 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                    >
                      해제
                    </Button>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-wrap gap-2">
                    {selectedShows.length === 0 ? (
                      <span className="text-gray-400">프로그램을 선택하세요</span>
                    ) : (
                      <span className="text-sm text-gray-700 font-medium">
                        {selectedShows[0].displayName} 외 {selectedShows.length - 1}개
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 드롭다운 메뉴 */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 z-[9999] mt-2 bg-white border-2 border-orange-200 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
                    {Object.entries(SHOWS).map(([categoryKey, shows]) => {
                      // 활성화된 프로그램만 필터링
                      const categoryShows = shows.filter(show => {
                        // showStatuses에 값이 있으면 그 값을 따르고, 없으면(undefined) 기본값(isActive) 사용
                        const status = showStatuses[show.id]
                        const isOpen = status !== undefined ? status === true : show.isActive !== false
                        return isOpen
                      })
                      if (categoryShows.length === 0) return null
                      
                      const category = CATEGORIES[categoryKey as keyof typeof CATEGORIES]
                      
                      return (
                        <div key={categoryKey} className="border-b border-gray-100 last:border-b-0">
                          <div className="px-4 py-2 bg-gray-50 font-semibold text-sm text-gray-700 flex items-center gap-2">
                            <img 
                              src={category.iconPath} 
                              alt={category.description}
                              className="w-5 h-5 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const emoji = document.createElement('span')
                                emoji.textContent = category.emoji
                                target.parentElement?.appendChild(emoji)
                              }}
                            />
                            <span>{category.description}</span>
                          </div>
                          <div className="py-2">
                            {categoryShows.map(show => {
                              const isSelected = selectedShows.some(s => s.id === show.id)
                              return (
                                <label
                                  key={show.id}
                                  className="flex items-center gap-3 px-4 py-2 hover:bg-orange-50 cursor-pointer transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleShow(show)}
                                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                  />
                                  <span className={`text-sm ${isSelected ? 'font-semibold text-orange-700' : 'text-gray-700'}`}>
                                    {show.displayName}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 커뮤니티 선택 */}
              <div className="relative dropdown-container-site overflow-visible">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">수집할 커뮤니티:</label>
                    <span className="text-xs text-gray-500">
                      {selectedSites.length === 0 ? "(전체)" : `(${selectedSites.length}개)`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllSites}
                      disabled={isLoading}
                      className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      전체
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllSites}
                      disabled={isLoading}
                      className="h-7 px-2 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                    >
                      해제
                    </Button>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-orange-200 rounded-lg hover:border-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-wrap gap-2">
                    {selectedSites.length === 0 ? (
                      <span className="text-gray-500">모든 커뮤니티에서 수집</span>
                    ) : (
                      <span className="text-sm text-gray-700 font-medium">
                        {COMMUNITIES.find(c => c.id === selectedSites[0])?.name} 외 {selectedSites.length - 1}개
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isSiteDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 커뮤니티 드롭다운 메뉴 */}
                {isSiteDropdownOpen && (
                  <div className="absolute left-0 right-0 z-[9999] mt-2 bg-white border-2 border-orange-200 rounded-lg shadow-2xl max-h-96 overflow-y-auto p-2">
                    <div className="grid grid-cols-2 gap-1">
                      {COMMUNITIES.map(site => {
                        const isSelected = selectedSites.includes(site.id)
                        return (
                          <label
                            key={site.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50 cursor-pointer transition-colors rounded"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSite(site.id)}
                              className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                            />
                            <span className={`text-sm ${isSelected ? 'font-semibold text-orange-700' : 'text-gray-700'}`}>
                              {site.name}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 날짜 범위 및 개수 설정 */}
            <div className="flex gap-4 items-center bg-orange-50/50 p-3 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">시작일:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-orange-200 rounded text-sm"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">종료일:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-orange-200 rounded text-sm"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm font-medium text-gray-700">수집 개수:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                  className="w-20 px-2 py-1.5 border border-orange-200 rounded text-sm"
                  disabled={isLoading}
                />
                <span className="text-xs text-gray-500">개</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* 진행 상황 표시 */}
          {(progress || isLoading) && (
            <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {(progress?.status === "running" || progress?.status === "processing" || isLoading) ? (
                    <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                  ) : progress?.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <X className="w-6 h-6 text-red-600" />
                  )}
                  <span className="font-bold text-lg text-orange-700">
                    {(progress?.status === "running" || isLoading) && "크롤링 중..."}
                    {progress?.status === "processing" && "저장 중..."}
                    {progress?.status === "completed" && "완료"}
                    {progress?.status === "failed" && "실패"}
                  </span>
                </div>
                {(progress?.total ?? 0) > 0 && (
                  <span className="text-base font-bold text-orange-600">
                    {progress!.current} / {progress!.total}
                  </span>
                )}
              </div>

              <p className="text-base text-gray-800 mb-3 font-semibold">
                {progress?.message || "커뮤니티 검색 준비 중..."}
              </p>

              {(progress?.total ?? 0) > 0 && (
                <div className="w-full bg-gray-300 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${((progress!.current / progress!.total) * 100)}%` }}
                  />
                </div>
              )}

              {isLoading && (
                <div className="mt-4 p-3 bg-white/70 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-700">
                    🔍 <strong>수집 대상 사이트:</strong> 디시인사이드, 에펨코리아, 클리앙, 네이트판, 루리웹, 뽐뿌
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    각 사이트를 순회하며 관련 게시글을 검색하고 있습니다. 사이트마다 응답 시간이 다를 수 있습니다.
                  </p>
                </div>
              )}

              {/* 실시간 로그 */}
              {progress?.logs && progress.logs.length > 0 && (
                <div className="mt-4 p-4 bg-white/90 rounded-lg border border-orange-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-gray-700 uppercase">실시간 수집 현황</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-xs">
                    {progress.logs.slice(-12).map((log, idx) => (
                      <div key={idx} className="flex gap-2 text-gray-600 hover:bg-orange-50 px-2 py-1 rounded">
                        <span className="text-gray-400 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="break-all">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#fdba74 #fff7ed' }}>
            {posts.length === 0 && !isLoading && !progress && (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                수집된 이슈가 없습니다. '이슈 수집' 버튼을 눌러주세요.
              </div>
            )}
            {posts.map((post) => (
              <Card key={post.id} className={`overflow-hidden border-l-4 ${post.status === 'completed' ? 'border-l-green-500 opacity-60' : 'border-l-orange-500'}`}>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-gray-100 text-xs px-2 py-1">
                          {post.sourceName || (post.source === 'mamacafe' ? '맘카페' :
                            post.source === '82cook' ? '82쿡' :
                            post.source === 'dcinside' ? '디시인사이드' : 
                            post.source === 'fmkorea' ? '에펨코리아' :
                            post.source === 'theqoo' ? '더쿠' :
                            post.source === 'clien' ? '클리앙' :
                            post.source === 'nate' ? '네이트판' :
                            post.source)}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-1">
                          {getShowById(post.showId)?.displayName || post.showId}
                        </Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleString('ko-KR') : '날짜 미상'}
                        </span>
                        <span className="text-xs text-gray-400">
                          조회 {post.viewCount} · 댓글 {post.commentCount}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="default"
                        onClick={() => handleDelete(post.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-10 px-3"
                      >
                        <Trash2 className="w-5 h-5 mr-1" />
                        삭제
                      </Button>
                    </div>
                    
                    <h3 className="font-bold text-lg hover:text-orange-600 transition-colors">
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        {post.title}
                        <ExternalLink className="w-4 h-4 inline" />
                      </a>
                    </h3>

                    <div className="bg-gray-50/50 p-3 rounded border border-dashed border-gray-200">
                      <p className="text-xs font-bold text-gray-400 mb-1 uppercase">Post Content Analysis</p>
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50/30 p-3 rounded-lg border border-orange-100 relative mt-4">
                      <div className="absolute -top-2 left-3 bg-white px-2 text-[10px] font-bold text-orange-600 border border-orange-200 rounded">
                        추천 댓글 (AI)
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed italic">
                        "{post.suggestedComment}"
                      </p>
                      <Button 
                        variant="ghost" 
                        size="default"
                        className="mt-2 h-9 px-3 gap-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50"
                        onClick={() => {
                          navigator.clipboard.writeText(post.suggestedComment)
                          toast({ title: "복사 완료", description: "댓글 내용이 클립보드에 복사되었습니다." })
                        }}
                      >
                        <MessageSquare className="w-4 h-4" />
                        댓글 복사하기
                      </Button>
                    </div>
                  </div>

                  <div className="flex md:flex-col justify-end gap-3 shrink-0">
                    <Button 
                      asChild 
                      variant="outline" 
                      size="default"
                      className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 h-10 px-4"
                    >
                      <a href={post.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        원문 이동
                      </a>
                    </Button>
                    <AutoCommentButton
                      post={post}
                      collectionType="board"
                      initialStatus={(post as any).commentStatus ?? null}
                    />
                    <Button 
                      onClick={() => handleComplete(post.id)}
                      disabled={post.status === 'completed'}
                      size="default"
                      className={`h-10 px-4 text-white ${post.status === 'completed' ? "bg-green-500 hover:bg-green-600" : "bg-gray-900 hover:bg-gray-800"}`}
                    >
                      {post.status === 'completed' ? (
                        <><CheckCircle2 className="w-4 h-4 mr-2" /> 완료됨</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" /> 작성 완료 처리</>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




