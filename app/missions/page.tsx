"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Star, Plus, Home, User, AlertCircle, ChevronDown, ChevronRight, ArrowLeft } from "lucide-react"
import MissionCreationModal from "@/components/mission-creation-modal"
import ProfileModal from "@/components/profile-modal"
import { BottomNavigation } from "@/components/bottom-navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MockVoteRepo, mockMissions } from "@/lib/mock-vote-data"
import { getTierFromPoints } from "@/lib/tier-system"

function getGradeFromPoints(points: number): string {
  if (points >= 5000) return "연애고수"
  if (points >= 3000) return "연애중수"
  if (points >= 2000) return "연애초보"
  if (points >= 1000) return "썸"
  if (points >= 500) return "짝사랑"
  if (points >= 200) return "솔로"
  return "모솔"
}

export default function MissionsPage() {
  const userPoints = 1250
  const userTier = getTierFromPoints(userPoints)
  const [userNickname, setUserNickname] = useState("Sundream")
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(true)
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const searchParams = useSearchParams()
  const season = searchParams.get("season") || "all"
  const userId = "user123"

  useEffect(() => {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("rp_picked_")) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }, [])

  const hasUserVoted = (missionId: string): boolean => {
    return MockVoteRepo.hasUserVoted(userId, missionId)
  }

  const shouldShowResults = (missionId: string): boolean => {
    const mission = MockVoteRepo.getMission(missionId)
    return mission?.status === "settled" || hasUserVoted(missionId)
  }

  const getSeasonTitle = (season: string): string => {
    switch (season) {
      case "all":
        return `${selectedShow} 전체 미션`
      case "27":
        return `${selectedShow} 27기 미션`
      case "28":
        return `${selectedShow} 28기 미션`
      case "29":
        return `${selectedShow} 29기 미션`
      default:
        return `${selectedShow} 전체 미션`
    }
  }

  const getSidebarTitle = () => {
    switch (season) {
      case "all":
        return `${selectedShow} 미션현황`
      case "27":
        return `${selectedShow} 미션현황(27기)`
      case "28":
        return `${selectedShow} 미션현황(28기)`
      case "29":
        return `${selectedShow} 미션현황(29기)`
      default:
        return `${selectedShow} 미션현황`
    }
  }

  const filteredMissions = Object.values(mockMissions).filter((mission) => {
    if (season === "all") return true
    const missionSeason = (Number.parseInt(mission.id) % 3) + 27
    return season === missionSeason.toString()
  })

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block fixed h-full z-40 top-16">
        <div className="p-6">
          <nav className="space-y-2">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-gray-50">
                <Home className="w-5 h-5" />홈
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 hover:bg-gray-50"
              onClick={() => setIsMissionModalOpen(true)}
            >
              <Plus className="w-5 h-5" />
              미션 게시하기
            </Button>

            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-between gap-3 bg-pink-50 text-pink-600 hover:bg-pink-100"
                onClick={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5" />
                  <div className="text-left leading-tight">
                    <div>{selectedShow}</div>
                    <div className="text-sm">미션현황{season !== "all" ? `(${season}기)` : ""}</div>
                  </div>
                </div>
                {isMissionStatusOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>

              {isMissionStatusOpen && (
                <div className="ml-8 space-y-1">
                  <Link href="/missions?season=all">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm ${
                        season === "all" ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                      }`}
                    >
                      전체
                    </Button>
                  </Link>
                  <Link href="/missions?season=27">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm ${
                        season === "27" ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                      }`}
                    >
                      27기
                    </Button>
                  </Link>
                  <Link href="/missions?season=28">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm ${
                        season === "28" ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                      }`}
                    >
                      28기
                    </Button>
                  </Link>
                  <Link href="/missions?season=29">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm ${
                        season === "29" ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                      }`}
                    >
                      29기
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-gray-50">
              <User className="w-5 h-5" />
              마이페이지
            </Button>
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-gray-200 h-16">
          <div className="container mx-auto px-2 sm:px-4 lg:px-8 h-full">
            <div className="flex items-center justify-between h-full gap-2 sm:gap-4">
              <div className="flex items-center flex-shrink-0">
                <Link href="/">
                  <img
                    src="/realpick-logo.png"
                    alt="RealPick"
                    className="w-auto cursor-pointer hover:opacity-80 transition-opacity h-20 md:h-32"
                  />
                </Link>
              </div>

              <div className="flex items-center gap-1 sm:gap-4">
                <button
                  className={`text-xs sm:text-base font-semibold transition-colors ${
                    selectedShow === "나는솔로"
                      ? "text-pink-600 hover:text-pink-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setSelectedShow("나는솔로")}
                >
                  나는솔로
                </button>
                <div className="w-px h-3 sm:h-5 bg-gray-300"></div>
                <button
                  className={`text-xs sm:text-base font-semibold transition-colors ${
                    selectedShow === "돌싱글즈"
                      ? "text-pink-600 hover:text-pink-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setSelectedShow("돌싱글즈")}
                >
                  돌싱글즈
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">
                    <span className="underline">{userNickname}</span>님
                  </span>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-gray-900">{userPoints.toLocaleString()}P</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-pink-600 font-medium">{userTier.name}</span>
                </div>
                <div className="flex sm:hidden items-center gap-1 text-xs">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-gray-900">
                    {userPoints >= 1000 ? `${(userPoints / 1000).toFixed(1)}K` : userPoints}
                  </span>
                </div>
                <Avatar
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                  onClick={() => setIsProfileModalOpen(true)}
                >
                  <AvatarImage src={userTier.characterImage || "/placeholder.svg"} alt={userTier.name} />
                  <AvatarFallback>{userTier.name[0]}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="p-2">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <h2 className="text-2xl font-semibold text-gray-900">{getSeasonTitle(season)}</h2>
              </div>
              <div className="text-sm text-gray-600">
                총 <span className="font-semibold text-gray-900">{filteredMissions.length}</span>개 미션
              </div>
            </div>

            {filteredMissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">해당 기수의 미션이 없습니다</div>
                <div className="text-gray-500 text-sm">다른 기수를 선택해보세요</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMissions.map((mission) => (
                  <Card
                    key={mission.id}
                    className="hover:shadow-lg hover:border-pink-300 transition-all duration-200 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-gray-200 text-gray-800 font-medium">
                            {mission.kind === "predict" ? "예측픽" : "다수픽"}
                          </Badge>
                          {season !== "all" && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">{season}기</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{mission.status === "settled" ? "마감됨" : "진행중"}</span>
                        </div>
                      </div>
                      <CardTitle className="text-base text-gray-900 font-semibold truncate">{mission.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-600">
                          <span className="text-gray-900 font-semibold">
                            {mission.stats?.participants?.toLocaleString() || 0}
                          </span>
                          명 참여
                        </div>
                      </div>
                      {shouldShowResults(mission.id) ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 font-medium"
                            disabled
                          >
                            픽 완료
                          </Button>
                          <Link href={`/mission/${mission.id}/results`} className="flex-1">
                            <Button
                              size="sm"
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
                            >
                              결과보기
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <Link href={`/mission/${mission.id}/vote`}>
                          <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium">
                            픽하기
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNavigation />

      <MissionCreationModal isOpen={isMissionModalOpen} onClose={() => setIsMissionModalOpen(false)} />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        nickname={userNickname}
        onNicknameChange={setUserNickname}
      />
    </div>
  )
}
