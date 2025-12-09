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
import { getMissions, getMissions2 } from "@/lib/supabase/missions"
import { hasUserVoted as checkUserVoted, getVote1, getAllVotes2 } from "@/lib/supabase/votes"
import { getTopVotersByMission } from "@/lib/supabase/top-voters"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import type { TMission, TVoteSubmission } from "@/types/t-vote/vote.types"
import { getUser } from "@/lib/supabase/users"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { getMainMissionId } from "@/lib/supabase/admin"

export default function HomePage() {
  const router = useRouter()
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState("전체")
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null)
  const [isPickViewModalOpen, setIsPickViewModalOpen] = useState(false)
  const [selectedMissionForView, setSelectedMissionForView] = useState<TMission | null>(null)
  const [selectedUserVote, setSelectedUserVote] = useState<TVoteSubmission | null>(null)
  const [missions, setMissions] = useState<TMission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [votedMissions, setVotedMissions] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0) // 미션 목록 새로고침용
  const [adminMainMissionId, setAdminMainMissionId] = useState<string | null>(null)
  const [topVoters, setTopVoters] = useState<Array<{ nickname: string; points: number; tier: string }>>([])
  const userId = getUserId() || "user123"

  // 실제 미션 데이터와 Mock 커플매칭 데이터 혼합
  useEffect(() => {
    const loadMissions = async () => {
      setIsLoading(true)
      try {
        // 0. 관리자 설정 메인 미션 ID 가져오기
        const adminSetting = await getMainMissionId()
        if (adminSetting.success) {
          setAdminMainMissionId(adminSetting.missionId)
        }

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
            referenceUrl: mission.f_reference_url,
            isLive: mission.f_is_live
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
            createdAt: mission.f_created_at,
            isLive: mission.f_is_live
          }))
        }

        // 4. 두 데이터 합치기
        const combinedMissions = [...realMissions, ...coupleMissions]
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

  // 필터링된 미션 목록
  const filteredMissions = missions.filter((mission) => {
    // 1. Show ID 필터링
    if (selectedShowId && mission.showId !== selectedShowId) return false

    // 2. 상태 필터링
    if (selectedFilter === "전체") return true
    if (selectedFilter === "진행중") return mission.status === "open" && !isDeadlinePassed(mission.deadline)
    if (selectedFilter === "마감") return mission.status !== "open" || isDeadlinePassed(mission.deadline)
    if (selectedFilter === "핫이슈") return true // 정렬에서 처리
    return true
  })

  // 정렬: 진행중(open) > 마감됨(settled/closed)
  // 진행중인 미션 내에서는 최신순(createdAt)으로 정렬
  const sortedMissions = [...filteredMissions].sort((a, b) => {
    // 핫이슈 필터일 경우 참여자 수 순으로 정렬
    if (selectedFilter === "핫이슈") {
      return (b.stats?.participants || 0) - (a.stats?.participants || 0)
    }

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

  // 메인 미션 선정 로직
  // 0. 관리자 설정이 있으면 최우선
  // 1. 커플 매칭(match) 최우선
  // 2. 로맨스(LOVE) 카테고리 우선
  // 3. 서바이벌/오디션(SURVIVAL) 카테고리 -> 토너먼트(tournament) 우선
  // 4. 그 외 참여자 수 순
  const openMainMissions = missions
    .filter(m => {
      // 1. 기본 필터: 진행중이고 마감 안 된 것
      if (m.status !== 'open' || isDeadlinePassed(m.deadline)) return false

      // 2. 선택된 프로그램이 있으면 해당 프로그램 미션만 대상
      if (selectedShowId && m.showId !== selectedShowId) return false

      return true
    })
    .sort((a, b) => {
      // 0. 관리자 설정 체크
      if (adminMainMissionId) {
        if (a.id === adminMainMissionId) return -1
        if (b.id === adminMainMissionId) return 1
      }

      const getPriority = (m: TMission) => {
        // 커플 매칭은 카테고리 무관하게 최우선
        if (m.form === 'match') return 5

        // 카테고리 체크 (대소문자 무시 및 부분 일치 허용)
        const cat = (m.category || "").toUpperCase()
        const isRomance = cat.includes("LOVE") || cat.includes("ROMANCE")
        const isSurvival = cat.includes("SURVIVAL") || cat.includes("AUDITION")

        if (isRomance) return 3
        if (isSurvival && m.form === 'tournament') return 3
        if (m.form === 'tournament') return 2
        return 1
      }

      const priorityA = getPriority(a)
      const priorityB = getPriority(b)

      if (priorityA !== priorityB) return priorityB - priorityA
      // 우선순위가 같으면 참여자 수 내림차순
      return (b.stats?.participants || 0) - (a.stats?.participants || 0)
    })

  // 진행 중인 미션이 없으면 마감된 커플매칭 미션 우선 표시
  const openMainMission = openMainMissions[0]
  const closedMainMission = !openMainMission
    ? missions
      .filter(m => {
        // 1. 기본 필터: 마감된 것
        if (m.status === 'open' && !isDeadlinePassed(m.deadline)) return false

        // 2. 선택된 프로그램이 있으면 해당 프로그램 미션만 대상
        if (selectedShowId && m.showId !== selectedShowId) return false

        return true
      })
      .sort((a, b) => {
        // 커플 매칭 최우선
        if (a.form === 'match' && b.form !== 'match') return -1
        if (a.form !== 'match' && b.form === 'match') return 1
        // 최신 마감 미션
        const aTime = new Date(a.deadline || a.createdAt).getTime()
        const bTime = new Date(b.deadline || b.createdAt).getTime()
        return bTime - aTime
      })[0]
    : null

  const mainMission = openMainMission || closedMainMission
  const isMainMissionClosed = mainMission && (mainMission.status !== 'open' || isDeadlinePassed(mainMission.deadline))

  // 마감된 메인 미션의 TOP 3 투표자 불러오기
  useEffect(() => {
    const loadTopVoters = async () => {
      console.log('[DEBUG] Checking main mission for top voters:', {
        id: mainMission?.id,
        title: mainMission?.title,
        isClosed: isMainMissionClosed
      })

      if (mainMission && isMainMissionClosed) {
        console.log('[DEBUG] Fetching top voters for mission:', mainMission.id)
        const voters = await getTopVotersByMission(mainMission.id, 3)
        console.log('[DEBUG] Fetched voters:', voters)
        setTopVoters(voters)
      } else {
        setTopVoters([])
      }
    }
    loadTopVoters()
  }, [mainMission?.id, isMainMissionClosed])

  // 메인 미션을 제외한 나머지 리스트
  const displayMissions = sortedMissions.filter(m => m.id !== mainMission?.id)

  // 활성화된 프로그램 ID 목록 (미션이 있는 프로그램)
  const activeShowIds = new Set(missions.map(m => m.showId).filter(Boolean) as string[])

  // Show Statuses Fetching
  const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
  useEffect(() => {
    fetch('/api/public/shows')
      .then(res => res.json())
      .then(data => setShowStatuses(data.statuses || {}))
      .catch(err => console.error("Failed to fetch show statuses", err))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
        {/* 상단 헤더 */}
        {/* 상단 헤더 */}
        <AppHeader
          selectedShow="나는솔로" // Legacy prop, can be ignored or removed later
          onShowChange={() => { }} // Legacy prop
          userNickname={userNickname}
          userPoints={userPoints}
          userTier={userTier}
          onAvatarClick={() => router.push("/p-profile")}
          selectedShowId={selectedShowId}
          onShowSelect={(showId) => {
            setSelectedShowId(showId === selectedShowId ? null : showId) // Toggle
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          activeShowIds={activeShowIds}
          showStatuses={showStatuses}
        />


        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-4 space-y-4 md:pl-72">
          {/* 메인 미션 배너 */}
          {mainMission && (
            <div
              className="w-full bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl p-5 md:p-6 mb-6 shadow-xl text-white overflow-hidden relative group cursor-pointer"
              onClick={() => router.push(isMainMissionClosed ? `/p-mission/${mainMission.id}/results` : `/p-mission/${mainMission.id}/vote`)}
            >
              {/* 배경 애니메이션 효과 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-16 -mb-16 animate-pulse delay-700" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
              {/* 반짝이는 효과 (Shimmer) */}
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-0"></div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                {/* 왼쪽: 미션 카드 (원본 크기 유지 & 3D 효과) */}
                <div className="w-full md:w-1/2 perspective-1000 flex-shrink-0">
                  <div className="pointer-events-none transform transition-transform duration-500 group-hover:scale-105 group-hover:rotate-y-6">
                    <MissionCard
                      mission={mainMission}
                      shouldShowResults={false}
                      onViewPick={() => { }}
                      variant="hot"
                    />
                  </div>
                </div>

                {/* 오른쪽: 상세 설명 */}
                <div className="w-full md:w-1/2 text-center md:text-left space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold text-purple-300 mb-1 animate-fade-in-up">
                    {!isMainMissionClosed ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        {mainMission.form === 'match' ? '💖 MAIN MATCH' : mainMission.form === 'tournament' ? '🏆 MAIN TOURNAMENT' : '🔥 HOT ISSUE'}
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                        </span>
                        {mainMission.form === 'match' ? '💖 CLOSED MATCH' : mainMission.form === 'tournament' ? '🏆 CLOSED TOURNAMENT' : '✅ CLOSED'}
                      </>
                    )}
                  </div>

                  <h1 className="text-xl md:text-2xl font-black leading-tight break-keep text-white drop-shadow-lg animate-fade-in-up delay-100">
                    {mainMission.title}
                  </h1>

                  {!isMainMissionClosed ? (
                    <>
                      <p className="text-gray-300 text-sm md:text-base max-w-xl mx-auto md:mx-0 break-keep line-clamp-2 animate-fade-in-up delay-200">
                        {mainMission.description || "여러분의 촉으로 결과를 예측해보세요! 가장 많은 사람들이 선택한 결과는 무엇일까요?"}
                      </p>

                      <div className="flex flex-col md:flex-row items-center gap-3 pt-2 justify-center md:justify-start animate-fade-in-up delay-300">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/p-mission/${mainMission.id}/vote`)
                          }}
                          className="bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 font-bold text-sm px-6 py-2 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-300"
                          size="default"
                        >
                          지금 투표 참여하기
                        </Button>
                        <p className="text-xs text-gray-400">
                          현재 <span className="text-white font-bold">{mainMission.stats?.participants?.toLocaleString()}명</span> 참여 중
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-300 text-sm md:text-base max-w-xl mx-auto md:mx-0 break-keep animate-fade-in-up delay-200">
                        🏆 미션이 마감되었습니다! 총 <span className="text-white font-bold">{mainMission.stats?.participants?.toLocaleString()}명</span>이 참여했습니다.
                      </p>

                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 animate-fade-in-up delay-300">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                          TOP 3 랭킹
                        </h3>
                        <div className="space-y-2">
                          {topVoters.length > 0 ? (
                            topVoters.map((voter, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${index === 0 ? 'bg-yellow-500/20 text-yellow-300' : index === 1 ? 'bg-gray-500/20 text-gray-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                    {index + 1}위
                                  </span>
                                  <span className="text-white font-medium">{voter.nickname}</span>
                                  <span className="text-gray-400 text-[10px]">{voter.tier}</span>
                                </div>
                                <span className="text-purple-300 font-bold">{voter.points.toLocaleString()}P</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-400 text-xs text-center py-2">아직 참여자가 없습니다</p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-center md:justify-start animate-fade-in-up delay-400">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/p-mission/${mainMission.id}/results`)
                          }}
                          variant="outline"
                          className="border-white/50 text-white hover:bg-white/20 hover:border-white font-bold text-sm px-6 py-2 bg-white/10"
                        >
                          전체 결과 보기
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div >
            </div >
          )
          }

          {/* 필터 (가로 스크롤) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 pt-2">
            {["전체", "진행중", "마감", "핫이슈"].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedFilter === filter
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
              >
                {filter}
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
            ) : displayMissions.length > 0 ? (
              displayMissions.map((mission, index) => (
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
                    variant={index === 0 && !mainMission ? "hot" : "default"} // 메인 미션이 있으면 리스트 첫번째는 hot 아님
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p>진행 중인 미션이 없습니다.</p>
              </div>
            )}
          </div>
        </main >

        {/* 하단 네비게이션 */}
        < BottomNavigation
          onMissionClick={() => setIsMissionModalOpen(true)}
          onStatusClick={() => setIsMissionStatusOpen(true)}
        />

        {/* 사이드바 (햄버거 메뉴) */}
        <SidebarNavigation
          selectedShow="나는솔로" // Default
          selectedSeason={selectedFilter} // Map filter to season prop for now
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={setSelectedFilter} // Map filter select
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
        />

        {/* 미션 생성 모달 */}
        <MissionCreationModal
          isOpen={isMissionModalOpen}
          onClose={() => setIsMissionModalOpen(false)}
          onMissionCreated={handleMissionCreated}
          initialShowId={selectedShowId}
        />

        {/* 내 픽 보기 모달 */}
        {
          selectedMissionForView && (
            <MyPickViewModal
              isOpen={isPickViewModalOpen}
              onClose={() => {
                setIsPickViewModalOpen(false)
                setSelectedMissionForView(null)
              }}
              mission={selectedMissionForView}
              userVote={selectedUserVote}
            />
          )
        }
      </div >
    </div >
  )
}
