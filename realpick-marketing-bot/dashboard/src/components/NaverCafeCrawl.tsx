
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Loader2, CheckCircle2, X, Calendar, ExternalLink, RefreshCw, Search, MessageSquare, Trash2, ChevronDown } from "lucide-react"
import { useToast } from "../hooks/useToast"
import { getShowById, SHOWS, CATEGORIES } from "../lib/shows"
import type { TShow } from "../lib/shows"

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

interface NaverCafePost {
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

export function NaverCafeCrawl() {
  const [limit, setLimit] = useState(10)
  const [selectedShows, setSelectedShows] = useState<TShow[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<CrawlProgress | null>(null)
  const [progressId, setProgressId] = useState<string | null>(null)
  const [posts, setPosts] = useState<NaverCafePost[]>([])
  
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
        console.log('[NaverCafe] 프로그램 상태 로드:', data.statuses)
      }
    } catch (error) {
      console.error('[NaverCafe] 프로그램 상태 로드 실패:', error)
    } finally {
      setIsLoadingShows(false)
    }
  }

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

  const loadPosts = async () => {
    try {
      const timestamp = Date.now()
      const res = await fetch(`/api/admin/marketer/naver-cafe/crawl?_t=${timestamp}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      if (data.success) {
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error("[NaverCafe] 게시글 로드 실패:", error)
    }
  }

  useEffect(() => {
    loadShowStatuses()
    loadPosts()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
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

  useEffect(() => {
    if (!progressId) return

    const pollProgress = async () => {
      try {
        const res = await fetch(`/api/admin/marketer/naver-cafe/crawl?progressId=${progressId}`)
        const data = await res.json()
        
        if (data.success && data.progress) {
          setProgress(data.progress)
          
          if (data.progress.status === "completed" || data.progress.status === "failed") {
            setProgressId(null)
            setIsLoading(false)
            
            if (data.progress.status === "completed") {
              await loadPosts()
              toast({
                title: "크롤링 완료",
                description: data.progress.message || "네이버 카페 크롤링이 완료되었습니다."
              })
            } else {
              toast({
                title: "크롤링 실패",
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

    pollProgress()
    const interval = setInterval(pollProgress, 1000)
    return () => clearInterval(interval)
  }, [progressId, toast])

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

  const selectAllShows = () => {
    setSelectedShows(activeShows)
    toast({
      title: "전체 선택 완료",
      description: `${activeShows.length}개 프로그램이 선택되었습니다.`
    })
  }

  const clearAllShows = () => {
    setSelectedShows([])
  }

  const generateKeywords = () => {
    if (selectedShows.length === 0) {
      return "나는솔로,나솔,최강야구,나솔사계,돌싱글즈,환승연애,솔로지옥"
    }
    
    const keywords = selectedShows.flatMap(show => [show.name, show.displayName])
    return [...new Set(keywords)].join(",")
  }

  const handleStartCrawl = async () => {
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
      message: "🌐 Chrome 브라우저 실행 중... 네이버 로그인 후 자동으로 크롤링이 시작됩니다.",
      startedAt: new Date().toISOString()
    })
    setProgressId(null)
    
    try {
      const keywords = generateKeywords()
      
      const res = await fetch("/api/admin/marketer/naver-cafe/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywords,
          limit: limit,
          startDate: startDate,
          endDate: endDate
        })
      })
      
      const data = await res.json()
      
      if (data.progressId) {
        setProgressId(data.progressId)
        setProgress({
          id: data.progressId,
          status: "running",
          current: 0,
          total: limit,
          message: "📝 여러 카페를 순회하며 게시글 수집 중...",
          startedAt: new Date().toISOString()
        })
      } else if (data.success) {
        setIsLoading(false)
        setProgress({
          id: "done",
          status: "completed",
          current: data.posts?.length || 0,
          total: limit,
          message: `✅ 총 ${data.posts?.length || 0}개의 게시글을 수집했습니다.`,
          completedAt: new Date().toISOString()
        })
        await loadPosts()
        toast({
          title: "크롤링 완료",
          description: `${data.posts?.length || 0}개의 게시글을 수집했습니다.`
        })
      } else {
        setIsLoading(false)
        setProgress({
          id: "error",
          status: "failed",
          current: 0,
          total: limit,
          message: `❌ 오류: ${data.error || "알 수 없는 오류"}`
        })
        toast({
          title: "크롤링 실패",
          description: data.error || "알 수 없는 오류",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      setIsLoading(false)
      setProgress({
        id: "error",
        status: "failed",
        current: 0,
        total: limit,
        message: `❌ 오류: ${error.message}`
      })
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
      const res = await fetch(`/api/admin/marketer/naver-cafe/crawl?id=${id}`, {
        method: "DELETE"
      })
      
      const data = await res.json()
      
      if (data.success || res.status === 200) {
        const newPosts = posts.filter(p => p.id !== id)
        setPosts(newPosts)
        
        toast({ title: "삭제 완료", description: "게시글이 삭제되었습니다." })
        
        setTimeout(() => {
          loadPosts()
        }, 500)
      } else {
        throw new Error(data.error || "삭제 실패")
      }
    } catch (error: any) {
      toast({ 
        title: "삭제 실패", 
        description: error.message || "게시글 삭제 중 오류가 발생했습니다.",
        variant: "destructive" 
      })
      loadPosts()
    }
  }

  const handleComplete = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "completed" } : p))
    toast({ title: "작성 완료 처리" })
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 overflow-visible relative z-50">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 overflow-visible">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Search className="w-5 h-5" />
                  네이버 카페 이슈 모니터링 & 바이럴
                </CardTitle>
                <CardDescription>
                  맘카페 게시글 본문을 분석하여 AI 추천 댓글을 생성합니다.
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <Button variant="outline" onClick={loadPosts} className="border-blue-200 text-blue-700" disabled={isLoading}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  목록 갱신
                </Button>
                <Button onClick={handleStartCrawl} disabled={isLoading || selectedShows.length === 0} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  본문 기반 이슈 수집
                </Button>
              </div>
            </div>

            {/* 프로그램 선택 드롭다운 */}
            <div className="relative dropdown-container overflow-visible">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">크롤링할 프로그램 선택:</label>
                  <span className="text-xs text-gray-500">({selectedShows.length}개 선택됨)</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllShows}
                    disabled={isLoading || selectedShows.length === activeShows.length}
                    className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    전체 선택
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllShows}
                    disabled={isLoading || selectedShows.length === 0}
                    className="h-7 px-2 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                  >
                    선택 초기화
                  </Button>
                </div>
              </div>
              
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-wrap gap-2">
                  {selectedShows.length === 0 ? (
                    <span className="text-gray-400">프로그램을 선택하세요</span>
                  ) : (
                    selectedShows.map(show => (
                      <Badge key={show.id} className="bg-blue-100 text-blue-700 border-blue-300">
                        {show.displayName}
                      </Badge>
                    ))
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 z-[9999] mt-2 bg-white border-2 border-blue-200 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
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
                                className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleShow(show)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className={`text-sm ${isSelected ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
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

            {/* 날짜 범위 및 개수 설정 */}
            <div className="flex gap-4 items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">시작일:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border border-blue-200 rounded text-sm"
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">종료일:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 border border-blue-200 rounded text-sm"
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
                  className="w-20 px-2 py-1.5 border border-blue-200 rounded text-sm"
                  disabled={isLoading}
                />
                <span className="text-xs text-gray-500">개</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {(progress || isLoading) && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {(progress?.status === "running" || progress?.status === "processing" || isLoading) ? (
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  ) : progress?.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <X className="w-6 h-6 text-red-600" />
                  )}
                  <span className="font-bold text-lg text-blue-700">
                    {(progress?.status === "running" || isLoading) && "크롤링 중..."}
                    {progress?.status === "processing" && "저장 중..."}
                    {progress?.status === "completed" && "완료"}
                    {progress?.status === "failed" && "실패"}
                  </span>
                </div>
                {progress?.total > 0 && (
                  <span className="text-base font-bold text-blue-600">
                    {progress.current} / {progress.total}
                  </span>
                )}
              </div>
              <p className="text-base text-gray-800 mb-3 font-semibold">{progress?.message || "크롤링을 준비 중입니다..."}</p>
              {progress?.total > 0 && (
                <div className="w-full bg-gray-300 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
              {isLoading && (
                <div className="mt-4 p-3 bg-white/70 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700">
                    💡 <strong>참고:</strong> Chrome 브라우저가 백그라운드에서 실행 중입니다. 
                    {progress?.id === "initial" && " 처음 실행 시 네이버 로그인이 필요할 수 있습니다."}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    여러 카페를 순회하며 게시글을 수집하고 있습니다. 각 카페에서 게시글이 없으면 자동으로 다음 카페로 이동합니다.
                  </p>
                </div>
              )}
              
              {/* 실시간 로그 */}
              {progress?.logs && progress.logs.length > 0 && (
                <div className="mt-4 p-4 bg-white/90 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-gray-700 uppercase">실시간 로그</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-xs">
                    {progress.logs.slice(-10).map((log, idx) => (
                      <div key={idx} className="flex gap-2 text-gray-600 hover:bg-blue-50 px-2 py-1 rounded">
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

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {posts.length === 0 && !isLoading && !progress && (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                수집된 게시글이 없습니다. 위에서 크롤링을 시작해주세요.
              </div>
            )}
            {posts.map((post) => (
              <Card key={post.id} className={`overflow-hidden border-l-4 ${post.status === 'completed' ? 'border-l-green-500 opacity-60' : 'border-l-blue-500'}`}>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-gray-100 text-xs px-2 py-1">
                          {post.sourceName || '네이버 카페'}
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
                    
                    <h3 className="font-bold text-lg hover:text-blue-600 transition-colors">
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
                    
                    <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-100 relative mt-4">
                      <div className="absolute -top-2 left-3 bg-white px-2 text-[10px] font-bold text-blue-600 border border-blue-200 rounded">
                        추천 댓글 (AI)
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed italic">
                        "{post.suggestedComment}"
                      </p>
                      <Button 
                        variant="ghost" 
                        size="default"
                        className="mt-2 h-9 px-3 gap-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
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
                      className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 h-10 px-4"
                    >
                      <a href={post.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        원문 이동
                      </a>
                    </Button>
                    <Button 
                      onClick={() => handleComplete(post.id)}
                      disabled={post.status === 'completed'}
                      size="default"
                      className={`h-10 px-4 ${post.status === 'completed' ? "bg-green-500 hover:bg-green-600" : "bg-gray-900 hover:bg-gray-800"}`}
                    >
                      {post.status === 'completed' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          작성 완료
                        </>
                      ) : (
                        "완료 처리"
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
