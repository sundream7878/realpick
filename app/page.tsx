"use client"

import { Button } from "@/components/c-ui/button"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import MyPickViewModal from "@/components/c-my-pick-view-modal/my-pick-view-modal"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { MissionCard } from "@/components/c-mission/MissionCard"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MockVoteRepo, mockMissions, mockDealers } from "@/lib/mock-vote-data"
import { getMissions, getMissions2 } from "@/lib/supabase/missions"
import { hasUserVoted as checkUserVoted, getVote1, getAllVotes2 } from "@/lib/supabase/votes"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import type { TMission, TVoteSubmission } from "@/types/t-vote/vote.types"
import { getUser } from "@/lib/supabase/users"
import type { TTierInfo } from "@/types/t-tier/tier.types"

export default function HomePage() {
  const router = useRouter()
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [selectedSeason, setSelectedSeason] = useState<string>("전체")
  const [isPickViewModalOpen, setIsPickViewModalOpen] = useState(false)
  const [selectedMissionForView, setSelectedMissionForView] = useState<TMission | null>(null)
  const [selectedUserVote, setSelectedUserVote] = useState<TVoteSubmission | null>(null)
  const [missions, setMissions] = useState<TMission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [votedMissions, setVotedMissions] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0) // 미션 목록 새로고침용
  const userId = getUserId() || "user123"

  // 실제 미션 데이터와 Mock 커플매칭 데이터 혼합
  useEffect(() => {
    const loadMissions = async () => {
      setIsLoading(true)
      try {
        // 1. Supabase에서 Binary/Multi/주관식 미션 가져오기
        const result = await getMissions(10)
        let realMissions: TMission[] = []

        if (result.success && result.missions) {
          // Supabase 데이터를 TMission 형태로 변환
          realMissions = result.missions.map((mission: any) => ({
            id: mission.f_id,
            title: mission.f_title,
            kind: mission.f_kind,
            form: mission.f_form,
            seasonType: mission.f_season_type || "전체",
            showId: mission.f_show_id,
            category: mission.f_category,
            seasonNumber: mission.f_season_number || undefined,
            options: mission.f_options || [],
            subjectivePlaceholder: mission.f_subjective_placeholder || undefined,
            deadline: mission.f_deadline,
            revealPolicy: mission.f_reveal_policy,
            status: mission.f_status,
            stats: {
              participants: mission.f_stats_participants || 0,
              totalVotes: mission.f_stats_total_votes || 0
            },
            result: {
              distribution: mission.f_option_vote_counts || {},
              correct: mission.f_correct_answer || undefined,
              majority: mission.f_majority_option || undefined,
              totalVotes: mission.f_stats_total_votes || 0
            },
            creatorNickname: mission.creator?.f_nickname,
            creatorTier: mission.creator?.f_tier,
            createdAt: mission.f_created_at,
            thumbnailUrl: mission.f_thumbnail_url,
            referenceUrl: mission.f_reference_url
          }))
        }

        // 2. Supabase에서 커플매칭 미션 가져오기
        const coupleResult = await getMissions2(10)
        let coupleMissions: TMission[] = []

        if (coupleResult.success && coupleResult.missions) {
          coupleMissions = coupleResult.missions.map((mission: any) => ({
            id: mission.f_id,
            title: mission.f_title,
            kind: mission.f_kind,
            form: "match",
            seasonType: mission.f_season_type || "전체",
            showId: mission.f_show_id,
            category: mission.f_category,
            seasonNumber: mission.f_season_number || undefined,
            options: mission.f_match_pairs,
            deadline: mission.f_deadline,
            revealPolicy: mission.f_reveal_policy,
            status: mission.f_status,
            episodes: mission.f_total_episodes || 8,
            episodeStatuses: mission.f_episode_statuses || {},
            finalAnswer: mission.f_final_answer || undefined,
            stats: {
              participants: mission.f_stats_participants || 0,
              totalVotes: mission.f_stats_total_votes || 0
            },
            result: {
              distribution: {},
              finalAnswer: mission.f_final_answer || undefined,
              totalVotes: mission.f_stats_total_votes || 0
            },
            creatorNickname: mission.creator?.f_nickname,
            creatorTier: mission.creator?.f_tier,
            createdAt: mission.f_created_at
          }))
        }

        // 4. 두 데이터 합치기 (Mock 데이터 로직 제거)
        const combinedMissions = [...realMissions, ...coupleMissions]
        console.log("🎯 최종 미션 목록 (DB 데이터):", combinedMissions)
        setMissions(combinedMissions)

        // 5. 인증된 사용자의 경우 투표 여부 확인
        if (isAuthenticated()) {
          const voted = new Set<string>()
          for (const mission of combinedMissions) {
            const hasVoted = await checkUserVoted(userId, mission.id)
            if (hasVoted) {
              voted.add(mission.id)
            }
          }
          setVotedMissions(voted)
        } else {
          // 비인증 사용자는 localStorage 확인
          const voted = new Set<string>()
          combinedMissions.forEach((mission) => {
            const localVote = localStorage.getItem(`rp_picked_${mission.id}`)
            if (localVote) {
              voted.add(mission.id)
            }
          })
          setVotedMissions(voted)
        }
      } catch (error) {
        console.error("미션 로딩 실패:", error)
        setMissions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadMissions()
  }, [userId, refreshKey])

  // 미션 생성 성공 후 목록 새로고침
  const handleMissionCreated = () => {
    setRefreshKey(prev => prev + 1)
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
    window.addEventListener('auth-change', handleAuthChange)
    return () => window.removeEventListener('auth-change', handleAuthChange)
  }, [])

  // 탭 변경 핸들러
  const handleTabChange = (show: "나는솔로" | "돌싱글즈") => {
    setSelectedShow(show)
    setSelectedSeason("전체") // 탭 변경 시 시즌 선택 초기화
  }

  // 필터링된 미션 목록
  const filteredMissions = missions.filter((mission) => {
    // 1. 프로그램 필터 (현재는 '나는솔로'만 데이터가 있으므로 패스)
    // if (selectedShow === "나는솔로" && !mission.title.includes("나는솔로")) return false
    // if (selectedShow === "돌싱글즈" && !mission.title.includes("돌싱글즈")) return false

    // 2. 시즌 필터
    if (selectedSeason !== "전체") {
      // "29기" -> 29 (숫자 추출)
      const seasonNum = parseInt(selectedSeason.replace(/[^0-9]/g, ""))
      if (mission.seasonNumber !== seasonNum) return false
    }

    // 3. 마감된 미션 제외 (진행중인 미션만 표시)
    // 단, 내가 투표한 미션은 마감되어도 보여줄 수 있음 (기획에 따라 다름)
    // 현재는 '진행중' 탭이므로 마감되지 않은 것만 보여주는 것이 기본
    // 하지만 커플 매칭(match)은 회차별로 진행되므로 status가 settled여도 보여줄 수 있음

    // 여기서는 간단하게 모든 미션을 보여주되, 정렬로 해결
    return true
  })

  // 정렬: 진행중(open) > 마감됨(settled/closed)
  // 진행중인 미션 내에서는 최신순(createdAt)으로 정렬
  const sortedMissions = [...filteredMissions].sort((a, b) => {
    // 1. 상태 우선순위 (실제 진행중인 것만 open 취급)
    // DB 상태가 open이어도 마감일이 지났으면 closed로 취급하여 정렬
    const isAOpen = a.status === "open" && !isDeadlinePassed(a.deadline)
    const isBOpen = b.status === "open" && !isDeadlinePassed(b.deadline)

    if (isAOpen && !isBOpen) return -1
    if (!isAOpen && isBOpen) return 1

    // 2. 최신순 (createdAt 내림차순)
    // createdAt이 없으면 뒤로
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
        {/* 상단 헤더 */}
        <AppHeader
          selectedShow={selectedShow}
          onShowChange={handleTabChange}
          userNickname={userNickname}
          userPoints={userPoints}
          userTier={userTier}
          onAvatarClick={() => router.push("/p-profile")}
        />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-4 space-y-4 md:pl-72">
          {/* 배너 영역 */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-xl p-4 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-10 -mb-10"></div>

            <div className="relative z-10">
              <h2 className="text-lg font-bold mb-1">이번 주 핫한 예측! 🔥</h2>
              <p className="text-sm opacity-90 mb-3 truncate max-w-[80%]">
                {sortedMissions.length > 0 ? sortedMissions[0].title : "진행 중인 미션을 확인해보세요!"}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="bg-white text-purple-600 hover:bg-gray-100 border-none font-bold text-xs h-8"
                onClick={() => {
                  if (sortedMissions.length > 0) {
                    router.push(`/p-mission/${sortedMissions[0].id}/vote`)
                  }
                }}
              >
                지금 참여하기
              </Button>
            </div>
          </div>

          {/* 프로그램 탭 (나는솔로 / 돌싱글즈) */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => handleTabChange("나는솔로")}
              className={`flex-1 py-3 text-sm font-bold text-center transition-colors relative ${selectedShow === "나는솔로" ? "text-purple-600" : "text-gray-400 hover:text-gray-600"
                }`}
            >
              나는 SOLO
              {selectedShow === "나는솔로" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange("돌싱글즈")}
              className={`flex-1 py-3 text-sm font-bold text-center transition-colors relative ${selectedShow === "돌싱글즈" ? "text-pink-500" : "text-gray-400 hover:text-gray-600"
                }`}
            >
              돌싱글즈
              {selectedShow === "돌싱글즈" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500"></div>
              )}
            </button>
          </div>

          {/* 시즌 필터 (가로 스크롤) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {["전체", "29기", "28기", "27기", "26기"].map((season) => (
              <button
                key={season}
                onClick={() => setSelectedSeason(season)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedSeason === season
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {season}
              </button>
            ))}
          </div>

          {/* 미션 목록 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              // 로딩 스켈레톤
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm h-48 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              ))
            ) : sortedMissions.length > 0 ? (
              sortedMissions.slice(1).map((mission) => (
                <div key={mission.id} id={`mission-${mission.id}`}>
                  <MissionCard
                    mission={mission}
                    shouldShowResults={votedMissions.has(mission.id) || isDeadlinePassed(mission.deadline)}
                    onViewPick={async () => {
                      setSelectedMissionForView(mission)
                      // 투표 데이터 가져오기
                      if (userId) {
                        try {
                          if (mission.form === "match") {
                            const votes = await getAllVotes2(userId, mission.id)
                            if (votes && votes.length > 0) {
                              const matchPredictions: Record<string, Array<{ left: string; right: string }>> = {}
                              votes.forEach(v => {
                                if (v.episodeNo && v.pairs) {
                                  matchPredictions[`${v.episodeNo}회차`] = v.pairs
                                }
                              })
                              setSelectedUserVote({ ...votes[0], matchPredictions })
                            } else {
                              setSelectedUserVote(null)
                            }
                          } else {
                            const vote = await getVote1(userId, mission.id)
                            setSelectedUserVote(vote)
                          }
                        } catch (e) {
                          console.error("투표 조회 실패", e)
                          setSelectedUserVote(null)
                        }
                      }
                      setIsPickViewModalOpen(true)
                    }}
                    variant={mission.id === "1" ? "hot" : "default"}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p>진행 중인 미션이 없습니다.</p>
              </div>
            )}
          </div>
        </main>

        {/* 하단 네비게이션 */}
        <BottomNavigation
          onMissionClick={() => setIsMissionModalOpen(true)}
          onStatusClick={() => setIsMissionStatusOpen(true)}
        />

        {/* 사이드바 (햄버거 메뉴) */}
        <SidebarNavigation
          selectedShow={selectedShow}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={setSelectedSeason}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
        />

        {/* 미션 생성 모달 */}
        <MissionCreationModal
          isOpen={isMissionModalOpen}
          onClose={() => setIsMissionModalOpen(false)}
          onMissionCreated={handleMissionCreated}
        />

        {/* 내 픽 보기 모달 */}
        {selectedMissionForView && (
          <MyPickViewModal
            isOpen={isPickViewModalOpen}
            onClose={() => {
              setIsPickViewModalOpen(false)
              setSelectedMissionForView(null)
            }}
            mission={selectedMissionForView}
            userVote={selectedUserVote}
          />
        )}
      </div>
    </div>
  )
}
