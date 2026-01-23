"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Users, UserPlus, Play, Square, Loader2, RefreshCw, Activity, List, ShieldCheck } from "lucide-react"
import { Input } from "@/components/c-ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/c-ui/select"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { Badge } from "@/components/c-ui/badge"

export function FakeUserBotManage() {
    const [isRunning, setIsRunning] = useState(false)
    const [numUsers, setNumUsers] = useState("5")
    const [numVoters, setNumVoters] = useState("10") // 투표할 봇 수
    const [botRole, setBotRole] = useState("PICKER")
    const [botList, setBotList] = useState<any[]>([])
    const [voteDetails, setVoteDetails] = useState<any[]>([])
    const [recentlyCreated, setRecentlyCreated] = useState<any[]>([]) // 방금 생성된 유저 목록
    const { toast } = useToast()

    // 1. 가짜 유저 생성 (AI 닉네임)
    const handleCreateBots = async () => {
        setIsRunning(true)
        setRecentlyCreated([]) // 이전 목록 초기화
        try {
            const res = await fetch("/api/admin/marketer/bots/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: parseInt(numUsers), role: botRole })
            })
            const data = await res.json()
            if (data.success) {
                // 생성된 유저 목록 저장
                if (data.users && data.users.length > 0) {
                    setRecentlyCreated(data.users)
                }
                toast({ 
                    title: "봇 생성 성공", 
                    description: `${data.count}명의 새로운 AI 봇이 생성되었습니다.` 
                })
                fetchBots() // 전체 목록 갱신
            } else throw new Error(data.error)
        } catch (error: any) {
            toast({ title: "생성 실패", description: error.message, variant: "destructive" })
        } finally { setIsRunning(false) }
    }

    // 2. 랜덤 투표 가동
    const handleRunVotes = async () => {
        setIsRunning(true)
        setVoteDetails([]) // 이전 로그 초기화
        
        const startTime = Date.now()
        console.log(`[Bot Vote] 투표 시작: ${numVoters}명`)
        
        try {
            const res = await fetch("/api/admin/marketer/bots/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: parseInt(numVoters), delay: 0.0 })
            })
            const data = await res.json()
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
            console.log(`[Bot Vote] API Response (${elapsed}s):`, data)
            
            if (data.success) {
                setVoteDetails(data.details || [])
                toast({ 
                    title: "활동 완료", 
                    description: `${data.count}개의 랜덤 투표가 ${elapsed}초에 처리되었습니다.` 
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
    
    const fetchBots = async () => {
        setIsLoadingBots(true)
        try {
            const res = await fetch("/api/admin/marketer/bots/list")
            const data = await res.json()
            if (data.success) {
                setBotList(data.bots || [])
                toast({ 
                    title: "목록 갱신", 
                    description: `${data.count}명의 봇을 불러왔습니다.` 
                })
            } else {
                throw new Error(data.error)
            }
        } catch (e: any) { 
            console.error("봇 목록 로드 실패:", e)
            toast({ 
                title: "불러오기 실패", 
                description: e.message, 
                variant: "destructive" 
            })
        } finally {
            setIsLoadingBots(false)
        }
    }

    useEffect(() => { fetchBots() }, [])

    return (
        <Tabs defaultValue="create" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="create">가짜 유저 생성</TabsTrigger>
                <TabsTrigger value="list">봇 목록 관리</TabsTrigger>
                <TabsTrigger value="control">가상 활동 제어</TabsTrigger>
            </TabsList>

            {/* 1. 유저 생성 탭 */}
            <TabsContent value="create">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">가짜 유저 생성 (AI)</CardTitle>
                        <CardDescription>한국 예능 팬들의 성향을 가진 자연스러운 AI 닉네임 유저를 생성합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">생성 인원</label>
                                <Input type="number" value={numUsers} onChange={(e) => setNumUsers(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">역할 설정</label>
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
                            유저 등록
                        </Button>

                        {/* 방금 생성된 유저 목록 */}
                        {recentlyCreated.length > 0 && (
                            <div className="mt-6 space-y-2">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-green-600" />
                                    <h4 className="text-sm font-bold text-green-700">방금 생성된 유저 ({recentlyCreated.length}명)</h4>
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">봇 목록 관리</CardTitle>
                            <CardDescription>현재 시스템에서 운영 중인 가짜 유저 목록입니다. (총 {botList.length}명)</CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchBots}
                            disabled={isLoadingBots}
                        >
                            {isLoadingBots ? <Loader2 className="animate-spin w-3 h-3 mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                            갱신
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
                                                등록된 봇이 없습니다. 먼저 가짜 유저를 생성해주세요.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 3. 가상 활동 제어 탭 */}
            <TabsContent value="control">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">가상 활동 및 투표 제어</CardTitle>
                        <CardDescription>봇들을 가동하여 미션에 랜덤 투표를 수행하게 합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">투표 인원</label>
                                    <Input 
                                        type="number" 
                                        value={numVoters} 
                                        onChange={(e) => setNumVoters(e.target.value)}
                                        className="w-32"
                                        min="1"
                                        max="100"
                                    />
                                </div>
                                <div className="flex gap-2 items-end">
                                    <Button 
                                        onClick={handleRunVotes} 
                                        disabled={isRunning} 
                                        className="bg-blue-600 hover:bg-blue-700 gap-2"
                                        size="default"
                                    >
                                        {isRunning ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        투표 엔진 가동
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
                        </div>

                        {voteDetails.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> 실시간 투표 로그</h4>
                                <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 space-y-1 max-h-[300px] overflow-y-auto">
                                    {voteDetails.map((v, i) => (
                                        <div key={i}>
                                            <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {v.bot}님이 "{v.mission}" 미션에 "{v.option}" 선택
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
