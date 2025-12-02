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
import { SubjectiveVotePage } from "@/components/c-vote/subjective-vote-page"
import { CommentSection } from "@/components/c-comment/CommentSection"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import type { TMission, TVoteSubmission } from "@/types/t-vote/vote.types"
import type { TTierInfo } from "@/types/t-tier/tier.types"

export default function VotePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [mission, setMission] = useState<TMission | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [userVote, setUserVote] = useState<TVoteSubmission | null>(null)
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
          }
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
          form: missionType === "mission2" ? "match" : missionData.f_form,
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
          subjectivePlaceholder: missionData.f_subjective_placeholder
        }

        setMission(mappedMission)

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
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
        <AppHeader
          selectedShow={selectedShow}
          onShowChange={setSelectedShow}
          userNickname={userNickname}
          userPoints={userPoints}
          userTier={userTier}
          onAvatarClick={() => router.push("/p-profile")}
        />

        <main className="w-full max-w-6xl mx-auto px-6 md:px-8 py-4">
          {mission.form === "binary" && (
            <MultiVotePage mission={mission} />
          )}
          {mission.form === "multi" && (
            <MultiVotePage mission={mission} />
          )}
          {mission.form === "match" && (
            <MatchVotePage mission={mission} />
          )}
          {mission.form === "subjective" && (
            <SubjectiveVotePage mission={mission} />
          )}

          {/* 댓글 섹션 추가 */}
          <CommentSection
            missionId={mission.id}
            missionType={mission.form === "match" ? "mission2" : "mission1"}
            currentUserId={userId || undefined}
          />
        </main>

        <BottomNavigation />
      </div>
    </div>
  )
}
