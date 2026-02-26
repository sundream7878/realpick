"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/c-ui/avatar"
import { Progress } from "@/components/c-ui/progress"
import { useRouter } from "next/navigation"
import { Share2, Trophy, Users, Clock, TrendingUp, Check, ArrowLeft, Crown, FileText, XCircle, CheckCircle2, Heart, Trash2, ExternalLink, Star } from "lucide-react"
import Link from "next/link"
import { MockVoteRepo, generateMockUserRanking } from "@/lib/mock-vote-data"
import { getMissionById } from "@/lib/firebase/missions"
import { getVote1 } from "@/lib/firebase/votes"
import { getUserId } from "@/lib/auth-utils"
import { auth } from "@/lib/firebase/config"
import type { TMission } from "@/types/t-vote/vote.types"
import { getTierFromPoints, getTierFromDbOrPoints, TIERS } from "@/lib/utils/u-tier-system/tierSystem.util"
import { desanitizeVoteCounts } from "@/lib/utils/sanitize-firestore-key"
import { getTimeRemaining, isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import MyPicksModal from "@/components/c-my-picks-modal/my-picks-modal"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import { ResultCharacterPopup } from "@/components/c-result-character-popup/result-character-popup"
import { getRandomComment } from "@/lib/utils/u-comment-generator/commentGenerator.util"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { BannerAd } from "@/components/c-banner-ad/banner-ad"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { CommentSection } from "@/components/c-comment/CommentSection"
import { isAuthenticated } from "@/lib/auth-utils"
import { getUser } from "@/lib/firebase/users"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { ShareModal } from "@/components/c-share-modal/share-modal"
import { isAdmin } from "@/lib/utils/permissions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/c-ui/alert-dialog"

import { calculatePotentialPoints } from "@/lib/utils/u-points/pointSystem.util"
import { getShowByName, getShowById, normalizeShowId } from "@/lib/constants/shows"
import { isYoutubeUrl, getYoutubeEmbedUrl } from "@/lib/utils/u-media/youtube.util"

function calculateEarnedPoints(mission: TMission, userVote: any): number {
  if (mission.kind === 'majority' || (mission as any).kind === 'poll') return 10;
  if (!mission.result?.correctAnswer) return 0;

  if (mission.form === 'multi' || mission.submissionType === 'text') {
    let correctAnswers: string[] = [];
    try {
      const parsed = JSON.parse(mission.result.correctAnswer);
      correctAnswers = Array.isArray(parsed) ? parsed : [mission.result.correctAnswer];
    } catch {
      correctAnswers = [mission.result.correctAnswer as string];
    }

    let userAnswers: string[] = [];
    if (Array.isArray(userVote?.choice)) {
      userAnswers = userVote.choice;
    } else if (typeof userVote?.choice === 'string') {
      try {
        const parsed = JSON.parse(userVote.choice);
        userAnswers = Array.isArray(parsed) ? parsed : [userVote.choice];
      } catch {
        userAnswers = [userVote.choice];
      }
    }

    let correctCount = 0;
    let incorrectCount = 0;
    userAnswers.forEach(ans => {
      if (correctAnswers.includes(ans)) correctCount++;
      else incorrectCount++;
    });

    return (correctCount * 100) - (incorrectCount * 50);
  } else {
    // Binary / Single
    return userVote?.choice === mission.result.correctAnswer ? 100 : -50;
  }
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [mission, setMission] = useState<TMission | null>(null)
  const [userVote, setUserVote] = useState<any>(null)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)
  const [successComment, setSuccessComment] = useState<string>("")
  const [showCharacterPopup, setShowCharacterPopup] = useState(false)
  const [characterPopupType, setCharacterPopupType] = useState<"predict" | "majority" | "match">("predict")
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedShowId, setSelectedShowId] = useState<string>("nasolo")
  const [selectedSeason, setSelectedSeason] = useState<string>("전체")
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [isMyPicksModalOpen, setIsMyPicksModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPromotingMain, setIsPromotingMain] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [ranking, setRanking] = useState<any[]>([])
  const userId = getUserId()
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  const [aggregatedResults, setAggregatedResults] = useState<Record<string, number>>({})
  const [totalParticipants, setTotalParticipants] = useState<number>(0)
  const [loadingResults, setLoadingResults] = useState(false)

  // Show Statuses, Visibility, Custom Shows Fetching & Sync
  const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
  const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
  const [customShows, setCustomShows] = useState<any[]>([])

  // 🔔 미션 읽음 처리 (페이지 진입 시)
  useEffect(() => {
    if (params.id) {
      // 읽음 처리 이벤트 발생
      window.dispatchEvent(new CustomEvent('mark-missions-as-read', {
        detail: { missionIds: [params.id] }
      }))
      console.log('[Notification] 미션 읽음 처리:', params.id)
    }
  }, [params.id])

  useEffect(() => {
    const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
    const cleanup = setupShowStatusSync(
      setShowStatuses,
      setShowVisibility,
      setCustomShows
    )
    return cleanup
  }, [])

  // 시즌 선택 핸들러
  const handleSeasonSelect = (season: string) => {
    setSelectedSeason(season)
  }

  // 사용자 정보 및 권한 확인
  useEffect(() => {
    const fetchUserInfo = async () => {
      const currentUserId = getUserId()
      if (currentUserId && isAuthenticated()) {
        try {
          const user = await getUser(currentUserId)
          if (user) {
            setUserNickname(user.nickname || "")
            setUserPoints(user.points || 0)
            setUserTier(getTierFromDbOrPoints(user.tier, user.points))
            setUserRole(user.role || null)
            setIsAdminUser(isAdmin(user.role))
          }
        } catch (error) {
          console.error("사용자 정보 조회 실패:", error)
        }
      }
    }
    fetchUserInfo()
  }, [])

  const handlePromoteToMain = async () => {
    if (!mission) {
      alert("미션 정보가 없습니다.")
      return
    }

    if (!confirm(`"${mission.title}"을(를) 메인 미션으로 승격하시겠습니까?`)) {
      return
    }

    setIsPromotingMain(true)
    try {
      const { setMainMissionId } = await import("@/lib/firebase/admin-settings")
      const success = await setMainMissionId(mission.id)
      
      if (success) {
        alert("메인 미션으로 승격되었습니다!")
      } else {
        throw new Error("메인 미션 설정에 실패했습니다.")
      }
    } catch (error: any) {
      console.error("메인 미션 승격 실패:", error)
      alert(`메인 미션 승격에 실패했습니다: ${error.message || "알 수 없는 오류"}`)
    } finally {
      setIsPromotingMain(false)
    }
  }

  const handleDeleteMission = async () => {
    const currentUserId = getUserId()
    if (!mission || !currentUserId) {
      alert("미션 정보 또는 사용자 정보가 없습니다.")
      return
    }

    setIsDeleting(true)
    try {
      // 커플 매칭, 일반 미션, AI 미션 구분
      let missionType = "mission1"
      if (mission.form === "match") {
        missionType = "mission2"
      } else if ((mission as any).isAIMission) {
        missionType = "ai_mission" // AI 미션은 명시적으로 ai_mission으로 전달
      }
      
      console.log("미션 삭제 시도:", { missionId: mission.id, missionType, userId: currentUserId, isAIMission: (mission as any).isAIMission })
      
      // Firebase 인증 토큰 가져오기
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error("인증 토큰을 가져올 수 없습니다. 다시 로그인해주세요.")
      }
      
      const response = await fetch(`/api/missions/delete?missionId=${mission.id}&missionType=${missionType}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log("삭제 응답:", response.status, data)

      if (!response.ok) {
        const errorMessage = data.details || data.error || "미션 삭제에 실패했습니다."
        throw new Error(errorMessage)
      }

      // 삭제 성공 시 해당 프로그램 페이지로 이동
      alert("미션이 성공적으로 삭제되었습니다.")
      const { normalizeShowId } = await import("@/lib/constants/shows")
      const redirectShowId = normalizeShowId(mission.showId) || "nasolo"
      router.push(`/?show=${redirectShowId}`)
    } catch (error: any) {
      console.error("미션 삭제 실패:", error)
      alert(`미션 삭제에 실패했습니다: ${error.message || "알 수 없는 오류"}`)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  useEffect(() => {
    const fetchMission = async () => {
      try {
        setLoading(true)

        // 통합 미션 조회 함수 사용 (병렬 처리로 더 빠름)
        const result = await getMissionById(params.id)
        
        let missionData: TMission | null = null

        if (result.success && result.mission) {
          const rawMission = result.mission
          const isCouple = rawMission.__table === "missions2"

          if (isCouple) {
            missionData = {
              id: rawMission.id,
              title: rawMission.title,
              kind: rawMission.kind,
              form: "match",
              seasonType: rawMission.seasonType || "전체",
              seasonNumber: rawMission.seasonNumber || undefined,
              options: rawMission.matchPairs,
              deadline: rawMission.deadline,
              revealPolicy: rawMission.revealPolicy,
              status: rawMission.status,
              episodes: rawMission.totalEpisodes || 8,
              episodeStatuses: rawMission.episodeStatuses || {},
              finalAnswer: rawMission.finalAnswer || undefined,
              stats: {
                participants: rawMission.participants || 0
              },
              result: {
                distribution: {},
                finalAnswer: rawMission.finalAnswer || undefined,
                totalVotes: rawMission.totalVotes || 0,
                ranking: rawMission.ranking || {}
              },
              createdAt: rawMission.createdAt?.toDate?.()?.toISOString() || rawMission.createdAt,
              showId: rawMission.showId,
              category: rawMission.category,
              creatorNickname: rawMission.creatorNickname,
              creatorTier: rawMission.creatorTier,
              referenceUrl: rawMission.referenceUrl,
              thumbnailUrl: rawMission.thumbnailUrl,
              description: rawMission.description,
              __table: rawMission.__table, // 테이블 정보 보존
              isAIMission: rawMission.isAIMission // AI 미션 플래그 보존
            } as any
            
            // 🏆 커플 매칭 미션의 랭킹 데이터 설정
            if (rawMission.ranking) {
              const rankingArray = Object.values(rawMission.ranking).sort((a: any, b: any) => b.score - a.score)
              setRanking(rankingArray)
              console.log('[Results Page] 랭킹 데이터 로드:', rankingArray)
            }
          } else {
            missionData = {
              id: rawMission.id,
              title: rawMission.title,
              kind: rawMission.kind,
              form: rawMission.form,
              seasonType: rawMission.seasonType || "전체",
              seasonNumber: rawMission.seasonNumber || undefined,
              options: rawMission.options || [],
              submissionType: rawMission.form === "subjective" ? "text" : (rawMission.submissionType || "selection"),
              subjectivePlaceholder: rawMission.subjectivePlaceholder || undefined,
              deadline: rawMission.deadline,
              revealPolicy: rawMission.revealPolicy,
              status: rawMission.status,
              stats: {
                participants: rawMission.participants || 0,
                totalVotes: rawMission.stats?.totalVotes || rawMission.totalVotes || 0
              },
              result: {
                distribution: rawMission.optionVoteCounts || {},
                correctAnswer: rawMission.correctAnswer || undefined,
                majorityOption: rawMission.majorityOption || undefined,
                totalVotes: rawMission.stats?.totalVotes || rawMission.totalVotes || 0
              },
              createdAt: rawMission.createdAt?.toDate?.()?.toISOString() || rawMission.createdAt,
              showId: rawMission.showId,
              category: rawMission.category,
              creatorNickname: rawMission.creatorNickname,
              creatorTier: rawMission.creatorTier,
              referenceUrl: rawMission.referenceUrl,
              thumbnailUrl: rawMission.thumbnailUrl,
              description: rawMission.description,
              __table: rawMission.__table, // 테이블 정보 보존
              isAIMission: rawMission.isAIMission // AI 미션 플래그 보존
            } as any
          }

          console.log('[Results Page] 로드된 미션 데이터:', {
            id: params.id,
            title: missionData?.title,
            participants: missionData?.stats?.participants,
            totalVotes: missionData?.stats?.totalVotes,
            optionVoteCounts: rawMission.optionVoteCounts,
            distribution: missionData?.result?.distribution
          })

          // 추가 검증: 만약 stats.totalVotes가 0인데 distribution에 데이터가 있다면 합산해서 사용
          if (missionData && missionData.stats && missionData.stats.totalVotes === 0 && missionData.result && missionData.result.distribution) {
            const dist = missionData.result.distribution;
            const sum = Object.values(dist).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
            console.log('[Results Page] stats.totalVotes가 0이지만 distribution 합계:', sum)
            if (sum > 0) {
              missionData.stats.totalVotes = sum
              missionData.result.totalVotes = sum
              console.log('[Results Page] totalVotes 업데이트:', sum)
            }
          }
        } else {
          // Firebase에 없으면 Mock 데이터에서 시도
          missionData = MockVoteRepo.getMission(params.id)
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
            // 커플매칭은 pickresult2에서 가져오기
            const { getAllVotes2 } = await import("@/lib/firebase/votes")
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
          if (missionData.showId) {
            // showId를 영어로 정규화
            const normalizedShowId = normalizeShowId(missionData.showId)
            setSelectedShowId(normalizedShowId || missionData.showId)
          }
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
                  userVoteData.pairs?.some((p: any) => `${p.left}-${p.right}` === missionData.result?.correctAnswer) || false
                popupType = "predict"
              } else {
                success = userVoteData.choice === missionData.result?.correctAnswer
                popupType = "predict"
              }
              commentType = success ? "predict-success" : "predict-fail"
            } else if (missionData.kind === "majority") {
              // 공감픽은 정답/오답 개념이 없으므로 항상 성공(참여 완료)으로 취급
              success = true
              commentType = "majority-success"
              popupType = "majority"
            }
          }

          // ⭐ 성공/실패 판단과 팝업은 마감된 미션에만 표시
          if (isMissionClosed) {
            if (missionData.status === "settled") {
              // 정산 완료된 경우: 성공/실패 팝업
              setIsSuccess(success)
              setCharacterPopupType(popupType)
              setShowCharacterPopup(true)

              const missionType = missionData.kind === "predict" ? "prediction" : "majority"
              const comment = getRandomComment("user123", params.id, missionType, success)
              setSuccessComment(comment)
            }
            // 실시간 공개가 기본이므로 "마감 후 공개" 대기 팝업 로직 제거
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

  // 🔄 실시간 결과 로드 (커플매칭용)
  useEffect(() => {
    const loadMatchResults = async () => {
      if (mission?.form === "match" && mission.status !== "settled") {
        setLoadingResults(true)
        try {
          const { getAggregatedVotes2 } = await import("@/lib/firebase/votes")
          const { pairCounts, totalParticipants } = await getAggregatedVotes2(mission.id)
          setAggregatedResults(pairCounts)
          setTotalParticipants(totalParticipants)
        } catch (error) {
          console.error("Failed to load match results:", error)
        } finally {
          setLoadingResults(false)
        }
      }
    }
    loadMatchResults()
  }, [mission?.id, mission?.form, mission?.status])

  if (loading || !mission) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SidebarNavigation
          selectedShow={selectedShowId}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={handleSeasonSelect}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
          category={getShowById(selectedShowId)?.category}
          selectedShowId={selectedShowId}
        />
        <MissionCreationModal
          isOpen={isMissionModalOpen}
          onClose={() => setIsMissionModalOpen(false)}
          initialShowId={selectedShowId}
          category={getShowById(selectedShowId)?.category}
        />
        <div className="flex-1 flex flex-col">
          <AppHeader
            selectedShow={getShowById(selectedShowId)?.name as any || "나는솔로"}
            selectedShowId={selectedShowId}
            onShowChange={(show) => {
              const showObj = getShowByName(show)
              if (showObj) setSelectedShowId(showObj.id)
            }}
            onShowSelect={(showId) => {
              if (showId) {
                // showId를 영어로 정규화
                const normalizedShowId = normalizeShowId(showId)
                router.push(`/?show=${normalizedShowId || showId}`)
              } else {
                router.push("/")
              }
            }}
            userNickname={userNickname}
            userPoints={userPoints}
            userTier={userTier}
            onAvatarClick={() => {
              const profileUrl = selectedShowId ? `/p-profile?show=${selectedShowId}` : "/p-profile"
              router.push(profileUrl)
            }}
            showStatuses={showStatuses}
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
      <MissionCreationModal
        isOpen={isMissionModalOpen}
        onClose={() => setIsMissionModalOpen(false)}
        initialShowId={selectedShowId}
        category={getShowById(selectedShowId)?.category}
      />
      <div className="max-w-5xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
        {showCharacterPopup && userVote && (
          <ResultCharacterPopup
            isSuccess={isSuccess}
            isPending={false}
            missionType={characterPopupType}
            comment={successComment}
            missionId={params.id}
          />
        )}

        <div className="flex-1 flex flex-col">
          <AppHeader
            selectedShow={getShowById(selectedShowId)?.name as any || "나는솔로"}
            selectedShowId={selectedShowId}
            onShowChange={(show) => {
              const showObj = getShowByName(show)
              if (showObj) setSelectedShowId(showObj.id)
            }}
            onShowSelect={(showId) => {
              if (showId) {
                // showId를 영어로 정규화
                const normalizedShowId = normalizeShowId(showId)
                router.push(`/?show=${normalizedShowId || showId}`)
              } else {
                router.push("/")
              }
            }}
            userNickname={userNickname}
            userPoints={userPoints}
            userTier={userTier}
            onAvatarClick={() => {
              const profileUrl = selectedShowId ? `/p-profile?show=${selectedShowId}` : "/p-profile"
              router.push(profileUrl)
            }}
            showStatuses={showStatuses}
          />

          <main className="flex-1 px-4 lg:px-8 py-6 md:ml-40 max-w-full overflow-hidden pb-32 md:pb-16 min-w-0">
            <div className="max-w-4xl mx-auto">
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h1 className="text-lg md:text-xl font-bold text-gray-900">{mission.title}</h1>
                      {/* 미션 생성자 닉네임 */}
                      {mission.creatorNickname && (
                        <div className="text-sm text-gray-600">
                          <span className="text-gray-500">생성자:</span> <span className="font-medium">{mission.creatorNickname}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdminUser && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePromoteToMain}
                            disabled={isPromotingMain}
                            className="flex items-center gap-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                          >
                            <Star className="w-4 h-4" />
                            <span className="hidden sm:inline">{isPromotingMain ? "승격 중..." : "메인 승격"}</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              // 권한 재확인
                              const currentUserId = getUserId()
                              if (currentUserId) {
                                const user = await getUser(currentUserId)
                                if (user && isAdmin(user.role)) {
                                  setIsDeleteDialogOpen(true)
                                } else {
                                  alert("관리자 권한이 필요합니다.")
                                }
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">삭제</span>
                          </Button>
                        </>
                      )}
                      {
                        mission.form === "match" && mission.status === "settled" && mission.finalAnswer && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsMyPicksModalOpen(true)}
                            className="flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:inline">내가 픽한 결과</span>
                            <span className="sm:hidden">내 픽</span>
                          </Button>
                        )
                      }
                    </div>
                  </div >
                  {/* 디버깅용: role 정보 표시 (개발 중에만) */}
                  {process.env.NODE_ENV === 'development' && userRole && (
                    <div className="text-xs text-gray-500 mb-2">
                      현재 역할: {userRole} | 관리자 여부: {isAdminUser ? '예' : '아니오'}
                    </div>
                  )}
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
                    {!isMissionClosed && mission.deadline && mission.form !== "match" && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{getTimeRemaining(mission.deadline)}</span>
                      </div>
                    )}
                  </div>
                </div >

                {userVote && successComment && mission.deadline && isDeadlinePassed(mission.deadline) && (
                  <Card
                    className={`border-2 ${mission.status !== "settled"
                      ? "border-gray-200 bg-gray-50"
                      : isSuccess
                        ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
                        : "border-red-200 bg-red-50"
                      }`}
                  >
                    <CardContent className="p-6 flex items-start gap-4">
                      {mission.status !== "settled" ? (
                        <Clock className="w-8 h-8 text-gray-400 flex-shrink-0 mt-1" />
                      ) : isSuccess ? (
                        <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                      )}
                      <div className="space-y-1">
                        <h3
                          className={`font-bold text-lg ${mission.status !== "settled"
                            ? "text-gray-700"
                            : isSuccess
                              ? "text-green-700"
                              : "text-red-700"
                            }`}
                        >
                          {mission.status !== "settled"
                            ? (mission.kind === "majority" || (mission as any).kind === "poll")
                              ? "공감픽 참여 완료 (+10P)"
                              : "결과 집계 중"
                            : mission.kind === "predict"
                              ? (() => {
                                const points = calculateEarnedPoints(mission, userVote)
                                return points > 0 ? `예측 성공! (+${points}P)` : `예측 실패 (${points}P)`
                              })()
                              : "공감픽 참여 완료 (+10P)"}
                        </h3>
                        <p
                          className={`${mission.status !== "settled"
                            ? "text-gray-600"
                            : isSuccess
                              ? "text-green-600"
                              : "text-red-600"
                            }`}
                        >
                          {mission.status !== "settled"
                            ? (mission.kind === "majority" || (mission as any).kind === "poll")
                              ? "결과가 확정되면 알려드릴게요!"
                              : "잠시만 기다려주세요!"
                            : successComment}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 커플 매칭 최종 결과 표시 */}
                {mission.form === "match" && mission.finalAnswer && (
                  <Card className="border-2 border-pink-200 bg-pink-50/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                        최종 커플 매칭 결과
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mission.finalAnswer.map((pair: { left: string; right: string }, index: number) => {
                          const pairStr = `${pair.left}-${pair.right}`
                          // 유저가 마지막 회차에 이 커플을 선택했는지 확인
                          const episodeNos = Object.keys(userVote?.predictions || {}).map(Number).sort((a, b) => b - a)
                          const latestEp = episodeNos[0] || 8
                          const userFinalPick = userVote?.predictions?.[latestEp]?.find(
                            (p: any) => p.left === pair.left && p.right === pair.right
                          )
                          const isCorrectlyPicked = !!userFinalPick

                          return (
                            <div
                              key={index}
                              className={`flex items-center justify-between p-3 rounded-lg border ${isCorrectlyPicked
                                ? "bg-white border-pink-200 shadow-sm"
                                : "bg-white/50 border-gray-100"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-200">
                                  {index + 1}호
                                </Badge>
                                <span className="font-bold text-gray-800">
                                  {pair.left} ❤️ {pair.right}
                                </span>
                              </div>
                              {isCorrectlyPicked && (
                                <Badge variant="outline" className="text-pink-600 border-pink-200 bg-pink-50">
                                  정답!
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 커플 매칭 실시간 결과 표시 (마감 전) */}
                {mission.form === "match" && !mission.finalAnswer && (
                  <Card className="border-2 border-purple-100 bg-purple-50/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-900">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        실시간 커플 매칭 현황
                      </CardTitle>
                      <p className="text-sm text-purple-700">현재까지 사용자들의 투표 결과입니다.</p>
                    </CardHeader>
                    <CardContent>
                      {loadingResults ? (
                        <div className="py-8 text-center">
                          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-gray-600">결과를 불러오는 중...</p>
                        </div>
                      ) : Object.keys(aggregatedResults).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(aggregatedResults)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10) // 상위 10개만 표시
                            .map(([pair, count], index) => {
                              const totalVotes = Object.values(aggregatedResults).reduce((sum, c) => sum + c, 0)
                              const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                              const isUserChoice = userVote?.pairs?.some((p: any) => `${p.left}-${p.right}` === pair)

                              return (
                                <div key={pair} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                  isUserChoice ? "bg-white border-purple-300 shadow-sm" : "bg-white/50 border-gray-100"
                                }`}>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      isUserChoice ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-white"
                                    }`}>
                                      {index + 1}
                                    </Badge>
                                    <span className={`font-medium ${isUserChoice ? "text-purple-900 font-bold" : "text-gray-900"}`}>
                                      {pair}
                                    </span>
                                    {isUserChoice && (
                                      <Badge className="bg-purple-500 text-white text-[10px] h-5 px-1.5">내 픽</Badge>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className={`font-bold ${isUserChoice ? "text-purple-700" : "text-gray-700"}`}>{percentage}%</div>
                                    <div className="text-xs text-gray-500">{count}표</div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-500">
                          <p>아직 투표 데이터가 없습니다.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 참여자 랭킹 (커플 매칭 미션인 경우) */}
                {mission.form === "match" && ranking.length > 0 && (
                  <Card className="border-2 border-orange-100 mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <Crown className="w-5 h-5 fill-orange-600" />
                        참여자 랭킹
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        회차별 정답 예측에 따른 누적 점수 순위입니다
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {ranking.map((user, index) => {
                          const isCurrentUser = userNickname === user.nickname
                          const tierInfo = TIERS.find(t => t.name === user.tier) || TIERS[TIERS.length - 1]

                          return (
                            <div
                              key={user.userId}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isCurrentUser
                                ? "bg-blue-50 border-blue-200 shadow-sm"
                                : "bg-white border-gray-100 hover:bg-gray-50"
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0
                                    ? "bg-yellow-400 text-white shadow-md"
                                    : index === 1
                                      ? "bg-gray-400 text-white shadow-md"
                                      : index === 2
                                        ? "bg-orange-400 text-white shadow-md"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                >
                                  {index + 1}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                                    <img
                                      src={tierInfo?.characterImage || "/placeholder.svg"}
                                      alt={user.tier || "루키"}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold text-sm ${isCurrentUser ? "text-blue-700" : "text-gray-900"}`}>
                                        {user.nickname}
                                      </span>
                                      {isCurrentUser && (
                                        <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600 text-[10px] h-5 px-1.5">
                                          나
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{user.tier}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="font-bold text-orange-600">
                                {user.points}점
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {mission.form !== "match" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>투표 결과</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResultsChart mission={mission} userVote={userVote} />
                    </CardContent>
                  </Card>
                )}

                {/* 참조 URL - 유튜브 임베드 플레이어 */}
                {mission.referenceUrl && isYoutubeUrl(mission.referenceUrl) ? (
                  <div className="mt-6 flex justify-center">
                    <div className="w-full max-w-2xl">
                      <div className="relative w-full overflow-hidden rounded-lg shadow-md" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
                          src={getYoutubeEmbedUrl(mission.referenceUrl) || ''}
                          title="YouTube video player"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  </div>
                ) : mission.referenceUrl ? (
                  <div className="flex items-center gap-2 text-sm text-blue-600 mt-6">
                    <Link href={mission.referenceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                      🔗 참고 링크 확인하기
                    </Link>
                  </div>
                ) : null}

                {/* 주관식 정답 및 내 답변 표시 (정산 완료 시) */}
                {mission.submissionType === "text" && mission.status === "settled" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>내 답변 결과</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg border">
                        <div className="text-sm text-muted-foreground mb-1">정답</div>
                        <div className="font-bold text-green-600 text-lg">
                          {(() => {
                            try {
                              const parsed = JSON.parse(mission.result?.correctAnswer || "[]")
                              return Array.isArray(parsed) ? parsed.join(", ") : mission.result?.correctAnswer
                            } catch {
                              return mission.result?.correctAnswer
                            }
                          })()}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border">
                        <div className="text-sm text-muted-foreground mb-1">내 답변</div>
                        <div className="font-bold text-slate-900 text-lg">
                          {(() => {
                            if (Array.isArray(userVote.choice)) return userVote.choice.join(", ")
                            try {
                              const parsed = JSON.parse(userVote.choice)
                              return Array.isArray(parsed) ? parsed.join(", ") : userVote.choice
                            } catch {
                              return userVote.choice
                            }
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>미션 통계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mission.form === "match" ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-primary">
                            {mission.stats?.participants?.toLocaleString() || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">총 참여자</p>
                        </div>
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-accent">
                            {(() => {
                              const episodeStatuses = mission.episodeStatuses || {}
                              const episodeNos = Object.keys(episodeStatuses).map(Number).sort((a, b) => b - a)
                              return episodeNos[0] || mission.startEpisode || 1
                            })()}회
                          </p>
                          <p className="text-sm text-muted-foreground">현재 회차</p>
                        </div>
                        <div className="text-center p-4 bg-primary/5 rounded-lg">
                          <p className="text-lg font-bold text-primary">
                            {(() => {
                              // 등급 업그레이드 비율 계산
                              const ranking = Object.values(mission.result?.ranking || {})
                              if (ranking.length === 0) return "0%"
                              const sortedRanking = [...ranking].sort(
                                (a: any, b: any) => b.score - a.score,
                              )
                              const upgradedUsers = sortedRanking.filter((u: any) => u.tierUpgraded).length
                              const percentage = Math.round((upgradedUsers / sortedRanking.length) * 100)
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

                {/* 참여자 랭킹 (커플 매칭 미션인 경우) */}


                {/* 댓글 섹션 추가 */}
                <div className="mt-8">
                  <CommentSection
                    missionId={mission.id}
                    missionType={mission.form === "match" ? "mission2" : "mission1"}
                    currentUserId={userId || undefined}
                  />
                </div>

                {/* 하단 액션 버튼 */}
                <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-3 pt-6 pb-10 max-w-xl mx-auto px-2 sm:px-4">
                  <Button
                    size="sm"
                    className="flex-1 min-w-0 px-2 py-2 sm:px-6 sm:py-4 text-[10px] sm:text-base font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
                    onClick={() => setIsShareModalOpen(true)}
                  >
                    <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">결과 공유하기</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-w-0 px-2 py-2 sm:px-6 sm:py-4 text-[10px] sm:text-base font-bold border-2 border-purple-600 text-purple-600 hover:bg-purple-50 shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
                    onClick={() => {
                      // showId를 영어로 정규화하여 URL 생성
                      const normalizedShowId = normalizeShowId(selectedShowId)
                      const missionsUrl = normalizedShowId ? `/?show=${normalizedShowId}` : "/"
                      router.push(missionsUrl)
                    }}
                  >
                    <span className="truncate">다른 미션 보기</span>
                  </Button>
                </div>
              </div >
            </div >
          </main >
        </div >

        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNavigation />
          <BannerAd />
        </div>

        <SidebarNavigation
          selectedShow={selectedShowId}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={handleSeasonSelect}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
          category={getShowById(selectedShowId)?.category}
          selectedShowId={selectedShowId}
        />

        {
          mission.form === "match" && mission.finalAnswer && (
            <MyPicksModal
              isOpen={isMyPicksModalOpen}
              onClose={() => setIsMyPicksModalOpen(false)}
              userPredictions={userVote?.predictions || {}}
              finalAnswer={mission.finalAnswer}
              maxRounds={mission.episodes || 8}
            />
          )
        }

        {/* 공유 모달 */}
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={mission.title}
          description={`${mission.stats?.participants || 0}명이 참여한 미션 결과를 확인해보세요!`}
          url={typeof window !== "undefined" ? window.location.href : ""}
          hashtags={["리얼픽", mission.showId || "나는솔로", mission.kind === "predict" ? "예측픽" : "공감픽"]}
        />

        {/* 삭제 확인 다이얼로그 */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>미션 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                정말로 이 미션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                <br />
                <span className="font-semibold text-gray-900 mt-2 block">{mission?.title}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMission}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div >
  )
}

function ResultsChart({ mission, userVote }: { mission: TMission; userVote: any }) {
  // distribution이 없더라도 options가 있으면 진행
  const distribution = desanitizeVoteCounts(mission.result?.distribution || {})
  const options = Array.isArray(mission.options) ? mission.options : []
  
  console.log('[ResultsChart] 렌더링 시작:', {
    missionId: mission.id,
    distribution,
    options,
    stats: mission.stats,
    totalVotes: mission.stats?.totalVotes
  })
  
  if (options.length === 0 && Object.keys(distribution).length === 0) {
    console.log('[ResultsChart] options와 distribution이 모두 비어있음')
    return null
  }

  // 실시간 공개가 기본이므로 항상 결과를 표시 (shouldHideResults 로직 제거)
  // totalVotes 계산 (항상 distribution의 실제 합계를 우선 사용)
  const distributionSum = Object.values(distribution).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
  const totalVotes = distributionSum > 0 ? distributionSum : (mission.stats?.totalVotes || 0)
  
  console.log('[ResultsChart] totalVotes 계산:', {
    'mission.stats?.totalVotes': mission.stats?.totalVotes,
    'distribution 실제 합계': distributionSum,
    '최종 사용 totalVotes': totalVotes
  })
  
  // 모든 선택지를 순회하며 데이터 구성 (투표가 없는 항목도 포함)
  let entries: [string, number, number][] = []

  if (options.length > 0) {
    // 정의된 선택지가 있는 경우 (Binary, Multi 등)
    entries = options.map(option => {
      // 1. 정확한 매칭 시도
      let value = Number(distribution[option]) || 0
      
      // 2. 정확한 매칭이 0인 경우, 대소문자/공백 무시하고 다시 시도
      if (value === 0) {
        const lowerOption = option.trim().toLowerCase();
        for (const [key, val] of Object.entries(distribution)) {
          if (key.trim().toLowerCase() === lowerOption) {
            value = Number(val) || 0;
            break;
          }
        }
      }
      
      const percentage = totalVotes > 0 ? Math.round((value / totalVotes) * 100) : 0
      console.log(`[ResultsChart] ${option}:`, { value, percentage, totalVotes })
      return [option, percentage, value] as [string, number, number]
    })
  } else {
    // 선택지가 동적으로 생성되는 경우 (Text 미션 등)
    entries = Object.entries(distribution).map(([option, value]) => {
      const val = Number(value) || 0
      const percentage = totalVotes > 0 ? Math.round((val / totalVotes) * 100) : 0
      console.log(`[ResultsChart] ${option}:`, { val, percentage, totalVotes })
      return [option, percentage, val] as [string, number, number]
    })
  }
  
  console.log('[ResultsChart] 최종 entries:', entries)

  // 투표수 순으로 정렬
  entries.sort(([, , aVal], [, , bVal]) => bVal - aVal)

  // 텍스트 미션은 상위 5개만 표시
  if (mission.submissionType === "text") {
    entries = entries.slice(0, 5)
  }

  return (
    <div className="space-y-4">
      {entries.map(([option, percentage, rawValue], index) => {
        const isUserChoice = isAuthenticated() && (
          mission.form === "match"
            ? userVote?.pairs?.some((p: any) => `${p.left}-${p.right}` === option)
            : Array.isArray(userVote?.choice)
              ? userVote?.choice.includes(option)
              : userVote?.choice === option
        )
// ... (rest of the component)

        // 정답인 항목 확인
        let isCorrect = false
        if (mission.kind === "predict") {
          if (mission.form === "multi" || mission.submissionType === "text") {
            try {
              const correctAnswers = JSON.parse(mission.result?.correctAnswer || "[]")
              isCorrect = Array.isArray(correctAnswers) ? correctAnswers.includes(option) : correctAnswers === option
            } catch {
              isCorrect = mission.result?.correctAnswer === option
            }
          } else {
            isCorrect = mission.result?.correctAnswer === option
          }
        }

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
                {isUserChoice && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1 flex-shrink-0"
                  >
                    <Check className="w-3 h-3" />내 픽
                  </Badge>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold">{percentage}%</span>
                <p className="text-xs text-muted-foreground">
                  {rawValue.toLocaleString()}표
                </p>
              </div>
            </div>
            <Progress
              value={percentage}
              className={`h-3 ${isCorrect
                ? "bg-emerald-100 [&>div]:bg-emerald-500"
                : isUserChoice
                  ? "bg-purple-100 [&>div]:bg-purple-500"
                  : ""
                }`}
            />
          </div>
        )
      })}
    </div >
  )
}
