
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Badge } from "./ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Label } from "./ui/label"
import { useState, useEffect } from "react"
import { useToast } from "../hooks/useToast"
import { Instagram, Hash, Users, Edit2, Trash2, Plus, CheckCircle, AlertCircle, Sparkles } from "lucide-react"
// Firebase removed

interface AIMission {
  id: string
  title: string
  channelName?: string
  showId?: string
  category?: string
  relatedAccounts?: string[]
  viralHashtags?: string
  status: string
  createdAt: any
}

export function InstagramViralManage() {
  const [missions, setMissions] = useState<AIMission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingMission, setEditingMission] = useState<AIMission | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // 편집 폼 상태
  const [relatedAccountsInput, setRelatedAccountsInput] = useState("")
  const [viralHashtagsInput, setViralHashtagsInput] = useState("")
  
  const { toast } = useToast()

  // 미션 목록 로드
  const loadMissions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/ai-missions/list?limit=50")
      const result = await response.json()
      if (result.success && result.missions) {
        setMissions(result.missions as AIMission[])
      } else {
        toast({
          title: "로딩 실패",
          description: result.error || "미션을 불러올 수 없습니다.",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "로딩 실패",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMissions()
  }, [])

  // 편집 다이얼로그 열기
  const handleEdit = (mission: AIMission) => {
    setEditingMission(mission)
    setRelatedAccountsInput((mission.relatedAccounts || []).join(", "))
    setViralHashtagsInput(mission.viralHashtags || "")
    setIsDialogOpen(true)
  }

  // 저장
  const handleSave = async () => {
    if (!editingMission) return

    try {
      // 계정 리스트 파싱 (쉼표로 구분, '@' 제거, 공백 제거)
      const accounts = relatedAccountsInput
        .split(",")
        .map(acc => acc.trim().replace("@", ""))
        .filter(acc => acc.length > 0)

      // API를 통해 업데이트
      const response = await fetch("/api/instagram/update-tags", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
          missionId: editingMission.id, 
          relatedAccounts: accounts, 
          viralHashtags: viralHashtagsInput.trim() 
        }) 
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "업데이트 실패");
      }

      toast({
        title: "저장 완료",
        description: "인스타그램 태그 정보가 업데이트되었습니다."
      })

      // 목록 새로고침
      await loadMissions()
      setIsDialogOpen(false)
      setEditingMission(null)
    } catch (error: any) {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  // AI 자동 생성 (해시태그)
  const handleAutoGenerateHashtags = async () => {
    if (!editingMission) return

    try {
      const response = await fetch("/api/admin/marketer/instagram/generate-hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionId: editingMission.id,
          title: editingMission.title,
          showId: editingMission.showId,
          channelName: editingMission.channelName
        })
      })

      const data = await response.json()

      if (data.success && data.hashtags) {
        setViralHashtagsInput(data.hashtags)
        toast({
          title: "해시태그 생성 완료",
          description: "AI가 해시태그를 생성했습니다."
        })
      } else {
        throw new Error(data.error || "해시태그 생성 실패")
      }
    } catch (error: any) {
      toast({
        title: "생성 실패",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 카드 */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-purple-600" />
            인스타그램 태그 & 해시태그 관리
          </CardTitle>
          <CardDescription>
            쇼츠(릴스) 업로드 시 태그할 계정과 해시태그를 관리합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              <Users className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">딜러 태그 (@)</div>
                <div className="text-xs text-gray-600">유튜버 리그램 유도</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              <Users className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">출연자 태그 (@)</div>
                <div className="text-xs text-gray-600">당사자 등판 & 팬덤 유입</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
              <Hash className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">경쟁자 해시태그 (#)</div>
                <div className="text-xs text-gray-600">안전한 어그로 & 검색 유입</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 미션 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>AI 미션 목록</CardTitle>
          <CardDescription>
            자동 생성된 미션에 인스타그램 바이럴 정보를 추가하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : missions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              자동 생성된 미션이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>미션 제목</TableHead>
                    <TableHead>채널명</TableHead>
                    <TableHead>출연자 태그</TableHead>
                    <TableHead>해시태그</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missions.map((mission) => {
                    const hasAccounts = mission.relatedAccounts && mission.relatedAccounts.length > 0
                    const hasHashtags = mission.viralHashtags && mission.viralHashtags.trim().length > 0
                    
                    return (
                      <TableRow key={mission.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {mission.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{mission.channelName || "알 수 없음"}</Badge>
                        </TableCell>
                        <TableCell>
                          {hasAccounts ? (
                            <div className="flex flex-wrap gap-1">
                              {mission.relatedAccounts!.slice(0, 2).map((acc, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  @{acc}
                                </Badge>
                              ))}
                              {mission.relatedAccounts!.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{mission.relatedAccounts!.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">미설정</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasHashtags ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Badge variant="outline" className="text-gray-400">미설정</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={mission.status === "open" ? "default" : "secondary"}
                          >
                            {mission.status === "open" ? "진행중" : mission.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(mission)}
                            className="gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            편집
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 편집 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>인스타그램 바이럴 정보 편집</DialogTitle>
            <DialogDescription>
              {editingMission?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 딜러 정보 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                딜러 계정
              </Label>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="font-medium mb-1">자동으로 태그됩니다:</div>
                <Badge variant="secondary">@{editingMission?.channelName || "딜러계정"}</Badge>
                <p className="text-xs mt-2 text-gray-500">
                  * 딜러의 인스타그램 아이디는 유튜브 크롤링 시 자동 수집되거나 어드민에서 수동으로 등록됩니다.
                </p>
              </div>
            </div>

            {/* 출연자/공식 계정 */}
            <div className="space-y-2">
              <Label htmlFor="relatedAccounts" className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" />
                출연자/공식 계정 태그 (@ 태그)
              </Label>
              <Input
                id="relatedAccounts"
                value={relatedAccountsInput}
                onChange={(e) => setRelatedAccountsInput(e.target.value)}
                placeholder="예: youngho_insta, naneun_solo (쉼표로 구분)"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                쉼표(,)로 구분하여 여러 계정 입력 가능. '@'는 자동으로 제거됩니다.
              </p>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="text-xs font-medium text-green-800 mb-1">💡 활용 팁</div>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• 출연자 본인 계정을 태그하면 당사자가 리그램할 확률 UP</li>
                  <li>• 프로그램 공식 계정도 태그 가능</li>
                  <li>• 태그된 계정에게 알림이 가므로 신중하게 선택</li>
                </ul>
              </div>
            </div>

            {/* 해시태그 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="viralHashtags" className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-orange-500" />
                  바이럴 해시태그
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoGenerateHashtags}
                  className="gap-1 text-xs"
                >
                  <Sparkles className="w-3 h-3" />
                  AI 자동 생성
                </Button>
              </div>
              <Textarea
                id="viralHashtags"
                value={viralHashtagsInput}
                onChange={(e) => setViralHashtagsInput(e.target.value)}
                placeholder="예: #리얼픽 #나는솔로22기 #영숙 #경쟁채널명"
                className="font-mono text-sm min-h-[100px]"
              />
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="text-xs font-medium text-orange-800 mb-1">⚠️ 주의사항</div>
                <ul className="text-xs text-orange-700 space-y-1">
                  <li>• 경쟁 채널명은 태그(@) 말고 <strong>해시태그(#)</strong>로만 추가</li>
                  <li>• 방송명, 출연자명 필수 포함</li>
                  <li>• 검색 유입을 위한 키워드를 전략적으로 배치</li>
                </ul>
              </div>
            </div>

            {/* 미리보기 */}
            <div className="space-y-2">
              <Label>업로드 시 적용될 내용 미리보기</Label>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="text-sm space-y-3">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">📸 사진/영상 내 태그:</div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">@{editingMission?.channelName || "딜러"}</Badge>
                      {relatedAccountsInput.split(",").filter(acc => acc.trim()).map((acc, i) => (
                        <Badge key={i} variant="secondary">@{acc.trim().replace("@", "")}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">📝 본문 캡션:</div>
                    <div className="bg-white p-2 rounded border text-xs whitespace-pre-wrap">
                      {editingMission?.title || "미션 제목"} 투표 결과 보기 👇
                      {"\n\n"}
                      Original Content by @{editingMission?.channelName || "딜러"}
                      {"\n\n"}
                      {viralHashtagsInput || "#해시태그"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                저장
              </Button>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}




