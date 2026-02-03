"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Badge } from "@/components/c-ui/badge"
import { Search, MessageSquare, ExternalLink, RefreshCw, Loader2, CheckCircle2, Trash2, Calendar, X } from "lucide-react"
import { useToast } from "@/hooks/h-toast/useToast.hook"

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
}

export function CommunityViralManage() {
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<CrawlProgress | null>(null)
  const [progressId, setProgressId] = useState<string | null>(null)
  const [limit, setLimit] = useState<number>(10) // 테스트용 기본값 10개
  const { toast } = useToast()

  // 데이터 로드
  const loadPosts = async () => {
    try {
      const res = await fetch("/api/admin/marketer/community/crawl")
      const data = await res.json()
      if (data.success) setPosts(data.posts)
    } catch (error) {
      console.error("Failed to load posts", error)
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
        const res = await fetch(`/api/admin/marketer/community/crawl?progressId=${progressId}`)
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
    setIsLoading(true)
    setProgress(null)
    setProgressId(null)
    
    try {
      const res = await fetch("/api/admin/marketer/community/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          keywords: "나는솔로,최강야구,나솔사계,돌싱글즈",
          limit: limit // 크롤링 개수 제한
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
      const res = await fetch(`/api/admin/marketer/community/crawl?id=${id}`, {
        method: "DELETE"
      })
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id))
        toast({ title: "삭제 완료" })
      }
    } catch (error) {
      toast({ title: "삭제 실패", variant: "destructive" })
    }
  }

  const handleComplete = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "completed" } : p))
    toast({ title: "작성 완료 처리" })
  }

  return (
    <div className="space-y-6">
      <Card className="border-orange-200">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50">
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
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">크롤링 개수:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 10)}
                  className="w-20 px-2 py-1 border border-orange-200 rounded text-sm"
                  disabled={isLoading}
                />
                <span className="text-xs text-gray-500">개</span>
              </div>
              <Button variant="outline" onClick={loadPosts} className="border-orange-200 text-orange-700" disabled={isLoading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                목록 갱신
              </Button>
              <Button onClick={handleSearch} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                본문 기반 이슈 수집
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* 진행 상황 표시 - sticky */}
          {progress && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {progress.status === "running" || progress.status === "processing" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                  ) : progress.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <X className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-semibold text-orange-700">
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
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-gray-100 uppercase text-[10px]">
                          {post.source}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                          {post.showId}
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
                        size="sm" 
                        onClick={() => handleDelete(post.id)}
                        className="text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
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
                        size="sm" 
                        className="mt-2 text-[10px] h-7 gap-1 text-gray-500 hover:text-orange-600"
                        onClick={() => {
                          navigator.clipboard.writeText(post.suggestedComment)
                          toast({ title: "복사 완료", description: "댓글 내용이 클립보드에 복사되었습니다." })
                        }}
                      >
                        <MessageSquare className="w-3 h-3" />
                        댓글 복사하기
                      </Button>
                    </div>
                  </div>

                  <div className="flex md:flex-col justify-end gap-2 shrink-0">
                    <Button 
                      asChild 
                      variant="outline" 
                      className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      <a href={post.url} target="_blank" rel="noopener noreferrer">
                        원문 이동
                      </a>
                    </Button>
                    <Button 
                      onClick={() => handleComplete(post.id)}
                      disabled={post.status === 'completed'}
                      className={post.status === 'completed' ? "bg-green-500" : "bg-gray-900"}
                    >
                      {post.status === 'completed' ? (
                        <><CheckCircle2 className="w-4 h-4 mr-2" /> 완료됨</>
                      ) : (
                        "작성 완료 처리"
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
