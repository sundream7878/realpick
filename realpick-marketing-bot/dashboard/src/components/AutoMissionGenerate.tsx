import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Zap, RefreshCw, Loader2, Play, CheckCircle, Video, Sparkles, Terminal, ClipboardList, ChevronDown, X, Clock, Filter, BrainCircuit } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "../hooks/useToast"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Label } from "./ui/label"
import { getShowById, SHOWS, CATEGORIES } from "../lib/shows"
import type { TShow } from "../lib/shows"

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
    
    // 옵션 상태
    const [selectedShows, setSelectedShows] = useState<TShow[]>([])
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const [maxResults, setMaxResults] = useState(2)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })
    const [dailyTestRunning, setDailyTestRunning] = useState(false)
    const [dailyTestResult, setDailyTestResult] = useState<{ totalCollected: number; totalScreened: number; totalMissionsCreated: number } | null>(null)
    
    // Firebase에서 실시간 프로그램 상태 가져오기
    const [showStatuses, setShowStatuses] = useState<Record<string, boolean>>({})
    const [isLoadingShows, setIsLoadingShows] = useState(true)
    
    const { toast } = useToast()

    // 프로그램 상태 로드 (개발 시 프록시 404 회피를 위해 백엔드 직접 호출)
    const loadShowStatuses = async () => {
        setIsLoadingShows(true)
        const base = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:3001' : ''
        const url = `${base}/api/public/shows`
        try {
            const res = await fetch(url)
            const contentType = res.headers.get('content-type') ?? ''
            const text = await res.text()
            let data: { statuses?: Record<string, boolean> } = {}
            const trimmed = text.trim()
            const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[')
            if (res.ok && text && !trimmed.startsWith('<') && (contentType.includes('application/json') || looksLikeJson)) {
                try {
                    data = JSON.parse(text)
                } catch (_) {}
            }
            if (data.statuses) {
                setShowStatuses(data.statuses)
                console.log('[AutoMission] 프로그램 상태 로드:', data.statuses)
            }
        } catch (error) {
            // 네트워크/실제 예외만 로그 (HTML 응답 등은 위에서 파싱 스킵으로 처리됨)
            if (error instanceof SyntaxError && String(error).includes('JSON')) return
            console.error('[AutoMission] 프로그램 상태 로드 실패:', error)
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

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.dropdown-container-auto')) {
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

    // 프로그램 선택/해제
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

    const handleDailyAutoTest = async () => {
        const keywords = activeShows.map((s) => s.displayName)
        if (keywords.length === 0) {
            toast({ title: "활성 프로그램 없음", description: "프로그램 상태를 불러온 뒤 다시 시도하세요.", variant: "destructive" })
            return
        }
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3002"
        setDailyTestRunning(true)
        setDailyTestResult(null)
        try {
            const base = typeof import.meta !== "undefined" && import.meta.env?.DEV ? "http://localhost:3001" : ""
            const res = await fetch(`${base}/api/youtube/run-daily-auto-mission`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keywords, baseUrl }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "요청 실패")
            setDailyTestResult({
                totalCollected: data.totalCollected ?? 0,
                totalScreened: data.totalScreened ?? 0,
                totalMissionsCreated: data.totalMissionsCreated ?? 0,
            })
            toast({
                title: "6시 자동 로직 테스트 완료",
                description: `수집 ${data.totalCollected} → 선정 ${data.totalScreened} → 미션 ${data.totalMissionsCreated}개 생성`,
            })
        } catch (e: any) {
            toast({ title: "테스트 실패", description: e.message || String(e), variant: "destructive" })
        } finally {
            setDailyTestRunning(false)
        }
    }

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('ko-KR')
        setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    }

    const handleAutoGenerate = async () => {
        if (selectedShows.length === 0) {
            toast({
                title: "프로그램 선택 필요",
                description: "최소 1개 프로그램을 선택하세요.",
                variant: "destructive"
            })
            return
        }

        setIsRunning(true)
        setLogs([])
        setProgress(0)
        setStats({ totalVideos: 0, totalMissions: 0, completedKeywords: 0 })
        addLog(`자동 미션 생성 시작 (${selectedShows.length}개 프로그램 × ${maxResults}개 영상)...`)
        
        let totalVideos = 0
        let totalMissions = 0
        let completedCount = 0
        
        try {
            for (let i = 0; i < selectedShows.length; i++) {
                const show = selectedShows[i]
                const keyword = show.displayName
                setCurrentKeyword(keyword)
                const keywordProgress = Math.round(((i + 1) / selectedShows.length) * 100)
                setProgress(keywordProgress)
                
                addLog(`[${i + 1}/${selectedShows.length}] "${keyword}" 키워드 수집 중... (${maxResults}개 영상)`)
                
                const crawlRes = await fetch("/api/youtube/crawl", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        keywords: keyword,
                        maxResults: maxResults,
                        startDate: startDate,
                        endDate: endDate
                    })
                })
                
                const crawlData = await crawlRes.json()
                
                if (!crawlData.success || !crawlData.results?.channels?.[keyword]?.videos) {
                    addLog(`"${keyword}" 수집 실패 또는 영상 없음`)
                    completedCount++
                    setStats({
                        totalVideos,
                        totalMissions,
                        completedKeywords: completedCount
                    })
                    continue
                }
                
                const videos = crawlData.results.channels[keyword].videos
                addLog(`"${keyword}" ${videos.length}개 영상 수집 완료`)
                totalVideos += videos.length
                
                for (let vidIdx = 0; vidIdx < videos.length; vidIdx++) {
                    const video = videos[vidIdx]
                    addLog(`"${video.title.substring(0, 40)}..." 분석 중...`)
                    
                    if (vidIdx > 0) {
                        addLog(`API 제한 방지를 위해 3초 대기 중...`)
                        await new Promise(resolve => setTimeout(resolve, 3000))
                    }
                    
                    const analyzeRes = await fetch("/api/youtube/analyze", {
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
                    
                    const analyzeData = await analyzeRes.json()
                    
                    if (analyzeData.success && analyzeData.missions) {
                        const missionCount = analyzeData.missions.length
                        totalMissions += missionCount
                        addLog(`미션 생성 완료: "${analyzeData.missions[0].title}"`)
                        addLog(`생성된 선택지: ${analyzeData.missions[0].options.join(', ')}`)
                    } else {
                        if (analyzeData.error && (analyzeData.error.includes('429') || analyzeData.error.includes('Resource exhausted'))) {
                            addLog(`API 제한 초과. 10초 대기 후 재시도...`)
                            await new Promise(resolve => setTimeout(resolve, 10000))
                            const retryRes = await fetch("/api/youtube/analyze", {
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
                                addLog(`재시도 성공! 미션 생성 완료: "${retryData.missions[0].title}"`)
                            } else {
                                addLog(`재시도 실패: ${retryData.error || '알 수 없는 오류'}`)
                            }
                        } else {
                            addLog(`미션 생성 실패: ${analyzeData.error || '알 수 없는 오류'}`)
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
            addLog(`완료! 총 ${totalVideos}개 영상에서 ${totalMissions}개 미션 생성`)
            toast({ 
                title: "자동 생성 완료", 
                description: `${selectedShows.length}개 프로그램에서 ${totalVideos}개 영상 수집, ${totalMissions}개 미션 생성 완료. [미션 승인 관리]에서 확인하세요.` 
            })
            
        } catch (error: any) {
            addLog(`오류 발생: ${error.message}`)
            toast({ title: "생성 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsRunning(false)
            setCurrentKeyword("")
        }
    }

    return (
        <div className="space-y-6">
            {/* 매일 6시 자동 실행 안내 */}
            <Card className="border-emerald-200 bg-emerald-50/80 backdrop-blur-sm shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="w-5 h-5 text-emerald-600" />
                        매일 새벽 6시 자동 실행
                    </CardTitle>
                    <CardDescription className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>매일 아침 6시(KST)에</span>
                        <strong>지난 24시간</strong>
                        <span>동안 올라온 영상을 수집하고,</span>
                        <span className="inline-flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <strong>수집된 모든 영상에 대해 자동으로 미션을 생성</strong>합니다.
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDailyAutoTest}
                        disabled={dailyTestRunning || activeShows.length === 0}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                    >
                        {dailyTestRunning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                실행 중…
                            </>
                        ) : (
                            "지금 6시 로직 실행"
                        )}
                    </Button>
                    {dailyTestResult && (
                        <span className="text-sm text-emerald-700">
                            수집 {dailyTestResult.totalCollected} → 미션 {dailyTestResult.totalMissionsCreated}개 생성 완료
                        </span>
                    )}
                </CardContent>
            </Card>

            <Card className="border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg overflow-visible relative z-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                        <Sparkles className="w-7 h-7 text-purple-600" />
                        완전 자동 미션 생성 시스템
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        당일 방영 프로그램의 YouTube 영상을 자동 수집하고 AI 미션을 생성합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 overflow-visible">
                    {/* 프로그램 선택 드롭다운 */}
                    <div className="relative dropdown-container-auto overflow-visible">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-semibold text-gray-700">수집 대상 프로그램 선택:</label>
                                <span className="text-xs text-gray-500">({selectedShows.length}개 선택됨)</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAllShows}
                                    disabled={isRunning || selectedShows.length === activeShows.length}
                                    className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                >
                                    전체 선택
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearAllShows}
                                    disabled={isRunning || selectedShows.length === 0}
                                    className="h-7 px-2 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                >
                                    선택 초기화
                                </Button>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={isRunning}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-purple-200 rounded-lg hover:border-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex flex-wrap gap-2">
                                {selectedShows.length === 0 ? (
                                    <span className="text-gray-400">프로그램을 선택하세요</span>
                                ) : (
                                    selectedShows.map(show => (
                                        <Badge key={show.id} className="bg-purple-100 text-purple-700 border-purple-300">
                                            {show.displayName}
                                        </Badge>
                                    ))
                                )}
                            </div>
                            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute left-0 right-0 z-[9999] mt-2 bg-white border-2 border-purple-200 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
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
                                                        // 이미지 로드 실패 시 이모지로 폴백
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
                                                            className="flex items-center gap-3 px-4 py-2 hover:bg-purple-50 cursor-pointer transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleShow(show)}
                                                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                                            />
                                                            <span className={`text-sm ${isSelected ? 'font-semibold text-purple-700' : 'text-gray-700'}`}>
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

                    {/* 날짜 범위 및 수집 개수 */}
                    <div className="flex gap-4 items-center bg-purple-50/50 p-4 rounded-lg border border-purple-100">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">시작일:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 border border-purple-200 rounded text-sm"
                                disabled={isRunning}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">종료일:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 border border-purple-200 rounded text-sm"
                                disabled={isRunning}
                            />
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                            <label className="text-sm font-medium text-gray-700">영상 개수:</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={maxResults}
                                onChange={(e) => setMaxResults(parseInt(e.target.value) || 2)}
                                className="w-20 px-2 py-1.5 border border-purple-200 rounded text-sm"
                                disabled={isRunning}
                            />
                            <span className="text-xs text-gray-500">개/프로그램</span>
                        </div>
                    </div>

                    {/* 통계 */}
                    {(isRunning || stats.totalVideos > 0) && (
                        <div className="grid grid-cols-3 gap-6 p-6 bg-gradient-to-br from-purple-100/80 to-pink-100/80 rounded-2xl backdrop-blur-sm border border-purple-200">
                            <div className="text-center">
                                <div className="text-4xl font-extrabold text-purple-600">{stats.totalVideos}</div>
                                <div className="text-sm font-bold text-gray-600 mt-1">수집된 영상</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-extrabold text-pink-600">{stats.totalMissions}</div>
                                <div className="text-sm font-bold text-gray-600 mt-1">생성된 미션</div>
                            </div>
                            <div className="text-center">
                                <div className="text-4xl font-extrabold text-blue-600">{stats.completedKeywords}/{selectedShows.length}</div>
                                <div className="text-sm font-bold text-gray-600 mt-1">완료된 프로그램</div>
                            </div>
                        </div>
                    )}

                    {/* 진행률 */}
                    {isRunning && (
                        <div className="space-y-3">
                            <div className="flex justify-between text-base">
                                <span className="text-gray-600 font-bold">진행 중: {currentKeyword}</span>
                                <span className="font-extrabold text-purple-600 text-lg">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-3" />
                        </div>
                    )}

                    {/* 버튼 */}
                    <div className="space-y-3">
                        <Button 
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 gap-3 h-16 text-lg font-extrabold rounded-2xl"
                            onClick={handleAutoGenerate}
                            disabled={isRunning || selectedShows.length === 0}
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    자동 생성 진행 중...
                                </>
                            ) : (
                                <>
                                    <Play className="w-6 h-6" />
                                    전체 자동 수집 및 미션 생성 시작
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 실시간 로그 */}
            {logs.length > 0 && (
                <Card className="rounded-2xl bg-white/60 backdrop-blur-sm border-purple-100 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl font-extrabold">실시간 로그</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-gray-900 rounded-2xl p-6 font-mono text-sm text-green-400 space-y-2 max-h-[500px] overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i} className="leading-relaxed">{log}</div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 안내 문구 */}
            <div className="grid gap-6 md:grid-cols-1">
                <Card className="border-purple-200 bg-white/60 backdrop-blur-sm rounded-2xl shadow-md">
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <div className="text-purple-600 mt-0.5">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <div className="space-y-3 text-base text-purple-900">
                                <p className="font-extrabold text-lg">전체 자동 생성 모드</p>
                                <ul className="list-disc list-inside space-y-2 text-purple-700 font-bold">
                                    <li>선택한 프로그램의 YouTube 영상 자동 수집</li>
                                    <li>날짜 범위 내의 영상만 필터링</li>
                                    <li>프로그램당 설정한 개수만큼 수집</li>
                                    <li>Gemini AI가 자동으로 미션 생성</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 프로세스 */}
            <Card className="border-purple-100 bg-white/60 backdrop-blur-sm rounded-2xl shadow-md">
                <CardContent className="p-6">
                    <div className="space-y-3 text-base text-gray-700">
                        <p className="font-extrabold text-gray-900 text-lg">자동 생성 프로세스</p>
                        <ol className="list-decimal list-inside space-y-2 font-bold">
                            <li>YouTube API로 영상 메타데이터 수집</li>
                            <li>영상 자막 추출 (없으면 스킵)</li>
                            <li>Gemini AI가 자막 분석하여 질문 + 답변 선택지 생성</li>
                            <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">ai_missions</code> 컬렉션에 저장 (승인 대기)</li>
                            <li>"미션 승인 관리" 탭에서 확인 및 승인</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
