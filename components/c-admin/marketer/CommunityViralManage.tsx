"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Search, Loader2, RefreshCw, Check, Edit2, Send, Trash2, FileText, Globe, ClipboardList } from "lucide-react"
import { Textarea } from "@/components/c-ui/textarea"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { Badge } from "@/components/c-ui/badge"

export function CommunityViralManage() {
    const [rawText, setRawText] = useState("")
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analyzeResult, setAnalyzeResult] = useState<any>(null)
    const [pendingList, setPendingList] = useState<any[]>([])
    const [approvedList, setApprovedList] = useState<any[]>([])
    const { toast } = useToast()

    // 1. AI 분석 핸들러
    const handleAnalyze = async () => {
        if (!rawText.trim()) {
            toast({ title: "입력 오류", description: "공고 본문을 입력해주세요.", variant: "destructive" })
            return
        }
        setIsAnalyzing(true)
        try {
            const res = await fetch("/api/admin/marketer/recruits/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: rawText })
            })
            const data = await res.json()
            if (data.success) {
                setAnalyzeResult(data.result)
                toast({ title: "분석 성공", description: "데이터가 구조화되었습니다." })
            } else throw new Error(data.error)
        } catch (error: any) {
            toast({ title: "분석 실패", description: error.message, variant: "destructive" })
        } finally { setIsAnalyzing(false) }
    }

    // 2. 분석 결과 DB 저장
    const handleSavePending = async () => {
        try {
            const res = await fetch("/api/admin/marketer/recruits/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(analyzeResult)
            })
            const data = await res.json()
            if (data.success) {
                toast({ title: "저장 성공", description: "승인 대기 목록으로 이동했습니다." })
                setAnalyzeResult(null)
                setRawText("")
                fetchRecruits() // 목록 갱신
            } else throw new Error(data.error)
        } catch (error: any) {
            toast({ title: "저장 실패", description: error.message, variant: "destructive" })
        }
    }

    // 3. 목록 조회 (승인 대기 / 승인 완료)
    const fetchRecruits = async () => {
        try {
            // 실제 구현 시 API 호출
            // const res = await fetch("/api/admin/marketer/recruits/list")
            // const data = await res.json()
            // setPendingList(data.pending)
            // setApprovedList(data.approved)
        } catch (e) { console.error("목록 로드 실패") }
    }

    useEffect(() => { fetchRecruits() }, [])

    return (
        <Tabs defaultValue="analyze" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analyze">크롤링 및 분석</TabsTrigger>
                <TabsTrigger value="pending">승인 대기 목록</TabsTrigger>
                <TabsTrigger value="approved">승인된 공고</TabsTrigger>
            </TabsList>

            {/* 1. 분석 탭 */}
            <TabsContent value="analyze" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">모집 공고 원문 분석</CardTitle>
                        <CardDescription>방송국 공지사항에서 복사한 텍스트를 AI가 리얼캐스팅 규격으로 가공합니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea 
                            placeholder="이곳에 방송국 모집 공고의 제목과 본문을 복사해 넣으세요..." 
                            className="min-h-[250px] leading-relaxed"
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                        />
                        <Button onClick={handleAnalyze} disabled={isAnalyzing || !rawText.trim()} className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg">
                            {isAnalyzing ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
                            AI 분석 및 구조화 시작
                        </Button>

                        {analyzeResult && (
                            <Card className="border-purple-200 bg-purple-50/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-600" /> 분석 결과 미리보기
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-y-3 text-sm">
                                        <div><span className="text-gray-500">프로그램:</span> <span className="font-bold">{analyzeResult.programId}</span></div>
                                        <div><span className="text-gray-500">카테고리:</span> <Badge variant="outline">{analyzeResult.category}</Badge></div>
                                        <div className="col-span-2"><span className="text-gray-500">제목:</span> <span className="font-bold">{analyzeResult.title}</span></div>
                                        <div className="col-span-2"><span className="text-gray-500">대상:</span> {analyzeResult.target}</div>
                                        <div><span className="text-gray-500">마감일:</span> {analyzeResult.endDate}</div>
                                    </div>
                                    <Button onClick={handleSavePending} className="w-full bg-green-600 hover:bg-green-700">
                                        <Send className="w-4 h-4 mr-2" /> 이 내용으로 DB 저장 (승인 대기)
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 2. 승인 대기 탭 */}
            <TabsContent value="pending">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">승인 대기 중인 공고</CardTitle>
                        <CardDescription>AI가 가공한 데이터가 실제 사용자에게 노출되기 전 최종 검토 단계입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-center py-20 text-gray-400">
                            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            승인 대기 중인 공고가 없습니다.
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* 3. 승인 완료 탭 */}
            <TabsContent value="approved">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">현재 게시 중인 공고</CardTitle>
                        <CardDescription>사용자 페이지 '리얼캐스팅' 메뉴에 실제로 노출되고 있는 공고 목록입니다.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="text-center py-20 text-gray-400">
                            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            게시 중인 공고가 없습니다.
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
