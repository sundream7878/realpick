"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"
import {
  Share2,
  Trophy,
  Users,
  Clock,
  TrendingUp,
  Star,
  Plus,
  Home,
  User,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowLeft,
  Crown,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { MockVoteRepo, generateMockUserRanking } from "@/lib/mock-vote-data"
import type { Mission } from "@/lib/vote-types"
import { getTierFromPoints } from "@/lib/tier-system"
import ProfileModal from "@/components/profile-modal"
import MyPicksModal from "@/components/my-picks-modal"
import { ResultCharacterPopup } from "@/components/result-character-popup"
import { getRandomComment } from "@/lib/comment-generator"
import { BottomNavigation } from "@/components/bottom-navigation"

function getGradeFromPoints(points: number): string {
  if (points >= 5000) return "연애고수"
  if (points >= 3000) return "연애중수"
  if (points >= 2000) return "연애초보"
  if (points >= 1000) return "썸"
  if (points >= 500) return "짝사랑"
  if (points >= 200) return "솔로"
  return "모솔"
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [mission, setMission] = useState<Mission | null>(null)
  const [userVote, setUserVote] = useState<any>(null)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)
  const [successComment, setSuccessComment] = useState<string>("")
  const [showCharacterPopup, setShowCharacterPopup] = useState(false)
  const [characterPopupType, setCharacterPopupType] = useState<"predict" | "majority" | "match">("predict")
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [userNickname, setUserNickname] = useState("Sundream")
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isMyPicksModalOpen, setIsMyPicksModalOpen] = useState(false)
  const router = useRouter()

  const userPoints = 1250
  const userTier = getTierFromPoints(userPoints)

  useEffect(() => {
    const missionData = MockVoteRepo.getMission(params.id)
    const userVoteData = MockVoteRepo.getUserVote("user123", params.id)

    if (missionData) {
      setMission(missionData)
      setUserVote(userVoteData)

      let success = false
      let commentType: "predict-success" | "predict-fail" | "majority-success" | "majority-fail" = "predict-fail"
      let popupType: "predict" | "majority" | "match" = "predict"

      if (userVoteData) {
        if (missionData.kind === "predict") {
          if (missionData.form === "match" && missionData.finalAnswer) {
            const userPredictions = userVoteData.predictions || {}
            let hasCorrectPrediction = false

            for (const round in userPredictions) {
              const roundPredictions = userPredictions[round]
              for (const prediction of roundPredictions) {
                const predictionStr = `${prediction.left}-${prediction.right}`
                if (missionData.finalAnswer.some((couple) => `${couple.left}-${couple.right}` === predictionStr)) {
                  hasCorrectPrediction = true
                  break
                }
              }
              if (hasCorrectPrediction) break
            }

            success = hasCorrectPrediction
            popupType = "match"
          } else if (missionData.form === "match") {
            success =
              userVoteData.pairs?.some((p: any) => `${p.left}-${p.right}` === missionData.result?.correct) || false
            popupType = "predict"
          } else {
            success = userVoteData.choice === missionData.result?.correct
            popupType = "predict"
          }
          commentType = success ? "predict-success" : "predict-fail"
        } else if (missionData.kind === "majority") {
          if (missionData.form === "match") {
            success =
              userVoteData.pairs?.some((p: any) => `${p.left}-${p.right}` === missionData.result?.majority) || false
          } else {
            success = userVoteData.choice === missionData.result?.majority
          }
          commentType = success ? "majority-success" : "majority-fail"
          popupType = "majority"
        }
      }

      setIsSuccess(success)
      setCharacterPopupType(popupType)
      setShowCharacterPopup(true)

      const missionType = missionData.kind === "predict" ? "prediction" : "majority"
      const comment = getRandomComment("user123", params.id, missionType, success)
      setSuccessComment(comment)
    }
  }, [params.id])

  if (!mission) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  const mockUserPredictions = {
    1: [
      { left: "광수", right: "영순" },
      { left: "영수", right: "정숙" },
    ],
    2: [
      { left: "광수", right: "영순" },
      { left: "상철", right: "현숙" },
    ],
    3: [{ left: "영호", right: "순자" }],
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showCharacterPopup && userVote && (
        <ResultCharacterPopup
          isSuccess={isSuccess}
          missionType={characterPopupType}
          comment={successComment}
          missionId={params.id}
        />
      )}

      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block fixed h-full z-40 top-16">
        <div className="p-6">
          <nav className="space-y-2">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-gray-50">
                <Home className="w-5 h-5" />홈
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-gray-50"
                onClick={() => setIsMissionModalOpen(true)}
              >
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
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate flex-1">{mission.title}</h1>
                  {mission.form === "match" && mission.status === "settled" && mission.finalAnswer && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMyPicksModalOpen(true)}
                      className="flex items-center gap-2 flex-shrink-0"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">내가 픽한 결과</span>
                      <span className="sm:hidden">내 픽</span>
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={mission.status === "open" ? "default" : "secondary"} className="text-sm">
                    {mission.status === "open" ? "진행중" : "완료"}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold text-gray-900">
                      {mission.stats?.participants?.toLocaleString() || 0}
                    </span>
                    명 참여
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>실시간 집계</span>
                  </div>
                  {mission.status === "open" && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>2시간 15분 남음</span>
                    </div>
                  )}
                </div>
              </div>

              {userVote && successComment && (
                <Card
                  className={`border-2 ${
                    isSuccess
                      ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
                      : "border-red-200 bg-gradient-to-r from-red-50 to-rose-50"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isSuccess ? "bg-green-500" : "bg-red-500"}`}>
                        <Trophy className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3
                          className={`font-semibold text-sm ${isSuccess ? "text-green-700" : "text-red-700"}`}
                          style={{ color: isSuccess ? "#22C55E" : "#EF4444" }}
                        >
                          {mission.kind === "predict"
                            ? isSuccess
                              ? "예측픽 성공!"
                              : "예측픽 실패"
                            : isSuccess
                              ? "다수픽 성공!"
                              : "다수픽 실패"}
                        </h3>
                        <p
                          className={`text-sm ${isSuccess ? "text-green-600" : "text-red-600"}`}
                          style={{ color: isSuccess ? "#22C55E" : "#EF4444" }}
                        >
                          {successComment}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!(mission.form === "match" && mission.status === "settled") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">투표 결과</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {mission.status === "open" ? "실시간 중간 결과" : "최종 결과"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResultsChart mission={mission} userVote={userVote} />
                  </CardContent>
                </Card>
              )}

              {mission.form === "match" && mission.status === "settled" && mission.finalAnswer && (
                <>
                  <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-pink-600" />
                        최종 커플 결과
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">모든 회차가 종료되어 최종 커플이 확정되었습니다</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mission.finalAnswer.map((couple, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-lg border-2 border-pink-200"
                          >
                            <span className="font-semibold text-base sm:text-lg truncate">{couple.left}</span>
                            <span className="text-pink-600 text-lg sm:text-xl flex-shrink-0">💕</span>
                            <span className="font-semibold text-base sm:text-lg truncate">{couple.right}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Crown className="w-6 h-6 text-amber-500" />
                        참여자 랭킹
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">회차별 정답 예측에 따른 누적 점수 순위입니다</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {generateMockUserRanking(mission.finalAnswer, mission.stats?.participants || 0).map((user) => (
                          <div
                            key={user.rank}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                              user.isCurrentUser
                                ? "bg-blue-50 border-2 border-blue-200"
                                : "bg-gray-50 hover:bg-gray-100"
                            }`}
                          >
                            <div
                              className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold ${
                                user.rank === 1
                                  ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                                  : user.rank === 2
                                    ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                                    : user.rank === 3
                                      ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white"
                                      : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {user.rank}
                            </div>

                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                              <AvatarImage src={user.tierInfo.characterImage || "/placeholder.svg"} />
                              <AvatarFallback>{user.nickname[0]}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm sm:text-base truncate">{user.nickname}</span>
                                {user.isCurrentUser && (
                                  <Badge className="bg-blue-500 text-white text-xs flex-shrink-0">나</Badge>
                                )}
                                {user.tierUpgraded && (
                                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs flex-shrink-0">
                                    등급 UP!
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <span className="text-pink-600 font-medium truncate">{user.tierInfo.name}</span>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="font-bold text-base sm:text-lg text-amber-600">{user.totalScore}점</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">통계</CardTitle>
                </CardHeader>
                <CardContent>
                  {mission.form === "match" && mission.status === "settled" && mission.finalAnswer ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {mission.stats?.participants?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">총 참여자</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {(() => {
                            const ranking = generateMockUserRanking(
                              mission.finalAnswer,
                              mission.stats?.participants || 0,
                            )
                            const successfulUsers = ranking.filter((u) => u.correctRounds.length > 0).length
                            const percentage = Math.round((successfulUsers / ranking.length) * 100)
                            return `${percentage}%`
                          })()}
                        </p>
                        <p className="text-sm text-muted-foreground">최종 커플 예측 성공</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {(() => {
                            const ranking = generateMockUserRanking(
                              mission.finalAnswer,
                              mission.stats?.participants || 0,
                            )
                            const upgradedUsers = ranking.filter((u) => u.tierUpgraded).length
                            const percentage = Math.round((upgradedUsers / ranking.length) * 100)
                            return `${percentage}%`
                          })()}
                        </p>
                        <p className="text-sm text-muted-foreground">등급 업그레이드</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {mission.stats?.participants?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">총 참여자</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-accent">
                          {mission.options?.length || Object.keys(mission.result?.distribution || {}).length}
                        </p>
                        <p className="text-sm text-muted-foreground">선택지</p>
                      </div>
                      <div className="text-center p-4 bg-primary/5 rounded-lg">
                        <p className="text-lg font-bold text-primary">
                          {Object.values(mission.result?.distribution || {})[0] || 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">1위 득표율</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700" variant="default">
                  <Share2 className="w-4 h-4 mr-2" />
                  결과 공유하기
                </Button>
                <Link href="/" className="block">
                  <Button size="lg" className="w-full bg-transparent" variant="outline">
                    다른 미션 보기
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNavigation />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        nickname={userNickname}
        onNicknameChange={setUserNickname}
      />

      {mission.form === "match" && mission.finalAnswer && (
        <MyPicksModal
          isOpen={isMyPicksModalOpen}
          onClose={() => setIsMyPicksModalOpen(false)}
          userPredictions={mockUserPredictions}
          finalAnswer={mission.finalAnswer}
        />
      )}
    </div>
  )
}

function ResultsChart({ mission, userVote }: { mission: Mission; userVote: any }) {
  if (!mission.result?.distribution) return null

  const entries = Object.entries(mission.result.distribution).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-4">
      {entries.map(([option, percentage], index) => {
        const isUserChoice =
          mission.form === "match"
            ? userVote?.pairs?.some((p: any) => `${p.left}-${p.right}` === option)
            : userVote?.choice === option

        return (
          <div
            key={option}
            className={`p-4 rounded-lg border-2 transition-all ${
              isUserChoice ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge
                  variant="outline"
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  {index + 1}
                </Badge>
                <span className={`font-medium truncate ${isUserChoice ? "text-blue-700" : "text-foreground"}`}>
                  {option}
                </span>
                {isUserChoice && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 flex-shrink-0"
                  >
                    <Check className="w-3 h-3" />내 선택
                  </Badge>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold">{percentage}%</span>
                <p className="text-xs text-muted-foreground">
                  {Math.round((percentage / 100) * (mission.stats?.participants || 0)).toLocaleString()}표
                </p>
              </div>
            </div>
            <Progress value={percentage} className={`h-3 ${isUserChoice ? "bg-blue-100" : ""}`} />
          </div>
        )
      })}
    </div>
  )
}
