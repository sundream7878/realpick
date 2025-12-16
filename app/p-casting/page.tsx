"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import { Button } from "@/components/c-ui/button"
import { Badge } from "@/components/c-ui/badge"
import { Card, CardContent } from "@/components/c-ui/card"
import { RECRUITS, TRecruit, TRecruitType } from "@/lib/constants/recruits"
import { SHOWS, getShowById, getShowByName, TShowCategory } from "@/lib/constants/shows"
import { getDDay, isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import { Calendar, User, Users, ExternalLink, Mic2, Ticket } from "lucide-react"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { getUser } from "@/lib/supabase/users"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import type { TTierInfo } from "@/types/t-tier/tier.types"

export default function CastingPage() {
    const router = useRouter()
    const [selectedType, setSelectedType] = useState<"all" | TRecruitType>("all")
    const [selectedCategory, setSelectedCategory] = useState<"ALL" | TShowCategory>("ALL")

    // 사이드바/모달 상태 관리
    const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
    const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
    const [selectedShowId, setSelectedShowId] = useState<string | null>(null)
    const [selectedSeason, setSelectedSeason] = useState<string>("전체")
    const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})

    // 유저 정보
    const [userNickname, setUserNickname] = useState("")
    const [userPoints, setUserPoints] = useState(0)
    const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))

    // 유저 데이터 로드
    useEffect(() => {
        const loadUserData = async () => {
            if (isAuthenticated()) {
                const currentUserId = getUserId()
                if (currentUserId) {
                    try {
                        const user = await getUser(currentUserId)
                        if (user) {
                            setUserNickname(user.nickname)
                            setUserPoints(user.points)
                            setUserTier(getTierFromDbOrPoints(user.tier, user.points))
                        }
                    } catch (error) {
                        console.error("유저 데이터 로딩 실패:", error)
                    }
                }
            } else {
                setUserNickname("")
                setUserPoints(0)
                setUserTier(getTierFromPoints(0))
            }
        }

        loadUserData()

        const handleAuthChange = () => {
            loadUserData()
        }
        window.addEventListener('auth-change', handleAuthChange)
        return () => window.removeEventListener('auth-change', handleAuthChange)
    }, [])

    useEffect(() => {
        fetch('/api/public/shows')
            .then(res => res.json())
            .then(data => setShowStatuses(data.statuses || {}))
            .catch(err => console.error("Failed to fetch show statuses", err))
    }, [])

    // 필터링 및 정렬 로직
    const filteredRecruits = RECRUITS.filter(recruit => {
        // 1. 유형 필터
        if (selectedType !== "all" && recruit.type !== selectedType) return false

        // 2. 카테고리 필터
        if (selectedCategory !== "ALL") {
            const show = getShowById(recruit.programId)
            if (show?.category !== selectedCategory) return false
        }

        return true
    }).sort((a, b) => {
        const now = new Date()
        const aEnd = new Date(a.endDate)
        const bEnd = new Date(b.endDate)
        const aPassed = isDeadlinePassed(a.endDate)
        const bPassed = isDeadlinePassed(b.endDate)

        // 1. 마감된 것은 맨 뒤로
        if (aPassed && !bPassed) return 1
        if (!aPassed && bPassed) return -1

        // 2. 둘 다 진행중이면 마감 임박순 (오름차순)
        if (!aPassed && !bPassed) {
            return aEnd.getTime() - bEnd.getTime()
        }

        // 3. 둘 다 마감이면 최신순 (내림차순)
        return bEnd.getTime() - aEnd.getTime()
    })

    // D-Day 배지 컴포넌트
    const DDayBadge = ({ date }: { date: string }) => {
        if (isDeadlinePassed(date)) {
            return <Badge variant="secondary" className="bg-gray-200 text-gray-500">마감됨</Badge>
        }

        const dDay = getDDay(date)
        const isUrgent = dDay.includes("D-") && parseInt(dDay.replace("D-", "")) <= 7

        return (
            <Badge className={`${isUrgent ? "bg-red-500 animate-pulse" : "bg-purple-600"} text-white border-none`}>
                {dDay === "D-Day" ? "오늘 마감" : dDay}
            </Badge>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
                {/* 헤더 */}
                <AppHeader
                    selectedShow={selectedShowId ? (getShowById(selectedShowId)?.name as "나는솔로" | "돌싱글즈") || "나는솔로" : "나는솔로"}
                    onShowChange={() => { }}
                    userNickname={userNickname}
                    userPoints={userPoints}
                    userTier={userTier}
                    onAvatarClick={() => router.push("/p-profile")}
                    selectedShowId={selectedShowId}
                    onShowSelect={(showId) => {
                        if (showId) {
                            router.push(`/?show=${showId}`)
                        } else {
                            router.push("/")
                        }
                    }}
                    showStatuses={showStatuses}
                />

                <main className="flex-1 p-4 md:pl-72">
                    {/* 타이틀 섹션 */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            📢 Real Casting
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            다음 주인공은 바로 당신입니다.
                        </p>
                    </div>

                    {/* 필터 탭 */}
                    <div className="flex flex-col gap-4 mb-6">
                        {/* 유형 탭 */}
                        <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-fit">
                            {[
                                { id: "all", label: "전체 보기" },
                                { id: "cast", label: "출연 도전", icon: Mic2 },
                                { id: "audience", label: "방청 신청", icon: Ticket },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedType(tab.id as any)}
                                    className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${selectedType === tab.id
                                        ? "bg-white text-purple-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    {tab.icon && <tab.icon className="w-4 h-4" />}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* 장르 필터 */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {[
                                { id: "ALL", label: "전체" },
                                { id: "LOVE", label: "❤️ 로맨스" },
                                { id: "VICTORY", label: "🏆 승부/생존" },
                                { id: "STAR", label: "🌟 오디션" },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id as any)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${selectedCategory === cat.id
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 공고 리스트 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredRecruits.map((recruit) => {
                            const show = getShowById(recruit.programId)
                            const isClosed = isDeadlinePassed(recruit.endDate)
                            const posterUrl = show?.officialUrl ? `/images/shows/${recruit.programId}.jpg` : undefined // 실제로는 상수에 정의된 이미지 사용 예정
                            // 임시로 썸네일이 없으면 그라데이션 처리

                            return (
                                <Card
                                    key={recruit.id}
                                    className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${isClosed
                                        ? "border-l-gray-300 opacity-70 grayscale"
                                        : recruit.type === "cast"
                                            ? "border-l-purple-500"
                                            : "border-l-pink-500"
                                        }`}
                                >
                                    <CardContent className="p-0">
                                        <div className="flex h-32">
                                            {/* 좌측: 썸네일 (포스터) */}
                                            <div className="w-24 md:w-32 bg-gray-200 shrink-0 relative overflow-hidden group cursor-pointer"
                                                onClick={() => window.open(recruit.officialUrl || show?.officialUrl, "_blank")}
                                            >
                                                {/* 실제 이미지가 없으므로 텍스트로 대체하거나 그라데이션 */}
                                                <div className={`w-full h-full flex items-center justify-center text-center p-2 text-white font-bold text-xs bg-gradient-to-br ${recruit.type === "cast" ? "from-purple-400 to-indigo-600" : "from-pink-400 to-rose-600"
                                                    }`}>
                                                    {show?.displayName || recruit.title}
                                                </div>

                                                {/* 호버 시 오버레이 */}
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ExternalLink className="w-6 h-6 text-white" />
                                                </div>
                                            </div>

                                            {/* 우측: 정보 */}
                                            <div className="flex-1 p-3 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-gray-50">
                                                            {recruit.type === "cast" ? "출연자 모집" : "방청 신청"}
                                                        </Badge>
                                                        <DDayBadge date={recruit.endDate} />
                                                    </div>

                                                    <h3 className="font-bold text-gray-900 text-sm md:text-base line-clamp-1 mb-1">
                                                        {recruit.title}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                                                        {recruit.description}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        <span className="truncate max-w-[100px]">{recruit.target}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>~{recruit.endDate}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 하단 버튼 (모바일 최적화) */}
                                        {!isClosed && (
                                            <div
                                                className={`py-2 text-center text-sm font-bold text-white cursor-pointer transition-colors ${recruit.type === "cast"
                                                    ? "bg-purple-600 hover:bg-purple-700"
                                                    : "bg-pink-500 hover:bg-pink-600"
                                                    }`}
                                                onClick={() => window.open(recruit.officialUrl || show?.officialUrl, "_blank")}
                                            >
                                                {recruit.type === "cast" ? "지원하러 가기" : "신청하러 가기"}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* 푸터 메시지 */}
                    <div className="mt-12 text-center py-8 border-t border-gray-100">
                        <p className="text-purple-600 font-bold text-lg animate-bounce">
                            당신의 데뷔를 응원합니다!! 🎉
                        </p>
                        <p className="text-gray-400 text-xs mt-2">
                            RealPick은 방송국 공식 모집 공고를 큐레이션하여 제공합니다.
                        </p>
                    </div>
                </main>

                <BottomNavigation
                    onMissionClick={() => setIsMissionModalOpen(true)}
                    onStatusClick={() => setIsMissionStatusOpen(true)}
                />

                <SidebarNavigation
                    selectedShow={selectedShowId ? (getShowById(selectedShowId)?.name as "나는솔로" | "돌싱글즈") || "나는솔로" : "나는솔로"}
                    selectedSeason={selectedSeason}
                    isMissionStatusOpen={isMissionStatusOpen}
                    onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
                    onSeasonSelect={setSelectedSeason}
                    onMissionModalOpen={() => setIsMissionModalOpen(true)}
                    category={selectedShowId ? getShowById(selectedShowId)?.category : undefined}
                    activeNavItem="casting"
                    selectedShowId={selectedShowId}
                />

                <MissionCreationModal
                    isOpen={isMissionModalOpen}
                    onClose={() => setIsMissionModalOpen(false)}
                    onMissionCreated={() => { }}
                    category={selectedShowId ? getShowById(selectedShowId)?.category : undefined}
                />
            </div>
        </div>
    )
}
