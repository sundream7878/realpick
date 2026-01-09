"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMission, getMission2, getMissions, getMissions2 } from "@/lib/supabase/missions"
import { getVote1, getAllVotes2 } from "@/lib/supabase/votes"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { getUser } from "@/lib/supabase/users"
import { getTierFromDbOrPoints, getTierFromPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { MultiVotePage } from "@/components/c-vote/multi-vote-page"
import { MatchVotePage } from "@/components/c-vote/match-vote-page"
import { SubjectiveVotePage } from "@/components/c-vote/subjective-vote-page"
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
import { ArrowLeft, Trash2, Clock, Users, Share2, List } from "lucide-react"
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
  const [missions, setMissions] = useState<TMission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  
  // Show Statuses, Visibility, Custom Shows Fetching & Sync
  const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
  const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
  const [customShows, setCustomShows] = useState<any[]>([])
  
  const userId = getUserId()

  // 🚀 미션 데이터 로딩 로직
  useEffect(() => {
    const fetchMissionData = async () => {
      console.log("🔍 미션 상세 로딩 시작:", params.id)
      setIsLoading(true)
      
      try {
        // 1. 미션 상세 정보 가져오기 (병렬)
        const [coupleResult, result] = await Promise.all([
          getMission2(params.id),
          getMission(params.id)
        ])

        let activeMission: TMission | null = null

        if (coupleResult.success && coupleResult.mission) {
          console.log("✅ 커플매칭 미션 발견:", coupleResult.mission.f_title)
          activeMission = {
            id: coupleResult.mission.f_id,
            title: coupleResult.mission.f_title,
            kind: coupleResult.mission.f_kind,
            form: "match",
            seasonType: coupleResult.mission.f_season_type || "전체",
            seasonNumber: coupleResult.mission.f_season_number || undefined,
            options: coupleResult.mission.f_match_pairs, // TMatchPairs 형식
            episodes: coupleResult.mission.f_total_episodes || 8,
            episodeStatuses: coupleResult.mission.f_episode_statuses || {},
            deadline: coupleResult.mission.f_deadline,
            revealPolicy: coupleResult.mission.f_reveal_policy,
            status: coupleResult.mission.f_status,
            finalAnswer: coupleResult.mission.f_final_answer || undefined,
            stats: {
              participants: coupleResult.mission.f_stats_participants || 0,
              totalVotes: coupleResult.mission.f_stats_total_votes || 0
            },
            result: {
              distribution: {},
              finalAnswer: coupleResult.mission.f_final_answer || undefined,
              totalVotes: coupleResult.mission.f_stats_total_votes || 0
            },
            createdAt: coupleResult.mission.f_created_at,
            showId: coupleResult.mission.f_show_id,
            category: coupleResult.mission.f_category
          }
        } else if (result.success && result.mission) {
          console.log("✅ 일반 미션 발견:", result.mission.f_title)
          activeMission = {
            id: result.mission.f_id,
            title: result.mission.f_title,
            kind: result.mission.f_kind,
            form: result.mission.f_form,
            seasonType: result.mission.f_season_type || "전체",
            seasonNumber: result.mission.f_season_number || undefined,
            options: result.mission.f_options || [],
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
              majority: result.mission.f_majority_option || undefined,
              totalVotes: result.mission.f_stats_total_votes || 0
            },
            createdAt: result.mission.f_created_at,
            showId: result.mission.f_show_id,
            category: result.mission.f_category
          }
        }

        if (activeMission) {
          setMission(activeMission)
          setSelectedShowId(activeMission.showId || null)
        }

        // 2. 헤더 알림 등을 위해 전체 미션 목록 가져오기
        const [m1Result, m2Result] = await Promise.all([
          getMissions(30),
          getMissions2(30)
        ])

        const combinedMissions: TMission[] = []
        if (m1Result.success && m1Result.missions) {
          combinedMissions.push(...m1Result.missions.map((m: any) => ({ id: m.f_id, showId: m.f_show_id } as TMission)))
        }
        if (m2Result.success && m2Result.missions) {
          combinedMissions.push(...m2Result.missions.map((m: any) => ({ id: m.f_id, showId: m.f_show_id } as TMission)))
        }
        setMissions(combinedMissions)

      } catch (error) {
        console.error("❌ 데이터 로딩 오류:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMissionData()
  }, [params.id])

  // Show status sync
  useEffect(() => {
    const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
    const cleanup = setupShowStatusSync(
      setShowStatuses,
      setShowVisibility,
      setCustomShows
    )
    return cleanup
  }, [])

  // 사용자 정보 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (isAuthenticated() && userId) {
        try {
          const userData = await getUser(userId)
          if (userData) {
            setUserNickname(userData.nickname || "")
            setUserPoints(userData.points || 0)
            setUserTier(getTierFromDbOrPoints(userData.tier, userData.points))
            setUserRole(userData.role || "PICKER")
          }
        } catch (error) {
          console.error("사용자 데이터 로드 실패:", error)
        }
      }
    }
    loadUserData()
  }, [userId])

  const handleDeleteMission = async () => {
    if (!mission || !userId) {
      alert("미션 정보 또는 사용자 정보가 없습니다.")
      return
    }

    setIsDeleting(true)
    try {
      const missionType = mission.form === "match" ? "mission2" : "mission1"
      
      const response = await fetch(`/api/missions/delete?missionId=${mission.id}&missionType=${missionType}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.details || data.error || "미션 삭제에 실패했습니다."
        throw new Error(errorMessage)
      }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3E757B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500 mb-4">미션을 찾을 수 없습니다.</div>
          <Button onClick={() => router.push("/")} variant="outline">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  const renderVotePage = () => {
    if (mission.form === "match") {
      return <MatchVotePage mission={mission} />
    } else if (mission.form === "subjective") {
      return <SubjectiveVotePage mission={mission} />
    } else {
      return <MultiVotePage mission={mission} />
    }
  }

  const showInfo = getShowById(selectedShowId || "")
  const activeShowIds = new Set(missions.map(m => m.showId).filter(Boolean) as string[])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
        <AppHeader
          selectedShow={(showInfo?.name as any) || "나는솔로"}
          selectedShowId={selectedShowId}
          onShowChange={() => {}}
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
          activeShowIds={activeShowIds}
          missions={missions}
        />

        <main className="flex-1 p-4 space-y-4 md:pl-72 pb-32 md:pb-16">
          <div className="max-w-4xl">
            {/* 뒤로가기 버튼 */}
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 p-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>

            {/* 미션 헤더 영역 */}
            <div className="mb-8">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                    {mission.seasonNumber ? `[${mission.seasonNumber}기] ${mission.title}` : mission.title}
                  </h1>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAuthenticated() && isAdmin(userRole || undefined) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 font-medium flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>삭제</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700 border-none px-3 py-1 text-xs font-bold rounded-full">
                      {isDeadlinePassed(mission.deadline) ? "마감" : "진행중"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                    <Users className="w-4 h-4" />
                    <span>{mission.stats.participants.toLocaleString()} 명 참여</span>
                  </div>
                  {mission.deadline && !isDeadlinePassed(mission.deadline) && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium">
                      <Clock className="w-4 h-4" />
                      <span>{getTimeRemaining(mission.deadline)} 남음</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100 w-full mb-8" />

            {/* 투표 컴포넌트 */}
            <div className="w-full">
              {renderVotePage()}
            </div>

            {/* 하단 공유 및 다른 미션 버튼 */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 shadow-sm"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: mission.title,
                      text: "리얼픽에서 나의 예측 결과를 확인해보세요!",
                      url: window.location.href,
                    }).catch(console.error);
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert("링크가 복사되었습니다!");
                  }
                }}
              >
                <Share2 className="w-5 h-5" />
                결과 공유하기
              </Button>
              <Button
                className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gray-900 hover:bg-black text-white font-bold flex items-center gap-2 shadow-sm"
                onClick={() => {
                  const missionsUrl = selectedShowId ? `/p-missions?show=${selectedShowId}` : "/p-missions"
                  router.push(missionsUrl)
                }}
              >
                <List className="w-5 h-5" />
                다른 미션 보러가기
              </Button>
            </div>

            {/* 댓글 섹션 */}
            <div className="mt-12 pt-12 border-t border-gray-100">
              <div id="comments">
                <CommentSection missionId={mission.id} missionType={mission.form === "match" ? "mission2" : "mission1"} />
              </div>
            </div>
          </div>
        </main>

        <SidebarNavigation
          selectedShow={showInfo?.name || "나는솔로"}
          selectedSeason="전체"
          isMissionStatusOpen={false}
          onMissionStatusToggle={() => {}}
          onSeasonSelect={() => {}}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
          category={showInfo?.category}
          selectedShowId={selectedShowId}
          activeShowIds={activeShowIds}
        />

        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNavigation />
        </div>

        <MissionCreationModal
          isOpen={isMissionModalOpen}
          onClose={() => setIsMissionModalOpen(false)}
          category={showInfo?.category}
        />

        {/* 삭제 확인 다이얼로그 */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>미션 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                정말로 이 미션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
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
    </div>
  )
}
