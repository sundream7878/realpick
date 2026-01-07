"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMission, getMission2 } from "@/lib/supabase/missions"
import { getVote1, getAllVotes2 } from "@/lib/supabase/votes"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { getUser } from "@/lib/supabase/users"
import { getTierFromDbOrPoints, getTierFromPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { MultiVotePage } from "@/components/c-vote/multi-vote-page"
import { MatchVotePage } from "@/components/c-vote/match-vote-page"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"

import { CommentSection } from "@/components/c-comment/CommentSection"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import type { TMission, TVoteSubmission } from "@/types/t-vote/vote.types"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { isDeadlinePassed, getTimeRemaining } from "@/lib/utils/u-time/timeUtils.util"
import { getShowByName, getShowById } from "@/lib/constants/shows"
import { Button } from "@/components/c-ui/button"
import { Badge } from "@/components/c-ui/badge"
import { ArrowLeft, Share2, Trash2, Clock, Users, TrendingUp } from "lucide-react"
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

export default function VotePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [mission, setMission] = useState<TMission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [selectedShowId, setSelectedShowId] = useState<string>("nasolo")
  const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
  const [userVote, setUserVote] = useState<TVoteSubmission | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [userRole, setUserRole] = useState<string>("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const userId = getUserId()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // 1. 유저 정보 로드
        if (userId) {
          const user = await getUser(userId)
          if (user) {
            setUserNickname(user.nickname)
            setUserPoints(user.points)
            setUserTier(getTierFromDbOrPoints(user.tier, user.points))
            setUserRole(user.role || "")
            const adminCheck = isAdmin(user.role)
            console.log("User role:", user.role, "Is admin:", adminCheck, "User object:", user)
            setIsAdminUser(adminCheck)
          } else {
            console.log("User not found for userId:", userId)
          }
        } else {
          console.log("No userId found")
        }

        // 2. 미션 정보 로드 (순차적 시도)
        // 먼저 일반 미션(mission1)에서 찾기
        let missionData: any = null
        let missionType = "mission1"

        const result1 = await getMission(params.id)
        if (result1.success && result1.mission) {
          missionData = result1.mission
        } else {
          // 없으면 커플 매칭(mission2)에서 찾기
          const result2 = await getMission2(params.id)
          if (result2.success && result2.mission) {
            missionData = result2.mission
            missionType = "mission2"
          }
        }

        if (!missionData) {
          console.error("미션을 찾을 수 없습니다.")
          // router.push("/p-missions") // 에러 페이지로 이동하거나 목록으로 이동
          return
        }

        // 3. TMission 타입으로 변환
        const mappedMission: TMission = {
          id: missionData.f_id,
          title: missionData.f_title,
          description: missionData.f_description,
          kind: missionData.f_kind,
          form: missionType === "mission2" ? "match" : (missionData.f_form === "subjective" ? "multi" : missionData.f_form),
          submissionType: missionData.f_form === "subjective" ? "text" : (missionData.f_submission_type || "selection"),
          requiredAnswerCount: missionData.f_required_answer_count || 1,
          seasonType: missionData.f_season_type || "전체",
          seasonNumber: missionData.f_season_number,
          options: missionData.f_options || missionData.f_match_pairs,
          deadline: missionData.f_deadline,
          revealPolicy: missionData.f_reveal_policy,
          status: missionData.f_status,
          episodes: missionData.f_total_episodes,
          episodeStatuses: missionData.f_episode_statuses,
          finalAnswer: missionData.f_final_answer,
          stats: {
            participants: missionData.f_stats_participants || 0,
            totalVotes: missionData.f_stats_total_votes || 0
          },
          result: {
            distribution: missionData.f_option_vote_counts || {},
            correctAnswer: missionData.f_correct_answer,
            majorityOption: missionData.f_majority_option,
            finalAnswer: missionData.f_final_answer,
            totalVotes: missionData.f_stats_total_votes || 0
          },
          creatorNickname: missionData.creator?.f_nickname,
          creatorTier: missionData.creator?.f_tier,
          createdAt: missionData.f_created_at,

          thumbnailUrl: missionData.f_thumbnail_url,
          referenceUrl: missionData.f_reference_url,
          imageUrl: missionData.f_image_url,
          subjectivePlaceholder: missionData.f_subjective_placeholder,
          showId: missionData.f_show_id,
          category: missionData.f_category
        }

        setMission(mappedMission)
        if (mappedMission.showId) {
          setSelectedShowId(mappedMission.showId)
        }

        // 마감된 미션이면 결과 페이지로 이동
        const isClosed = mappedMission.deadline ? isDeadlinePassed(mappedMission.deadline) : mappedMission.status === "settled"
        if (isClosed) {
          router.replace(`/p-mission/${params.id}/results`)
          return
        }

        // 4. 투표 정보 로드 (로그인한 경우)
        if (userId) {
          if (mappedMission.form === "match") {
            const votes = await getAllVotes2(userId, params.id)
            if (votes.length > 0) {
              setUserVote(votes[0])
            }
          } else {
            const vote = await getVote1(userId, params.id)
            if (vote) {
              setUserVote(vote)
            }
          }
        }

      } catch (error) {
        console.error("데이터 로딩 실패:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [params.id, userId])

  useEffect(() => {
    const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
    const cleanup = setupShowStatusSync(setShowStatuses)
    return cleanup
  }, [])

  const handleDeleteMission = async () => {
    if (!mission || !userId) {
      alert("미션 정보 또는 사용자 정보가 없습니다.")
      return
    }

    setIsDeleting(true)
    try {
      const missionType = mission.form === "match" ? "mission2" : "mission1"
      console.log("미션 삭제 시도:", { missionId: mission.id, missionType })
      
      const response = await fetch(`/api/missions/delete?missionId=${mission.id}&missionType=${missionType}`, {
        method: "DELETE",
      })

      const data = await response.json()
      console.log("삭제 응답:", response.status, data)

      if (!response.ok) {
        const errorMessage = data.details || data.error || "미션 삭제에 실패했습니다."
        throw new Error(errorMessage)
      }

      // 삭제 성공 시 메인 페이지로 이동
      alert("미션이 성공적으로 삭제되었습니다.")
      router.push("/")
    } catch (error: any) {
      console.error("미션 삭제 실패:", error)
      alert(`미션 삭제에 실패했습니다: ${error.message || "알 수 없는 오류"}`)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">미션을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MissionCreationModal
        isOpen={isMissionModalOpen}
        onClose={() => setIsMissionModalOpen(false)}
        onMissionCreated={() => router.push('/')}
        initialShowId={selectedShowId}
        category={selectedShowId ? getShowById(selectedShowId)?.category : undefined}
      />
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
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
                router.push(`/?show=${showId}`)
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

          <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden pb-20 md:pb-6">
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
                  <div className="flex items-center justify-between gap-4">
                    <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate flex-1">
                      {(mission.showId === 'nasolo' || mission.showId === 'nasolsagye') && mission.seasonNumber
                        ? `[${mission.seasonNumber}기] ${mission.title}`
                        : mission.title}
                    </h1>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdminUser && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            // 권한 재확인
                            if (userId) {
                              const user = await getUser(userId)
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
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        <span className="hidden sm:inline">공유하기</span>
                      </Button>
                    </div>
                  </div>

                  {/* 디버깅용: role 정보 표시 (개발 중에만) */}
                  {process.env.NODE_ENV === 'development' && userRole && (
                    <div className="text-xs text-gray-500 mb-2">
                      현재 역할: {userRole} | 관리자 여부: {isAdminUser ? '예' : '아니오'}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={mission.status === "open" ? "default" : "secondary"} className="text-sm">
                      {mission.status === "open" ? "진행중" : "마감됨"}
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
                    {mission.status === "open" && mission.deadline && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{getTimeRemaining(mission.deadline)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="max-w-2xl mx-auto w-full">
                  {mission.form === "binary" && (
                    <MultiVotePage mission={mission} />
                  )}
                  {mission.form === "multi" && (
                    <MultiVotePage mission={mission} />
                  )}
                  {mission.form === "match" && (
                    <MatchVotePage mission={mission} />
                  )}
                </div>
              </div>

              {/* 댓글 섹션 추가 */}
              <div className="mt-8">
                <CommentSection
                  missionId={mission.id}
                  missionType={mission.form === "match" ? "mission2" : "mission1"}
                  currentUserId={userId || undefined}
                />
              </div>

              {/* 다른 미션 보기 버튼 */}
              <div className="flex justify-center pt-8 pb-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-3 text-lg font-semibold border-2 border-purple-600 text-purple-600 hover:bg-purple-50 shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={() => router.back()}
                >
                  다른 미션 보기
                </Button>
              </div>
            </div>
          </main>
        </div>

        {/* 공유 모달 */}
        {mission && (
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            title={mission.title}
            description={`${mission.stats?.participants || 0}명이 참여 중! 지금 함께 예측해보세요!`}
            url={typeof window !== "undefined" ? window.location.href : ""}
            hashtags={["리얼픽", mission.showId || "나는솔로", mission.kind === "predict" ? "예측픽" : "공감픽"]}
          />
        )}

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

        <BottomNavigation
          onMissionClick={() => setIsMissionModalOpen(true)}
          onStatusClick={() => setIsMissionStatusOpen(true)}
        />

        <SidebarNavigation
          selectedShow={selectedShowId ? getShowById(selectedShowId)?.name : undefined}
          selectedSeason="전체"
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={() => { }}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
          category={selectedShowId ? getShowById(selectedShowId)?.category : undefined}
          selectedShowId={selectedShowId}
        />
      </div>
    </div>
  )
}
