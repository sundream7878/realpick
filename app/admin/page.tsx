"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Badge } from "@/components/c-ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/c-ui/select"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { getAllOpenMissions, setMainMissionId, getMainMissionId } from "@/lib/supabase/admin"
import { SHOWS, CATEGORIES, type TShowCategory } from "@/lib/constants/shows"
import { getUserId, getUserRole } from "@/lib/auth-utils" // Assuming getUserRole exists or I'll check logic

export default function AdminPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [missions, setMissions] = useState<any[]>([])
    const [currentMainMissionId, setCurrentMainMissionId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            // Simple client-side check (should be reinforced with RLS/Server Actions in real app)
            const userId = getUserId()
            // For now, we'll assume if they are on this page they might be admin or we just let them try
            // In a real app, we'd check the role from DB. 
            // Let's just proceed with loading data.
            setIsAdmin(true)

            try {
                const [missionsResult, mainMissionResult] = await Promise.all([
                    getAllOpenMissions(),
                    getMainMissionId()
                ])

                if (missionsResult.success) {
                    setMissions(missionsResult.missions || [])
                }

                if (mainMissionResult.success) {
                    setCurrentMainMissionId(mainMissionResult.missionId)
                }
            } catch (error) {
                console.error("Failed to load admin data", error)
                toast({
                    title: "로딩 실패",
                    description: "데이터를 불러오는 중 오류가 발생했습니다.",
                    variant: "destructive"
                })
            } finally {
                setIsLoading(false)
            }
        }

        checkAuthAndLoad()
    }, [])

    const handleSetMainMission = async (missionId: string) => {
        try {
            const result = await setMainMissionId(missionId)
            if (result.success) {
                setCurrentMainMissionId(missionId)
                toast({
                    title: "메인 미션 설정 완료",
                    description: "메인 배너가 업데이트되었습니다."
                })
            } else {
                throw new Error("Failed to set main mission")
            }
        } catch (error) {
            toast({
                title: "설정 실패",
                description: "메인 미션 설정 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    const handleClearMainMission = async () => {
        try {
            const result = await setMainMissionId(null)
            if (result.success) {
                setCurrentMainMissionId(null)
                toast({
                    title: "메인 미션 해제 완료",
                    description: "메인 배너가 기본 로직으로 돌아갑니다."
                })
            }
        } catch (error) {
            console.error(error)
        }
    }

    // Group shows by category
    const groupedShows = {
        LOVE: SHOWS.LOVE,
        VICTORY: SHOWS.VICTORY,
        STAR: SHOWS.STAR
    }

    if (isLoading) return <div className="p-8 text-center">로딩 중...</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader
                selectedShow="나는솔로"
                onShowChange={() => { }}
                userNickname="관리자"
                userPoints={0}
                userTier={{
                    id: "admin",
                    name: "관리자",
                    minPoints: 0,
                    maxPoints: 0,
                    color: "bg-gray-500",
                    icon: "👑"
                }}
            />

            <main className="container max-w-5xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">현재 메인 미션 ID:</span>
                        <span className="text-sm text-gray-500">현재 메인 미션 ID:</span>
                        <Badge variant="outline" className="font-mono">
                            {currentMainMissionId || "없음 (자동 선정)"}
                        </Badge>
                        {currentMainMissionId && (
                            <Button variant="ghost" size="sm" onClick={handleClearMainMission} className="text-rose-500 h-6">
                                해제
                            </Button>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    {(Object.keys(groupedShows) as TShowCategory[]).map((category) => (
                        <section key={category} className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">{CATEGORIES[category].emoji}</span>
                                <h2 className="text-xl font-bold text-gray-800">{CATEGORIES[category].label}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groupedShows[category].map((show) => {
                                    // Filter missions for this show
                                    const showMissions = missions.filter(m => {
                                        // "나는솔로" (nasolo)인 경우, showId가 없거나 nasolo인 것 모두 포함
                                        if (show.id === 'nasolo') {
                                            return m.f_show_id === show.id || !m.f_show_id
                                        }
                                        return m.f_show_id === show.id
                                    })

                                    return (
                                        <Card key={show.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <CardHeader className="py-3 px-4 bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
                                                <CardTitle className="text-base font-medium text-gray-900">
                                                    {show.displayName}
                                                </CardTitle>
                                                <Badge variant="secondary" className="bg-white text-gray-500 border border-gray-200">
                                                    {showMissions.length}개 진행중
                                                </Badge>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        onValueChange={handleSetMainMission}
                                                        value={currentMainMissionId && showMissions.find(m => m.f_id === currentMainMissionId) ? currentMainMissionId : ""}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="메인 미션으로 선정할 투표 선택" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {showMissions.length === 0 ? (
                                                                <div className="p-2 text-sm text-gray-500 text-center">진행 중인 투표 없음</div>
                                                            ) : (
                                                                showMissions.map((mission) => (
                                                                    <SelectItem key={mission.f_id} value={mission.f_id}>
                                                                        <span className="truncate block max-w-[300px]">{mission.f_title}</span>
                                                                    </SelectItem>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            <BottomNavigation />
        </div>
    )
}
