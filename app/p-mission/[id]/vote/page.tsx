"use client"

import { useState, useEffect } from "react"
import { MockVoteRepo } from "@/lib/mock-vote-data"
import { getMission, getMission2 } from "@/lib/supabase/missions"
import type { TMission } from "@/types/t-vote/vote.types"
import { MultiVotePage } from "@/components/c-vote/multi-vote-page"
import { MatchVotePage } from "@/components/c-vote/match-vote-page"
import { SubjectiveVotePage } from "@/components/c-vote/subjective-vote-page"
import { Button } from "@/components/c-ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { getUser } from "@/lib/supabase/users"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import type { TTierInfo } from "@/types/t-tier/tier.types"

export default function VotePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [mission, setMission] = useState<TMission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [selectedSeason, setSelectedSeason] = useState<string>("전체")
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))

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

        // 먼저 t_missions2에서 커플매칭 미션 가져오기 (406 에러 방지)
        const coupleResult = await getMission2(params.id)

        if (coupleResult.success && coupleResult.mission) {
          // t_missions2 데이터를 TMission 형태로 변환
          const coupleMission: TMission = {
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
            episodeStatuses: coupleResult.mission.f_episode_statuses,
            finalAnswer: coupleResult.mission.f_final_answer || undefined,
            stats: {
              participants: coupleResult.mission.f_stats_participants || 0
            },
            result: {
              distribution: {},
              finalAnswer: coupleResult.mission.f_final_answer || undefined,
              totalVotes: coupleResult.mission.f_stats_total_votes || 0
            },
            description: coupleResult.mission.f_description || undefined,
            referenceUrl: coupleResult.mission.f_reference_url || undefined,
            imageUrl: coupleResult.mission.f_image_url || undefined,
            thumbnailUrl: coupleResult.mission.f_thumbnail_url || undefined,
            createdAt: coupleResult.mission.f_created_at
          }
          setMission(coupleMission)
        } else {
          // t_missions2에 없으면 t_missions1에서 미션 데이터 가져오기
          const result = await getMission(params.id)

          if (result.success && result.mission) {
            // Supabase 데이터를 TMission 형태로 변환
            const supabaseMission: TMission = {
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
                correctAnswer: result.mission.f_correct_answer || undefined,
                majorityOption: result.mission.f_majority_option || undefined,
                totalVotes: result.mission.f_stats_total_votes || 0
              },
              description: result.mission.f_description || undefined,
              referenceUrl: result.mission.f_reference_url || undefined,
              imageUrl: result.mission.f_image_url || undefined,
              thumbnailUrl: result.mission.f_thumbnail_url || undefined,
              createdAt: result.mission.f_created_at
            }
            setMission(supabaseMission)
          } else {
            setError("미션을 찾을 수 없습니다")
          }
        }
      } catch (err) {
        console.error("미션 로딩 에러:", err)
        setError("미션을 불러오는데 실패했습니다")
      } finally {
        setLoading(false)
      }
    }

    fetchMission()
  }, [params.id])

  if (loading) {
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
                <p className="text-muted-foreground">미션을 불러오는 중...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !mission) {
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
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">{error || "미션을 찾을 수 없습니다"}</p>
                <Link href="/">
                  <Button>홈으로 돌아가기</Button>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

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

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto">
            {mission.form === "binary" && <MultiVotePage mission={mission} />}
            {mission.form === "multi" && <MultiVotePage mission={mission} />}
            {mission.form === "match" && <MatchVotePage mission={mission} />}
            {mission.form === "subjective" && <SubjectiveVotePage mission={mission} />}
            {!["binary", "multi", "match", "subjective"].includes(mission.form) && (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">지원하지 않는 투표 형식입니다</p>
                <Link href="/">
                  <Button>홈으로 돌아가기</Button>
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}
