"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Zap, Settings, RefreshCw, Loader2, Play, Check, Edit2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { Badge } from "@/components/c-ui/badge"
import { Input } from "@/components/c-ui/input"

export function AutoMissionGenerate() {
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [missions, setMissions] = useState<any[]>([])
    const [videoId, setVideoId] = useState("")
    const [videoTitle, setVideoTitle] = useState("")
    const { toast } = useToast()

    const handleAnalyze = async () => {
        if (!videoId.trim() || !videoTitle.trim()) {
            toast({ title: "입력 오류", description: "영상 ID와 제목을 입력해주세요.", variant: "destructive" })
            return
        }

        setIsAnalyzing(true)
        try {
            const res = await fetch("/api/admin/marketer/youtube/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoId, title: videoTitle })
            })
            const data = await res.json()
            
            if (data.success) {
                setMissions(data.missions)
                toast({ title: "분석 성공", description: "미션 초안이 생성되었습니다." })
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast({ title: "분석 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsAnalyzing(true) // 분석 상태 유지하여 결과 표시
            setIsAnalyzing(false)
        }
    }

    const handleSaveMission = async (mission: any, idx: number) => {
        try {
            const res = await fetch("/api/missions/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...mission,
                    showId: "nasolo", // 기본값
                    format: mission.form === 'binary' ? 'binary' : 'multi',
                    type: mission.category === 'PREDICT' ? 'prediction' : 'majority',
                    isAIMission: true,
                    referenceUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                })
            })
            const data = await res.json()
            if (data.success) {
                toast({ title: "저장 성공", description: "미션이 정식 게시되었습니다." })
                // 승인된 미션 목록에서 제거
                setMissions(prev => prev.filter((_, i) => i !== idx))
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast({ title: "저장 실패", description: error.message, variant: "destructive" })
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI 자동 미션 생성</CardTitle>
                    <CardDescription>유튜브 영상 자막을 분석하여 자동으로 미션을 생성합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500">YouTube 영상 ID</label>
                            <Input 
                                placeholder="예: dQw4w9WgXcQ" 
                                value={videoId}
                                onChange={(e) => setVideoId(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-500">영상 제목</label>
                            <Input 
                                placeholder="영상 제목을 입력하세요" 
                                value={videoTitle}
                                onChange={(e) => setVideoTitle(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button 
                        className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        자막 분석 및 미션 생성
                    </Button>

                    {missions.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <h3 className="font-bold text-gray-900">생성된 미션 초안 ({missions.length})</h3>
                            {missions.map((m, i) => (
                                <Card key={i} className="border-purple-100 bg-purple-50/30">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2">
                                                <Badge variant={m.category === 'PREDICT' ? 'destructive' : 'default'} className="text-[10px]">
                                                    {m.category === 'PREDICT' ? '예측' : '공감'}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px] bg-white">
                                                    {m.form === 'binary' ? '양자' : '다자'}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600">
                                                    <Edit2 className="w-3 h-3 mr-1" /> 수정
                                                </Button>
                                                <Button 
                                                    variant="default" 
                                                    size="sm" 
                                                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleSaveMission(m, i)}
                                                >
                                                    <Check className="w-3 h-3 mr-1" /> 승인
                                                </Button>
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-gray-900">{m.title}</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {m.options.map((opt: string, j: number) => (
                                                <span key={j} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-gray-600">
                                                    {j + 1}. {opt}
                                                </span>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
