
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Users, UserPlus, Play, Square, Loader2, RefreshCw, Activity, List, ShieldCheck } from "lucide-react"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useToast } from "../hooks/useToast"
import { Badge } from "./ui/badge"

export function FakeUserBotManage() {
    const [isRunning, setIsRunning] = useState(false)
    const [numUsers, setNumUsers] = useState("5")
    const [loveVoters, setLoveVoters] = useState("10") // 로맨스 카테고리 봇 투표 수
    const [victoryVoters, setVictoryVoters] = useState("10") // 서바이벌 카테고리 봇 투표 수
    const [starVoters, setStarVoters] = useState("10") // 오디션 카테고리 봇 투표 수
    const [botRole, setBotRole] = useState("PICKER")
    const [botList, setBotList] = useState<any[]>([])
    const [voteDetails, setVoteDetails] = useState<any[]>([])
    const [recentlyCreated, setRecentlyCreated] = useState<any[]>([]) // 최근 생성된 봇 목록
    const { toast } = useToast()

    // 1. 봇 생성 함수 (AI 닉네임)
    const handleCreateBots = async () => {
        setIsRunning(true)
        setRecentlyCreated([]) // 기존 목록 초기화
        try {
            const res = await fetch("/api/admin/marketer/bots/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: parseInt(numUsers), role: botRole })
            })
            const data = await res.json()
            if (data.success) {
                // 생성된 봇 목록 저장
                if (data.users && data.users.length > 0) {
                    setRecentlyCreated(data.users)
                }
                toast({ 
                    title: "봇 생성 완료", 
                    description: `${data.count}명의 가짜 AI 유저가 생성되었습니다.` 
                });
                fetchBots(false); // 목록 새로 고침 (토스트 없이)
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({ title: "생성 실패", description: error.message, variant: "destructive" });
        } finally { 
            setIsRunning(false);
        }
    }

    // 2. 봇 투표 실행 (카테고리별)
    const handleRunVotes = async () => {
        setIsRunning(true)
        setVoteDetails([]) // 기존 로그 초기화
        
        const startTime = Date.now() // 실행 시작 시간
        const loveCount = parseInt(loveVoters) || 0
        const victoryCount = parseInt(victoryVoters) || 0
        const starCount = parseInt(starVoters) || 0
        const totalVoters = loveCount + victoryCount + starCount

        if (totalVoters === 0) {
            toast({ title: "투표 수 오류", description: "최소 한 카테고리의 투표 수를 입력해주세요.", variant: "destructive" })
            setIsRunning(false)
            return
        }

        console.log(`[Bot Vote] 투표 시작 - 로맨스: ${loveCount}명, 서바이벌: ${victoryCount}명, 오디션: ${starCount}명 (총 ${totalVoters}명)`)
        
        try {
            const res = await fetch("/api/admin/marketer/bots/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    categoryVotes: {
                        LOVE: loveCount,
                        VICTORY: victoryCount,
                        STAR: starCount
                    },
                    delay: 0.0 
                })
            })
            const data = await res.json()
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
            console.log(`[Bot Vote] API Response (${elapsed}s):`, data)
            
            if (data.success) {
                setVoteDetails(data.details || [])
                toast({ 
                    title: "투표 완료", 
                    description: `총 ${data.count}명이 투표를 ${elapsed}초만에 완료했습니다.` 
                })
            } else {
                throw new Error(data.error || "알 수 없는 오류")
            }
        } catch (error: any) {
            console.error("[Bot Vote] Error:", error)
            toast({ title: "투표 실패", description: error.message, variant: "destructive" })
        } finally { 
            setIsRunning(false) 
        }
    }

    // 봇 목록 불러오기
    const [isLoadingBots, setIsLoadingBots] = useState(false)
    
    const fetchBots = async (showToast = false) => {
        setIsLoadingBots(true)
        try {
            const res = await fetch("/api/admin/marketer/bots/list")
            const data = await res.json()
            if (data.success) {
                setBotList(data.bots || [])
                if (showToast) {
                    toast({ 
                        title: "조회 완료", 
                        description: `${data.count}개의 봇을 찾았습니다.` 
                    })
                }
            } else {
                throw new Error(data.error)
            }
        } catch (e: any) { 
            console.error("봇 목록 조회 실패:", e)
            if (showToast) {
                toast({ 
                    title: "불러오기 실패", 
                    description: e.message, 
                    variant: "destructive" 
                })
            }
        } finally {
            setIsLoadingBots(false)
        }
    }

    useEffect(() => { fetchBots(false) }, [])

    return (
        <Tabs defaultValue="create" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="create">봇 생성 관리</TabsTrigger>
                <TabsTrigger value="list">봇 목록 조회</TabsTrigger>
                <TabsTrigger value="control">투표 실행 관리</TabsTrigger>
            </TabsList>

            {/* 1. 봇 생성 탭 */}
            <TabsContent value="create">
                <Card className="border-purple-200">
                    <CardHeader>
                        <CardTitle className="text-lg">가짜 유저 봇 생성 (AI)</CardTitle>
                        <CardDescription>실제 유저처럼 행동하는 가짜 유저봇들을 AI 닉네임으로 자동 생성합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">생성 개수</label>
                                <Input type="number" value={numUsers} onChange={(e) => setNumUsers(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">봇 역할</label>
                                <Select value={botRole} onValueChange={setBotRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PICKER">일반 유저 (PICKER)</SelectItem>
                                        <SelectItem value="DEALER">딜러 (DEALER)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button 
                            onClick={handleCreateBots} 
                            disabled={isRunning} 
                            className="bg-purple-600 hover:bg-purple-700 gap-2"
                            size="default"
                        >
                            {isRunning ? <Loader2 className="animate-spin w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                            봇 생성
                        </Button>

                        {/* 최근 생성된 봇 목록 표시 */}
                        {recentlyCreated.length > 0 && (
                            <div className="mt-6 space-y-2">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-green-600" />
                                    <h4 className="text-sm font-bold text-green-700">방금 생성된 봇 ({recentlyCreated.length}명)</h4>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                                    <div className="space-y-1">
                                        {recentlyCreated.map((user, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 hover:bg-green-100 rounded">
                                                <span className="font-medium text-green-900">{user.nickname}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs bg-white">
                                                        {user.role}
                                                    </Badge>
                                                    <span className="text-xs text-green-600">{user.uid?.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 2. 봇 목록 탭 */}
            <TabsContent value="list">
                <Card className="border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">봇 목록 조회</CardTitle>
                            <CardDescription>현재 시스템에 등록된 모든 가짜 유저봇들입니다. (총 {botList.length}명)</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => fetchBots(true)}
                            disabled={isLoadingBots}
                        >
                            {isLoadingBots ? <Loader2 className="animate-spin w-3 h-3 mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                            새로고침
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 text-left">닉네임</th>
                                        <th className="p-3 text-left">역할</th>
                                        <th className="p-3 text-left">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {isLoadingBots ? (
                                        <tr>
                                            <td colSpan={3} className="p-10 text-center">
                                                <Loader2 className="animate-spin w-6 h-6 mx-auto text-gray-400" />
                                                <p className="text-gray-400 mt-2">봇 목록을 불러오는 중...</p>
                                            </td>
                                        </tr>
                                    ) : botList.length > 0 ? (
                                        botList.map((bot, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium">{bot.nickname}</td>
                                                <td className="p-3">
                                                    <Badge variant="outline" className="text-xs">
                                                        {bot.role}
                                                    </Badge>
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-100 text-xs">
                                                        활성
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="p-10 text-center text-gray-400">
                                                등록된 봇이 없습니다. 봇을 먼저 생성해주세요.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 3. 투표 실행 관리 탭 */}
            <TabsContent value="control">
                <Card className="border-blue-200">
                    <CardHeader>
                        <CardTitle className="text-lg">봇 투표 및 행동 관리</CardTitle>
                        <CardDescription>가짜 유저들이 실제로 투표 및 활동하도록 명령합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        로맨스 투표자
                                    </label>
                                    <Input 
                                        type="number" 
                                        value={loveVoters} 
                                        onChange={(e) => setLoveVoters(e.target.value)}
                                        placeholder="투표 인원"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        서바이벌 투표자
                                    </label>
                                    <Input 
                                        type="number" 
                                        value={victoryVoters} 
                                        onChange={(e) => setVictoryVoters(e.target.value)}
                                        placeholder="투표 인원"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        오디션 투표자
                                    </label>
                                    <Input 
                                        type="number" 
                                        value={starVoters} 
                                        onChange={(e) => setStarVoters(e.target.value)}
                                        placeholder="투표 인원"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div>
                                    <p className="text-sm font-medium text-blue-900">총 투표 예정 인원</p>
                                    <p className="text-xs text-blue-600 mt-1">각 카테고리의 합산값이 실제로 투표 진행</p>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {parseInt(loveVoters || "0") + parseInt(victoryVoters || "0") + parseInt(starVoters || "0")}명
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleRunVotes} 
                                    disabled={isRunning} 
                                    className="bg-blue-600 hover:bg-blue-700 gap-2 flex-1"
                                    size="default"
                                >
                                    {isRunning ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    봇 투표 시작
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    className="text-red-500 border-red-100 hover:bg-red-50"
                                    disabled
                                >
                                    <Square className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {voteDetails.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> 실시간 투표 로그</h4>
                                <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 space-y-1 max-h-[300px] overflow-y-auto">
                                    {voteDetails.map((v, i) => (
                                        <div key={i}>
                                            <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {v.bot}님이 "{v.mission}" 미션에 "{v.option}" 투표
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}




