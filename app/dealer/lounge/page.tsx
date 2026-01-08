
"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { Loader2, Trophy, Users, Layout, Crown } from "lucide-react"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import { getTierFromPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { getShowById } from "@/lib/constants/shows"
import type { TTierInfo } from "@/types/t-tier/tier.types"

interface DealerStat {
    id: string
    nickname: string
    tier: string
    role: string
    missionCount: number
    totalParticipants: number
}

export default function DealerLoungePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [stats, setStats] = useState<DealerStat[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Layout states
    const [selectedShowId, setSelectedShowId] = useState<string | null>(searchParams.get('show'))
    const [selectedSeason, setSelectedSeason] = useState<string>("전체")
    const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
    const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
    const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})

    useEffect(() => {
        const checkPermissionAndLoadData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push("/login")
                return
            }

            // Check role
            const { data: userData } = await supabase
                .from("t_users")
                .select("f_role, f_nickname, f_points, f_tier")
                .eq("f_id", user.id)
                .single()

            if (!userData || (userData.f_role !== 'DEALER' && userData.f_role !== 'MAIN_DEALER' && userData.f_role !== 'ADMIN')) {
                router.push("/")
                return
            }

            setCurrentUser({ ...user, ...userData })

            // Fetch stats
            try {
                const res = await fetch('/api/dealer/stats')
                const data = await res.json()

                if (!res.ok) throw new Error(data.error || 'Failed to fetch stats')

                setStats(data.stats)
            } catch (err: any) {
                console.error("Error loading dealer stats:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        checkPermissionAndLoadData()
    }, [router])

    // URL 쿼리 파라미터 동기화
    useEffect(() => {
        const showParam = searchParams.get('show')
        setSelectedShowId(showParam)
    }, [searchParams])

    useEffect(() => {
        const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
        const cleanup = setupShowStatusSync(setShowStatuses)
        return cleanup
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    const myStat = stats.find(s => s.id === currentUser?.id)
    const rank = stats.findIndex(s => s.id === currentUser?.id) + 1
    const userTierInfo = getTierFromPoints(currentUser?.f_points || 0)

    const handleSeasonSelect = (season: string) => {
        setSelectedSeason(season)
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
                <AppHeader
                    selectedShow={selectedShowId ? (getShowById(selectedShowId)?.name as "나는솔로" | "돌싱글즈") || "나는솔로" : "나는솔로"}
                    onShowChange={() => { }}
                    userNickname={currentUser?.f_nickname || ""}
                    userPoints={currentUser?.f_points || 0}
                    userTier={userTierInfo}
                    onAvatarClick={() => {
                        const profileUrl = selectedShowId ? `/p-profile?show=${selectedShowId}` : "/p-profile"
                        router.push(profileUrl)
                    }}
                    selectedShowId={selectedShowId}
                    onShowSelect={(showId) => {
                        if (showId) {
                            router.push(`/?show=${showId}`)
                        } else {
                            router.push("/")
                        }
                    }}
                    activeShowIds={new Set()}
                    showStatuses={showStatuses}
                />

                <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden pb-20 md:pb-6">
                    <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Crown className="w-8 h-8 text-yellow-500" />
                        딜러 라운지
                    </h1>
                    <p className="text-gray-600 mt-2">
                        딜러님들의 미션 현황과 성과를 한눈에 확인하세요.
                    </p>
                </div>

                {/* My Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg text-purple-600">
                                <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-500">내 랭킹</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{rank}위</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg text-blue-600">
                                <Layout className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-500">생성한 미션</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{myStat?.missionCount || 0}개</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 sm:p-3 bg-green-100 rounded-lg text-green-600">
                                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm text-gray-500">총 참여자 수</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{myStat?.totalParticipants?.toLocaleString() || 0}명</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Combined Chart Section */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">딜러별 통계</h3>
                    <div className="h-[300px] sm:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis 
                                    dataKey="nickname" 
                                    tick={{ fontSize: 10 }} 
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis yAxisId="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                />
                                <Bar yAxisId="left" dataKey="totalParticipants" name="총 참여자 수" radius={[10, 10, 0, 0]} barSize={30} fill="#3b82f6">
                                    {stats.map((entry, index) => (
                                        <Cell key={`cell-participants-${index}`} fill={entry.id === currentUser?.id ? '#3b82f6' : '#93c5fd'} />
                                    ))}
                                    <LabelList dataKey="totalParticipants" position="top" fill="#64748b" fontSize={10} formatter={(value: number) => value.toLocaleString()} />
                                </Bar>
                                <Bar yAxisId="right" dataKey="missionCount" name="생성 미션 수" radius={[10, 10, 0, 0]} barSize={30} fill="#8b5cf6">
                                    {stats.map((entry, index) => (
                                        <Cell key={`cell-missions-${index}`} fill={entry.id === currentUser?.id ? '#8b5cf6' : '#c4b5fd'} />
                                    ))}
                                    <LabelList dataKey="missionCount" position="top" fill="#64748b" fontSize={10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                    </div>
                </main>

                <BottomNavigation />

                <SidebarNavigation
                    selectedShow={selectedShowId ? getShowById(selectedShowId)?.name : undefined}
                    selectedSeason={selectedSeason}
                    isMissionStatusOpen={isMissionStatusOpen}
                    onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
                    onSeasonSelect={handleSeasonSelect}
                    onMissionModalOpen={() => setIsMissionModalOpen(true)}
                    activeNavItem="dealer"
                    category={selectedShowId ? getShowById(selectedShowId)?.category : undefined}
                    selectedShowId={selectedShowId}
                />

                <MissionCreationModal
                    isOpen={isMissionModalOpen}
                    onClose={() => setIsMissionModalOpen(false)}
                />
            </div>
        </div>
    )
}
