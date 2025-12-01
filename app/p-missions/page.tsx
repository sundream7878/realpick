"use client"

import { Button } from "@/components/c-ui/button"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { MissionCard } from "@/components/c-mission/MissionCard"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MockVoteRepo, mockMissions } from "@/lib/mock-vote-data"
import { getMissions, getMissions2 } from "@/lib/supabase/missions"
import { hasUserVoted as checkUserVoted } from "@/lib/supabase/votes"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import type { TMission } from "@/types/t-vote/vote.types"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { getUser } from "@/lib/supabase/users"
import type { TTierInfo } from "@/types/t-tier/tier.types"

export default function MissionsPage() {
  const router = useRouter()
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(true)
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [missions, setMissions] = useState<TMission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [votedMissions, setVotedMissions] = useState<Set<string>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0) // 미션 목록 새로고침용
  const searchParams = useSearchParams()
  const season = searchParams.get("season") || "all"
  const userId = getUserId() || "user123"

  // season 파라미터를 selectedSeason으로 변환
  const selectedSeason = season === "all" ? "전체" : `${season}기`

  // 실제 미션 데이터와 Mock 커플매칭 데이터 혼합
  useEffect(() => {
    const loadMissions = async () => {
      setIsLoading(true)
      try {
        // 1. Supabase에서 Binary/Multi/주관식 미션 가져오기
        const result = await getMissions(50) // 미션 목록 페이지는 더 많이 가져오기
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
            createdAt: mission.f_created_at
          }))
        }

        // 2. Supabase에서 커플매칭 미션 가져오기
        const coupleResult = await getMissions2(50)
        let coupleMissions: TMission[] = []

        if (coupleResult.success && coupleResult.missions) {
          // t_missions2 데이터를 TMission 형태로 변환
          coupleMissions = coupleResult.missions.map((mission: any) => ({
            id: mission.f_id,
            title: mission.f_title,
            kind: mission.f_kind,
            form: "match",
            seasonType: mission.f_season_type || "전체",
            showId: mission.f_show_id,
            category: mission.f_category,
            seasonNumber: mission.f_season_number || undefined,
            options: mission.f_match_pairs, // TMatchPairs 형식
            deadline: mission.f_deadline,
            revealPolicy: mission.f_reveal_policy,
            status: mission.f_status,
            episodes: mission.f_total_episodes || 8,
            episodeStatuses: mission.f_episode_statuses || {}, // 누락된 필드 추가
            finalAnswer: mission.f_final_answer || undefined,
            stats: {
              participants: mission.f_stats_participants || 0
            },
            result: {
              distribution: {},
              finalAnswer: mission.f_final_answer || undefined,
              totalVotes: mission.f_stats_total_votes || 0
            },
            createdAt: mission.f_created_at
          }))
        }

        // 3. 임시로 27기 Mock 데이터 추가 (실제 DB에 27기가 없을 경우)
        const mock27Mission = mockMissions["27기-커플매칭"]
        const has27Mission = coupleMissions.some(m => m.seasonNumber === 27)

        // 4. 두 데이터 합치기
        const combinedMissions = [...realMissions, ...coupleMissions]
        if (!has27Mission && mock27Mission) {
          combinedMissions.push(mock27Mission)
        }

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
        // 에러 시 Mock 데이터 사용
        setMissions(Object.values(mockMissions))
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

    // 실시간 투표 업데이트 감지
    const handleVoteUpdate = () => {
      console.log("🔄 투표 업데이트 감지 - 미션 목록 새로고침")
      setRefreshKey(prev => prev + 1)
    }

    window.addEventListener("auth-change", handleAuthChange)
    window.addEventListener("storage", handleAuthChange)
    window.addEventListener("mission-vote-updated", handleVoteUpdate)

    return () => {
      window.removeEventListener("auth-change", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
      window.removeEventListener("mission-vote-updated", handleVoteUpdate)
    }
  }, [])

  const hasUserVoted = (missionId: string): boolean => {
    return votedMissions.has(missionId)
  }

  const shouldShowResults = (missionId: string): boolean => {
    const mission = missions.find(m => m.id === missionId)
    if (!mission) return false

    let isClosed = false

    if (mission.form === "match") {
      // 커플 매칭 미션: 모든 회차가 완료되면 마감
      const episodeStatuses = mission.episodeStatuses || {}
      const totalEpisodes = mission.episodes || 8

      // 상태가 settled이거나 모든 회차가 settled면 마감
      isClosed = mission.status === "settled"
      if (!isClosed) {
        let allEpisodesSettled = true
        for (let i = 1; i <= totalEpisodes; i++) {
          if (episodeStatuses[i] !== "settled") {
            allEpisodesSettled = false
            break
          }
        }
        isClosed = allEpisodesSettled
      }
    } else {
      // 일반 미션: 마감 시간이 지났거나 상태가 settled인 경우
      isClosed = mission.deadline ? isDeadlinePassed(mission.deadline) : mission.status === "settled"
    }

    // 마감되었거나 사용자가 투표한 경우 결과 보기
    return isClosed || hasUserVoted(missionId)
  }

  const getSeasonTitle = (season: string): string => {
    switch (season) {
      case "all":
        return `${selectedShow} 전체 미션`
      case "27":
        return `${selectedShow} 27기 미션`
      case "28":
        return `${selectedShow} 28기 미션`
      case "29":
        return `${selectedShow} 29기 미션`
      default:
        return `${selectedShow} 전체 미션`
    }
  }

  const handleSeasonSelect = (seasonValue: string) => {
    // "전체" -> "all", "29기" -> "29" 등으로 변환
    if (seasonValue === "전체") {
      // URL은 변경하지 않고 내부 상태만 업데이트
      return
    }
    // 실제로는 URL 변경이 필요하지만, 여기서는 상태만 관리
  }

  const filteredMissions = Array.isArray(missions) ? missions
    .filter((mission) => {
      if (season === "all") return true

      // 기수별 미션인 경우에만 필터링
      if (mission.seasonType === "기수별" && mission.seasonNumber) {
        return season === mission.seasonNumber.toString()
      }

      // 기수별이 아닌 미션(전체)은 모든 필터에 포함
      return mission.seasonType === "전체"
    })
    .sort((a, b) => {
      // 마감 여부 확인
      const aIsClosed = a.deadline ? isDeadlinePassed(a.deadline) : a.status === "settled"
      const bIsClosed = b.deadline ? isDeadlinePassed(b.deadline) : b.status === "settled"

      // 진행 중 미션이 먼저
      if (!aIsClosed && bIsClosed) return -1
      if (aIsClosed && !bIsClosed) return 1

      // 같은 상태면 최신 순
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    }) : []

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
        <AppHeader
          selectedShow={selectedShow}
          onShowChange={setSelectedShow}
          userNickname={userNickname}
          userPoints={userPoints}
          userTier={userTier}
          onAvatarClick={() => router.push("/p-profile")}
        />

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="p-2">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <h2 className="text-2xl font-semibold text-gray-900">{getSeasonTitle(season)}</h2>
              </div>
              {!isLoading && (
                <div className="text-sm text-gray-600">
                  총 <span className="font-semibold text-gray-900">{filteredMissions.length}</span>개 미션
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">미션을 불러오는 중...</div>
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">해당 기수의 미션이 없습니다</div>
                <div className="text-gray-500 text-sm">다른 기수를 선택해보세요</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    shouldShowResults={shouldShowResults(mission.id)}
                    variant="default"
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        <BottomNavigation />

        <SidebarNavigation
          selectedShow={selectedShow}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={handleSeasonSelect}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
          activeNavItem="missions"
        />

        <MissionCreationModal
          isOpen={isMissionModalOpen}
          onClose={() => setIsMissionModalOpen(false)}
          onMissionCreated={handleMissionCreated}
        />
      </div>
    </div>
  )
}
