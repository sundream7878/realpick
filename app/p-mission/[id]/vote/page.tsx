"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMissionById, getMissions, getMissions2 } from "@/lib/firebase/missions"
import { getVote1, getAllVotes2 } from "@/lib/firebase/votes"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { auth } from "@/lib/firebase/config"
import { getUser } from "@/lib/firebase/users"
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
import { getShowByName, getShowById, normalizeShowId } from "@/lib/constants/shows"
import { Button } from "@/components/c-ui/button"
import { Badge } from "@/components/c-ui/badge"
import { ArrowLeft, Trash2, Clock, Users, Share2, List, Star } from "lucide-react"
import { isAdmin } from "@/lib/utils/permissions"
import { ShareModal } from "@/components/c-share-modal/share-modal"
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
import { getYoutubeVideoId, getYoutubeThumbnailUrl, isYoutubeUrl, getYoutubeEmbedUrl } from "@/lib/utils/u-media/youtube.util"
import { ExternalLink } from "lucide-react"

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
  const [isPromotingMain, setIsPromotingMain] = useState(false)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  
  // Show Statuses, Visibility, Custom Shows Fetching & Sync
  const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
  const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
  const [customShows, setCustomShows] = useState<any[]>([])
  
  const userId = getUserId()

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

  // 🚀 미션 데이터 로딩 로직
  useEffect(() => {
    const fetchMissionData = async () => {
      console.log("🔍 미션 상세 로딩 시작:", params.id)
      setIsLoading(true)
      
      try {
        // 1. 미션 상세 정보 가져오기 (통합 함수 사용)
        const missionResult = await getMissionById(params.id)

        let activeMission: TMission | null = null

        if (missionResult.success && missionResult.mission) {
          const missionData = missionResult.mission
          const isCouple = missionData.__table === "missions2"
          const isAI = missionData.__table === "ai_mission"
          
          console.log(`✅ ${isCouple ? '커플매칭' : isAI ? 'AI 생성' : '일반'} 미션 발견:`, {
            title: missionData.title,
            __table: missionData.__table,
            isAIMission: missionData.isAIMission
          })
          
          if (isCouple) {
            activeMission = {
              id: missionData.id,
              title: missionData.title,
              kind: missionData.kind,
              form: "match",
              seasonType: missionData.seasonType || "전체",
              seasonNumber: missionData.seasonNumber || undefined,
              options: missionData.matchPairs, // TMatchPairs 형식
              episodes: missionData.totalEpisodes || 8,
              episodeStatuses: missionData.episodeStatuses || {},
              deadline: missionData.deadline,
              revealPolicy: missionData.revealPolicy,
              status: missionData.status,
              finalAnswer: missionData.finalAnswer || undefined,
              stats: {
                participants: missionData.participants || 0,
                totalVotes: missionData.totalVotes || 0
              },
              result: {
                distribution: {},
                finalAnswer: missionData.finalAnswer || undefined,
                totalVotes: missionData.totalVotes || 0
              },
              createdAt: missionData.createdAt?.toDate?.()?.toISOString() || missionData.createdAt,
              showId: missionData.showId,
              category: missionData.category,
              creatorNickname: missionData.creatorNickname,
              creatorTier: missionData.creatorTier,
              referenceUrl: missionData.referenceUrl,
              thumbnailUrl: missionData.thumbnailUrl,
              description: missionData.description,
              __table: missionData.__table, // 테이블 정보 보존
              isAIMission: missionData.isAIMission // AI 미션 플래그 보존
            } as any
          } else {
            activeMission = {
              id: missionData.id,
              title: missionData.title,
              kind: missionData.kind,
              form: missionData.form,
              seasonType: missionData.seasonType || "전체",
              seasonNumber: missionData.seasonNumber || undefined,
              options: missionData.options || [],
              deadline: missionData.deadline,
              revealPolicy: missionData.revealPolicy,
              status: missionData.status,
              stats: {
                participants: missionData.participants || 0,
                totalVotes: missionData.totalVotes || 0
              },
              result: {
                distribution: missionData.optionVoteCounts || {},
                correct: missionData.correctAnswer || undefined,
                majority: missionData.majorityOption || undefined,
                totalVotes: missionData.totalVotes || 0
              },
              createdAt: missionData.createdAt?.toDate?.()?.toISOString() || missionData.createdAt,
              showId: missionData.showId,
              category: missionData.category,
              creatorNickname: missionData.creatorNickname,
              creatorTier: missionData.creatorTier,
              referenceUrl: missionData.referenceUrl,
              thumbnailUrl: missionData.thumbnailUrl,
              description: missionData.description,
              __table: missionData.__table, // 테이블 정보 보존
              isAIMission: missionData.isAIMission // AI 미션 플래그 보존
            } as any
          }
        }

        if (activeMission) {
          setMission(activeMission)
          // showId를 영어로 정규화
          const normalizedShowId = normalizeShowId(activeMission.showId)
          setSelectedShowId(normalizedShowId || null)
        }

        // 헤더 알림 등을 위한 전체 미션 목록 로딩은 성능을 위해 제거
        // 대신 현재 미션 정보만 리스트에 포함
        if (activeMission) {
          setMissions([activeMission])
        }

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
    if (!mission || !userId) {
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
      
      console.log("미션 삭제 시도:", { missionId: mission.id, missionType, userId, isAIMission: (mission as any).isAIMission })
      
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

      if (!response.ok) {
        const errorMessage = data.details || data.error || "미션 삭제에 실패했습니다."
        throw new Error(errorMessage)
      }

      alert("미션이 성공적으로 삭제되었습니다.")
      // 삭제된 미션의 프로그램으로 리다이렉트 (showId 정규화)
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

  const isAdminUser = isAuthenticated() && isAdmin(userRole || undefined)
  const showInfo = getShowById(selectedShowId || "")
  const activeShowIds = new Set(missions.map(m => m.showId).filter(Boolean) as string[])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
        <AppHeader
          selectedShow={(showInfo?.name as any) || "나는솔로"}
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

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden pb-32 md:pb-16">
          <div className="max-w-4xl mx-auto">
            {/* 뒤로가기 버튼 */}
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

            {/* 미션 헤더 영역 */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h1 className="text-lg md:text-xl font-bold text-gray-900">
                      {mission.seasonNumber ? `[${mission.seasonNumber}기] ${mission.title}` : mission.title}
                    </h1>
                    {/* 미션 생성자 닉네임 */}
                    {mission.creatorNickname && (
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">생성자:</span> <span className="font-medium">{mission.creatorNickname}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                          onClick={() => setIsDeleteDialogOpen(true)}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">삭제</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

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
                  {!isMissionClosed && mission.deadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{getTimeRemaining(mission.deadline)} 남음</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full" />

              {/* 투표 컴포넌트 */}
              <div className="w-full">
                {renderVotePage()}
              </div>

              {/* 유튜브 임베드 플레이어 */}
              {mission.referenceUrl && isYoutubeUrl(mission.referenceUrl) && (
                <div className="flex justify-center mt-6">
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
              )}

              {/* 댓글 섹션 */}
              <div className="mt-8">
                <CommentSection
                  missionId={mission.id}
                  missionType={mission.form === "match" ? "mission2" : "mission1"}
                  currentUserId={userId || undefined}
                />
              </div>

              {/* 하단 공유 및 다른 미션 버튼 */}
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
          initialShowId={selectedShowId || undefined}
          category={showInfo?.category}
        />

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
