"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Zap, Settings, RefreshCw, Loader2, Play, Check, Edit2, CheckCircle, Video, Sparkles } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { Badge } from "@/components/c-ui/badge"
import { Progress } from "@/components/c-ui/progress"

// 자동 크롤링 키워드 목록
const AUTO_KEYWORDS = [
    "나는솔로",
    "나솔사계", 
    "솔로지옥",
    "환승연애",
    "합숙맞선",
    "최강야구",
    "골 때리는 그녀들",
    "뭉쳐야 찬다",
    "미스터트롯",
    "현역가왕",
    "쇼미더머니"
]

export function AutoMissionGenerate() {
    const [isRunning, setIsRunning] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [currentKeyword, setCurrentKeyword] = useState("")
    const [progress, setProgress] = useState(0)
    const [logs, setLogs] = useState<string[]>([])
    const [stats, setStats] = useState({
        totalVideos: 0,
        totalMissions: 0,
        completedKeywords: 0
    })
    const { toast } = useToast()

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('ko-KR')
        setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    }

    // 간단한 테스트 함수 (3개 영상, 1-2개 키워드만)
    const handleQuickTest = async () => {
        setIsTesting(true)
        setLogs([])
        setStats({ totalVideos: 0, totalMissions: 0, completedKeywords: 0 })
        
        addLog("🧪 빠른 테스트 시작 (나는솔로 3개 영상)")
        
        try {
            const keyword = "나는솔로"
            addLog(`📺 "${keyword}" 키워드로 3개 영상 수집 및 AI 미션 자동 생성 중...`)
            
            // test-collect API 사용 (크롤링 + 저장 + AI 미션 생성 한번에)
            const response = await fetch("/api/admin/marketer/youtube/test-collect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword })
            })
            
            const data = await response.json()
            
            if (!data.success) {
                addLog(`❌ 실패: ${data.error}`)
                if (data.details) {
                    addLog(`🔍 상세 정보: ${JSON.stringify(data.details)}`)
                }
                toast({ 
                    title: "테스트 실패", 
                    description: data.error || "알 수 없는 오류", 
                    variant: "destructive" 
                })
                return
            }
            
            // 결과 출력
            addLog(`✅ 영상 수집: ${data.stats.videos}개`)
            addLog(`✅ 채널 저장: ${data.stats.channels}개`)
            addLog(`✨ AI 미션 생성: ${data.stats.missions}개`)
            
            if (data.generatedMissions && data.generatedMissions.length > 0) {
                data.generatedMissions.forEach((mission: any, idx: number) => {
                    addLog(`📝 미션 ${idx + 1}: "${mission.title}"`)
                    addLog(`   선택지: ${mission.options.join(', ')}`)
                })
            }
            
            if (data.collectedVideos && data.collectedVideos.length > 0) {
                addLog(`\n📹 수집된 영상들:`)
                data.collectedVideos.forEach((video: any, idx: number) => {
                    addLog(`  ${idx + 1}. ${video.title.substring(0, 50)}...`)
                    addLog(`     조회수: ${parseInt(video.viewCount).toLocaleString()}회`)
                })
            }
            
            setStats({
                totalVideos: data.stats.videos,
                totalMissions: data.stats.missions,
                completedKeywords: 1
            })
            
            addLog(`\n🎉 테스트 완료! 생성된 미션은 [미션 승인 관리]에서 확인하세요.`)
            toast({ 
                title: "테스트 성공", 
                description: `${data.stats.videos}개 영상에서 ${data.stats.missions}개 미션 생성 완료` 
            })
            
        } catch (error: any) {
            addLog(`❌ 오류: ${error.message}`)
            console.error("Test error:", error)
            toast({ 
                title: "테스트 실패", 
                description: error.message, 
                variant: "destructive" 
            })
        } finally {
            setIsTesting(false)
        }
    }

    const handleAutoGenerate = async () => {
        setIsRunning(true)
        setLogs([])
        setProgress(0)
        setStats({ totalVideos: 0, totalMissions: 0, completedKeywords: 0 })
        
        addLog("🚀 자동 미션 생성 시작 (나는솔로 1개 영상 분석)...")
        
        const today = new Date().toISOString().split('T')[0]
        let totalVideos = 0
        let totalMissions = 0
        
        try {
            // 테스트를 위해 나는솔로 1개 영상만 처리
            const keyword = "나는솔로"
            setCurrentKeyword(keyword)
            
            addLog(`📺 "${keyword}" 키워드 수집 중...`)
            
            // 1. YouTube 크롤링 (1개 영상만)
            const crawlRes = await fetch("/api/admin/marketer/youtube/crawl", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    keywords: keyword,
                    maxResults: 1, // 1개만 수집
                    startDate: today,
                    endDate: today
                })
            })
            
            const crawlData = await crawlRes.json()
            
            if (!crawlData.success || !crawlData.results?.channels?.[keyword]?.videos) {
                addLog(`⚠️ "${keyword}" 수집 실패 또는 영상 없음`)
            } else {
                const videos = crawlData.results.channels[keyword].videos
                addLog(`✅ "${keyword}" ${videos.length}개 영상 수집 완료`)
                totalVideos += videos.length
                
                // 2. 수집된 영상 AI 분석 및 미션 생성
                for (const video of videos) {
                    addLog(`🤖 "${video.title.substring(0, 30)}..." 분석 중...`)
                    
                    const analyzeRes = await fetch("/api/admin/marketer/youtube/analyze", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            videoId: video.video_id,
                            title: video.title,
                            desc: video.description || "",
                            channelName: video.channel_title,
                            channelId: video.channel_id
                        })
                    })
                    
                    const analyzeData = await analyzeRes.json()
                    
                    if (analyzeData.success && analyzeData.missions) {
                        const missionCount = analyzeData.missions.length
                        totalMissions += missionCount
                        addLog(`✨ 미션 생성 완료: "${analyzeData.missions[0].title}"`)
                        addLog(`📝 생성된 선택지: ${analyzeData.missions[0].options.join(', ')}`)
                    } else {
                        addLog(`⚠️ 미션 생성 실패: ${analyzeData.error || '알 수 없는 오류'}`)
                    }
                }
            }
            
            setStats({
                totalVideos,
                totalMissions,
                completedKeywords: 1
            })
            
            setProgress(100)
            addLog(`🎉 완료! 총 ${totalVideos}개 영상에서 ${totalMissions}개 미션 생성`)
            toast({ 
                title: "자동 생성 완료", 
                description: `나는솔로 미션이 생성되었습니다. [미션 승인 관리]에서 확인하세요.` 
            })
            
        } catch (error: any) {
            addLog(`❌ 오류 발생: ${error.message}`)
            toast({ title: "생성 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsRunning(false)
            setCurrentKeyword("")
        }
    }

    return (
        <div className="space-y-6">
            {/* 자동 생성 컨트롤 */}
            <Card className="border-purple-200">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        완전 자동 미션 생성 시스템
                    </CardTitle>
                    <CardDescription>
                        당일 방영 프로그램의 YouTube 영상을 자동 수집하고 AI 미션을 생성합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    {/* 자동 크롤링 키워드 목록 */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700">수집 대상 프로그램 ({AUTO_KEYWORDS.length}개 × 2개 영상)</h4>
                        <div className="flex flex-wrap gap-2">
                            {AUTO_KEYWORDS.map((kw, i) => (
                                <Badge 
                                    key={i} 
                                    variant="outline" 
                                    className={`text-xs ${
                                        currentKeyword === kw 
                                            ? 'bg-purple-100 border-purple-300 text-purple-700 animate-pulse' 
                                            : stats.completedKeywords > i 
                                            ? 'bg-green-50 border-green-300 text-green-700'
                                            : 'bg-gray-50'
                                    }`}
                                >
                                    {stats.completedKeywords > i && <CheckCircle className="w-3 h-3 mr-1" />}
                                    {kw}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* 통계 */}
                    {(isRunning || stats.totalVideos > 0) && (
                        <div className="grid grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-600">{stats.totalVideos}</div>
                                <div className="text-xs text-gray-600">수집된 영상</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-pink-600">{stats.totalMissions}</div>
                                <div className="text-xs text-gray-600">생성된 미션</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.completedKeywords}/{AUTO_KEYWORDS.length}</div>
                                <div className="text-xs text-gray-600">완료된 키워드</div>
                            </div>
                        </div>
                    )}

                    {/* 진행률 */}
                    {isRunning && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">진행 중: {currentKeyword}</span>
                                <span className="font-semibold text-purple-600">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                    {/* 버튼 그룹 */}
                    <div className="space-y-3">
                        {/* 빠른 테스트 버튼 (권장) */}
                        <Button 
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 gap-2 h-12 text-base font-semibold"
                            onClick={handleQuickTest}
                            disabled={isRunning || isTesting}
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    테스트 진행 중...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    🧪 빠른 테스트 (나는솔로 3개 영상)
                                </>
                            )}
                        </Button>
                        
                        {/* 구분선 */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-white px-2 text-gray-500">또는</span>
                            </div>
                        </div>
                        
                        {/* 전체 자동 생성 버튼 */}
                        <Button 
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 h-12 text-base font-semibold"
                            onClick={handleAutoGenerate}
                            disabled={isRunning || isTesting}
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    자동 생성 진행 중...
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    전체 자동 수집 및 미션 생성 시작
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 실시간 로그 */}
            {logs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">실시간 로그</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 space-y-1 max-h-[400px] overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 안내 문구 */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* 테스트 모드 안내 */}
                <Card className="border-cyan-200 bg-cyan-50/30">
                    <CardContent className="p-4">
                        <div className="flex gap-3">
                            <div className="text-cyan-600 mt-0.5">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div className="space-y-2 text-sm text-cyan-900">
                                <p className="font-semibold">🧪 빠른 테스트 모드 (권장)</p>
                                <ul className="list-disc list-inside space-y-1 text-cyan-700">
                                    <li>나는솔로 키워드로 최근 3개 영상 수집</li>
                                    <li>자막이 있는 영상만 자동으로 AI 미션 생성</li>
                                    <li>약 30초~1분 소요 (영상당 10-20초)</li>
                                    <li>질문과 답변이 제대로 생성되는지 빠르게 확인</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 전체 모드 안내 */}
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardContent className="p-4">
                        <div className="flex gap-3">
                            <div className="text-purple-600 mt-0.5">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="space-y-2 text-sm text-purple-900">
                                <p className="font-semibold">⚡ 전체 자동 생성 모드</p>
                                <ul className="list-disc list-inside space-y-1 text-purple-700">
                                    <li>모든 프로그램 키워드 수집 (11개)</li>
                                    <li>키워드당 1개씩 영상 수집 및 분석</li>
                                    <li>약 3-5분 소요</li>
                                    <li>대량 미션 생성시 사용</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 공통 프로세스 */}
            <Card className="border-gray-200">
                <CardContent className="p-4">
                    <div className="space-y-2 text-sm text-gray-700">
                        <p className="font-semibold text-gray-900">📋 자동 생성 프로세스</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>YouTube API로 영상 메타데이터 수집</li>
                            <li>영상 자막 추출 (없으면 스킵)</li>
                            <li>Gemini AI가 자막 분석 → 질문 + 답변 선택지 생성</li>
                            <li><code className="bg-gray-100 px-1 rounded text-xs">ai_missions</code> 컬렉션에 저장 (승인 대기)</li>
                            <li>"미션 승인 관리" 탭에서 확인 및 승인</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
