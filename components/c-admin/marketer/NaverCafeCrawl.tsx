"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Badge } from "@/components/c-ui/badge"
import { Loader2, CheckCircle2, X, Calendar, ExternalLink, RefreshCw, Search, MessageSquare, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { getShowById } from "@/lib/constants/shows"

interface CrawlProgress {
  id: string
  status: "running" | "processing" | "completed" | "failed"
  current: number
  total: number
  message: string
  startedAt?: string
  completedAt?: string
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
  const [limit, setLimit] = useState(10) // 크롤링 개수
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<CrawlProgress | null>(null)
  const [progressId, setProgressId] = useState<string | null>(null)
  const [posts, setPosts] = useState<NaverCafePost[]>([])
  const { toast } = useToast()

  // 데이터 로드
  const loadPosts = async () => {
    try {
      console.log("[NaverCafe] 게시글 목록 로딩 시작...")
      const timestamp = Date.now()
      const res = await fetch(`/api/admin/marketer/naver-cafe/crawl?_t=${timestamp}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      console.log("[NaverCafe] 로드된 게시글 수:", data.posts?.length || 0)
      if (data.success) {
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error("[NaverCafe] 게시글 로드 실패:", error)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [])

  // 진행 상황 폴링
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

  const handleStartCrawl = async () => {
    setIsLoading(true)
    setProgress(null)
    setProgressId(null)
    
    try {
      const res = await fetch("/api/admin/marketer/naver-cafe/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: "나는솔로,나솔,최강야구,나솔사계,돌싱글즈,환승연애,솔로지옥",
          limit: limit // 크롤링 개수
        })
      })
      
      const data = await res.json()
      
      if (data.progressId) {
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
        setIsLoading(false)
        await loadPosts()
        toast({
          title: "크롤링 완료",
          description: "네이버 카페 크롤링이 완료되었습니다."
        })
      } else {
        setIsLoading(false)
        toast({
          title: "크롤링 실패",
          description: data.error || "알 수 없는 오류",
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
      console.log("[NaverCafe] 삭제 시작 - ID:", id)
      console.log("[NaverCafe] 현재 게시글 수:", posts.length)
      
      const res = await fetch(`/api/admin/marketer/naver-cafe/crawl?id=${id}`, {
        method: "DELETE"
      })
      
      console.log("[NaverCafe] API 응답 상태:", res.status)
      const data = await res.json()
      console.log("[NaverCafe] API 응답 데이터:", data)
      
      if (data.success || res.status === 200) {
        console.log("[NaverCafe] 삭제 성공, UI 업데이트 시작")
        
        const newPosts = posts.filter(p => p.id !== id)
        console.log("[NaverCafe] 필터링 후 게시글 수:", newPosts.length)
        setPosts(newPosts)
        
        toast({ title: "삭제 완료", description: "게시글이 삭제되었습니다." })
        
        console.log("[NaverCafe] 목록 새로고침 시작")
        setTimeout(() => {
          loadPosts()
        }, 500)
      } else {
        throw new Error(data.error || "삭제 실패")
      }
    } catch (error: any) {
      console.error("[NaverCafe] 삭제 오류:", error)
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

      {/* 수집된 게시글 목록 */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
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
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">크롤링 개수:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                  className="w-20 px-2 py-1 border border-blue-200 rounded text-sm"
                  disabled={isLoading}
                />
                <span className="text-xs text-gray-500">개</span>
              </div>
              <Button variant="outline" onClick={loadPosts} className="border-blue-200 text-blue-700" disabled={isLoading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                목록 갱신
              </Button>
              <Button onClick={handleStartCrawl} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                본문 기반 이슈 수집
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* 진행 상황 표시 */}
          {progress && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {progress.status === "running" || progress.status === "processing" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : progress.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-semibold text-blue-700">
                    {progress.status === "running" && "크롤링 중..."}
                    {progress.status === "processing" && "저장 중..."}
                    {progress.status === "completed" && "완료"}
                    {progress.status === "failed" && "실패"}
                  </span>
                </div>
                {progress.total > 0 && (
                  <span className="text-sm text-gray-600">
                    {progress.current} / {progress.total}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-2">{progress.message}</p>
              {progress.total > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
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
