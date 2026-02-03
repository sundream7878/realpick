
"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { auth, db } from "@/lib/firebase/config"
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { getUser } from "@/lib/firebase/users"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { Loader2, Trophy, Users, Layout, Crown } from "lucide-react"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { BannerAd } from "@/components/c-banner-ad/banner-ad"
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
    const categoryParam = searchParams.get('category')
    const [stats, setStats] = useState<DealerStat[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Layout states
    const [selectedShowId, setSelectedShowId] = useState<string | null>(searchParams.get('show'))
    const [selectedSeason, setSelectedSeason] = useState<string>("전체")
    const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
    const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
    // Show Statuses, Visibility, Custom Shows Fetching & Sync
    const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
    const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
    const [customShows, setCustomShows] = useState<any[]>([])

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)
            try {
                // 1. 유저 정보 및 인증 상태 확인
                const unsubscribe = onAuthStateChanged(auth, async (user) => {
                    if (!user) {
                        setError("로그인이 필요합니다.")
                        setLoading(false)
                        return
                    }

                    const userData = await getUser(user.uid)
                    if (!userData) {
                        setError("사용자 정보를 찾을 수 없습니다.")
                        setLoading(false)
                        return
                    }
                    setCurrentUser({ ...userData, id: user.uid })

                    // 2. 딜러 목록 가져오기 (DEALER, MAIN_DEALER, ADMIN)
                    const dealersQuery = query(
                        collection(db, "users"),
                        where("role", "in", ["DEALER", "MAIN_DEALER", "ADMIN"])
                    )
                    const dealersSnap = await getDocs(dealersQuery)
                    const dealers = dealersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))

                    // 3. 모든 딜러의 미션 통계 한 번에 계산 (N+1 문제 해결)
                    const dealerIds = dealers.map(d => d.id)
                    const dealerStats: DealerStat[] = []
                    
                    if (dealerIds.length > 0) {
                        // 모든 딜러가 생성한 미션을 한꺼번에 가져오기 (최대 30명씩 묶어서)
                        let allM1: any[] = []
                        let allM2: any[] = []

                        for (let i = 0; i < dealerIds.length; i += 30) {
                            const chunk = dealerIds.slice(i, i + 30)
                            const m1Q = query(collection(db, "missions1"), where("creatorId", "in", chunk))
                            const m2Q = query(collection(db, "missions2"), where("creatorId", "in", chunk))
                            const [m1S, m2S] = await Promise.all([getDocs(m1Q), getDocs(m2Q)])
                            allM1.push(...m1S.docs.map(doc => doc.data()))
                            allM2.push(...m2S.docs.map(doc => doc.data()))
                        }

                        // 딜러별로 그룹화
                        for (const dealer of dealers) {
                            const dealerM1 = allM1.filter(m => m.creatorId === dealer.id)
                            const dealerM2 = allM2.filter(m => m.creatorId === dealer.id)
                            
                            let totalParticipants = 0
                            dealerM1.forEach(m => totalParticipants += (m.participants || 0))
                            dealerM2.forEach(m => totalParticipants += (m.participants || 0))

                            dealerStats.push({
                                id: dealer.id,
                                nickname: (dealer as any).nickname || "알 수 없음",
                                tier: (dealer as any).tier || "루키",
                                role: (dealer as any).role || "DEALER",
                                missionCount: dealerM1.length + dealerM2.length,
                                totalParticipants
                            })
                        }
                    }

                    // 참여자 수 순으로 정렬
                    dealerStats.sort((a, b) => b.totalParticipants - a.totalParticipants)
                    setStats(dealerStats)
                    setLoading(false)
                })

                return () => unsubscribe()
            } catch (err: any) {
                console.error("Stats fetch error:", err)
                setError("통계 데이터를 불러오는 중 오류가 발생했습니다.")
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    useEffect(() => {
        const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
        const cleanup = setupShowStatusSync(
            setShowStatuses,
            setShowVisibility,
            setCustomShows
        )
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
    const userTierInfo = getTierFromPoints(currentUser?.points || 0)

    const handleSeasonSelect = (season: string) => {
        setSelectedSeason(season)
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
                <AppHeader
                    selectedShow={selectedShowId ? (getShowById(selectedShowId)?.name as "나는솔로" | "돌싱글즈") || "나는솔로" : "나는솔로"}
                    onShowChange={() => { }}
                    userNickname={currentUser?.nickname || ""}
                    userPoints={currentUser?.points || 0}
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

                <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden pb-32 md:pb-16">
                    <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                        <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-yellow-500" />
                        딜러 라운지
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-2">
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

                <div className="fixed bottom-0 left-0 right-0 z-50">
                    <BottomNavigation />
                    <BannerAd />
                </div>

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
                    initialShowId={selectedShowId}
                    category={categoryParam as any || (selectedShowId ? getShowById(selectedShowId)?.category : undefined)}
                />
            </div>
        </div>
    )
}
