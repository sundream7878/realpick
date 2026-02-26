"use client"

import { Button } from "@/components/c-ui/button"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { BannerAd } from "@/components/c-banner-ad/banner-ad"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { MissionCard } from "@/components/c-mission/MissionCard"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MockVoteRepo, mockMissions } from "@/lib/mock-vote-data"
import { getMissions, getMissions2 } from "@/lib/firebase/missions"
import { getUserVotesMap } from "@/lib/firebase/votes"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import type { TMission } from "@/types/t-vote/vote.types"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { desanitizeVoteCounts } from "@/lib/utils/sanitize-firestore-key"
import { getUser } from "@/lib/firebase/users"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { getShowByName, getShowById, normalizeShowId } from "@/lib/constants/shows"

export default function MissionsPage() {
  const router = useRouter()
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(true)
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null)
  const [missions, setMissions] = useState<TMission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [votedMissions, setVotedMissions] = useState<Set<string>>(new Set())
  const [userChoices, setUserChoices] = useState<Record<string, any>>({})
  const [refreshKey, setRefreshKey] = useState(0) // 미션 목록 새로고침용
  const searchParams = useSearchParams()
  const season = searchParams.get("season") || "all"
  const categoryParam = searchParams.get('category')
  const userId = getUserId() || "user123"

  // season 파라미터를 selectedSeason으로 변환
  const selectedSeason = season === "all" ? "전체" : `${season}기`

  // URL의 show 파라미터 읽기 및 selectedShowId 동기화
  useEffect(() => {
    const showParam = searchParams.get('show')
    setSelectedShowId(showParam)
  }, [searchParams])

  // 실제 미션 데이터와 Mock 커플매칭 데이터 혼합
  useEffect(() => {
    const loadMissions = async () => {
      setIsLoading(true)
      try {
        // 1. Firebase에서 Binary/Multi/주관식 미션 가져오기 (AI 미션 포함)
        const result = await getMissions("missions1", 50)
        let realMissions: TMission[] = []

        if (result.success && result.missions) {
          // Firebase 데이터를 TMission 형태로 변환
          realMissions = (result.missions || [])
            .filter(Boolean)
            .map((mission: any) => ({
            id: mission.id,
            title: mission.title,
            kind: mission.kind,
            form: mission.form,
            seasonType: mission.seasonType || "전체",
            showId: mission.showId,
            category: mission.category,
            seasonNumber: mission.seasonNumber || undefined,
            options: mission.options || [],
            subjectivePlaceholder: mission.subjectivePlaceholder || undefined,
            deadline: mission.deadline,
            revealPolicy: mission.revealPolicy,
            status: mission.status,
            stats: {
              participants: mission.participants || 0,
              totalVotes: mission.totalVotes || 0
            },
            result: {
              distribution: mission.optionVoteCounts || {},
              correct: mission.correctAnswer || undefined,
              majority: mission.majorityOption || undefined,
              totalVotes: mission.totalVotes || 0
            },
            createdAt: mission.createdAt?.toDate?.()?.toISOString() || mission.createdAt,
            thumbnailUrl: mission.thumbnailUrl,
            referenceUrl: mission.referenceUrl,
            isLive: mission.isLive,
            creatorNickname: mission.creatorNickname,
            creatorTier: mission.creatorTier
          }))
        }

        // 2. Firebase에서 커플매칭 미션 가져오기
        const coupleResult = await getMissions2(50)
        let coupleMissions: TMission[] = []

        if (coupleResult.success && coupleResult.missions) {
          // Firebase 데이터를 TMission 형태로 변환
          coupleMissions = (coupleResult.missions || [])
            .filter(Boolean)
            .map((mission: any) => ({
            id: mission.id,
            title: mission.title,
            kind: mission.kind,
            form: "match",
            seasonType: mission.seasonType || "전체",
            showId: mission.showId,
            category: mission.category,
            seasonNumber: mission.seasonNumber || undefined,
            options: mission.matchPairs, // TMatchPairs 형식
            deadline: mission.deadline,
            revealPolicy: mission.revealPolicy,
            status: mission.status,
            episodes: mission.totalEpisodes || 8,
            episodeStatuses: mission.episodeStatuses || {},
            finalAnswer: mission.finalAnswer || undefined,
            stats: {
              participants: mission.participants || 0
            },
            result: {
              distribution: {},
              finalAnswer: mission.finalAnswer || undefined,
              totalVotes: mission.totalVotes || 0
            },
            createdAt: mission.createdAt?.toDate?.()?.toISOString() || mission.createdAt,
            thumbnailUrl: mission.thumbnailUrl,
            referenceUrl: mission.referenceUrl,
            isLive: mission.isLive,
            creatorNickname: mission.creatorNickname,
            creatorTier: mission.creatorTier
          }))
        }

        // 3. 두 데이터 합치기 (missions1 + missions2, AI 미션은 missions1에 이미 포함)
        const combinedMissions = [...realMissions, ...coupleMissions]
        
        console.log('[미션 페이지] 미션 통합 결과:', {
          missions1: realMissions.length,
          missions2: coupleMissions.length,
          ai_mission: aiMissions.length,
          total: combinedMissions.length
        })

        setMissions(combinedMissions)

        // 5. 인증된 사용자의 경우 투표 여부 및 선택지 확인
        if (isAuthenticated()) {
          const missionIds = combinedMissions.map(m => m.id)
          const choicesMap = await getUserVotesMap(userId, missionIds)
          
          setUserChoices(choicesMap)
          setVotedMissions(new Set(Object.keys(choicesMap)))
        } else {
          // 비인증 사용자는 localStorage 확인
          const voted = new Set<string>()
          const choices: Record<string, any> = {}
          
          combinedMissions.forEach((mission) => {
            const localVote = localStorage.getItem(`rp_picked_${mission.id}`)
            if (localVote) {
              voted.add(mission.id)
              try {
                const parsed = JSON.parse(localVote)
                choices[mission.id] = parsed.choice || parsed
              } catch {
                choices[mission.id] = localVote
              }
            }
          })
          setVotedMissions(voted)
          setUserChoices(choices)
        }
      } catch (error) {
        console.error("미션 로딩 실패:", error)
        // 에러 시 빈 목록 설정
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

  // Show Statuses, Visibility, Custom Shows Fetching & Sync
  const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
  const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
  const [customShows, setCustomShows] = useState<any[]>([])

  useEffect(() => {
    const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
    const cleanup = setupShowStatusSync(
      setShowStatuses,
      setShowVisibility,
      setCustomShows
    )
    return cleanup
  }, [])

  // 활성화된 프로그램 ID 목록 (미션이 있는 프로그램)
  const activeShowIds = new Set(missions.map(m => m.showId).filter(Boolean) as string[])

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
      case "all":
        return `${selectedShowId ? getShowById(selectedShowId)?.name : "전체"} 전체 미션`
      case "27":
        return `${selectedShowId ? getShowById(selectedShowId)?.name : "전체"} 27기 미션`
      case "28":
        return `${selectedShowId ? getShowById(selectedShowId)?.name : "전체"} 28기 미션`
      case "29":
        return `${selectedShowId ? getShowById(selectedShowId)?.name : "전체"} 29기 미션`
      default:
        return `${selectedShowId ? getShowById(selectedShowId)?.name : "전체"} 전체 미션`
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
      // 1. 프로그램(카테고리) 필터링
      if (selectedShowId) {
        // 선택된 프로그램이 'nasolo'인 경우, showId가 'nasolo'이거나 없는(기존 데이터) 미션 표시
        if (selectedShowId === 'nasolo') {
          if (mission.showId && mission.showId !== 'nasolo') return false
        } else {
          // 다른 프로그램의 경우 해당 showId와 정확히 일치하는 미션만 표시
          if (mission.showId !== selectedShowId) return false
        }
      }

      // 2. 시즌 필터링
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
    <div className="min-h-screen bg-gray-50 pb-30 md:pb-0 relative overflow-x-hidden">
      <DesktopWingBanner side="left" />
      <DesktopWingBanner side="right" />

      <div className="max-w-5xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative z-10">
        <AppHeader
          selectedShow={selectedShowId ? (getShowById(selectedShowId)?.name as "나는솔로" | "돌싱글즈") || "나는솔로" : "나는솔로"}
          onShowChange={() => { }}
          userNickname={userNickname}
          userPoints={userPoints}
          userTier={userTier}
          onAvatarClick={() => {
            const profileUrl = selectedShowId ? `/p-profile?show=${selectedShowId}` : "/p-profile"
            router.push(profileUrl)
          }}
          selectedShowId={selectedShowId}
          onShowSelect={(showId) => {
            if (showId) {
              // showId를 영어로 정규화
              const normalizedShowId = normalizeShowId(showId)
              router.push(`/?show=${normalizedShowId || showId}`)
            } else {
              router.push("/")
            }
          }}
          activeShowIds={activeShowIds}
          showStatuses={showStatuses}
        />

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-40 max-w-full overflow-hidden pb-32 md:pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="p-2" onClick={() => router.back()}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    shouldShowResults={shouldShowResults(mission.id)}
                    variant="default"
                    userChoice={userChoices[mission.id]}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNavigation />
          <BannerAd />
        </div>

        <SidebarNavigation
          selectedShow={selectedShowId ? (getShowById(selectedShowId)?.name as "나는솔로" | "돌싱글즈") || "나는솔로" : "나는솔로"}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={handleSeasonSelect}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
          activeNavItem="missions"
          category={selectedShowId ? getShowById(selectedShowId)?.category : undefined}
          selectedShowId={selectedShowId}
        />

        <MissionCreationModal
          isOpen={isMissionModalOpen}
          onClose={() => setIsMissionModalOpen(false)}
          onMissionCreated={handleMissionCreated}
          initialShowId={selectedShowId}
          category={categoryParam as any || (selectedShowId ? getShowById(selectedShowId)?.category : undefined)}
        />
      </div>
    </div>
  )
}
