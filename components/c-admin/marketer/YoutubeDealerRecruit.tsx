"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Search, Youtube, Mail, Loader2, ExternalLink, RefreshCw, Check, Edit2, Zap, Trash2, Calendar, Users, Plus, X, Clock, Send } from "lucide-react"
import { Input } from "@/components/c-ui/input"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { Badge } from "@/components/c-ui/badge"
import { Textarea } from "@/components/c-ui/textarea"

export function YoutubeDealerRecruit() {
    const [keywords, setKeywords] = useState("")
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })
    const [maxResults, setMaxResults] = useState("5")
    const [isCrawling, setIsCrawling] = useState(false)
    const [crawlResults, setCrawlResults] = useState<any>(null)
    const [selectedVideo, setSelectedVideo] = useState<any>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [aiMissions, setAiMissions] = useState<any[]>([])
    const { toast } = useToast()

    // 이메일 관리 관련 상태
    const [emailSubject, setEmailSubject] = useState("🎯 리얼픽 파트너십 제안")
    const [emailTemplate, setEmailTemplate] = useState(`안녕하세요, {{channelName}} 님!

리얼픽 팀입니다. 귀하의 콘텐츠가 저희 플랫폼에서 큰 관심을 받고 있어 연락드립니다.

저희 리얼픽은 AI를 활용해 예능 콘텐츠의 재미를 극대화하는 투표 미션을 생성하고, 이를 통해 새로운 수익 모델을 제공하는 플랫폼입니다.

귀하의 채널 규모와 시청자 반응을 고려할 때, 리얼픽의 '공식 딜러'로 참여하시면 월 50만원 이상의 추가 수익이 예상됩니다.

[제안 내용]
1. 광고 수익 30% 쉐어
2. 실시간 정산 시스템 제공
3. 팬 참여 인터랙티브 콘텐츠 자동 생성

관심이 있으시다면 이 메일로 회신 부탁드립니다.
감사합니다.

리얼픽 비즈니스팀 드림`)
    const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null)
    
    // 승인된 미션 목록 관련 상태
    const [approvedMissions, setApprovedMissions] = useState<any[]>([])
    const [isLoadingMissions, setIsLoadingMissions] = useState(false)
    const [isDeletingMission, setIsDeletingMission] = useState<string | null>(null)

    // 1. 크롤링 핸들러
    const handleCrawl = async () => {
        if (!keywords.trim()) {
            toast({ title: "입력 오류", description: "키워드를 입력해주세요.", variant: "destructive" })
            return
        }

        setIsCrawling(true)
        try {
            const res = await fetch("/api/admin/marketer/youtube/crawl", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    keywords, 
                    maxResults: parseInt(maxResults), 
                    startDate,
                    endDate
                })
            })
            const data = await res.json()
            if (data.success) {
                setCrawlResults(data.results)
                toast({ title: "수집 완료", description: "유튜브 데이터를 성공적으로 가져왔습니다." })
            } else throw new Error(data.error)
        } catch (error: any) {
            toast({ title: "수집 실패", description: error.message, variant: "destructive" })
        } finally { setIsCrawling(false) }
    }

    // 2. AI 미션 분석 핸들러
    const handleAiAnalyze = async (video: any) => {
        setSelectedVideo(video)
        setIsAnalyzing(true)
        setAiMissions([]) // 이전 결과 초기화
        try {
            const res = await fetch("/api/admin/marketer/youtube/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    videoId: video.video_id, 
                    title: video.title,
                    desc: video.description 
                })
            })
            const data = await res.json()
            if (data.success) {
                const defaultDeadline = new Date()
                defaultDeadline.setDate(defaultDeadline.getDate() + 7)
                const deadlineDate = defaultDeadline.toISOString().split('T')[0]
                const deadlineTime = "23:59"

                const missionsWithEditingState = data.missions.map((m: any) => ({
                    ...m,
                    deadlineDate,
                    deadlineTime
                }))
                
                setAiMissions(missionsWithEditingState)
                toast({ title: "AI 분석 완료", description: "미션 초안이 생성되었습니다." })
            } else throw new Error(data.error)
        } catch (error: any) {
            toast({ title: "분석 실패", description: error.message, variant: "destructive" })
        } finally { setIsAnalyzing(false) }
    }

    // 3. 미션 내용 수정 핸들러
    const updateMissionField = (idx: number, field: string, value: any) => {
        setAiMissions(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
    }

    const updateOptionValue = (mIdx: number, oIdx: number, value: string) => {
        setAiMissions(prev => prev.map((m, i) => {
            if (i === mIdx) {
                const newOptions = [...m.options]
                newOptions[oIdx] = value
                return { ...m, options: newOptions }
            }
            return m
        }))
    }

    const addOption = (mIdx: number) => {
        setAiMissions(prev => prev.map((m, i) => {
            if (i === mIdx) {
                return { ...m, options: [...m.options, `새 선택지 ${m.options.length + 1}`] }
            }
            return m
        }))
    }

    const removeOption = (mIdx: number, oIdx: number) => {
        setAiMissions(prev => prev.map((m, i) => {
            if (i === mIdx && m.options.length > 2) {
                return { ...m, options: m.options.filter((_: any, oi: number) => oi !== oIdx) }
            }
            return m
        }))
    }

    // 4. 미션 최종 저장 (DB 등록)
    const handleSaveMission = async (mission: any, idx: number) => {
        try {
            const deadline = new Date(`${mission.deadlineDate}T${mission.deadlineTime}:00`).toISOString()

            const res = await fetch("/api/missions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: mission.title,
                    options: mission.options,
                    kind: mission.category === 'PREDICT' ? 'prediction' : 'majority',
                    form: mission.form || 'multi',
                    deadline: deadline,
                    showId: selectedVideo.keyword || "nasolo",
                    category: 'LOVE',
                    isAIMission: true,
                    channelName: selectedVideo.channel_title,
                    referenceUrl: `https://www.youtube.com/watch?v=${selectedVideo.video_id}`,
                    thumbnailUrl: `https://img.youtube.com/vi/${selectedVideo.video_id}/hqdefault.jpg`
                })
            })
            const data = await res.json()
            if (data.success) {
                toast({ title: "미션 게시 성공", description: "리얼픽 페이지에 정식 게시되었습니다." })
                setAiMissions(prev => prev.filter((_, i) => i !== idx))
            } else throw new Error(data.error)
        } catch (error: any) {
            toast({ title: "저장 실패", description: error.message, variant: "destructive" })
        }
    }

    // 5. 이메일 발송 핸들러
    const handleSendEmail = async (channel: any) => {
        if (!channel.email) {
            toast({ title: "발송 실패", description: "이메일 주소를 입력해주세요.", variant: "destructive" })
            return
        }

        setIsSendingEmail(channel.title)
        try {
            // 실제 메일 발송 로직 (백엔드 구현 필요)
            // 여기서는 시뮬레이션만 진행
            await new Promise(resolve => setTimeout(resolve, 1500))
            
            toast({ title: "발송 완료", description: `${channel.title}님께 제안 메일을 보냈습니다.` })
        } catch (error: any) {
            toast({ title: "발송 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsSendingEmail(null)
        }
    }

    const videoList: any[] = []
    const [channelList, setChannelList] = useState<any[]>([])

    useEffect(() => {
        if (crawlResults?.channels) {
            const vList: any[] = []
            const cMap: Record<string, any> = {}
            Object.entries(crawlResults.channels).forEach(([kw, data]: [string, any]) => {
                if (data.status === 'success') {
                    data.videos.forEach((v: any) => {
                        vList.push({ ...v, keyword: kw })
                        if (!cMap[v.channel_title]) {
                            cMap[v.channel_title] = {
                                title: v.channel_title,
                                subscribers: v.subscriber_count,
                                email: v.email || "",
                                keyword: kw
                            }
                        }
                    })
                }
            })
            setChannelList(Object.values(cMap))
        }
    }, [crawlResults])

    const updateChannelEmail = (idx: number, email: string) => {
        setChannelList(prev => prev.map((c, i) => i === idx ? { ...c, email } : c))
    }

    // 6. 승인된 AI 미션 목록 불러오기
    const loadApprovedMissions = async () => {
        setIsLoadingMissions(true)
        try {
            const res = await fetch("/api/missions/ai")
            const data = await res.json()
            if (data.success) {
                setApprovedMissions(data.missions || [])
            } else throw new Error(data.error)
        } catch (error: any) {
            toast({ title: "불러오기 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsLoadingMissions(false)
        }
    }

    // 7. 미션 삭제 핸들러
    const handleDeleteMission = async (missionId: string) => {
        if (!confirm("정말 이 미션을 삭제하시겠습니까?")) return
        
        setIsDeletingMission(missionId)
        try {
            const res = await fetch(`/api/missions/${missionId}`, {
                method: "DELETE"
            })
            const data = await res.json()
            if (data.success) {
                toast({ title: "삭제 완료", description: "미션이 삭제되었습니다." })
                setApprovedMissions(prev => prev.filter(m => m.id !== missionId))
            } else throw new Error(data.error)
        } catch (error: any) {
            toast({ title: "삭제 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsDeletingMission(null)
        }
    }

    // 데이터 가공 (videoList는 렌더링 시마다 계산해도 무방)
    if (crawlResults?.channels) {
        Object.entries(crawlResults.channels).forEach(([kw, data]: [string, any]) => {
            if (data.status === 'success') {
                data.videos.forEach((v: any) => {
                    if (!videoList.find(existing => existing.video_id === v.video_id)) {
                        videoList.push({ ...v, keyword: kw })
                    }
                })
            }
        })
    }

    return (
        <Tabs defaultValue="crawl" className="space-y-4" onValueChange={(value) => {
            if (value === "approve" && approvedMissions.length === 0) {
                loadApprovedMissions()
            }
        }}>
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="crawl">크롤링 및 분석</TabsTrigger>
                <TabsTrigger value="approve">미션 승인 관리</TabsTrigger>
                <TabsTrigger value="email">이메일 관리</TabsTrigger>
            </TabsList>

            <TabsContent value="crawl" className="space-y-6">
                {/* 수집 설정 카드 */}
                <Card>
                    <CardHeader>
                        <CardTitle>YouTube 데이터 수집</CardTitle>
                        <CardDescription>키워드와 기간을 설정하여 최신 영상과 채널 정보를 수집합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4 space-y-2">
                                <label className="text-xs font-medium text-gray-500">수집 키워드</label>
                                <Input 
                                    placeholder="예: 나는솔로, 환승연애" 
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                />
                            </div>
                            
                            <div className="md:col-span-5 space-y-2">
                                <label className="text-xs font-medium text-gray-500">수집 기간 (시작일 ~ 종료일)</label>
                                <div className="flex items-center gap-1 bg-gray-50 border rounded-md px-2 py-1 focus-within:ring-1 focus-within:ring-ring">
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                        <input 
                                            type="date"
                                            className="w-full pl-7 bg-transparent border-none text-sm outline-none cursor-pointer h-7"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <span className="text-gray-400 font-bold">~</span>
                                    <div className="relative flex-1">
                                        <Calendar className="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                        <input 
                                            type="date"
                                            className="w-full pl-7 bg-transparent border-none text-sm outline-none cursor-pointer h-7"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-1 space-y-2">
                                <label className="text-xs font-medium text-gray-500">수집량</label>
                                <Input 
                                    type="number"
                                    className="h-9 px-2"
                                    value={maxResults}
                                    onChange={(e) => setMaxResults(e.target.value)}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Button 
                                    onClick={handleCrawl} 
                                    disabled={isCrawling} 
                                    className="w-full bg-red-600 hover:bg-red-700 h-9 px-0"
                                >
                                    {isCrawling ? <Loader2 className="animate-spin w-4 h-4" /> : <Search className="w-4 h-4 mr-1" />}
                                    수집 시작
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 영상 목록 및 채널 분석 현황 - 가로 배치 */}
                {videoList.length > 0 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 영상 목록 */}
                            <Card className="border-gray-200">
                                <CardHeader className="bg-gray-50/50 border-b">
                                    <CardTitle className="text-base font-bold">수집된 영상 목록</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white sticky top-0 border-b shadow-sm z-10">
                                                <tr>
                                                    <th className="p-3 text-left font-semibold text-gray-600">영상 정보</th>
                                                    <th className="p-3 text-right font-semibold text-gray-600">관리</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {videoList.map((v, i) => (
                                                    <tr key={i} className={`hover:bg-gray-50 transition-colors ${selectedVideo?.video_id === v.video_id ? 'bg-blue-50/50' : ''}`}>
                                                        <td className="p-3">
                                                            <div 
                                                                className="font-bold text-gray-900 line-clamp-1 cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                                                                onClick={() => window.open(v.video_url, '_blank')}
                                                                title={v.title}
                                                            >
                                                                {v.title}
                                                            </div>
                                                            <div className="text-[11px] text-gray-500 flex gap-2 mt-1">
                                                                <span className="font-medium text-blue-600">{v.channel_title}</span>
                                                                <span>•</span>
                                                                <span>{parseInt(v.view_count).toLocaleString()}회</span>
                                                                <span>•</span>
                                                                <span>{v.published_at.split('T')[0]}</span>
                                                                {v.has_subtitle !== undefined && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className={v.has_subtitle ? "text-green-600 font-bold" : "text-red-400"}>
                                                                            {v.has_subtitle ? "자막 있음" : "자막 없음"}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <Button 
                                                                size="sm" 
                                                                variant={selectedVideo?.video_id === v.video_id ? "default" : "outline"}
                                                                className={`h-8 gap-1 text-xs ${selectedVideo?.video_id === v.video_id ? 'bg-blue-600' : ''}`}
                                                                onClick={() => handleAiAnalyze(v)}
                                                                disabled={isAnalyzing}
                                                            >
                                                                {isAnalyzing && selectedVideo?.video_id === v.video_id ? 
                                                                    <Loader2 className="animate-spin w-3 h-3" /> : 
                                                                    <Zap className="w-3 h-3" />}
                                                                분석
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 채널 목록 */}
                            <Card className="border-gray-200">
                                <CardHeader className="bg-gray-50/50 border-b">
                                    <CardTitle className="text-base font-bold text-blue-900 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        채널 분석 현황
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white sticky top-0 border-b shadow-sm z-10">
                                                <tr>
                                                    <th className="p-3 text-left font-semibold text-gray-600">채널명</th>
                                                    <th className="p-3 text-left font-semibold text-gray-600">구독자</th>
                                                    <th className="p-3 text-left font-semibold text-gray-600">이메일</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {channelList.map((c: any, i) => (
                                                    <tr key={i} className="hover:bg-gray-50 transition-colors text-xs text-gray-700">
                                                        <td className="p-3 font-bold text-gray-900">{c.title}</td>
                                                        <td className="p-3">
                                                            {parseInt(c.subscribers) >= 10000 
                                                                ? `${(parseInt(c.subscribers) / 10000).toFixed(1)}만` 
                                                                : parseInt(c.subscribers).toLocaleString()}명
                                                        </td>
                                                        <td className="p-3">
                                                            <Input 
                                                                value={c.email}
                                                                onChange={(e) => updateChannelEmail(i, e.target.value)}
                                                                placeholder="이메일 없음"
                                                                className="h-7 text-[11px] border-none bg-transparent hover:bg-white focus:bg-white transition-colors p-0"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* AI 미션 생성 결과 - 하단 배치 */}
                        <Card className="border-purple-100 shadow-sm shadow-purple-50">
                            <CardHeader className="bg-purple-50/30 border-b border-purple-100 px-4 py-3">
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-900">
                                    <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    AI 미션 생성 결과 (편집 가능)
                                </CardTitle>
                                {selectedVideo && (
                                    <CardDescription className="line-clamp-1 text-purple-700/70 text-[11px]">
                                        영상: {selectedVideo.title}
                                    </CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4 px-4 pb-6">
                                {isAnalyzing ? (
                                    <div className="py-24 text-center space-y-4">
                                        <div className="relative w-12 h-12 mx-auto">
                                            <Loader2 className="animate-spin w-12 h-12 text-purple-600" />
                                            <Zap className="absolute inset-0 m-auto w-5 h-5 text-yellow-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-purple-900">Gemini AI 분석 중...</p>
                                            <p className="text-purple-600/60 text-xs animate-pulse">자막 데이터를 기반으로 미션을 생성하고 있습니다.</p>
                                        </div>
                                    </div>
                                ) : aiMissions.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {aiMissions.map((m, i) => (
                                            <Card key={i} className="border-purple-100 bg-white hover:border-purple-200 transition-shadow shadow-sm overflow-hidden">
                                                <div className="bg-gray-50/50 px-4 py-2 border-b flex justify-between items-center">
                                                    <div className="flex gap-1.5">
                                                        <Badge variant={m.category === 'PREDICT' ? 'destructive' : 'default'} className="text-[10px] px-1.5 py-0">
                                                            {m.category === 'PREDICT' ? '예측' : '공감'}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white">
                                                            {m.form === 'binary' ? '양자' : '다자'}
                                                        </Badge>
                                                    </div>
                                                    <Button 
                                                        size="sm" 
                                                        className="h-7 bg-green-600 hover:bg-green-700 text-xs gap-1"
                                                        onClick={() => handleSaveMission(m, i)}
                                                    >
                                                        <Check className="w-3 h-3" /> 최종 승인 및 게시
                                                    </Button>
                                                </div>
                                                <CardContent className="p-4 space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">미션 제목</label>
                                                        <Input 
                                                            value={m.title}
                                                            onChange={(e) => updateMissionField(i, 'title', e.target.value)}
                                                            className="text-sm font-bold border-gray-100 focus:border-purple-300"
                                                        />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">선택지 설정</label>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-5 px-1.5 text-[10px] text-purple-600 hover:bg-purple-50"
                                                                onClick={() => addOption(i)}
                                                            >
                                                                <Plus className="w-3 h-3 mr-0.5" /> 항목 추가
                                                            </Button>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-1.5">
                                                            {m.options.map((opt: string, j: number) => (
                                                                <div key={j} className="flex gap-1">
                                                                    <div className="flex-none w-5 h-8 flex items-center justify-center text-[10px] font-bold text-gray-300 bg-gray-50 rounded-l border border-r-0 border-gray-100">
                                                                        {j + 1}
                                                                    </div>
                                                                    <Input 
                                                                        value={opt}
                                                                        onChange={(e) => updateOptionValue(i, j, e.target.value)}
                                                                        className="flex-1 h-8 text-xs border-gray-100 rounded-none focus:border-purple-200"
                                                                    />
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="flex-none w-8 h-8 p-0 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-r border border-l-0 border-gray-100"
                                                                        onClick={() => removeOption(i, j)}
                                                                        disabled={m.options.length <= 2}
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 pt-2 border-t border-dashed">
                                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">투표 마감 기한</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="relative">
                                                                <Calendar className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                                                <Input 
                                                                    type="date"
                                                                    value={m.deadlineDate}
                                                                    onChange={(e) => updateMissionField(i, 'deadlineDate', e.target.value)}
                                                                    className="pl-7 h-8 text-xs border-gray-100"
                                                                />
                                                            </div>
                                                            <div className="relative">
                                                                <Clock className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                                                <Input 
                                                                    type="time"
                                                                    value={m.deadlineTime}
                                                                    onChange={(e) => updateMissionField(i, 'deadlineTime', e.target.value)}
                                                                    className="pl-7 h-8 text-xs border-gray-100"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-24 text-center space-y-3">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                            <Search className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 text-sm">
                                            분석할 영상을 선택하고 '분석' 버튼을 눌러주세요.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="approve">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>미션 승인 관리</CardTitle>
                            <CardDescription>게시된 AI 미션들을 모니터링하고 관리합니다.</CardDescription>
                        </div>
                        <Button 
                            onClick={loadApprovedMissions} 
                            disabled={isLoadingMissions}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            {isLoadingMissions ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            새로고침
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isLoadingMissions ? (
                            <div className="text-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                                <p className="text-gray-400 mt-4">미션 목록을 불러오는 중...</p>
                            </div>
                        ) : approvedMissions.length === 0 ? (
                            <div className="text-center py-20 space-y-3">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                    <Search className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-400">승인된 AI 미션이 없습니다.</p>
                                <Button onClick={loadApprovedMissions} variant="outline" size="sm">
                                    불러오기
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {approvedMissions.map((mission) => (
                                    <Card key={mission.id} className="border-gray-200 hover:border-purple-200 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={mission.kind === 'predict' ? 'destructive' : 'default'} className="text-[10px]">
                                                            {mission.kind === 'predict' ? '예측' : '공감'}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px] bg-purple-50">
                                                            {mission.form === 'binary' ? '양자' : '다자'}
                                                        </Badge>
                                                        {mission.channelName && (
                                                            <span className="text-[10px] text-gray-500">
                                                                채널: {mission.channelName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-bold text-gray-900">{mission.title}</h3>
                                                    <div className="flex flex-wrap gap-1">
                                                        {mission.options?.map((opt: string, i: number) => (
                                                            <Badge key={i} variant="outline" className="text-[10px] bg-gray-50">
                                                                {opt}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                                                        <span>참여자: {mission.participants || 0}명</span>
                                                        <span>•</span>
                                                        <span>마감: {mission.deadline ? new Date(mission.deadline).toLocaleDateString('ko-KR') : 'N/A'}</span>
                                                        {mission.referenceUrl && (
                                                            <>
                                                                <span>•</span>
                                                                <a 
                                                                    href={mission.referenceUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-500 hover:underline flex items-center gap-1"
                                                                >
                                                                    <Youtube className="w-3 h-3" />
                                                                    원본 영상
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8"
                                                        onClick={() => window.open(`/p-mission/${mission.id}/vote`, '_blank')}
                                                    >
                                                        <ExternalLink className="w-3 h-3 mr-1" />
                                                        보기
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDeleteMission(mission.id)}
                                                        disabled={isDeletingMission === mission.id}
                                                    >
                                                        {isDeletingMission === mission.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3 h-3 mr-1" />
                                                        )}
                                                        삭제
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="email">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* 왼쪽: 채널 목록 */}
                    <Card className="lg:col-span-5 border-gray-200">
                        <CardHeader className="bg-gray-50/50 border-b">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                파트너 제안 채널 목록
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[700px] overflow-y-auto">
                                {channelList.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-white sticky top-0 border-b z-10">
                                            <tr>
                                                <th className="p-3 text-left text-gray-500 font-semibold">채널 정보</th>
                                                <th className="p-3 text-right text-gray-500 font-semibold">제안 발송</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {channelList.map((c, i) => (
                                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 space-y-1">
                                                        <div className="font-bold text-gray-900">{c.title}</div>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-[11px] text-gray-400">구독자: {parseInt(c.subscribers).toLocaleString()}명</div>
                                                            <div className="flex items-center gap-1">
                                                                <Mail className="w-3 h-3 text-gray-300" />
                                                                <Input 
                                                                    value={c.email}
                                                                    onChange={(e) => updateChannelEmail(i, e.target.value)}
                                                                    placeholder="수동 입력 가능"
                                                                    className="h-6 text-[11px] border-gray-100 bg-white w-full px-2"
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Button 
                                                            size="sm" 
                                                            className="h-8 bg-blue-600 hover:bg-blue-700 gap-1"
                                                            onClick={() => handleSendEmail(c)}
                                                            disabled={isSendingEmail === c.title}
                                                        >
                                                            {isSendingEmail === c.title ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                            전송
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="py-20 text-center text-gray-400 text-sm">
                                        '크롤링' 탭에서 먼저 데이터를 수집해주세요.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 오른쪽: 이메일 템플릿 편집기 */}
                    <Card className="lg:col-span-7 border-blue-100 shadow-sm shadow-blue-50 sticky top-0">
                        <CardHeader className="bg-blue-50/30 border-b border-blue-100">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-blue-900">
                                <Edit2 className="w-4 h-4 text-blue-500" />
                                이메일 템플릿 편집
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4 pb-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500">메일 제목</label>
                                <Input 
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="font-bold border-gray-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-gray-500">메일 본문</label>
                                    <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">변수: {'{{channelName}}'} 사용 가능</span>
                                </div>
                                <Textarea 
                                    value={emailTemplate}
                                    onChange={(e) => setEmailTemplate(e.target.value)}
                                    className="min-h-[500px] text-sm leading-relaxed border-gray-200 focus:ring-blue-100"
                                />
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <h5 className="text-xs font-bold text-gray-600 mb-2">💡 발송 팁</h5>
                                <ul className="text-[11px] text-gray-500 space-y-1 list-disc pl-4">
                                    <li>이메일 주소가 없는 채널은 수집된 영상 설명란을 확인하여 수동으로 입력할 수 있습니다.</li>
                                    <li>{'{{channelName}}'} 문구는 각 채널의 이름으로 자동 치환되어 발송됩니다.</li>
                                    <li>공식 딜러 참여 시의 수익 배분율(30%)을 강조하면 회신율이 높아집니다.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
    )
}
