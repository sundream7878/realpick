"use client"

import { useState, useEffect } from "react"
import { MockVoteRepo } from "@/lib/mock-vote-data"
import type { Mission } from "@/lib/vote-types"
import { MultiVotePage } from "@/components/vote/multi-vote-page"
import { MatchVotePage } from "@/components/vote/match-vote-page"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, Plus, Home, User, AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { getTierFromPoints } from "@/lib/tier-system"
import ProfileModal from "@/components/profile-modal"
import BottomNavigation from "@/components/bottom-navigation"

function getGradeFromPoints(points: number): string {
  if (points >= 5000) return "연애고수"
  if (points >= 3000) return "연애중수"
  if (points >= 2000) return "연애초보"
  if (points >= 1000) return "썸"
  if (points >= 500) return "짝사랑"
  if (points >= 200) return "솔로"
  return "모솔"
}

export default function VotePage({ params }: { params: { id: string } }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [userNickname, setUserNickname] = useState("Sundream")
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  const userPoints = 1250
  const userTier = getTierFromPoints(userPoints)

  useEffect(() => {
    const fetchMission = async () => {
      try {
        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 500))
        const data = MockVoteRepo.getMission(params.id)
        if (!data) {
          setError("미션을 찾을 수 없습니다")
        } else {
          setMission(data)
        }
      } catch (err) {
        setError("미션을 불러오는데 실패했습니다")
      } finally {
        setLoading(false)
      }
    }

    fetchMission()
  }, [params.id])

  const SidebarNav = () => (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block fixed h-full z-40 top-16">
      <div className="p-6">
        <nav className="space-y-2">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-gray-50">
              <Home className="w-5 h-5" />홈
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-gray-50">
              <Plus className="w-5 h-5" />
              미션 게시하기
            </Button>
          </Link>

          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-between gap-3 hover:bg-gray-50"
              onClick={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <div className="text-left leading-tight">
                  <div>나는솔로</div>
                  <div className="text-sm">미션현황</div>
                </div>
              </div>
              {isMissionStatusOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>

            {isMissionStatusOpen && (
              <div className="ml-8 space-y-1">
                <Link href="/missions?season=29">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sm hover:bg-gray-50">
                    29기
                  </Button>
                </Link>
                <Link href="/missions?season=28">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sm hover:bg-gray-50">
                    28기
                  </Button>
                </Link>
                <Link href="/missions?season=27">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sm hover:bg-gray-50">
                    27기
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <Link href="/mypage">
            <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-gray-50">
              <User className="w-5 h-5" />
              마이페이지
            </Button>
          </Link>
        </nav>
      </div>
    </aside>
  )

  const VoteComponent = () => {
    switch (mission.form) {
      case "binary":
        return <MultiVotePage mission={mission} />
      case "multi":
        return <MultiVotePage mission={mission} />
      case "match":
        return <MatchVotePage mission={mission} />
      default:
        return (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">지원하지 않는 투표 형식입니다</p>
            <Link href="/">
              <Button>홈으로 돌아가기</Button>
            </Link>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SidebarNav />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-gray-200 h-16">
            <div className="container mx-auto px-4 lg:px-8 h-full">
              <div className="flex items-center justify-center h-full relative">
                <div className="absolute left-0 flex items-center">
                  <Link href="/">
                    <img
                      src="/realpick-logo.png"
                      alt="RealPick"
                      className="w-auto h-32 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </Link>
                </div>

                <div className="flex items-center gap-6">
                  <button
                    className={`text-xl font-semibold transition-colors ${
                      selectedShow === "나는솔로"
                        ? "text-pink-600 hover:text-pink-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setSelectedShow("나는솔로")}
                  >
                    나는솔로
                  </button>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <button
                    className={`text-xl font-semibold transition-colors ${
                      selectedShow === "돌싱글즈"
                        ? "text-pink-600 hover:text-pink-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setSelectedShow("돌싱글즈")}
                  >
                    돌싱글즈
                  </button>
                </div>

                <div className="absolute right-0 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">
                      <span className="underline">{userNickname}</span>님
                    </span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-gray-900">{userPoints.toLocaleString()}P</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-pink-600 font-medium">{userTier.name}</span>
                  </div>
                  <Avatar
                    className="w-12 h-12 rounded-full bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    <AvatarImage src={userTier.characterImage || "/placeholder.svg"} alt={userTier.name} />
                    <AvatarFallback>{userTier.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden">
            <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">미션을 불러오는 중...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SidebarNav />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-gray-200 h-16">
            <div className="container mx-auto px-4 h-full">
              <div className="flex items-center justify-between h-full gap-2">
                <Link href="/" className="flex-shrink-0">
                  <img
                    src="/realpick-logo.png"
                    alt="RealPick"
                    className="w-auto h-10 md:h-12 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </Link>

                <div className="flex items-center gap-2 md:gap-4 text-xs md:text-base flex-shrink-0">
                  <button
                    className={`font-semibold transition-colors ${
                      selectedShow === "나는솔로"
                        ? "text-pink-600 hover:text-pink-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setSelectedShow("나는솔로")}
                  >
                    나는솔로
                  </button>
                  <div className="w-px h-4 md:h-6 bg-gray-300"></div>
                  <button
                    className={`font-semibold transition-colors ${
                      selectedShow === "돌싱글즈"
                        ? "text-pink-600 hover:text-pink-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setSelectedShow("돌싱글즈")}
                  >
                    돌싱글즈
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">{userNickname}</span>
                    <span className="text-gray-400">|</span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-gray-900">{userPoints.toLocaleString()}P</span>
                  </div>
                  <div className="md:hidden flex items-center gap-1 text-xs">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{(userPoints / 1000).toFixed(1)}K</span>
                  </div>
                  <Avatar
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    <AvatarImage src={userTier.characterImage || "/placeholder.svg"} alt={userTier.name} />
                    <AvatarFallback>{userTier.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden">
            <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">{error || "미션을 찾을 수 없습니다"}</p>
                <Link href="/">
                  <Button>홈으로 돌아가기</Button>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNav />
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

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <VoteComponent />
          </div>
        </main>
      </div>
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        nickname={userNickname}
        onNicknameChange={setUserNickname}
      />
      <BottomNavigation />
    </div>
  )
}
