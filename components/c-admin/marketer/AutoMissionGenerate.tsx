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

    const handleAutoGenerate = async () => {
        setIsRunning(true)
        setLogs([])
        setProgress(0)
        setStats({ totalVideos: 0, totalMissions: 0, completedKeywords: 0 })
        
        addLog(`🚀 자동 미션 생성 시작 (${AUTO_KEYWORDS.length}개 프로그램 × 2개 영상)...`)
        
        let totalVideos = 0
        let totalMissions = 0
        let completedCount = 0
        
        try {
            // 모든 키워드를 순회하며 각각 2개씩 크롤링
            for (let i = 0; i < AUTO_KEYWORDS.length; i++) {
                const keyword = AUTO_KEYWORDS[i]
                setCurrentKeyword(keyword)
                const keywordProgress = Math.round(((i + 1) / AUTO_KEYWORDS.length) * 100)
                setProgress(keywordProgress)
                
                addLog(`📺 [${i + 1}/${AUTO_KEYWORDS.length}] "${keyword}" 키워드 수집 중... (2개 영상)`)
                
                // 1. YouTube 크롤링 (프로그램당 2개씩)
                const crawlRes = await fetch("/api/admin/marketer/youtube/crawl", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        keywords: keyword,
                        maxResults: 2, // 프로그램당 2개씩
                    })
                })
                
                const crawlData = await crawlRes.json()
                
                if (!crawlData.success || !crawlData.results?.channels?.[keyword]?.videos) {
                    addLog(`⚠️ "${keyword}" 수집 실패 또는 영상 없음`)
                    completedCount++
                    setStats({
                        totalVideos,
                        totalMissions,
                        completedKeywords: completedCount
                    })
                    continue
                }
                
                const videos = crawlData.results.channels[keyword].videos
                addLog(`✅ "${keyword}" ${videos.length}개 영상 수집 완료`)
                totalVideos += videos.length
                
                // 2. 수집된 영상 AI 분석 및 미션 생성
                for (let vidIdx = 0; vidIdx < videos.length; vidIdx++) {
                    const video = videos[vidIdx]
                    addLog(`🤖 "${video.title.substring(0, 40)}..." 분석 중...`)
                    
                    // API 제한 방지를 위해 요청 간 딜레이 (첫 번째 요청 제외)
                    if (vidIdx > 0) {
                        addLog(`⏳ API 제한 방지를 위해 3초 대기 중...`)
                        await new Promise(resolve => setTimeout(resolve, 3000))
                    }
                    
                    const analyzeRes = await fetch("/api/admin/marketer/youtube/analyze", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            videoId: video.video_id,
                            title: video.title,
                            desc: video.description || "",
                            channelName: video.channel_title,
                            channelId: video.channel_id,
                            keyword: keyword // 키워드 전달하여 정확한 프로그램 분류
                        })
                    })
                    
                    const analyzeData = await analyzeRes.json()
                    
                    if (analyzeData.success && analyzeData.missions) {
                        const missionCount = analyzeData.missions.length
                        totalMissions += missionCount
                        addLog(`✨ 미션 생성 완료: "${analyzeData.missions[0].title}"`)
                        addLog(`📝 생성된 선택지: ${analyzeData.missions[0].options.join(', ')}`)
                    } else {
                        // 429 에러인 경우 특별 처리
                        if (analyzeData.error && (analyzeData.error.includes('429') || analyzeData.error.includes('Resource exhausted'))) {
                            addLog(`⚠️ API 제한 초과. 10초 대기 후 재시도...`)
                            await new Promise(resolve => setTimeout(resolve, 10000))
                            // 재시도
                            const retryRes = await fetch("/api/admin/marketer/youtube/analyze", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    videoId: video.video_id,
                                    title: video.title,
                                    desc: video.description || "",
                                    channelName: video.channel_title,
                                    channelId: video.channel_id,
                                    keyword: keyword
                                })
                            })
                            const retryData = await retryRes.json()
                            if (retryData.success && retryData.missions) {
                                const missionCount = retryData.missions.length
                                totalMissions += missionCount
                                addLog(`✨ 재시도 성공! 미션 생성 완료: "${retryData.missions[0].title}"`)
                            } else {
                                addLog(`❌ 재시도 실패: ${retryData.error || '알 수 없는 오류'}`)
                            }
                        } else {
                            addLog(`⚠️ 미션 생성 실패: ${analyzeData.error || '알 수 없는 오류'}`)
                        }
                    }
                }
                
                completedCount++
                setStats({
                    totalVideos,
                    totalMissions,
                    completedKeywords: completedCount
                })
            }
            
            setProgress(100)
            addLog(`🎉 완료! 총 ${totalVideos}개 영상에서 ${totalMissions}개 미션 생성`)
            toast({ 
                title: "자동 생성 완료", 
                description: `${AUTO_KEYWORDS.length}개 프로그램에서 ${totalVideos}개 영상 수집, ${totalMissions}개 미션 생성 완료. [미션 승인 관리]에서 확인하세요.` 
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
                        {/* 전체 자동 생성 버튼 */}
                        <Button 
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-2 h-12 text-base font-semibold"
                            onClick={handleAutoGenerate}
                            disabled={isRunning}
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
            <div className="grid gap-4 md:grid-cols-1">
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
