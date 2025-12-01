"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/c-ui/avatar"
import { Progress } from "@/components/c-ui/progress"
import { useRouter } from "next/navigation"
import { Share2, Trophy, Users, Clock, TrendingUp, Check, ArrowLeft, Crown, FileText } from "lucide-react"
import Link from "next/link"
import { MockVoteRepo, generateMockUserRanking } from "@/lib/mock-vote-data"
import { getMission, getMission2 } from "@/lib/supabase/missions"
import { getVote1 } from "@/lib/supabase/votes"
import { getUserId } from "@/lib/auth-utils"
import type { TMission } from "@/types/t-vote/vote.types"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { getTimeRemaining, isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import MyPicksModal from "@/components/c-my-picks-modal/my-picks-modal"
import { ResultCharacterPopup } from "@/components/c-result-character-popup/result-character-popup"
import { getRandomComment } from "@/lib/utils/u-comment-generator/commentGenerator.util"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { isAuthenticated } from "@/lib/auth-utils"
import { getUser } from "@/lib/supabase/users"
import type { TTierInfo } from "@/types/t-tier/tier.types"

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [mission, setMission] = useState<TMission | null>(null)
  const [userVote, setUserVote] = useState<any>(null)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)
  const [successComment, setSuccessComment] = useState<string>("")
  const [showCharacterPopup, setShowCharacterPopup] = useState(false)
  const [characterPopupType, setCharacterPopupType] = useState<"predict" | "majority" | "match">("predict")
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [selectedSeason, setSelectedSeason] = useState<string>("전체")
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [isMyPicksModalOpen, setIsMyPicksModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const handleSeasonSelect = (season: string) => {
    setSelectedSeason(season)
  }

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
        // 비로그인 상태일 때 기본값
        setUserNickname("")
        setUserPoints(0)
        setUserTier(getTierFromPoints(0))
      }
    }

    loadUserData()

    // 인증 상태 변경 감지
    const handleAuthChange = () => {
      loadUserData()
    }

    window.addEventListener("auth-change", handleAuthChange)
    window.addEventListener("storage", handleAuthChange)

    return () => {
      window.removeEventListener("auth-change", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
    }
  }, [])

  useEffect(() => {
    const fetchMission = async () => {
      try {
        setLoading(true)

        // 먼저 t_missions2에서 커플매칭 미션 가져오기
        const coupleResult = await getMission2(params.id)
        let missionData: TMission | null = null

        if (coupleResult.success && coupleResult.mission) {
          // t_missions2 데이터를 TMission 형태로 변환
          missionData = {
            id: coupleResult.mission.f_id,
            title: coupleResult.mission.f_title,
            kind: coupleResult.mission.f_kind,
            form: "match",
            seasonType: coupleResult.mission.f_season_type || "전체",
            seasonNumber: coupleResult.mission.f_season_number || undefined,
            options: coupleResult.mission.f_match_pairs, // TMatchPairs 형식
            deadline: coupleResult.mission.f_deadline,
            revealPolicy: coupleResult.mission.f_reveal_policy,
            status: coupleResult.mission.f_status,
            episodes: coupleResult.mission.f_total_episodes || 8,
            episodeStatuses: coupleResult.mission.f_episode_statuses || {}, // 누락된 필드 추가
            finalAnswer: coupleResult.mission.f_final_answer || undefined,
            stats: {
              participants: coupleResult.mission.f_stats_participants || 0
            },
            result: {
              distribution: {},
              finalAnswer: coupleResult.mission.f_final_answer || undefined
            },
            createdAt: coupleResult.mission.f_created_at
          }
        } else {
          // t_missions2에 없으면 t_missions1에서 미션 데이터 가져오기
          const result = await getMission(params.id)

          if (result.success && result.mission) {
            // Supabase 데이터를 TMission 형태로 변환
            missionData = {
              id: result.mission.f_id,
              title: result.mission.f_title,
              kind: result.mission.f_kind,
              form: result.mission.f_form,
              seasonType: result.mission.f_season_type || "전체",
              seasonNumber: result.mission.f_season_number || undefined,
              options: result.mission.f_options || [],
              subjectivePlaceholder: result.mission.f_subjective_placeholder || undefined,
              deadline: result.mission.f_deadline,
              revealPolicy: result.mission.f_reveal_policy,
              status: result.mission.f_status,
              stats: {
                participants: result.mission.f_stats_participants || 0,
                totalVotes: result.mission.f_stats_total_votes || 0
              },
              result: {
                distribution: result.mission.f_option_vote_counts || {},
                correct: result.mission.f_correct_answer || undefined,
                majority: result.mission.f_majority_option || undefined
              },
              createdAt: result.mission.f_created_at
            }
          } else {
            // Supabase에 없으면 Mock 데이터에서 시도
            missionData = MockVoteRepo.getMission(params.id)
          }
        }

        // 로그인 상태일 때만 사용자 투표 데이터 가져오기
        const userId = getUserId() || "user123"
        let userVoteData = null

        if (isAuthenticated() && missionData) {
          // 실제 DB에서 투표 데이터 가져오기
          if (missionData.form === "binary" || missionData.form === "multi" || missionData.form === "subjective") {
            try {
              const voteResult = await getVote1(userId, params.id)
              if (voteResult) {
                userVoteData = {
                  choice: voteResult.choice,
                  submittedAt: voteResult.submittedAt
                }
              }
            } catch (error) {
              console.error("투표 데이터 조회 실패:", error)
              // 에러가 발생해도 계속 진행
            }
          } else if (missionData.form === "match") {
            // 커플매칭은 t_pickresult2에서 가져오기
            const { getAllVotes2 } = await import("@/lib/supabase/votes")
            const votes = await getAllVotes2(userId, params.id)
            if (votes && votes.length > 0) {
              // 모든 에피소드의 투표를 predictions 형식으로 변환
              const predictions: Record<string, Array<{ left: string; right: string }>> = {}
              votes.forEach((vote) => {
                if (vote.episodeNo && vote.pairs) {
                  predictions[`${vote.episodeNo}`] = vote.pairs
                }
              })
              userVoteData = {
                predictions,
                pairs: votes[0]?.pairs || [],
                submittedAt: votes[0]?.submittedAt
              }
            }
          }
        }

        if (missionData) {
          setMission(missionData)
          setUserVote(userVoteData)

          let success = false
          let commentType: "predict-success" | "predict-fail" | "majority-success" | "majority-fail" = "predict-fail"
          let popupType: "predict" | "majority" | "match" = "predict"

          // ⭐ 마감된 미션에만 성공/실패 판단
          let isMissionClosed = missionData.deadline ? isDeadlinePassed(missionData.deadline) : missionData.status === "settled"

          // 커플 매칭 미션의 경우 모든 회차가 settled 상태이면 마감으로 간주
          if (missionData.form === "match" && !isMissionClosed) {
            const episodeStatuses = missionData.episodeStatuses || {}
            const totalEpisodes = missionData.episodes || 8
            let allEpisodesSettled = true
            for (let i = 1; i <= totalEpisodes; i++) {
              if (episodeStatuses[i] !== "settled") {
                allEpisodesSettled = false
                break
              }
            }
            isMissionClosed = allEpisodesSettled
          }

          if (userVoteData && isMissionClosed) {
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

          // ⭐ 성공/실패 판단과 팝업은 마감된 미션에만 표시
          if (isMissionClosed) {
            setIsSuccess(success)
            setCharacterPopupType(popupType)
            setShowCharacterPopup(true)

            const missionType = missionData.kind === "predict" ? "prediction" : "majority"
            const comment = getRandomComment("user123", params.id, missionType, success)
            setSuccessComment(comment)
          }
        }
      } catch (error) {
        console.error("미션 로딩 에러:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMission()
  }, [params.id])

  if (loading || !mission) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SidebarNavigation
          selectedShow={selectedShow}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={handleSeasonSelect}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
        />
        <div className="flex-1 flex flex-col">
          <AppHeader
            selectedShow={selectedShow}
            onShowChange={setSelectedShow}
            userNickname={userNickname}
            userPoints={userPoints}
            userTier={userTier}
            onAvatarClick={() => router.push("/p-profile")}
          />
          <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden">
            <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">결과를 불러오는 중...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const mockUserPredictions = {
    1: [
      { left: "광수", right: "영순" },
      { left: "영수", right: "정숙" },
    ],
    3: [{ left: "영호", right: "순자" }],
  }

  // 렌더링 시점에 마감 여부 재계산 (커플 매칭 고려)
  let isMissionClosed = false

  if (mission.form === "match") {
    // 커플 매칭: status가 settled이거나 모든 회차가 settled면 마감
    if (mission.status === "settled") {
      isMissionClosed = true
    } else {
      const episodeStatuses = mission.episodeStatuses || {}
      const totalEpisodes = mission.episodes || 8
      let allEpisodesSettled = true
      for (let i = 1; i <= totalEpisodes; i++) {
        if (episodeStatuses[i] !== "settled") {
          allEpisodesSettled = false
          break
        }
      }
      isMissionClosed = allEpisodesSettled
    }
  } else {
    // 일반 미션: 마감 시간이 지났거나 상태가 settled인 경우
    isMissionClosed = mission.deadline ? isDeadlinePassed(mission.deadline) : mission.status === "settled"
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
        {showCharacterPopup && userVote && (
          <ResultCharacterPopup
            isSuccess={isSuccess}
            missionType={characterPopupType}
            comment={successComment}
            missionId={params.id}
          />
        )}

      <div className="flex-1 flex flex-col">
        <AppHeader
          selectedShow={selectedShow}
          onShowChange={setSelectedShow}
          userNickname={userNickname}
          userPoints={userPoints}
          userTier={userTier}
          onAvatarClick={() => router.push("/p-profile")}
        />

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
                  {
                    mission.form === "match" && mission.status === "settled" && mission.finalAnswer && (
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
                    )
                  }
                </div >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={!isMissionClosed ? "default" : "secondary"} className="text-sm">
                    {!isMissionClosed ? "진행중" : "마감됨"}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold text-gray-900">
                      {mission.stats?.participants?.toLocaleString() || 0}
                    </span>
                    명 참여
                  </div>
                  {mission.revealPolicy === "realtime" && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>실시간 집계</span>
                    </div>
                  )}
                  {!isMissionClosed && mission.deadline && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{getTimeRemaining(mission.deadline)}</span>
                    </div>
                  )}
                </div>
              </div >

              {userVote && successComment && mission.deadline && isDeadlinePassed(mission.deadline) && (
                <Card
                  className={`border-2 ${isSuccess
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
              )
              }

              {
                !(mission.form === "match" && mission.status === "settled") && (
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
                )
              }

              {
                mission.form === "match" && mission.status === "settled" && mission.finalAnswer && (
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
                              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${user.isCurrentUser
                                ? "bg-blue-50 border-2 border-blue-200"
                                : "bg-gray-50 hover:bg-gray-100"
                                }`}
                            >
                              <div
                                className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold ${user.rank === 1
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
                )
              }

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
            </div >
          </div >
        </main >
      </div >

      <BottomNavigation />

      <SidebarNavigation
        selectedShow={selectedShow}
        selectedSeason={selectedSeason}
        isMissionStatusOpen={isMissionStatusOpen}
        onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
        onSeasonSelect={handleSeasonSelect}
        onMissionModalOpen={() => setIsMissionModalOpen(true)}
      />

      {
        mission.form === "match" && mission.finalAnswer && (
          <MyPicksModal
            isOpen={isMyPicksModalOpen}
            onClose={() => setIsMyPicksModalOpen(false)}
            userPredictions={mockUserPredictions}
            finalAnswer={mission.finalAnswer}
          />
        )
      }
      </div>
    </div >
  )
}

function ResultsChart({ mission, userVote }: { mission: TMission; userVote: any }) {
  if (!mission.result?.distribution) return null

  // 마감 여부 확인
  let isClosed = mission.deadline ? isDeadlinePassed(mission.deadline) : mission.status === "settled"

  // 커플 매칭 미션의 경우 모든 회차가 settled 상태이면 마감으로 간주
  if (mission.form === "match" && !isClosed) {
    const episodeStatuses = mission.episodeStatuses || {}
    const totalEpisodes = mission.episodes || 8
    let allEpisodesSettled = true
    for (let i = 1; i <= totalEpisodes; i++) {
      if (episodeStatuses[i] !== "settled") {
        allEpisodesSettled = false
        break
      }
    }
    isClosed = allEpisodesSettled
  }

  // 마감 후 공개(onClose)인 경우, 마감되지 않았으면 결과를 숨김
  const shouldHideResults = mission.revealPolicy === "onClose" && !isClosed

  const entries = Object.entries(mission.result.distribution).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-4">
      {entries.map(([option, percentage], index) => {
        const isUserChoice = isAuthenticated() && (
          mission.form === "match"
            ? userVote?.pairs?.some((p: any) => `${p.left}-${p.right}` === option)
            : userVote?.choice === option
        )

        // 정답인 항목 확인
        const isCorrect = mission.kind === "predict" && mission.result?.correct === option

        return (
          <div
            key={option}
            className={`p-4 rounded-lg border-2 transition-all ${isCorrect
              ? "border-emerald-400 bg-emerald-50 shadow-md ring-2 ring-emerald-200"
              : isUserChoice
                ? "border-purple-200 bg-purple-50"
                : "border-gray-200 bg-gray-50"
              }`}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge
                  variant="outline"
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? "bg-emerald-500 text-white border-emerald-600" : ""
                    }`}
                >
                  {index + 1}
                </Badge>
                <span className={`font-medium truncate ${isCorrect
                  ? "text-emerald-700 font-bold"
                  : isUserChoice
                    ? "text-purple-700"
                    : "text-foreground"
                  }`}>
                  {option}
                </span>
                {isCorrect && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-emerald-500 text-white border-emerald-600 flex items-center gap-1 flex-shrink-0"
                  >
                    <Check className="w-3 h-3" />정답
                  </Badge>
                )}
                {isUserChoice && !isCorrect && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1 flex-shrink-0"
                  >
                    <Check className="w-3 h-3" />내 선택
                  </Badge>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {shouldHideResults ? (
                  <span className="text-3xl text-gray-400">?</span>
                ) : (
                  <>
                    <span className="text-lg font-bold">{percentage}%</span>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((percentage / 100) * (mission.stats?.participants || 0)).toLocaleString()}표
                    </p>
                  </>
                )}
              </div>
            </div>
            {!shouldHideResults && (
              <Progress
                value={percentage}
                className={`h-3 ${isCorrect
                  ? "bg-emerald-100 [&>div]:bg-emerald-500"
                  : isUserChoice
                    ? "bg-purple-100 [&>div]:bg-purple-500"
                    : ""
                  }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
