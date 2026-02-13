import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Loader2, Video, Instagram, Youtube, Hash, Sparkles, Download, Play, CheckCircle2, X } from "lucide-react"
import { useToast } from "../hooks/useToast"

// 메인 Next.js API 서버 (미션/영상 렌더는 Next 쪽 사용)
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3002"

import { getShowById } from "../lib/shows"

function getShowDisplayName(showId: string): string {
  const show = getShowById(showId)
  return show?.displayName || showId
}

interface Mission {
  id: string
  title: string
  showId: string
  optionA: string
  optionB: string
  thumbnailUrl?: string
  status: string
  castTags?: string[]
  viralHashtags?: string
}

interface VideoJob {
  missionId: string
  track: 'auto' | 'dealer' | 'result'
  platforms: string[]
  status: 'generating' | 'completed' | 'failed'
  videoPath?: string
  scenario?: any
  snsContent?: any
  error?: string
}

export function SnsViralManage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentJob, setCurrentJob] = useState<VideoJob | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // 생성 옵션
  const [selectedTrack, setSelectedTrack] = useState<'auto' | 'dealer' | 'result'>('auto')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'youtube'])
  
  const { toast } = useToast()

  // 미션 목록 로드 (missions1 + missions2)
  const loadMissions = async () => {
    setIsLoading(true)
    try {
      console.log('[SNS Viral] API_BASE_URL:', API_BASE_URL)
      const url = `${API_BASE_URL}/api/missions/all?limit=100&status=open`
      console.log('[SNS Viral] Fetching:', url)
      
      const res = await fetch(url)
      console.log('[SNS Viral] Response status:', res.status)
      console.log('[SNS Viral] Response headers:', res.headers.get('content-type'))
      
      if (!res.ok) {
        const text = await res.text()
        console.error('[SNS Viral] Response error:', text)
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`)
      }
      
      const data = await res.json()
      
      if (data.success && data.missions) {
        // 미션 데이터 변환 (optionA, optionB 생성)
        const transformedMissions = data.missions.map((mission: any) => {
          let optionA = ''
          let optionB = ''
          
          if (mission.__table === 'missions1') {
            // missions1: options 배열
            const options = mission.options || []
            optionA = options[0] || '선택지 A'
            optionB = options[1] || '선택지 B'
          } else if (mission.__table === 'missions2') {
            // missions2: matchPairs
            const leftOptions = mission.matchPairs?.left || []
            const rightOptions = mission.matchPairs?.right || []
            optionA = leftOptions[0] || '선택지 A'
            optionB = rightOptions[0] || '선택지 B'
          }
          
          return {
            ...mission,
            optionA,
            optionB
          }
        })
        
        setMissions(transformedMissions)
        console.log('[SNS Viral] 미션 로드 성공:', transformedMissions.length)
      } else {
        throw new Error(data.error || '미션을 불러올 수 없습니다.')
      }
    } catch (error: any) {
      console.error('[SNS Viral] 미션 로드 실패:', error)
      toast({
        title: "로딩 실패",
        description: error.message || "미션을 불러올 수 없습니다.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMissions()
  }, [])

  // 플랫폼 토글
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform)
      } else {
        return [...prev, platform]
      }
    })
  }

  // 영상 생성
  const handleGenerateVideo = async () => {
    if (!selectedMission) return
    
    if (selectedPlatforms.length === 0) {
      toast({
        title: "플랫폼 선택 필요",
        description: "최소 1개 플랫폼을 선택하세요.",
        variant: "destructive"
      })
      return
    }
    
    setIsGenerating(true)
    setCurrentJob({
      missionId: selectedMission.id,
      track: selectedTrack,
      platforms: selectedPlatforms,
      status: 'generating'
    })
    
    try {
      console.log('[SNS Viral] 영상 생성 시작:', selectedMission.id)
      
      const res = await fetch(`${API_BASE_URL}/api/video/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: selectedMission.id,
          track: selectedTrack,
          platforms: selectedPlatforms
        })
      })

      const contentType = res.headers.get('content-type') || ''
      const text = await res.text()
      if (!contentType.includes('application/json')) {
        const urlUsed = `${API_BASE_URL}/api/video/render`
        const msg = text.startsWith('<')
          ? `영상 API가 HTML을 반환했습니다 (HTTP ${res.status}). (1) 메인 앱을 실행하세요: f:\\realpick 에서 npm run dev (기본 포트 3002) (2) 브라우저에서 ${API_BASE_URL}/api/health 를 열어 JSON이 나오는지 확인하세요.`
          : (text.slice(0, 200) || `HTTP ${res.status}`)
        throw new Error(msg)
      }
      const data = JSON.parse(text)
      
      if (data.success) {
        setCurrentJob({
          missionId: selectedMission.id,
          track: selectedTrack,
          platforms: selectedPlatforms,
          status: 'completed',
          videoPath: data.videoPath,
          scenario: data.scenario,
          snsContent: data.snsContent
        })
        
        toast({
          title: "영상 생성 완료!",
          description: "시나리오와 SNS 콘텐츠가 생성되었습니다."
        })
      } else {
        throw new Error(data.error || data.details || '생성 실패')
      }
    } catch (error: any) {
      console.error('[SNS Viral] 생성 실패:', error)
      
      setCurrentJob({
        missionId: selectedMission.id,
        track: selectedTrack,
        platforms: selectedPlatforms,
        status: 'failed',
        error: error.message
      })
      
      toast({
        title: "생성 실패",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
          <CardTitle className="flex items-center gap-2 text-purple-700 text-2xl">
            <Video className="w-7 h-7" />
            SNS 바이럴 영상 생성 (AI 자동화)
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Gemini AI가 시나리오와 SNS 콘텐츠를 생성하고, 무료 렌더링으로 숏폼 영상을 만듭니다.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-purple-100 rounded-xl h-14">
              <TabsTrigger value="generate" className="text-base font-bold rounded-lg data-[state=active]:bg-white">
                <Video className="w-5 h-5 mr-2" />
                영상 생성
              </TabsTrigger>
              <TabsTrigger value="history" className="text-base font-bold rounded-lg data-[state=active]:bg-white">
                <Hash className="w-5 h-5 mr-2" />
                생성 이력
              </TabsTrigger>
            </TabsList>

            {/* 영상 생성 탭 */}
            <TabsContent value="generate" className="space-y-6 mt-6">
              {/* 미션 선택 */}
              <div className="space-y-3">
                <Label className="text-lg font-bold text-gray-900">1️⃣ 미션 선택</Label>
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto p-1">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                      <p className="text-gray-400 mt-3">미션 목록 로딩 중...</p>
                    </div>
                  ) : missions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
                      진행 중인 미션이 없습니다.
                    </div>
                  ) : (
                    missions
                      .filter(m => m.status === 'open')
                      .map(mission => (
                        <div
                          key={mission.id}
                          onClick={() => setSelectedMission(mission)}
                          className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedMission?.id === mission.id
                              ? 'border-purple-500 bg-purple-50 shadow-lg'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-bold text-lg text-gray-900">{mission.title}</div>
                              <div className="text-sm text-gray-600 mt-2 flex gap-2">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">A: {mission.optionA}</span>
                                <span className="text-gray-400">vs</span>
                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">B: {mission.optionB}</span>
                              </div>
                              <Badge variant="outline" className="mt-3 font-bold">
                                {getShowDisplayName(mission.showId)}
                              </Badge>
                            </div>
                            {selectedMission?.id === mission.id && (
                              <CheckCircle2 className="w-6 h-6 text-purple-600" />
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Track 선택 */}
              <div className="space-y-3">
                <Label className="text-lg font-bold text-gray-900">2️⃣ Track 선택</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'auto', label: 'AI 자동 미션', description: '일반 사용자 타겟' },
                    { value: 'dealer', label: '딜러 파트너십', description: '딜러 채널 브랜딩' },
                    { value: 'result', label: '결과 중계', description: '긴급 속보 스타일' }
                  ].map(track => (
                    <div
                      key={track.value}
                      onClick={() => setSelectedTrack(track.value as any)}
                      className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                        selectedTrack === track.value
                          ? 'border-purple-500 bg-purple-50 shadow-lg'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="font-bold text-base">{track.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{track.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 플랫폼 선택 */}
              <div className="space-y-3">
                <Label className="text-lg font-bold text-gray-900">3️⃣ SNS 플랫폼 선택</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'pink' },
                    { value: 'youtube', label: 'YouTube', icon: Youtube, color: 'red' },
                    { value: 'tiktok', label: 'TikTok', icon: Hash, color: 'cyan' }
                  ].map(platform => {
                    const Icon = platform.icon
                    const isSelected = selectedPlatforms.includes(platform.value)
                    return (
                      <div
                        key={platform.value}
                        onClick={() => togglePlatform(platform.value)}
                        className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={`w-6 h-6 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                            <span className={`font-bold text-base ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
                              {platform.label}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 생성 버튼 */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleGenerateVideo}
                  disabled={!selectedMission || isGenerating || selectedPlatforms.length === 0}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-16 text-lg font-bold shadow-xl"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin mr-2" />
                      생성 중... (2~3분 소요)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6 mr-2" />
                      AI 영상 생성 시작
                    </>
                  )}
                </Button>
              </div>

              {/* 진행 상황 */}
              {currentJob && (
                <Card className="border-2 border-purple-300 shadow-2xl">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* 상태 표시 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {currentJob.status === 'generating' ? (
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                          ) : currentJob.status === 'completed' ? (
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                          ) : (
                            <X className="w-8 h-8 text-red-600" />
                          )}
                          <span className="font-bold text-xl">
                            {currentJob.status === 'generating' && '생성 중...'}
                            {currentJob.status === 'completed' && '생성 완료!'}
                            {currentJob.status === 'failed' && '생성 실패'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {selectedPlatforms.map(platform => (
                            <Badge key={platform} variant="outline" className="text-sm font-bold">
                              {platform === 'instagram' && <Instagram className="w-4 h-4 mr-1" />}
                              {platform === 'youtube' && <Youtube className="w-4 h-4 mr-1" />}
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* 생성 중 안내 */}
                      {currentJob.status === 'generating' && (
                        <div className="p-5 bg-purple-50 rounded-xl border-2 border-purple-200">
                          <p className="text-base text-purple-800 font-bold">
                            🎬 Gemini AI가 시나리오를 생성하고 있습니다...
                          </p>
                          <p className="text-sm text-purple-600 mt-3">
                            💡 시나리오 생성 → Canvas 렌더링 → SNS 콘텐츠 생성 순서로 진행됩니다.
                          </p>
                        </div>
                      )}

                      {/* 실패 메시지 */}
                      {currentJob.status === 'failed' && (
                        <div className="p-5 bg-red-50 rounded-xl border-2 border-red-200">
                          <p className="text-base text-red-800 font-bold">❌ 오류: {currentJob.error}</p>
                          <p className="text-sm text-red-600 mt-2">
                            💡 Tip: Gemini API 키 설정과 FFmpeg 설치를 확인하세요.
                          </p>
                        </div>
                      )}

                      {/* 완료 - 결과 표시 */}
                      {currentJob.status === 'completed' && currentJob.videoPath && (
                        <div className="space-y-5">
                          {/* 영상 정보 */}
                          <div className="space-y-3">
                            <Label className="text-lg font-bold text-gray-900">📹 생성된 영상</Label>
                            <div className="p-5 bg-green-50 rounded-xl border-2 border-green-200">
                              <p className="text-base text-green-800 font-bold">
                                ✅ 영상 생성 완료!
                              </p>
                              <p className="text-sm text-green-600 mt-2 font-mono">
                                📂 {currentJob.videoPath}
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                size="lg"
                                onClick={async () => {
                                  const a = document.createElement('a')
                                  a.href = `/api/video/download?path=${encodeURIComponent(currentJob.videoPath!)}`
                                  a.download = `mission-${selectedMission?.id}.mp4`
                                  a.click()
                                  
                                  toast({
                                    title: "다운로드 시작",
                                    description: "영상 파일을 다운로드하고 있습니다."
                                  })
                                }}
                                className="flex-1 font-bold"
                              >
                                <Download className="w-5 h-5 mr-2" />
                                영상 다운로드
                              </Button>
                              <Button
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                  toast({
                                    title: "파일 경로",
                                    description: currentJob.videoPath
                                  })
                                }}
                                className="flex-1 font-bold"
                              >
                                <Play className="w-5 h-5 mr-2" />
                                경로 복사
                              </Button>
                            </div>
                          </div>

                          {/* SNS 콘텐츠 */}
                          <div className="space-y-3">
                            <Label className="text-lg font-bold text-gray-900">📱 SNS 콘텐츠 (AI 생성)</Label>
                            
                            {Object.entries(currentJob.snsContent || {}).map(([platform, content]: [string, any]) => (
                              <Card key={platform} className="border-l-4 border-l-purple-500 shadow-lg">
                                <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {platform === 'instagram' && <Instagram className="w-5 h-5" />}
                                    {platform === 'youtube' && <Youtube className="w-5 h-5" />}
                                    {platform === 'tiktok' && <Hash className="w-5 h-5" />}
                                    <span className="font-bold">{platform.toUpperCase()}</span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                  {/* 캡션 */}
                                  <div>
                                    <Label className="text-xs text-gray-500 font-bold uppercase">캡션</Label>
                                    <Textarea
                                      value={content.caption}
                                      readOnly
                                      className="mt-2 text-sm bg-white border-2"
                                      rows={6}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-2 font-bold"
                                      onClick={() => {
                                        navigator.clipboard.writeText(content.caption)
                                        toast({ title: "복사 완료", description: "캡션이 클립보드에 복사되었습니다." })
                                      }}
                                    >
                                      📋 복사하기
                                    </Button>
                                  </div>

                                  {/* 해시태그 */}
                                  <div>
                                    <Label className="text-xs text-gray-500 font-bold uppercase">해시태그</Label>
                                    <Input
                                      value={content.hashtags}
                                      readOnly
                                      className="mt-2 text-sm bg-white border-2 font-mono"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-2 font-bold"
                                      onClick={() => {
                                        navigator.clipboard.writeText(content.hashtags)
                                        toast({ title: "복사 완료", description: "해시태그가 클립보드에 복사되었습니다." })
                                      }}
                                    >
                                      📋 복사하기
                                    </Button>
                                  </div>

                                  {/* CTA */}
                                  <div>
                                    <Label className="text-xs text-gray-500 font-bold uppercase">CTA</Label>
                                    <Input
                                      value={content.cta}
                                      readOnly
                                      className="mt-2 text-sm bg-white border-2"
                                    />
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          {/* 시나리오 확인 */}
                          <div>
                            <Button
                              variant="outline"
                              size="lg"
                              onClick={() => setIsDialogOpen(true)}
                              className="w-full font-bold"
                            >
                              🎬 Gemini AI 시나리오 JSON 보기
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 생성 이력 탭 */}
            <TabsContent value="history" className="mt-6">
              <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-xl">
                <Hash className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p className="text-lg font-bold">생성 이력 기능은 추후 구현 예정입니다.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 선택된 미션 요약 */}
      {selectedMission && (
        <Card className="border-2 border-purple-300 bg-purple-50/30">
          <CardHeader className="bg-purple-100/50">
            <CardTitle className="text-lg">✅ 선택된 미션</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <Label className="text-sm text-gray-500 font-bold">제목</Label>
              <p className="font-bold text-xl mt-1">{selectedMission.title}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500 font-bold">선택지 A</Label>
                <p className="font-semibold mt-1">{selectedMission.optionA}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500 font-bold">선택지 B</Label>
                <p className="font-semibold mt-1">{selectedMission.optionB}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div>
                <Label className="text-sm text-gray-500 font-bold">Track</Label>
                <Badge className="ml-2 font-bold">
                  {selectedTrack === 'auto' && 'AI 자동'}
                  {selectedTrack === 'dealer' && '딜러'}
                  {selectedTrack === 'result' && '결과'}
                </Badge>
              </div>

              <div>
                <Label className="text-sm text-gray-500 font-bold">플랫폼</Label>
                <div className="flex gap-2 mt-1 inline-flex ml-2">
                  {selectedPlatforms.map(p => (
                    <Badge key={p} variant="outline" className="font-bold">
                      {p === 'instagram' && <Instagram className="w-3 h-3 mr-1" />}
                      {p === 'youtube' && <Youtube className="w-3 h-3 mr-1" />}
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 시나리오 JSON 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">📝 Gemini AI 생성 시나리오</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <pre className="bg-gray-900 text-green-400 p-6 rounded-xl text-xs overflow-x-auto font-mono">
              {JSON.stringify(currentJob?.scenario, null, 2)}
            </pre>
            <Button
              variant="outline"
              size="lg"
              className="mt-4 w-full font-bold"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(currentJob?.scenario, null, 2))
                toast({ title: "복사 완료", description: "시나리오 JSON이 클립보드에 복사되었습니다." })
              }}
            >
              📋 JSON 복사하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
