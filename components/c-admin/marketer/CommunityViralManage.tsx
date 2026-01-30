"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Badge } from "@/components/c-ui/badge"
import { Search, MessageSquare, ExternalLink, RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/h-toast/useToast.hook"

interface ViralPost {
  id: string
  source: "dcinside" | "fmkorea" | "theqoo"
  title: string
  author: string
  url: string
  viewCount: number
  commentCount: number
  showId: string
  suggestedComment: string
  status: "pending" | "completed"
  createdAt: string
}

export function CommunityViralManage() {
  const [posts, setPosts] = useState<ViralPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // 임시 데이터 (실제로는 API에서 가져옴)
  useEffect(() => {
    setPosts([
      {
        id: "1",
        source: "dcinside",
        title: "나는솔로 23기 영수 진짜 역대급인듯ㅋㅋ",
        author: "ㅇㅇ",
        url: "https://gall.dcinside.com/board/view/?id=iamsolo&no=123456",
        viewCount: 1520,
        commentCount: 45,
        showId: "nasolo",
        suggestedComment: "진짜 이번 기수 영수님 행동 예측불가임ㅋㅋ 리얼픽 투표 결과 보니까 사람들이 다들 손절각 보던데 역시 보는 눈은 다 똑같은 듯",
        status: "pending",
        createdAt: new Date().toISOString()
      },
      {
        id: "2",
        source: "fmkorea",
        title: "최강야구 이번 경기 몬스터즈가 이길 것 같냐?",
        author: "야구좋아",
        url: "https://www.fmkorea.com/baseball/789012",
        viewCount: 3400,
        commentCount: 120,
        showId: "choegang-yagu-2025",
        suggestedComment: "리얼픽에서 투표 올라왔길래 해봤는데 몬스터즈 승리 예측이 70% 넘더라ㅋㅋ 다들 야구에 진심인 듯",
        status: "pending",
        createdAt: new Date().toISOString()
      }
    ])
  }, [])

  const handleSearch = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/marketer/community/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: "나는솔로,최강야구,나솔사계,돌싱글즈" })
      })
      const data = await res.json()
      
      if (data.success && data.posts) {
        setPosts(data.posts)
        toast({
          title: "이슈 서칭 완료",
          description: `새로운 ${data.posts.length}개의 핫게시물을 찾았습니다.`
        })
      } else {
        toast({
          title: "서칭 실패",
          description: data.error || "알 수 없는 오류가 발생했습니다.",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "오류 발생",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: "completed" } : p))
    toast({
      title: "작성 완료 처리",
      description: "해당 게시글에 댓글 작성을 완료했습니다."
    })
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
                주요 커뮤니티의 핫게시물을 분석하고 자연스러운 바이럴 댓글을 제안합니다.
              </CardDescription>
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              이슈 새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className={`overflow-hidden border-l-4 ${post.status === 'completed' ? 'border-l-green-500 opacity-60' : 'border-l-orange-500'}`}>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-gray-100 uppercase text-[10px]">
                        {post.source}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">
                        {post.showId}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        조회 {post.viewCount} · 댓글 {post.commentCount}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg hover:text-orange-600 transition-colors">
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        {post.title}
                        <ExternalLink className="w-4 h-4 inline" />
                      </a>
                    </h3>
                    
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                      <div className="absolute -top-2 left-3 bg-white px-2 text-[10px] font-bold text-orange-600 border border-orange-200 rounded">
                        추천 댓글
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
