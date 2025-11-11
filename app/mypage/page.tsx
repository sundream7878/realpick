"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Star, Home, User, Plus, AlertCircle, ChevronDown, ChevronRight, Heart } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { MockVoteRepo, mockMissions } from "@/lib/mock-vote-data"
import { getTierFromPoints } from "@/lib/tier-system"
import type { Mission } from "@/lib/vote-types"
import { BottomNavigation } from "@/components/bottom-navigation"

function getSeasonBadge(mission: any) {
  if (mission.seasonType === "기수별" && mission.seasonNumber) {
    return `${mission.seasonNumber}기`
  }
  return null
}

export default function MyPage() {
  const userPoints = 1250
  const userTier = getTierFromPoints(userPoints)
  const [userNickname, setUserNickname] = useState("Sundream")
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [selectedSeason, setSelectedSeason] = useState<string>("전체")
  const [isPickViewModalOpen, setIsPickViewModalOpen] = useState(false)
  const [selectedMissionForView, setSelectedMissionForView] = useState<Mission | null>(null)
  const userId = "user123"

  const hasUserVoted = (missionId: string): boolean => {
    return MockVoteRepo.hasUserVoted(userId, missionId)
  }

  const shouldShowResults = (missionId: string): boolean => {
    const mission = MockVoteRepo.getMission(missionId)
    return mission?.status === "settled" || hasUserVoted(missionId)
  }

  const participatedMissions = Object.values(mockMissions).filter((mission) => hasUserVoted(mission.id))

  const createdMissions = Object.values(mockMissions).filter((mission) => mission.id === "5")

  const handleSeasonSelect = (season: string) => {
    setSelectedSeason(season)
  }

  const handleViewPick = (mission: Mission) => {
    setSelectedMissionForView(mission)
    setIsPickViewModalOpen(true)
  }

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
                className="w-full justify-between gap-3 hover:bg-gray-50"
                onClick={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5" />
                  <div className="text-left leading-tight">
                    <div>{selectedShow}</div>
                    <div className="text-sm">미션현황{selectedSeason !== "전체" ? `(${selectedSeason})` : ""}</div>
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
                        selectedSeason === "전체" ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleSeasonSelect("전체")}
                    >
                      전체
                    </Button>
                  </Link>
                  <Link href="/missions?season=29">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm ${
                        selectedSeason === "29기" ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleSeasonSelect("29기")}
                    >
                      29기
                    </Button>
                  </Link>
                  <Link href="/missions?season=28">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm ${
                        selectedSeason === "28기" ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleSeasonSelect("28기")}
                    >
                      28기
                    </Button>
                  </Link>
                  <Link href="/missions?season=27">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm ${
                        selectedSeason === "27기" ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleSeasonSelect("27기")}
                    >
                      27기
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <Button variant="ghost" className="w-full justify-start gap-3 bg-pink-50 text-pink-600 hover:bg-pink-100">
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
              {/* 로고 - 메인 페이지와 동일한 크기 */}
              <div className="flex items-center flex-shrink-0">
                <Link href="/">
                  <img
                    src="/realpick-logo.png"
                    alt="RealPick"
                    className="w-auto cursor-pointer hover:opacity-80 transition-opacity h-20 md:h-32"
                  />
                </Link>
              </div>

              {/* 프로그램 선택 - 메인 페이지와 동일한 스타일 */}
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

              {/* 사용자 정보 - 메인 페이지와 동일한 스타일 */}
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
                {/* 모바일용 축약 정보 */}
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
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-8 h-8 text-pink-600 fill-pink-600" />
              <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
            </div>

            <Tabs defaultValue="participated" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="participated" className="relative">
                  내가 참여한 미션
                  <Badge className="ml-2 bg-pink-500 hover:bg-pink-600 text-white">{participatedMissions.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="created" className="relative">
                  내가 생성한 미션
                  <Badge className="ml-2 bg-purple-500 hover:bg-purple-600 text-white">{createdMissions.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participated" className="space-y-4">
                {participatedMissions.length === 0 ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">아직 참여한 미션이 없습니다.</p>
                      <Link href="/">
                        <Button className="mt-4 bg-pink-600 hover:bg-pink-700 text-white">미션 참여하러 가기</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {participatedMissions.map((mission) => (
                      <Card
                        key={mission.id}
                        className="hover:shadow-lg hover:border-pink-300 transition-all duration-200 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-gray-200 text-gray-800 font-medium">
                                {mission.kind === "predict"
                                  ? "예측픽"
                                  : mission.kind === "majority"
                                    ? "다수픽"
                                    : "커플매칭"}
                              </Badge>
                              {getSeasonBadge(mission) && (
                                <Badge className="bg-purple-100 text-purple-700 font-medium">
                                  [{getSeasonBadge(mission)}]
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{mission.status === "settled" ? "마감됨" : "진행중"}</span>
                            </div>
                          </div>
                          <CardTitle className="text-base text-balance text-gray-900 font-semibold">
                            {getSeasonBadge(mission) ? (
                              <>
                                <span className="text-purple-600 font-bold">[{getSeasonBadge(mission)}]</span>{" "}
                                {mission.title}
                              </>
                            ) : (
                              mission.title
                            )}
                          </CardTitle>
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 font-medium"
                              onClick={() => handleViewPick(mission)}
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="created" className="space-y-4">
                {createdMissions.length === 0 ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">아직 생성한 미션이 없습니다.</p>
                      <Button
                        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => setIsMissionModalOpen(true)}
                      >
                        미션 생성하기
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {createdMissions.map((mission) => (
                      <Card
                        key={mission.id}
                        className="hover:shadow-lg hover:border-purple-300 transition-all duration-200 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-purple-500 hover:bg-purple-600 text-white">내 미션</Badge>
                              {getSeasonBadge(mission) && (
                                <Badge className="bg-purple-100 text-purple-700 font-medium">
                                  [{getSeasonBadge(mission)}]
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>{mission.status === "settled" ? "마감됨" : "진행중"}</span>
                            </div>
                          </div>
                          <CardTitle className="text-base text-balance text-gray-900 font-semibold">
                            {getSeasonBadge(mission) ? (
                              <>
                                <span className="text-purple-600 font-bold">[{getSeasonBadge(mission)}]</span>{" "}
                                {mission.title}
                              </>
                            ) : (
                              mission.title
                            )}
                          </CardTitle>
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
                                onClick={() => handleViewPick(mission)}
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
                              <Button
                                size="sm"
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
                              >
                                픽하기
                              </Button>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <BottomNavigation />
    </div>
  )
}
