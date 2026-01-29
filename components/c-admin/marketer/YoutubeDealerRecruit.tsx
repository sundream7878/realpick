"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Search, Youtube, Mail, Loader2, ExternalLink, RefreshCw, Check, Edit2, Zap, Trash2, Calendar, Users, Plus, X, Clock, Send, Video, Filter } from "lucide-react"
import { Input } from "@/components/c-ui/input"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { Badge } from "@/components/c-ui/badge"
import { Textarea } from "@/components/c-ui/textarea"
import { SHOWS, CATEGORIES, getShowById, normalizeShowId } from "@/lib/constants/shows"

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
    const [missionCategoryFilter, setMissionCategoryFilter] = useState<string>("ALL")
    const [missionShowFilter, setMissionShowFilter] = useState<string>("ALL")
    const [isClearingMissions, setIsClearingMissions] = useState(false)
    
    // 수집된 채널 목록 관련 상태
    const [collectedChannels, setCollectedChannels] = useState<any[]>([])
    const [isLoadingChannels2, setIsLoadingChannels2] = useState(false)
    
    // 수집된 영상 목록 관련 상태
    const [collectedVideos, setCollectedVideos] = useState<any[]>([])
    const [isLoadingVideos, setIsLoadingVideos] = useState(false)
    
    // 필터 상태
    const [videoKeywordFilter, setVideoKeywordFilter] = useState<string>("ALL")
    const [channelKeywordFilter, setChannelKeywordFilter] = useState<string>("ALL")
    
    // showId 일괄 수정 상태
    const [isFixingShowIds, setIsFixingShowIds] = useState(false)

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
                    desc: video.description,
                    channelName: video.channel_title,
                    channelId: video.channel_id
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
                
                const toastMsg = data.savedToDb 
                    ? `미션 초안이 생성되었습니다. (${data.savedCount}개 DB 저장 완료)`
                    : "미션 초안이 생성되었습니다."
                toast({ title: "AI 분석 완료", description: toastMsg })
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

    // 4. 미션 최종 저장 (DB 등록 - ai_missions에서 missions1로 승격)
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
                    showId: normalizeShowId(selectedVideo.keyword) || "nasolo",
                    category: 'LOVE',
                    isAIMission: true,
                    aiMissionId: mission.aiMissionId, // ai_missions 컬렉션의 ID
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

    // 5. 이메일 발송 핸들러 (실제 발송)
    const handleSendEmail = async (channel: any) => {
        if (!channel.email) {
            toast({ title: "발송 실패", description: "이메일 주소를 입력해주세요.", variant: "destructive" })
            return
        }

        setIsSendingEmail(channel.title)
        try {
            const res = await fetch("/api/admin/marketer/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipientEmail: channel.email,
                    recipientName: channel.title,
                    subject: emailSubject,
                    body: emailTemplate
                })
            })
            
            const data = await res.json()
            
            if (data.success) {
                toast({ title: "발송 완료", description: `${channel.title}님께 제안 메일을 성공적으로 보냈습니다.` })
            } else {
                throw new Error(data.error || "이메일 발송에 실패했습니다.")
            }
        } catch (error: any) {
            console.error("이메일 발송 오류:", error)
            toast({ title: "발송 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsSendingEmail(null)
        }
    }

    const videoList: any[] = []
    const [channelList, setChannelList] = useState<any[]>([])
    const [isLoadingChannels, setIsLoadingChannels] = useState(false)

    // Firestore에서 dealers 컬렉션 불러오기
    const loadDealersFromDB = async () => {
        setIsLoadingChannels(true)
        try {
            const res = await fetch("/api/admin/dealers/list")
            const data = await res.json()
            if (data.success) {
                const dealerChannels = data.dealers.map((d: any) => ({
                    channelId: d.channelId,
                    title: d.channelName,
                    subscribers: d.subscriberCount || 0,
                    email: d.email || "",
                    keywords: d.keywords?.join(", ") || "",
                    platform: d.platform || "youtube",
                    fromDB: true
                }))
                setChannelList(dealerChannels)
            }
        } catch (error: any) {
            toast({ title: "불러오기 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsLoadingChannels(false)
        }
    }

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
                                keyword: kw,
                                fromDB: false
                            }
                        }
                    })
                }
            })
            setChannelList(Object.values(cMap))
        }
    }, [crawlResults])

    // 컴포넌트 마운트 시 DB에서 딜러 목록 자동 로드
    useEffect(() => {
        loadDealersFromDB()
    }, [])

    const updateChannelEmail = (idx: number, email: string) => {
        setChannelList(prev => prev.map((c, i) => i === idx ? { ...c, email } : c))
    }

    const removeChannel = (idx: number) => {
        if (confirm("이 채널을 목록에서 제거하시겠습니까?")) {
            setChannelList(prev => prev.filter((_, i) => i !== idx))
        }
    }

    // 6. 승인 대기 중인 AI 미션 목록 불러오기 (ai_missions 컬렉션에서)
    const loadApprovedMissions = async () => {
        setIsLoadingMissions(true)
        try {
            const res = await fetch("/api/admin/ai-missions/list")
            const data = await res.json()
            if (data.success) {
                setApprovedMissions(data.missions || [])
            } else {
                throw new Error(data.error || "미션 목록을 불러오는데 실패했습니다.")
            }
        } catch (error: any) {
            console.error("미션 불러오기 오류:", error)
            toast({ title: "불러오기 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsLoadingMissions(false)
        }
    }
    
    // 7. 수집된 채널 목록 불러오기
    const loadCollectedChannels = async () => {
        setIsLoadingChannels2(true)
        try {
            const res = await fetch("/api/admin/dealers/videos")
            const data = await res.json()
            if (data.success) {
                setCollectedChannels(data.channels || [])
            } else throw new Error(data.error)
        } catch (error: any) {
            console.error("채널 불러오기 오류:", error)
            toast({ title: "불러오기 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsLoadingChannels2(false)
        }
    }
    
    // 8. 수집된 영상 목록 불러오기
    const loadCollectedVideos = async () => {
        setIsLoadingVideos(true)
        try {
            const res = await fetch("/api/admin/dealers/videos-list")
            const data = await res.json()
            if (data.success) {
                setCollectedVideos(data.videos || [])
            } else throw new Error(data.error)
        } catch (error: any) {
            console.error("영상 불러오기 오류:", error)
            toast({ title: "영상 불러오기 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsLoadingVideos(false)
        }
    }
    
    // 9. 미션의 실제 카테고리 결정 (showId 기반)
    const getMissionCategory = (mission: any): string => {
        // 이미 올바른 카테고리가 있으면 사용
        if (mission.category && ['LOVE', 'VICTORY', 'STAR'].includes(mission.category)) {
            return mission.category
        }
        
        // showId로 카테고리 역추적
        const normalizedShow = normalizeShowId(mission.showId)
        if (normalizedShow) {
            const show = getShowById(normalizedShow)
            if (show) {
                return show.category
            }
        }
        
        // 기본값
        return 'LOVE'
    }
    
    // 10. 필터링된 미션 목록
    const filteredMissions = useMemo(() => {
        let filtered = [...approvedMissions]
        
        // 카테고리 필터
        if (missionCategoryFilter !== "ALL") {
            filtered = filtered.filter(m => getMissionCategory(m) === missionCategoryFilter)
        }
        
        // 프로그램 필터
        if (missionShowFilter !== "ALL") {
            filtered = filtered.filter(m => {
                const normalizedShowId = normalizeShowId(m.showId)
                return normalizedShowId === missionShowFilter
            })
        }
        
        return filtered
    }, [approvedMissions, missionCategoryFilter, missionShowFilter])
    
    // 11. 카테고리별 프로그램 목록 (필터용)
    const allShows = useMemo(() => {
        const shows: any[] = []
        Object.values(SHOWS).forEach(categoryShows => {
            shows.push(...categoryShows)
        })
        return shows
    }, [])
    
    // 12. 카테고리별 미션 개수 계산 (실제 showId 기반)
    const getCategoryCount = (categoryKey: string) => {
        return approvedMissions.filter(m => getMissionCategory(m) === categoryKey).length
    }
    
    // 14. 모든 AI 미션 삭제
    const handleClearAllMissions = async () => {
        if (!confirm("⚠️ 정말 모든 승인 대기 중인 AI 미션을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!")) {
            return
        }
        
        setIsClearingMissions(true)
        try {
            const res = await fetch("/api/admin/ai-missions/clear", {
                method: "POST"
            })
            const data = await res.json()
            
            if (data.success) {
                toast({ 
                    title: "삭제 완료", 
                    description: data.message 
                })
                setApprovedMissions([])
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast({ 
                title: "삭제 실패", 
                description: error.message, 
                variant: "destructive" 
            })
        } finally {
            setIsClearingMissions(false)
        }
    }
    
    // 15. showId 일괄 수정
    const handleFixShowIds = async () => {
        if (!confirm("기존 미션들의 showId를 영상 제목 기반으로 자동 수정하시겠습니까?\n\n예: '쇼미더머니' 영상 → show-me-the-money-12")) {
            return
        }
        
        setIsFixingShowIds(true)
        try {
            const res = await fetch("/api/admin/ai-missions/fix-show-ids", {
                method: "POST"
            })
            const data = await res.json()
            
            if (data.success) {
                toast({ 
                    title: "수정 완료", 
                    description: data.message,
                })
                
                // 상세 정보 콘솔 출력
                if (data.details && data.details.length > 0) {
                    console.log("=== showId 수정 상세 ===")
                    data.details.forEach((detail: any) => {
                        console.log(`- ${detail.title}`)
                        console.log(`  ${detail.oldShowId} → ${detail.newShowId}`)
                    })
                }
                
                // 목록 새로고침
                loadApprovedMissions()
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast({ 
                title: "수정 실패", 
                description: error.message, 
                variant: "destructive" 
            })
        } finally {
            setIsFixingShowIds(false)
        }
    }

    // 7. 미션 삭제 핸들러
    const handleDeleteMission = async (missionId: string) => {
        if (!confirm("정말 이 미션을 삭제하시겠습니까?")) return
        
        setIsDeletingMission(missionId)
        try {
            // Firebase 인증 토큰 가져오기
            const { auth } = await import("@/lib/firebase/config")
            const token = await auth.currentUser?.getIdToken()
            if (!token) {
                throw new Error("인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.")
            }

            // AI 미션도 missions1 컬렉션에 저장되므로 mission1으로 전송
            const res = await fetch(`/api/missions/delete?missionId=${missionId}&missionType=mission1`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            const data = await res.json()
            
            if (!res.ok) {
                const errorMessage = data.details || data.error || "미션 삭제에 실패했습니다."
                throw new Error(errorMessage)
            }
            
            if (data.success) {
                toast({ title: "삭제 완료", description: "미션이 성공적으로 삭제되었습니다." })
                setApprovedMissions(prev => prev.filter(m => m.id !== missionId))
            } else {
                throw new Error(data.error || "미션 삭제에 실패했습니다.")
            }
        } catch (error: any) {
            console.error("미션 삭제 실패:", error)
            toast({ title: "삭제 실패", description: error.message || "알 수 없는 오류가 발생했습니다.", variant: "destructive" })
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

    // 영상 필터링
    const filteredVideos = useMemo(() => {
        if (videoKeywordFilter === "ALL") return collectedVideos
        return collectedVideos.filter(video => video.keyword === videoKeywordFilter)
    }, [collectedVideos, videoKeywordFilter])
    
    // 채널 필터링
    const filteredChannels = useMemo(() => {
        if (channelKeywordFilter === "ALL") return collectedChannels
        return collectedChannels.filter(channel => 
            channel.keywords && channel.keywords.includes(channelKeywordFilter)
        )
    }, [collectedChannels, channelKeywordFilter])
    
    // 영상의 키워드 목록 추출
    const videoKeywords = useMemo(() => {
        const keywords = new Set<string>()
        collectedVideos.forEach(video => {
            if (video.keyword) keywords.add(video.keyword)
        })
        return Array.from(keywords).sort()
    }, [collectedVideos])
    
    // 채널의 키워드 목록 추출
    const channelKeywords = useMemo(() => {
        const keywords = new Set<string>()
        collectedChannels.forEach(channel => {
            if (channel.keywords && Array.isArray(channel.keywords)) {
                channel.keywords.forEach((kw: string) => keywords.add(kw))
            }
        })
        return Array.from(keywords).sort()
    }, [collectedChannels])

    return (
        <Tabs defaultValue="approve" className="space-y-4" onValueChange={(value) => {
            if (value === "approve" && approvedMissions.length === 0) {
                loadApprovedMissions()
            } else if (value === "channels" && collectedChannels.length === 0) {
                loadCollectedChannels()
            } else if (value === "videos" && collectedVideos.length === 0) {
                loadCollectedVideos()
            }
        }}>
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="approve">미션 승인 관리</TabsTrigger>
                <TabsTrigger value="videos">수집된 영상 목록</TabsTrigger>
                <TabsTrigger value="channels">수집된 채널 목록</TabsTrigger>
                <TabsTrigger value="email">이메일 관리</TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="space-y-6">
                <Card>
                    <CardHeader className="space-y-4">
                        <div className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>수집된 영상 목록</CardTitle>
                                <CardDescription>자동 수집된 YouTube 영상들입니다. ({collectedVideos.length}개)</CardDescription>
                            </div>
                            <Button 
                                onClick={loadCollectedVideos} 
                                disabled={isLoadingVideos}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                {isLoadingVideos ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                새로고침
                            </Button>
                        </div>
                        
                        {/* 키워드 필터 */}
                        {videoKeywords.length > 0 && (
                            <div className="pt-2 border-t space-y-2">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600 font-medium">프로그램</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <Button
                                        variant={videoKeywordFilter === "ALL" ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setVideoKeywordFilter("ALL")}
                                    >
                                        전체 ({collectedVideos.length})
                                    </Button>
                                    {videoKeywords.map((keyword) => {
                                        const count = collectedVideos.filter(v => v.keyword === keyword).length
                                        return (
                                            <Button
                                                key={keyword}
                                                variant={videoKeywordFilter === keyword ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => setVideoKeywordFilter(keyword)}
                                            >
                                                {keyword} ({count})
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoadingVideos ? (
                            <div className="text-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                                <p className="text-gray-400 mt-4">영상 목록을 불러오는 중...</p>
                            </div>
                        ) : collectedVideos.length === 0 ? (
                            <div className="text-center py-20 space-y-3">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                    <Video className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-400">수집된 영상이 없습니다.</p>
                                <p className="text-sm text-gray-500">"완전 자동 미션 생성"을 실행하면 영상이 수집됩니다.</p>
                            </div>
                        ) : filteredVideos.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400">필터링된 영상이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {filteredVideos.map((video, idx) => (
                                    <Card key={idx} className="border-gray-200 hover:border-blue-200 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex gap-4">
                                                {/* 썸네일 */}
                                                {video.thumbnail && (
                                                    <div className="flex-shrink-0">
                                                        <img 
                                                            src={video.thumbnail} 
                                                            alt={video.title}
                                                            className="w-32 h-20 object-cover rounded"
                                                        />
                                                    </div>
                                                )}
                                                
                                                {/* 영상 정보 */}
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <a 
                                                            href={video.video_url || `https://youtube.com/watch?v=${video.videoId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-semibold text-sm hover:text-blue-600 line-clamp-2"
                                                        >
                                                            {video.title}
                                                        </a>
                                                        {video.has_subtitle && (
                                                            <Badge variant="outline" className="text-[10px] bg-green-50 flex-shrink-0">
                                                                자막 있음
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                                        <span className="font-medium">{video.channelName}</span>
                                                        {video.subscriberCount && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{(video.subscriberCount).toLocaleString()}명</span>
                                                            </>
                                                        )}
                                                        {video.keyword && (
                                                            <>
                                                                <span>•</span>
                                                                <Badge variant="outline" className="text-[10px] bg-purple-50">
                                                                    {video.keyword}
                                                                </Badge>
                                                            </>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span>조회수: {(video.viewCount || 0).toLocaleString()}</span>
                                                        <span>좋아요: {(video.likeCount || 0).toLocaleString()}</span>
                                                        <span>댓글: {(video.commentCount || 0).toLocaleString()}</span>
                                                    </div>
                                                    
                                                    <p className="text-xs text-gray-400 line-clamp-2">
                                                        {video.description || '설명 없음'}
                                                    </p>
                                                    
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                                        <span>업로드: {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString('ko-KR') : 'N/A'}</span>
                                                        <span>•</span>
                                                        <span>수집: {video.collectedAt ? new Date(video.collectedAt).toLocaleDateString('ko-KR') : 'N/A'}</span>
                                                    </div>
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

            <TabsContent value="channels" className="space-y-6">
                <Card>
                    <CardHeader className="space-y-4">
                        <div className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>수집된 채널 목록</CardTitle>
                                <CardDescription>자동 크롤링으로 수집된 YouTube 채널들입니다. ({collectedChannels.length}개)</CardDescription>
                            </div>
                            <Button 
                                onClick={loadCollectedChannels} 
                                disabled={isLoadingChannels2}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                {isLoadingChannels2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                새로고침
                            </Button>
                        </div>
                        
                        {/* 키워드 필터 */}
                        {channelKeywords.length > 0 && (
                            <div className="pt-2 border-t space-y-2">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600 font-medium">프로그램</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    <Button
                                        variant={channelKeywordFilter === "ALL" ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setChannelKeywordFilter("ALL")}
                                    >
                                        전체 ({collectedChannels.length})
                                    </Button>
                                    {channelKeywords.map((keyword) => {
                                        const count = collectedChannels.filter(c => 
                                            c.keywords && c.keywords.includes(keyword)
                                        ).length
                                        return (
                                            <Button
                                                key={keyword}
                                                variant={channelKeywordFilter === keyword ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={() => setChannelKeywordFilter(keyword)}
                                            >
                                                {keyword} ({count})
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoadingChannels2 ? (
                            <div className="text-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                                <p className="text-gray-400 mt-4">채널 목록을 불러오는 중...</p>
                            </div>
                        ) : collectedChannels.length === 0 ? (
                            <div className="text-center py-20 space-y-3">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                    <Users className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-400">수집된 채널이 없습니다.</p>
                                <p className="text-sm text-gray-500">"완전 자동 미션 생성"을 실행하면 채널이 수집됩니다.</p>
                            </div>
                        ) : filteredChannels.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400">필터링된 채널이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredChannels.map((channel) => (
                                    <Card key={channel.id} className="border-gray-200 hover:border-blue-200 transition-colors">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-gray-900">{channel.channelName}</h3>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {channel.platform || 'youtube'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <span>구독자: {(channel.subscriberCount || 0).toLocaleString()}명</span>
                                                        <span>•</span>
                                                        <span>영상: {channel.videoCount || 0}개</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {channel.keywords?.map((kw: string, i: number) => (
                                                            <Badge key={i} variant="outline" className="text-[10px] bg-blue-50">
                                                                {kw}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-400">
                                                        최근 수집: {channel.lastCrawledAt ? new Date(channel.lastCrawledAt).toLocaleString('ko-KR') : 'N/A'}
                                                    </p>
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

                        {/* 미션 생성 결과 - 하단 배치 */}
                        <Card className="border-purple-100 shadow-sm shadow-purple-50">
                            <CardHeader className="bg-purple-50/30 border-b border-purple-100 px-4 py-3">
                                <CardTitle className="text-base font-bold flex items-center gap-2 text-purple-900">
                                    <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    미션 생성 결과 (편집 가능)
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
                    <CardHeader className="space-y-4">
                        <div className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>미션 승인 관리 (AI 자동 생성)</CardTitle>
                                <CardDescription>AI가 생성한 미션을 확인하고 승인합니다. 승인 시 실제 페이지에 게시됩니다.</CardDescription>
                            </div>
                            <div className="flex gap-2">
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
                                {approvedMissions.length > 0 && (
                                    <>
                                        <Button 
                                            onClick={handleFixShowIds} 
                                            disabled={isFixingShowIds}
                                            variant="outline"
                                            size="sm"
                                            className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                                        >
                                            {isFixingShowIds ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                            showId 일괄 수정
                                        </Button>
                                        <Button 
                                            onClick={handleClearAllMissions} 
                                            disabled={isClearingMissions}
                                            variant="destructive"
                                            size="sm"
                                            className="gap-2"
                                        >
                                            {isClearingMissions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            전체 삭제
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {/* 필터 영역 */}
                        <div className="flex items-center gap-3 pt-2 border-t">
                            <Filter className="w-4 h-4 text-gray-400" />
                            
                            {/* 카테고리 필터 */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 font-medium">카테고리:</span>
                                <div className="flex gap-1">
                                    <Button
                                        variant={missionCategoryFilter === "ALL" ? "default" : "outline"}
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                            setMissionCategoryFilter("ALL")
                                            setMissionShowFilter("ALL")
                                        }}
                                    >
                                        전체 ({approvedMissions.length})
                                    </Button>
                                    {Object.entries(CATEGORIES).filter(([key]) => key !== "UNIFIED").map(([key, cat]) => {
                                        const count = getCategoryCount(key)
                                        return (
                                            <Button
                                                key={key}
                                                variant={missionCategoryFilter === key ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 text-xs flex items-center gap-1.5"
                                                onClick={() => {
                                                    setMissionCategoryFilter(key)
                                                    setMissionShowFilter("ALL")
                                                }}
                                            >
                                                <img src={cat.iconPath} alt={cat.description} className="w-3.5 h-3.5" />
                                                {cat.description} ({count})
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>
                            
                            {/* 프로그램 필터 */}
                            {missionCategoryFilter !== "ALL" && (
                                <div className="flex items-center gap-2 border-l pl-3">
                                    <span className="text-sm text-gray-600 font-medium">프로그램:</span>
                                    <div className="flex gap-1 flex-wrap">
                                        <Button
                                            variant={missionShowFilter === "ALL" ? "default" : "outline"}
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => setMissionShowFilter("ALL")}
                                        >
                                            전체
                                        </Button>
                                        {SHOWS[missionCategoryFilter as keyof typeof SHOWS]?.map(show => {
                                            const count = approvedMissions.filter(m => 
                                                getMissionCategory(m) === missionCategoryFilter && 
                                                normalizeShowId(m.showId) === show.id
                                            ).length
                                            if (count === 0) return null
                                            return (
                                                <Button
                                                    key={show.id}
                                                    variant={missionShowFilter === show.id ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => setMissionShowFilter(show.id)}
                                                >
                                                    {show.displayName} ({count})
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
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
                                <p className="text-gray-400">승인 대기 중인 미션이 없습니다.</p>
                                <Button onClick={loadApprovedMissions} variant="outline" size="sm">
                                    불러오기
                                </Button>
                            </div>
                        ) : filteredMissions.length === 0 ? (
                            <div className="text-center py-20 space-y-3">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                    <Search className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-400">선택한 필터에 해당하는 미션이 없습니다.</p>
                                <p className="text-sm text-gray-500">다른 카테고리나 프로그램을 선택해보세요.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-sm text-gray-500 pb-2">
                                    총 {approvedMissions.length}개 미션 중 {filteredMissions.length}개 표시
                                </div>
                                {filteredMissions.map((mission) => (
                                    <Card key={mission.id} className="border-purple-200 hover:border-purple-300 transition-colors bg-purple-50/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-[10px] bg-yellow-50 border-yellow-300 text-yellow-700">
                                                            승인 대기
                                                        </Badge>
                                                        {(() => {
                                                            const cat = getMissionCategory(mission)
                                                            const catInfo = CATEGORIES[cat as keyof typeof CATEGORIES]
                                                            return catInfo ? (
                                                                <Badge variant="outline" className="text-[10px] bg-blue-50 flex items-center gap-1">
                                                                    <img 
                                                                        src={catInfo.iconPath} 
                                                                        alt={catInfo.description}
                                                                        className="w-2.5 h-2.5"
                                                                    />
                                                                    {catInfo.description}
                                                                </Badge>
                                                            ) : null
                                                        })()}
                                                        {mission.showId && (() => {
                                                            const show = getShowById(normalizeShowId(mission.showId) || '')
                                                            return show ? (
                                                                <Badge variant="outline" className="text-[10px] bg-purple-50">
                                                                    {show.displayName}
                                                                </Badge>
                                                            ) : null
                                                        })()}
                                                        <Badge variant="outline" className="text-[10px] bg-white">
                                                            {mission.form === 'binary' ? '양자' : '다자'}
                                                        </Badge>
                                                        {mission.sourceVideo?.channelName && (
                                                            <span className="text-[10px] text-gray-500">
                                                                채널: {mission.sourceVideo.channelName}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-gray-400">
                                                            생성: {mission.createdAt ? new Date(mission.createdAt).toLocaleDateString('ko-KR') : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-gray-900">{mission.title}</h3>
                                                    {mission.description && (
                                                        <p className="text-sm text-gray-600 line-clamp-2">{mission.description}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-1">
                                                        {mission.options?.map((opt: string, i: number) => (
                                                            <Badge key={i} variant="outline" className="text-[10px] bg-white">
                                                                {i + 1}. {opt}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    {mission.sourceVideo && (
                                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-2 p-2 bg-white rounded border">
                                                            <Youtube className="w-3 h-3 text-red-500" />
                                                            <span className="flex-1 line-clamp-1">{mission.sourceVideo.title}</span>
                                                            <a 
                                                                href={mission.sourceVideo.url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-blue-500 hover:underline flex items-center gap-1"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                                보기
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <Button 
                                                        variant="default" 
                                                        size="sm" 
                                                        className="h-8 bg-green-600 hover:bg-green-700 whitespace-nowrap"
                                                        onClick={async () => {
                                                            if (confirm("이 미션을 승인하고 게시하시겠습니까?")) {
                                                                try {
                                                                    const deadline = new Date()
                                                                    deadline.setDate(deadline.getDate() + 7)
                                                                    
                                                                    // showId 정규화 및 category 결정
                                                                    const normalizedShow = normalizeShowId(mission.showId) || "nasolo"
                                                                    const missionCategory = getMissionCategory(mission)
                                                                    
                                                                    const res = await fetch("/api/missions/create", {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({
                                                                            title: mission.title,
                                                                            options: mission.options,
                                                                            kind: mission.kind === 'PREDICT' ? 'prediction' : 'majority',
                                                                            form: mission.form || 'multi',
                                                                            deadline: deadline.toISOString(),
                                                                            showId: normalizedShow,
                                                                            category: missionCategory,
                                                                            isAIMission: true,
                                                                            aiMissionId: mission.id,
                                                                            channelName: mission.sourceVideo?.channelName || 'AI',
                                                                            referenceUrl: mission.sourceVideo?.url || null,
                                                                            thumbnailUrl: mission.sourceVideo?.thumbnailUrl || null
                                                                        })
                                                                    })
                                                                    const data = await res.json()
                                                                    if (data.success) {
                                                                        toast({ title: "승인 완료", description: "미션이 정식 게시되었습니다." })
                                                                        loadApprovedMissions()
                                                                    } else {
                                                                        throw new Error(data.error)
                                                                    }
                                                                } catch (error: any) {
                                                                    toast({ title: "승인 실패", description: error.message, variant: "destructive" })
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Check className="w-3 h-3 mr-1" />
                                                        승인
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={async () => {
                                                            if (confirm("이 미션을 거부하시겠습니까?")) {
                                                                try {
                                                                    const res = await fetch("/api/admin/ai-missions/reject", {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ missionId: mission.id })
                                                                    })
                                                                    const data = await res.json()
                                                                    if (data.success) {
                                                                        toast({ title: "거부 완료", description: "미션이 거부되었습니다." })
                                                                        loadApprovedMissions()
                                                                    } else {
                                                                        throw new Error(data.error)
                                                                    }
                                                                } catch (error: any) {
                                                                    toast({ title: "거부 실패", description: error.message, variant: "destructive" })
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        거부
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
                        <CardHeader className="bg-gray-50/50 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                파트너 제안 채널 목록
                            </CardTitle>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={loadDealersFromDB}
                                disabled={isLoadingChannels}
                                className="gap-1"
                            >
                                {isLoadingChannels ? <Loader2 className="animate-spin w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                                새로고침
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[700px] overflow-y-auto">
                                {isLoadingChannels ? (
                                    <div className="py-20 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                                        <p className="text-gray-400 mt-4">채널 목록을 불러오는 중...</p>
                                    </div>
                                ) : channelList.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-white sticky top-0 border-b z-10">
                                            <tr>
                                                <th className="p-3 text-left text-gray-500 font-semibold">채널 정보</th>
                                                <th className="p-3 text-right text-gray-500 font-semibold">제안 발송</th>
                                                <th className="p-3 text-center text-gray-500 font-semibold w-12">삭제</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {channelList.map((c, i) => (
                                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-gray-900">{c.title}</div>
                                                            {c.fromDB && (
                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-600 border-blue-200">
                                                                    DB
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-[11px] text-gray-400">
                                                                구독자: {parseInt(c.subscribers || 0).toLocaleString()}명
                                                                {c.keywords && <span className="ml-2 text-blue-500">• {c.keywords}</span>}
                                                            </div>
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
                                                            disabled={isSendingEmail === c.title || !c.email}
                                                        >
                                                            {isSendingEmail === c.title ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                            전송
                                                        </Button>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => removeChannel(i)}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="py-20 text-center text-gray-400 text-sm space-y-2">
                                        <p>등록된 채널이 없습니다.</p>
                                        <p className="text-xs">'크롤링' 탭에서 데이터를 수집하거나</p>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={loadDealersFromDB}
                                        >
                                            DB에서 불러오기
                                        </Button>
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
