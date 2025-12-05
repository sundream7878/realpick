"use client"

import { Button } from "@/components/c-ui/button"
import { Card, CardContent } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Input } from "@/components/c-ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/c-ui/select"
import { Heart, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Plus, X } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import type { TMission, TMatchPairs } from "@/types/t-vote/vote.types"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { MissionCard } from "@/components/c-mission/MissionCard"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import MyPickViewModal from "@/components/c-my-pick-view-modal/my-pick-view-modal"
import { useRouter } from "next/navigation"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { getMissionsByCreator, getMissionsByParticipant, submitPredictMissionAnswer, updatePredictMissionAnswer, settleMissionWithFinalAnswer, updateEpisodeStatuses, settleMatchMission } from "@/lib/supabase/missions"
import { hasUserVoted as checkUserVoted } from "@/lib/supabase/votes"
import { getUser } from "@/lib/supabase/users"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { useToast } from "@/hooks/h-toast/useToast.hook"

export default function MyPage() {
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
  const [participatedMissions, setParticipatedMissions] = useState<TMission[]>([])
  const [createdMissions, setCreatedMissions] = useState<TMission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null)
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({})
  const [matchAnswerDrafts, setMatchAnswerDrafts] = useState<Record<string, Array<{ left: string; right: string }>>>({})
  const [matchPairSelections, setMatchPairSelections] = useState<Record<string, { left?: string; right?: string }>>({})
  const [submittingMissionId, setSubmittingMissionId] = useState<string | null>(null)
  const [editingMissionAnswers, setEditingMissionAnswers] = useState<Record<string, boolean>>({})
  const userId = getUserId()
  const { toast } = useToast()

  // 유저 데이터 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (isAuthenticated() && userId) {
        try {
          const user = await getUser(userId)
          if (user) {
            setUserNickname(user.nickname)
            setUserPoints(user.points)
            setUserTier(getTierFromDbOrPoints(user.tier, user.points))
          }
        } catch (error) {
          console.error("유저 데이터 로딩 실패:", error)
        }
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
  }, [userId])

  const loadMissions = useCallback(async () => {
    if (!isAuthenticated() || !userId) {
      setCreatedMissions([])
      setParticipatedMissions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const [createdResult, participatedResult] = await Promise.all([
        getMissionsByCreator(userId),
        getMissionsByParticipant(userId),
      ])

      if (createdResult.success && createdResult.missions) {
        const created: TMission[] = createdResult.missions.map((mission: any) => {
          if (mission.__table === "t_missions2") {
            return {
              id: mission.f_id,
              title: mission.f_title,
              kind: mission.f_kind || "predict",
              form: "match",
              seasonType: mission.f_season_type || "전체",
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
              },
              result: {
                distribution: {},
                correctAnswer:
                  mission.f_final_answer && mission.f_final_answer.length > 0
                    ? "최종 커플 확정"
                    : undefined,
                totalVotes: mission.f_stats_total_votes || 0,
              },
              createdAt: mission.f_created_at,
              updatedAt: mission.f_updated_at,
            } as TMission
          }

          return {
            id: mission.f_id,
            title: mission.f_title,
            kind: mission.f_kind,
            form: mission.f_form,
            seasonType: mission.f_season_type || "전체",
            seasonNumber: mission.f_season_number || undefined,
            options: mission.f_options || [],
            deadline: mission.f_deadline,
            revealPolicy: mission.f_reveal_policy,
            status: mission.f_status,
            stats: {
              participants: mission.f_stats_participants || 0,
              totalVotes: mission.f_stats_total_votes || 0,
            },
            result: {
              distribution: mission.f_option_vote_counts || {},
              correctAnswer: mission.f_correct_answer || undefined,
              majorityOption: mission.f_majority_option || undefined,
              totalVotes: mission.f_stats_total_votes || 0,
            },
            createdAt: mission.f_created_at,
            updatedAt: mission.f_updated_at,
          } as TMission
        })

        created.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setCreatedMissions(created)
      }

      if (participatedResult.success && participatedResult.missions) {
        const participated: TMission[] = participatedResult.missions.map((mission: any) => ({
          id: mission.f_id,
          title: mission.f_title,
          kind: mission.f_kind,
          form: mission.f_form,
          seasonType: mission.f_season_type || "전체",
          seasonNumber: mission.f_season_number || undefined,
          options: mission.f_options || [],
          deadline: mission.f_deadline,
          revealPolicy: mission.f_reveal_policy,
          status: mission.f_status,
          stats: {
            participants: mission.f_stats_participants || 0,
            totalVotes: mission.f_stats_total_votes || 0,
          },
          result: {
            distribution: mission.f_option_vote_counts || {},
            correctAnswer: mission.f_correct_answer || undefined,
            majorityOption: mission.f_majority_option || undefined,
            totalVotes: mission.f_stats_total_votes || 0,
          },
          createdAt: mission.f_created_at,
        }))
        setParticipatedMissions(participated)
      }
    } catch (error) {
      console.error("미션 데이터 로딩 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadMissions()
  }, [loadMissions])

  useEffect(() => {
    setAnswerDrafts((prev) => {
      const next: Record<string, string> = {}

      createdMissions.forEach((mission) => {
        if (mission.kind === "predict" && mission.form !== "match") {
          const serverAnswer = mission.result?.correctAnswer ?? ""
          next[mission.id] =
            mission.status === "settled"
              ? serverAnswer
              : prev[mission.id] ?? serverAnswer
        }
      })

      return next
    })

    setMatchAnswerDrafts((prev) => {
      const next: Record<string, Array<{ left: string; right: string }>> = {}

      createdMissions.forEach((mission) => {
        if (mission.form === "match") {
          const serverPairs = mission.finalAnswer ? [...mission.finalAnswer] : []
          next[mission.id] =
            mission.status === "settled"
              ? serverPairs
              : prev[mission.id] ?? serverPairs
        }
      })

      return next
    })
  }, [createdMissions])

  const hasUserVoted = (missionId: string): boolean => {
    // 참여한 미션 목록에 있으면 참여한 것
    return participatedMissions.some(m => m.id === missionId)
  }

  const shouldShowResults = (mission: TMission): boolean => {
    const isClosed = mission.deadline ? isDeadlinePassed(mission.deadline) : mission.status === "settled"
    return isClosed || hasUserVoted(mission.id)
  }

  const handleSeasonSelect = (season: string) => {
    setSelectedSeason(season)
  }

  const handleViewPick = (mission: TMission) => {
    setSelectedMissionForView(mission)
    setIsPickViewModalOpen(true)
  }

  const isMatchMissionClosed = (mission: TMission) => {
    if (mission.status === "settled") return true

    const episodeStatuses = mission.episodeStatuses || {}
    const totalEpisodes = mission.episodes || 8

    for (let i = 1; i <= totalEpisodes; i++) {
      if (episodeStatuses[i] !== "settled") {
        return false
      }
    }

    return true
  }

  const isMissionClosedForDealer = (mission: TMission) => {
    if (mission.form === "match") {
      return isMatchMissionClosed(mission)
    }

    if (mission.status === "settled" || mission.status === "closed") {
      return true
    }

    return mission.deadline ? isDeadlinePassed(mission.deadline) : false
  }

  const formatDateTime = (value?: string) => {
    if (!value) return "-"
    try {
      return new Date(value).toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return value
    }
  }

  const getKindLabel = (mission: TMission) => (mission.kind === "predict" ? "예측픽" : "공감픽")

  const getFormLabel = (mission: TMission) => {
    switch (mission.form) {
      case "binary":
        return "2지선다"
      case "multi":
        return "다자선택"
      case "match":
        return "커플매칭"
      case "subjective":
        return "주관식"
      default:
        return mission.form
    }
  }

  const getStatusBadgeClass = (status: TMission["status"]) => {
    switch (status) {
      case "settled":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "closed":
        return "bg-amber-50 text-amber-700 border-amber-200"
      default:
        return "bg-blue-50 text-blue-700 border-blue-200"
    }
  }

  const getStatusLabel = (status: TMission["status"]) => {
    switch (status) {
      case "settled":
        return "결과 확정"
      case "closed":
        return "마감"
      default:
        return "진행중"
    }
  }

  const toggleMissionPanel = (missionId: string) => {
    setExpandedMissionId(prev => (prev === missionId ? null : missionId))
  }

  const handlePredictAnswerSubmit = async (missionId: string) => {
    const answer = answerDrafts[missionId]?.trim()
    if (!answer) {
      toast({
        title: "정답을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setSubmittingMissionId(missionId)
    try {
      // 딜러가 정답을 확정하는 것이므로 settleMissionWithFinalAnswer 호출
      const result = await settleMissionWithFinalAnswer(missionId, answer)
      if (!result.success) {
        toast({
          title: "정답 저장 실패",
          description: result.error ?? "다시 시도해주세요.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "정답이 확정되었습니다.",
        description: "참여자들에게 결과가 공개됩니다.",
      })
      await loadMissions()
    } catch (error) {
      console.error("정답 확정 중 오류:", error)
      toast({
        title: "정답 저장 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setSubmittingMissionId(null)
    }
  }

  const handlePredictAnswerUpdate = async (mission: TMission) => {
    const missionId = mission.id
    const answer = answerDrafts[missionId]?.trim()
    if (!answer) {
      toast({
        title: "정답을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setSubmittingMissionId(missionId)
    try {
      // 정답 수정도 동일하게 settleMissionWithFinalAnswer 호출 (이미 settled 상태여도 업데이트 가능하도록)
      const result = await settleMissionWithFinalAnswer(missionId, answer)
      if (!result.success) {
        toast({
          title: "정답 수정 실패",
          description: result.error ?? "다시 시도해주세요.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "정답이 수정되었습니다.",
        description: "참여자들에게 수정된 결과가 반영됩니다.",
      })
      setEditingMissionAnswers(prev => {
        const next = { ...prev }
        delete next[missionId]
        return next
      })
      await loadMissions()
    } catch (error) {
      console.error("정답 수정 중 오류:", error)
      toast({
        title: "정답 수정 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setSubmittingMissionId(null)
    }
  }

  const handleMatchAnswerSubmit = async (missionId: string) => {
    const pairs = matchAnswerDrafts[missionId] || []
    if (pairs.length === 0) {
      toast({
        title: "최소 한 쌍 이상의 커플을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setSubmittingMissionId(missionId)
    try {
      const result = await settleMatchMission(missionId, pairs)
      if (!result.success) {
        toast({
          title: "최종 커플 저장 실패",
          description: result.error ?? "다시 시도해주세요.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "최종 커플이 확정되었습니다.",
        description: "딜러 결과가 즉시 공개됩니다.",
      })
      await loadMissions()
    } catch (error) {
      console.error("커플 결과 저장 중 오류:", error)
      toast({
        title: "최종 커플 저장 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setSubmittingMissionId(null)
    }
  }

  const handleAddMatchPair = (missionId: string) => {
    const selection = matchPairSelections[missionId]
    if (!selection?.left || !selection?.right) {
      toast({
        title: "남녀 커플을 모두 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    const currentPairs = matchAnswerDrafts[missionId] || []
    if (currentPairs.some(pair => pair.left === selection.left || pair.right === selection.right)) {
      toast({
        title: "이미 선택된 출연자입니다.",
        description: "한 출연자는 한 번만 매칭할 수 있습니다.",
        variant: "destructive",
      })
      return
    }

    setMatchAnswerDrafts(prev => ({
      ...prev,
      [missionId]: [...currentPairs, { left: selection.left, right: selection.right }],
    }))

    setMatchPairSelections(prev => ({
      ...prev,
      [missionId]: { left: undefined, right: undefined },
    }))
  }

  const handleRemoveMatchPair = (missionId: string, index: number) => {
    setMatchAnswerDrafts(prev => ({
      ...prev,
      [missionId]: (prev[missionId] || []).filter((_, pairIndex) => pairIndex !== index),
    }))
  }

  const handleEpisodeStatusChange = async (missionId: string, episodeNo: number, status: "open" | "settled" | "locked") => {
    setSubmittingMissionId(missionId)
    try {
      const result = await updateEpisodeStatuses(missionId, episodeNo, status)
      if (!result.success) {
        toast({
          title: "회차 상태 변경 실패",
          description: result.error ?? "다시 시도해주세요.",
          variant: "destructive",
        })
        return
      }

      const statusText = status === "open" ? "투표 활성화" : status === "settled" ? "마감" : "잠금"
      toast({
        title: `${episodeNo}차 상태 변경 완료`,
        description: `${statusText} 처리되었습니다.`,
      })
      await loadMissions()
    } catch (error) {
      console.error("회차 상태 변경 중 오류:", error)
      toast({
        title: "회차 상태 변경 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setSubmittingMissionId(null)
    }
  }

  const startEditingMissionAnswer = (mission: TMission) => {
    setEditingMissionAnswers(prev => ({
      ...prev,
      [mission.id]: true,
    }))
    setAnswerDrafts(prev => ({
      ...prev,
      [mission.id]: mission.result?.correctAnswer ?? "",
    }))
  }

  const cancelEditingMissionAnswer = (mission: TMission) => {
    setEditingMissionAnswers(prev => {
      const next = { ...prev }
      delete next[mission.id]
      return next
    })
    setAnswerDrafts(prev => ({
      ...prev,
      [mission.id]: mission.result?.correctAnswer ?? "",
    }))
  }

  const renderDealerPanel = (mission: TMission) => {
    const isClosedForDealer = isMissionClosedForDealer(mission)
    const isSettled = mission.status === "settled"
    const canSubmit = isClosedForDealer && !isSettled
    const isEditingAnswer = !!editingMissionAnswers[mission.id]

    if (mission.kind !== "predict") {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span>공감픽/주관식 미션은 정답 입력이 필요 없습니다.</span>
        </div>
      )
    }

    if (mission.form === "match") {
      const matchPairs = (mission.options as TMatchPairs) || { left: [], right: [] }
      const leftOptions = Array.isArray(matchPairs?.left) ? matchPairs.left : []
      const rightOptions = Array.isArray(matchPairs?.right) ? matchPairs.right : []
      const currentPairs = matchAnswerDrafts[mission.id] || []
      const selection = matchPairSelections[mission.id] || {}

      const totalEpisodes = mission.episodes || 8
      const episodeStatuses = mission.episodeStatuses || {}

      return (
        <div className="space-y-4">
          {/* 회차별 상태 관리 */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <p className="text-sm font-semibold text-purple-900">회차별 상태 관리</p>
            </div>
            <p className="text-xs text-purple-700">각 회차의 투표를 열거나 마감할 수 있습니다.</p>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((episodeNo) => {
                const status = episodeStatuses[episodeNo] || "locked"
                const isProcessing = submittingMissionId === mission.id

                return (
                  <div key={episodeNo} className="flex flex-col items-center gap-1">
                    <div className="text-xs font-medium text-gray-700">{episodeNo}차</div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${status === "open"
                        ? "bg-green-100 text-green-700 border-green-300"
                        : status === "settled"
                          ? "bg-gray-200 text-gray-700 border-gray-400"
                          : "bg-gray-100 text-gray-500 border-gray-300"
                        }`}
                    >
                      {status === "open" ? "진행중" : status === "settled" ? "마감" : "잠금"}
                    </Badge>
                    <div className="flex flex-col gap-1 w-full">
                      {status === "locked" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-300 w-full"
                          onClick={() => handleEpisodeStatusChange(mission.id, episodeNo, "open")}
                          disabled={isProcessing}
                        >
                          오픈
                        </Button>
                      )}
                      {status === "open" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300 w-full"
                            onClick={() => handleEpisodeStatusChange(mission.id, episodeNo, "settled")}
                            disabled={isProcessing}
                          >
                            마감
                          </Button>
                        </>
                      )}
                      {status === "settled" && (
                        <span className="text-xs text-gray-500 text-center">마감됨</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-gray-700">
            <AlertCircle className="h-4 w-4 text-purple-500" />
            <span>최종 커플을 입력하면 즉시 결과가 확정되며, 이후에는 수정할 수 없습니다.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">남성 출연자</p>
              <div className="flex flex-wrap gap-2">
                {leftOptions.length > 0 ? (
                  leftOptions.map((name) => (
                    <Badge key={name} variant="outline" className="border-purple-200 bg-white text-purple-700">
                      {name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">등록된 출연자가 없습니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">여성 출연자</p>
              <div className="flex flex-wrap gap-2">
                {rightOptions.length > 0 ? (
                  rightOptions.map((name) => (
                    <Badge key={name} variant="outline" className="border-pink-200 bg-white text-pink-700">
                      {name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">등록된 출연자가 없습니다.</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-800">입력된 커플</p>
            {currentPairs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 px-4 py-3 text-sm text-gray-500">
                아직 입력된 커플이 없습니다. 아래에서 커플을 추가해주세요.
              </div>
            ) : (
              <div className="space-y-2">
                {currentPairs.map((pair, index) => (
                  <div
                    key={`${pair.left}-${pair.right}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-purple-100 bg-white px-3 py-2"
                  >
                    <span className="text-sm font-medium text-purple-800">
                      {pair.left} ❤️ {pair.right}
                    </span>
                    {!isSettled && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-purple-500 hover:text-purple-700"
                        onClick={() => handleRemoveMatchPair(mission.id, index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isSettled && (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">남성 선택</p>
                  <Select
                    value={selection.left ?? undefined}
                    onValueChange={(value) =>
                      setMatchPairSelections((prev) => ({
                        ...prev,
                        [mission.id]: { ...prev[mission.id], left: value },
                      }))
                    }
                    disabled={leftOptions.length === 0}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="남성을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {leftOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">여성 선택</p>
                  <Select
                    value={selection.right ?? undefined}
                    onValueChange={(value) =>
                      setMatchPairSelections((prev) => ({
                        ...prev,
                        [mission.id]: { ...prev[mission.id], right: value },
                      }))
                    }
                    disabled={rightOptions.length === 0}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="여성을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {rightOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => handleAddMatchPair(mission.id)}
                  disabled={!selection.left || !selection.right || !canSubmit}
                >
                  <Plus className="h-4 w-4" />
                  커플 추가
                </Button>

                <Button
                  className="bg-purple-700 hover:bg-purple-800 text-white"
                  disabled={!canSubmit || currentPairs.length === 0 || submittingMissionId === mission.id}
                  onClick={() => handleMatchAnswerSubmit(mission.id)}
                >
                  {canSubmit
                    ? submittingMissionId === mission.id
                      ? "저장 중..."
                      : "최종 커플 확정"
                    : "마감 후 확정 가능"}
                </Button>
              </div>
              {!isClosedForDealer && (
                <p className="text-xs text-gray-500">모든 회차가 마감되어야 최종 커플을 확정할 수 있습니다.</p>
              )}
            </>
          )}

          {isSettled && (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>최종 커플이 확정되었습니다.</span>
            </div>
          )}
        </div>
      )
    }

    const options = Array.isArray(mission.options) ? (mission.options as string[]) : []
    const currentAnswer = answerDrafts[mission.id] ?? ""
    const answerTrimmed = currentAnswer.trim()
    const inputDisabled = submittingMissionId === mission.id || (isSettled && !isEditingAnswer)

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <AlertCircle className="h-4 w-4 text-purple-500" />
          <span>정답을 입력하면 결과가 확정되며, 이후에는 수정할 수 없습니다.</span>
        </div>

        <div className="rounded-xl border border-purple-100 bg-white p-4 shadow-sm space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500">정답 입력</p>
            <Input
              value={currentAnswer}
              onChange={(event) =>
                setAnswerDrafts((prev) => ({
                  ...prev,
                  [mission.id]: event.target.value,
                }))
              }
              placeholder="정답을 입력하세요"
              disabled={inputDisabled}
            />

            {options.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={isSettled && !isEditingAnswer}
                    onClick={() =>
                      setAnswerDrafts((prev) => ({
                        ...prev,
                        [mission.id]: option,
                      }))
                    }
                  >
                    {option}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            {mission.result?.correctAnswer && (
              <Badge className="w-fit bg-emerald-50 text-emerald-700 border-emerald-200">
                최종 정답: {mission.result.correctAnswer}
              </Badge>
            )}
            {!isSettled ? (
              <Button
                className="bg-purple-700 hover:bg-purple-800 text-white md:w-auto"
                disabled={!canSubmit || !answerTrimmed || submittingMissionId === mission.id}
                onClick={() => handlePredictAnswerSubmit(mission.id)}
              >
                {canSubmit
                  ? submittingMissionId === mission.id
                    ? "저장 중..."
                    : "정답 확정"
                  : "마감 후 확정 가능"}
              </Button>
            ) : isEditingAnswer ? (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
                <Button
                  className="bg-purple-700 hover:bg-purple-800 text-white md:w-auto"
                  disabled={!answerTrimmed || submittingMissionId === mission.id}
                  onClick={() => handlePredictAnswerUpdate(mission)}
                >
                  {submittingMissionId === mission.id ? "수정 중..." : "정답 수정 완료"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="md:w-auto text-gray-600"
                  onClick={() => cancelEditingMissionAnswer(mission)}
                  disabled={submittingMissionId === mission.id}
                >
                  취소
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="md:w-auto gap-2"
                onClick={() => startEditingMissionAnswer(mission)}
              >
                정답 수정
              </Button>
            )}
          </div>
          {!isClosedForDealer && !isSettled && (
            <p className="text-xs text-gray-500">마감 시간 이후에만 정답을 확정할 수 있습니다.</p>
          )}
        </div>
      </div>
    )
  }

  const predictMissionCards = createdMissions.filter(m => m.kind === "predict")
  const majorityMissionCards = createdMissions.filter(m => m.kind === "majority")

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
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-8 h-8 text-pink-600 fill-pink-600" />
              <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
            </div>

            <Tabs defaultValue="participated" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="participated" className="relative">
                  내가 참여한 미션
                  <Badge className="ml-2 bg-pink-500 hover:bg-pink-600 text-white">{participatedMissions.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="created" className="relative">
                  내가 생성한 미션
                  <Badge className="ml-2 bg-purple-500 hover:bg-purple-600 text-white">{createdMissions.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participated" className="space-y-4">
                {isLoading ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">미션을 불러오는 중...</p>
                    </CardContent>
                  </Card>
                ) : participatedMissions.length === 0 ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">아직 참여한 미션이 없습니다.</p>
                      <Link href="/">
                        <Button className="mt-4 bg-pink-600 hover:bg-pink-700 text-white">미션 참여하러 가기</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {participatedMissions.map((mission) => (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        shouldShowResults={shouldShowResults(mission)}
                        onViewPick={() => handleViewPick(mission)}
                        variant="default"
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="created" className="space-y-4">
                {isLoading ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">미션을 불러오는 중...</p>
                    </CardContent>
                  </Card>
                ) : createdMissions.length === 0 ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">아직 생성한 미션이 없습니다.</p>
                      <Button
                        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => setIsMissionModalOpen(true)}
                      >
                        미션 생성하기
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <Card className="border-dashed border-purple-200 bg-purple-50/70">
                      <CardContent className="py-4 text-sm text-purple-800">
                        예측픽은 마감 이후에만 정답을 확정할 수 있어요. 커플매칭은 모든 회차가 마감되면 최종 커플을 입력해주세요.
                      </CardContent>
                    </Card>

                    {predictMissionCards.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-purple-900">예측픽 미션</h3>
                          <span className="text-sm text-purple-600">{predictMissionCards.length}개</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                          {predictMissionCards.map((mission) => {
                            const participants = mission.stats?.participants?.toLocaleString() ?? "0"
                            const missionSettledText =
                              mission.form === "match"
                                ? `${mission.finalAnswer?.length ?? 0}쌍 확정`
                                : mission.result?.correctAnswer
                                  ? `정답: ${mission.result.correctAnswer}`
                                  : "정답 미입력"

                            return (
                              <div key={mission.id} className="flex flex-col rounded-2xl border border-purple-100 bg-white shadow-sm">
                                <div className="flex flex-col gap-4 p-5 h-full">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge className="border bg-blue-50 text-blue-700 border-blue-200">예측픽</Badge>
                                      <Badge className="border border-purple-200 bg-purple-50 text-purple-700">
                                        {getFormLabel(mission)}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        생성 {formatDateTime(mission.createdAt)}
                                      </span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">{mission.title}</h3>
                                    <p className="text-sm text-gray-500">
                                      마감 {mission.form === "match" ? "회차 완료 시" : formatDateTime(mission.deadline)} · 참여자 {participants}명
                                    </p>
                                    {mission.status === "settled" && (
                                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>{missionSettledText}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-auto flex flex-col items-start gap-2 w-full">
                                    <Badge className={`border ${getStatusBadgeClass(mission.status)}`}>
                                      {getStatusLabel(mission.status)}
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2 w-full"
                                      onClick={() => toggleMissionPanel(mission.id)}
                                    >
                                      {expandedMissionId === mission.id ? (
                                        <>
                                          접기
                                          <ChevronUp className="h-4 w-4" />
                                        </>
                                      ) : (
                                        <>
                                          정답 입력
                                          <ChevronDown className="h-4 w-4" />
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                {expandedMissionId === mission.id && (
                                  <div className="space-y-4 border-t border-purple-50 bg-gradient-to-br from-pink-50/70 to-purple-50/70 px-5 py-4">
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                      <span>시즌: {mission.seasonType === "기수별" ? `${mission.seasonNumber ?? "-"}기` : mission.seasonType ?? "-"}</span>
                                      <span>공개 정책: {mission.revealPolicy === "realtime" ? "실시간" : "마감 후"}</span>
                                    </div>

                                    {renderDealerPanel(mission)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    )}

                    {majorityMissionCards.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-slate-900">다수픽 미션</h3>
                          <span className="text-sm text-slate-600">{majorityMissionCards.length}개</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                          {majorityMissionCards.map((mission) => {
                            const participants = mission.stats?.participants?.toLocaleString() ?? "0"
                            const missionSettledText = mission.result?.majorityOption ? `최종 다수: ${mission.result.majorityOption}` : "결과 미확정"

                            return (
                              <div key={mission.id} className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm">
                                <div className="flex flex-col gap-4 p-5 h-full">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge className="border bg-green-50 text-green-700 border-green-200">공감픽</Badge>
                                      <Badge className="border border-purple-200 bg-purple-50 text-purple-700">
                                        {getFormLabel(mission)}
                                      </Badge>
                                      <span className="text-xs text-gray-500">생성 {formatDateTime(mission.createdAt)}</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">{mission.title}</h3>
                                    <p className="text-sm text-gray-500">
                                      시즌 {mission.seasonType === "기수별" ? `${mission.seasonNumber ?? "-"}기` : mission.seasonType ?? "-"} · 참여자 {participants}명
                                    </p>
                                    {mission.status === "settled" && (
                                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>{missionSettledText}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-auto flex flex-col items-start gap-2 w-full">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2 w-full"
                                      onClick={() => toggleMissionPanel(mission.id)}
                                    >
                                      {expandedMissionId === mission.id ? (
                                        <>
                                          접기
                                          <ChevronUp className="h-4 w-4" />
                                        </>
                                      ) : (
                                        <>
                                          상세 보기
                                          <ChevronDown className="h-4 w-4" />
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                {expandedMissionId === mission.id && (
                                  <div className="space-y-4 border-t border-purple-50 bg-gradient-to-br from-slate-50/70 to-purple-50/60 px-5 py-4">
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                      <span>시즌: {mission.seasonType === "기수별" ? `${mission.seasonNumber ?? "-"}기` : mission.seasonType ?? "-"}</span>
                                      <span>공개 정책: {mission.revealPolicy === "realtime" ? "실시간" : "마감 후"}</span>
                                    </div>

                                    {renderDealerPanel(mission)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
          activeNavItem="mypage"
        />

        <MissionCreationModal isOpen={isMissionModalOpen} onClose={() => setIsMissionModalOpen(false)} />
        <MyPickViewModal
          isOpen={isPickViewModalOpen}
          onClose={() => setIsPickViewModalOpen(false)}
          mission={selectedMissionForView!}
          userVote={null} // TODO: 실제 유저 투표 데이터 가져오기
        />
      </div>
    </div>
  )
}
