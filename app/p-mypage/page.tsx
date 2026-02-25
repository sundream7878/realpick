"use client"

import { Button } from "@/components/c-ui/button"
import { Card, CardContent } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Input } from "@/components/c-ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/c-ui/select"
import { Heart, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Plus, X } from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { getTierFromPoints, getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import type { TUserRole } from "@/lib/utils/permissions"
import type { TMission, TMatchPairs } from "@/types/t-vote/vote.types"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { BannerAd } from "@/components/c-banner-ad/banner-ad"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { MissionCard } from "@/components/c-mission/MissionCard"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import MyPickViewModal from "@/components/c-my-pick-view-modal/my-pick-view-modal"
import { useRouter, useSearchParams } from "next/navigation"
import { getUserId, isAuthenticated } from "@/lib/auth-utils"
import { getMissionsByCreator, getMissionsByParticipant, submitPredictMissionAnswer, updatePredictMissionAnswer, settleMissionWithFinalAnswer, updateEpisodeStatuses, settleMatchMission } from "@/lib/firebase/missions"
import { getUserVotesMap } from "@/lib/firebase/votes"
import { getUser } from "@/lib/firebase/users"
import { isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { getShowByName, getShowById, normalizeShowId, CATEGORIES, SHOWS } from "@/lib/constants/shows"
import type { TShowCategory } from "@/lib/constants/shows"

const ITEMS_PER_PAGE = 10

export default function MyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  const [userNickname, setUserNickname] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [userRole, setUserRole] = useState<TUserRole>("PICKER")
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedShowId, setSelectedShowId] = useState<string | null>(searchParams.get('show'))
  const [selectedSeason, setSelectedSeason] = useState<string>("전체")
  const [isLoading, setIsLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [createdMissions, setCreatedMissions] = useState<TMission[]>([])
  const [participatedMissions, setParticipatedMissions] = useState<TMission[]>([])
  const [userChoices, setUserChoices] = useState<Record<string, any>>({})
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({})
  const [matchAnswerDrafts, setMatchAnswerDrafts] = useState<Record<string, Array<{ left: string; right: string }>>>({})
  const [matchPairSelections, setMatchPairSelections] = useState<Record<string, Record<string, string>>>({})
  const [selectedMissionForView, setSelectedMissionForView] = useState<TMission | null>(null)
  const [isPickViewModalOpen, setIsPickViewModalOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<TShowCategory | "ALL">("ALL")
  const [filterShowId, setFilterShowId] = useState<string>("ALL")
  const [createdTab, setCreatedTab] = useState<"predict" | "majority">("predict")
  const [createdPage, setCreatedPage] = useState(1)
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null)
  const [editingMissionAnswers, setEditingMissionAnswers] = useState<Record<string, boolean>>({})
  const [submittingMissionId, setSubmittingMissionId] = useState<string | null>(null)
  
  const userId = getUserId()
  const { toast } = useToast()

  // Show Statuses, Visibility, Custom Shows Fetching & Sync
  const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
  const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
  const [customShows, setCustomShows] = useState<any[]>([])

  // 사용자 정보 로딩
  const loadUserInfo = useCallback(async () => {
    const isAuth = isAuthenticated()
    const currentUserId = getUserId()

    if (!currentUserId) {
      console.warn('[MyPage] userId가 없음')
      setUserNickname("")
      setUserPoints(0)
      setUserTier(getTierFromPoints(0))
      setUserRole("PICKER")
      return
    }

    if (!isAuth) {
      // 익명 사용자 정보 설정
      setUserNickname(getAnonNickname())
      setUserPoints(0)
      setUserTier(getTierFromPoints(0))
      setUserRole("PICKER")
      return
    }

    try {
      console.log('[MyPage] 사용자 정보 로딩 시작 - userId:', currentUserId)
      const { getUser } = await import('@/lib/firebase/users')
      const user = await getUser(currentUserId)
      
      console.log('[MyPage] 사용자 정보 결과:', user)
      
      if (user) {
        setUserNickname(user.nickname || "")
        setUserPoints(user.points || 0)
        setUserTier(getTierFromPoints(user.points || 0))
        setUserRole(user.role || "PICKER")
      }
    } catch (error) {
      console.error('[MyPage] 사용자 정보 로딩 중 오류:', error)
    }
  }, [])

  useEffect(() => {
    const { setupShowStatusSync } = require('@/lib/utils/u-show-status/showStatusSync.util')
    const cleanup = setupShowStatusSync(
      setShowStatuses,
      setShowVisibility,
      setCustomShows
    )
    return cleanup
  }, [])

  // 사용자 정보 로딩
  useEffect(() => {
    loadUserInfo()
  }, [loadUserInfo])

  const loadMissions = useCallback(async () => {
    const isAuth = isAuthenticated()
    const currentUserId = getUserId()

    if (!currentUserId) {
      setCreatedMissions([])
      setParticipatedMissions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // 1. 익명 사용자인 경우 localStorage에서 참여 데이터 로드
      if (!isAuth) {
        console.log('[MyPage] 익명 사용자 데이터 로드 중...')
        // 익명 사용자는 생성한 미션이 없음
        setCreatedMissions([])
        
        // localStorage에서 참여한 미션 ID들 찾기
        const participated: TMission[] = []
        const votedIds: string[] = []
        const choices: Record<string, any> = {}

        // 모든 localStorage 키 순회하여 미션 참여 데이터 찾기
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('rp_picked_')) {
            const missionId = key.replace('rp_picked_', '')
            votedIds.push(missionId)
            
            const localVote = localStorage.getItem(key)
            if (localVote) {
              try {
                const parsed = JSON.parse(localVote)
                choices[missionId] = parsed.choice || parsed
              } catch {
                choices[missionId] = localVote
              }
            }
          }
        }

        if (votedIds.length > 0) {
          // Firebase에서 미션 상세 정보 가져오기
          const { getMissionsByIds } = await import('@/lib/firebase/missions')
          const missionsResult = await getMissionsByIds(votedIds)
          if (missionsResult.success && missionsResult.missions) {
            setParticipatedMissions(missionsResult.missions)
            setUserChoices(choices)
          }
        } else {
          setParticipatedMissions([])
        }
        setIsLoading(false)
        return
      }

      // 2. 인증된 사용자인 경우 Firebase에서 로드
      console.log('[MyPage] Firebase에서 미션 데이터 가져오는 중...')
      const [createdResult, participatedResult] = await Promise.all([
        getMissionsByCreator(currentUserId),
        getMissionsByParticipant(currentUserId),
      ])
      
      console.log('[MyPage] createdResult:', createdResult)
      console.log('[MyPage] participatedResult:', participatedResult)

      if (createdResult.success && createdResult.missions) {
        const created: TMission[] = createdResult.missions.map((mission: any) => {
          // showId 정규화 (한글 → 영어)
          const normalizedShowId = normalizeShowId(mission.showId)
          
          if (mission.__table === "missions2") {
            return {
              id: mission.id,
              showId: normalizedShowId,
              title: mission.title,
              kind: mission.kind || "predict",
              form: "match",
              seasonType: mission.seasonType || "전체",
              seasonNumber: mission.seasonNumber || undefined,
              options: mission.matchPairs,
              deadline: mission.deadline,
              revealPolicy: mission.revealPolicy,
              status: mission.status,
              episodes: mission.totalEpisodes || 8,
              episodeStatuses: mission.episodeStatuses || {},
              finalAnswer: mission.finalAnswer || undefined,
              stats: {
                participants: mission.participants || 0,
              },
              result: {
                distribution: {},
                correctAnswer:
                  mission.finalAnswer && mission.finalAnswer.length > 0
                    ? "최종 커플 확정"
                    : undefined,
                totalVotes: mission.totalVotes || 0,
              },
              createdAt: mission.createdAt?.toDate?.()?.toISOString() || mission.createdAt,
              updatedAt: mission.updatedAt?.toDate?.()?.toISOString() || mission.updatedAt,
              thumbnailUrl: mission.thumbnailUrl,
              referenceUrl: mission.referenceUrl,
              isLive: mission.isLive,
            } as TMission
          }
          
          return {
            id: mission.id,
            showId: normalizedShowId,
            title: mission.title,
            kind: mission.kind,
            form: mission.form,
            seasonType: mission.seasonType || "전체",
            seasonNumber: mission.seasonNumber || undefined,
            options: mission.options || [],
            deadline: mission.deadline,
            revealPolicy: mission.revealPolicy,
            status: mission.status,
            stats: {
              participants: mission.participants || 0,
              totalVotes: mission.totalVotes || 0,
            },
            result: {
              distribution: mission.optionVoteCounts || {},
              correctAnswer: mission.correctAnswer || undefined,
              majorityOption: mission.majorityOption || undefined,
              totalVotes: mission.totalVotes || 0,
            },
            createdAt: mission.createdAt?.toDate?.()?.toISOString() || mission.createdAt,
            updatedAt: mission.updatedAt?.toDate?.()?.toISOString() || mission.updatedAt,
            thumbnailUrl: mission.thumbnailUrl,
            referenceUrl: mission.referenceUrl,
            isLive: mission.isLive,
          } as TMission
        })

        created.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setCreatedMissions(created)
      }

      if (participatedResult.success && participatedResult.missions) {
        const participatedIds = participatedResult.missions.map((m: any) => m.id)
        const { getUserVotesMap } = await import("@/lib/firebase/votes")
        const choicesMap = await getUserVotesMap(userId, participatedIds)
        setUserChoices(choicesMap)

        const participated: TMission[] = participatedResult.missions.map((mission: any) => {
          // showId 정규화 (한글 → 영어)
          const normalizedShowId = normalizeShowId(mission.showId)
          
          return {
            id: mission.id,
            showId: normalizedShowId,
            title: mission.title,
            kind: mission.kind,
            form: mission.form,
            seasonType: mission.seasonType || "전체",
            seasonNumber: mission.seasonNumber || undefined,
            options: mission.options || [],
            deadline: mission.deadline,
            revealPolicy: mission.revealPolicy,
            status: mission.status,
            stats: {
              participants: mission.participants || 0,
              totalVotes: mission.totalVotes || 0,
            },
            result: {
              distribution: mission.optionVoteCounts || {},
              correctAnswer: mission.correctAnswer || undefined,
              majorityOption: mission.majorityOption || undefined,
              totalVotes: mission.totalVotes || 0,
            },
            createdAt: mission.createdAt?.toDate?.()?.toISOString() || mission.createdAt,
            thumbnailUrl: mission.thumbnailUrl,
            referenceUrl: mission.referenceUrl,
            isLive: mission.isLive,
          }
        })
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

  const needsAnswerEntry = (mission: TMission) => {
    if (mission.kind !== "predict" || mission.status === "settled") return false
    
    if (mission.form === "match") {
      // 모든 회차가 마감되었는지 확인
      const totalEpisodes = mission.episodes || 8
      const episodeStatuses = mission.episodeStatuses || {}
      for (let i = 1; i <= totalEpisodes; i++) {
        if (episodeStatuses[i] !== "settled") return false
      }
      return true
    }
    
    return mission.deadline ? isDeadlinePassed(mission.deadline) : false
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
      console.log(`[정답 입력] 미션 ${missionId}, 정답: ${answer}`)
      
      // 딜러가 정답을 확정하는 것이므로 settleMissionWithFinalAnswer 호출
      const result = await settleMissionWithFinalAnswer(missionId, answer)
      
      console.log(`[정답 입력 결과]`, result)
      
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
        description: "참여자들에게 포인트가 지급됩니다.",
      })
      
      // 정답 입력란 초기화
      setAnswerDrafts(prev => {
        const next = { ...prev }
        delete next[missionId]
        return next
      })
      
      await loadMissions()
    } catch (error: any) {
      console.error("정답 확정 중 오류:", error)
      console.error("에러 상세:", error?.message, error?.code)
      toast({
        title: "정답 저장 실패",
        description: error?.message || "잠시 후 다시 시도해주세요.",
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
      console.log(`[정답 수정] 미션 ${missionId}, 정답: ${answer}`)
      
      // 정답 수정도 동일하게 settleMissionWithFinalAnswer 호출 (이미 settled 상태여도 업데이트 가능하도록)
      const result = await settleMissionWithFinalAnswer(missionId, answer)
      
      console.log(`[정답 수정 결과]`, result)
      
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
        description: "참여자들에게 수정된 포인트가 재분배됩니다.",
      })
      setEditingMissionAnswers(prev => {
        const next = { ...prev }
        delete next[missionId]
        return next
      })
      setAnswerDrafts(prev => {
        const next = { ...prev }
        delete next[missionId]
        return next
      })
      await loadMissions()
    } catch (error: any) {
      console.error("정답 수정 중 오류:", error)
      console.error("에러 상세:", error?.message, error?.code)
      toast({
        title: "정답 수정 실패",
        description: error?.message || "잠시 후 다시 시도해주세요.",
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
      console.log(`[커플 정답 입력] 미션 ${missionId}, 커플: ${JSON.stringify(pairs)}`)
      
      const result = await settleMatchMission(missionId, pairs)
      
      console.log(`[커플 정답 입력 결과]`, result)
      
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
        description: "참여자들에게 포인트가 지급됩니다.",
      })
      
      // 입력란 초기화
      setMatchAnswerDrafts(prev => {
        const next = { ...prev }
        delete next[missionId]
        return next
      })
      
      await loadMissions()
    } catch (error: any) {
      console.error("커플 결과 저장 중 오류:", error)
      console.error("에러 상세:", error?.message, error?.code)
      toast({
        title: "최종 커플 저장 실패",
        description: error?.message || "잠시 후 다시 시도해주세요.",
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
      [missionId]: [...currentPairs, { left: selection.left as string, right: selection.right as string }],
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

  // 필터링 로직 추가
  const filterMissions = useCallback((missions: TMission[]) => {
    console.log('[MyPage] 필터링 전 미션 개수:', missions.length)
    console.log('[MyPage] 필터 설정 - 카테고리:', filterCategory, '/ 프로그램:', filterShowId)
    
    const filtered = missions.filter(mission => {
      const show = mission.showId ? getShowById(mission.showId) : null
      
      // 카테고리 필터
      if (filterCategory !== "ALL") {
        // showId가 없는 미션은 카테고리 필터가 ALL이 아니면 제외하지 않음 (레거시 데이터 보호)
        if (!show || !show.category) {
          return false // 프로그램 정보가 없는 미션은 특정 카테고리 필터 시 제외
        }
        if (show.category !== filterCategory) {
          return false
        }
      }
      
      // 프로그램 필터
      if (filterShowId !== "ALL") {
        if (!mission.showId || mission.showId !== filterShowId) {
          return false
        }
      }
      
      return true
    })
    
    console.log('[MyPage] 필터링 후 미션 개수:', filtered.length)
    return filtered
  }, [filterCategory, filterShowId])

  const filteredParticipatedMissions = useMemo(() => 
    filterMissions(participatedMissions), 
  [participatedMissions, filterMissions])

  const filteredCreatedMissionsTotal = useMemo(() => {
    console.log('[MyPage] 원본 생성 미션 개수:', createdMissions.length)
    const filtered = filterMissions(createdMissions)
    console.log('[MyPage] 필터링된 생성 미션 개수:', filtered.length)
    return filtered
  }, [createdMissions, filterMissions])

  const filteredCreatedMissionsByTab = useMemo(() => {
    console.log('[MyPage] 현재 탭:', createdTab)
    console.log('[MyPage] 미션별 kind:', filteredCreatedMissionsTotal.map(m => ({ id: m.id, kind: m.kind, title: m.title })))
    const byTab = filteredCreatedMissionsTotal.filter(m => m.kind === createdTab)
    console.log('[MyPage] 탭별 필터링 후 미션 개수:', byTab.length)
    return byTab
  }, [filteredCreatedMissionsTotal, createdTab])

  const totalCreatedPages = Math.ceil(filteredCreatedMissionsByTab.length / ITEMS_PER_PAGE)
  const currentCreatedMissions = filteredCreatedMissionsByTab.slice((createdPage - 1) * ITEMS_PER_PAGE, createdPage * ITEMS_PER_PAGE)

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

  return (
    <div className="min-h-screen bg-gray-50 pb-30 md:pb-0">
      <div className="max-w-5xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative">
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
          activeShowIds={new Set([...createdMissions, ...participatedMissions].map(m => m.showId).filter(Boolean) as string[])}
          showStatuses={showStatuses}
        />

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-35 max-w-full overflow-hidden pb-32 md:pb-16 min-w-0">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-pink-600 fill-pink-600" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">마이페이지</h1>
            </div>

            {!isAuthenticated() && (
              <Card className="mb-6 border-pink-200 bg-pink-50/50 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-base sm:text-lg font-bold text-pink-900">내 픽을 안전하게 보관하고 싶다면?</h3>
                      <p className="text-xs sm:text-sm text-pink-700">
                        지금은 브라우저에만 저장되어 있어요. 로그인하면 어디서든 내 참여 기록을 확인할 수 있습니다!
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowLoginModal(true)}
                      className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-6 shrink-0"
                    >
                      기록 보관하기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="participated" className="w-full">
              <div className="flex flex-col gap-4 mb-6">
                <TabsList className={`grid w-full max-w-md ${userRole !== 'PICKER' ? 'grid-cols-2' : 'grid-cols-1 max-w-[200px]'}`}>
                  <TabsTrigger value="participated" className="relative">
                    내가 참여한 미션
                    <Badge className="ml-2 bg-pink-500 hover:bg-pink-600 text-white">{filteredParticipatedMissions.length}</Badge>
                  </TabsTrigger>
                  {userRole !== 'PICKER' && (
                    <TabsTrigger value="created" className="relative">
                      내가 생성한 미션
                      <Badge className="ml-2 bg-purple-500 hover:bg-purple-600 text-white">{filteredCreatedMissionsTotal.length}</Badge>
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* 필터 영역 - 탭 아래로 이동 */}
                <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 w-12 shrink-0">분류</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                      <button
                        onClick={() => {
                          setFilterCategory("ALL")
                          setFilterShowId("ALL")
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap flex-shrink-0 ${filterCategory === "ALL" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                      >
                        전체
                      </button>
                      {Object.entries(CATEGORIES).filter(([id]) => id !== "UNIFIED").map(([id, info]) => (
                        <button
                          key={id}
                          onClick={() => {
                            setFilterCategory(id as TShowCategory)
                            setFilterShowId("ALL")
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${filterCategory === id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                        >
                          <img src={info.iconPath} alt={info.description} className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                          {info.description}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filterCategory !== "ALL" && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                      <span className="text-xs font-semibold text-gray-400 w-12 shrink-0">프로그램</span>
                      <Select
                        value={filterShowId}
                        onValueChange={setFilterShowId}
                      >
                        <SelectTrigger className="flex-1 h-9 text-xs bg-white border-gray-200 rounded-xl focus:ring-0 shadow-none">
                          <SelectValue placeholder="프로그램을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          <SelectItem value="ALL">전체 프로그램</SelectItem>
                          {(SHOWS[filterCategory] || [])
                            .slice()
                            .sort((a, b) => {
                              const getStatus = (id: string) => showStatuses[id] || 'ACTIVE'
                              const getPriority = (status: string) => {
                                if (status === 'ACTIVE') return 0
                                if (status === 'UNDECIDED') return 1
                                if (status === 'UPCOMING') return 2
                                return 0
                              }
                              const priorityA = getPriority(getStatus(a.id))
                              const priorityB = getPriority(getStatus(b.id))
                              return priorityA - priorityB
                            })
                            .map(show => {
                              const status = showStatuses[show.id] || 'ACTIVE'
                              const isUpcoming = status === 'UPCOMING'
                              const isUndecided = status === 'UNDECIDED'
                              const isActive = status === 'ACTIVE'
                              const statusText = isUpcoming ? " (예정)" : isUndecided ? " (미정)" : ""
                              
                              return (
                                <SelectItem 
                                  key={show.id} 
                                  value={show.id}
                                  disabled={!isActive}
                                  className={!isActive ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                  {show.displayName}{statusText}
                                </SelectItem>
                              )
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <TabsContent value="participated" className="space-y-4 focus-visible:outline-none">
                {isLoading ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">미션을 불러오는 중...</p>
                    </CardContent>
                  </Card>
                ) : filteredParticipatedMissions.length === 0 ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">
                        {filterCategory === "ALL" && filterShowId === "ALL" 
                          ? "아직 참여한 미션이 없습니다." 
                          : "조건에 맞는 미션이 없습니다."}
                      </p>
                      {filterCategory === "ALL" && filterShowId === "ALL" && (
                        <Link href="/">
                          <Button className="mt-4 bg-pink-600 hover:bg-pink-700 text-white">미션 참여하러 가기</Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2">
                    {filteredParticipatedMissions.map((mission) => (
                      <MissionCard
                        key={mission.id}
                        mission={mission}
                        shouldShowResults={shouldShowResults(mission)}
                        onViewPick={() => handleViewPick(mission)}
                        variant="default"
                        userChoice={userChoices[mission.id]}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {userRole !== 'PICKER' && (
                <TabsContent value="created" className="space-y-4">
                  {isLoading ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center">
                      <p className="text-gray-500 text-lg">미션을 불러오는 중...</p>
                    </CardContent>
                  </Card>
                ) : filteredCreatedMissionsTotal.length === 0 ? (
                  <Card className="border-gray-200">
                    <CardContent className="py-12 text-center space-y-4">
                      <p className="text-gray-500 text-lg">
                        {filterCategory === "ALL" && filterShowId === "ALL"
                          ? "아직 생성한 미션이 없습니다."
                          : "조건에 맞는 미션이 없습니다."}
                      </p>
                      <div className="flex gap-2 justify-center">
                        {filterCategory === "ALL" && filterShowId === "ALL" ? (
                          <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => setIsMissionModalOpen(true)}
                          >
                            미션 생성하기
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setFilterCategory("ALL")
                              setFilterShowId("ALL")
                            }}
                          >
                            필터 초기화
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Sub Tabs */}
                    <div className="flex border-b border-gray-200">
                      <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${createdTab === "predict"
                          ? "border-purple-600 text-purple-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        onClick={() => {
                          setCreatedTab("predict")
                          setCreatedPage(1)
                        }}
                      >
                        예측픽 ({filteredCreatedMissionsTotal.filter(m => m.kind === "predict").length})
                      </button>
                      <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${createdTab === "majority"
                          ? "border-purple-600 text-purple-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        onClick={() => {
                          setCreatedTab("majority")
                          setCreatedPage(1)
                        }}
                      >
                        공감픽 ({filteredCreatedMissionsTotal.filter(m => m.kind === "majority").length})
                      </button>
                    </div>

                    <Card className="border-dashed border-purple-200 bg-purple-50/70">
                      <CardContent className="py-4 text-sm text-purple-800">
                        {createdTab === "predict"
                          ? "예측픽은 마감 이후에만 정답을 확정할 수 있어요. 커플매칭은 모든 회차가 마감되면 최종 커플을 입력해주세요."
                          : "공감픽은 정답이 없으며, 투표 결과에 따라 다수 의견이 결정됩니다."}
                      </CardContent>
                    </Card>

                    {currentCreatedMissions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
                        {currentCreatedMissions.map((mission) => {
                          const participants = mission.stats?.participants?.toLocaleString() ?? "0"
                          const isAnswerRequired = needsAnswerEntry(mission)
                          const missionSettledText =
                            mission.kind === "predict"
                              ? mission.form === "match"
                                ? `${mission.finalAnswer?.length ?? 0}쌍 확정`
                                : mission.result?.correctAnswer
                                  ? `정답: ${mission.result.correctAnswer}`
                                  : "정답 미입력"
                              : mission.result?.majorityOption
                                ? `최종 다수: ${mission.result.majorityOption}`
                                : "결과 미확정"

                          return (
                            <div key={mission.id} className={`flex flex-col rounded-2xl border transition-all ${isAnswerRequired ? "border-amber-400 bg-amber-50/30 shadow-md" : "border-purple-100 bg-white shadow-sm"}`}>
                              <div className="flex flex-col gap-4 p-5 h-full relative">
                                {isAnswerRequired && (
                                  <div className="absolute top-4 right-4 animate-bounce">
                                    <Badge className="bg-amber-500 text-white border-none text-[10px] py-0.5 px-2">
                                      ⚠️ 정답 입력 필요
                                    </Badge>
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={`border ${mission.kind === "predict" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                                      {mission.kind === "predict" ? "예측픽" : "공감픽"}
                                    </Badge>
                                    <Badge className="border border-purple-200 bg-purple-50 text-purple-700">
                                      {getFormLabel(mission)}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      생성 {formatDateTime(mission.createdAt)}
                                    </span>
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-900">{mission.title}</h3>
                                  <p className="text-sm text-gray-500">
                                    {mission.form === "match"
                                      ? "회차 완료 시 마감"
                                      : `마감 ${formatDateTime(mission.deadline)}`} · 참여자 {participants}명
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
                                    variant={isAnswerRequired ? "default" : "outline"}
                                    size="sm"
                                    className={`gap-2 w-full ${isAnswerRequired ? "bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm" : ""}`}
                                    onClick={() => toggleMissionPanel(mission.id)}
                                  >
                                    {expandedMissionId === mission.id ? (
                                      <>
                                        접기
                                        <ChevronUp className="h-4 w-4" />
                                      </>
                                    ) : (
                                      <>
                                        {mission.kind === "predict" ? "정답 입력" : "상세 보기"}
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
                    ) : (
                      <Card className="border-gray-200">
                        <CardContent className="py-12 text-center space-y-4">
                          <p className="text-gray-500 text-lg">
                            {createdTab === "predict" ? "예측픽" : "공감픽"} 미션이 없습니다.
                          </p>
                          <div className="flex gap-2 justify-center">
                            {filteredCreatedMissionsTotal.filter(m => m.kind !== createdTab).length > 0 && (
                              <Button
                                variant="outline"
                                onClick={() => setCreatedTab(createdTab === "predict" ? "majority" : "predict")}
                              >
                                {createdTab === "predict" ? "공감픽" : "예측픽"} 탭 보기
                              </Button>
                            )}
                            {(filterCategory !== "ALL" || filterShowId !== "ALL") && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setFilterCategory("ALL")
                                  setFilterShowId("ALL")
                                }}
                              >
                                필터 초기화
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Pagination */}
                    {totalCreatedPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreatedPage(p => Math.max(1, p - 1))}
                          disabled={createdPage === 1}
                        >
                          이전
                        </Button>
                        <span className="text-sm text-gray-600">
                          {createdPage} / {totalCreatedPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreatedPage(p => Math.min(totalCreatedPages, p + 1))}
                          disabled={createdPage === totalCreatedPages}
                        >
                          다음
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNavigation />
          <BannerAd />
        </div>

        <SidebarNavigation
          selectedShow={selectedShowId ? getShowById(selectedShowId)?.name : undefined}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={handleSeasonSelect}
          onMissionModalOpen={() => setIsMissionModalOpen(true)}
          activeNavItem="mypage"
          category={selectedShowId ? getShowById(selectedShowId)?.category : undefined}
          selectedShowId={selectedShowId}
        />

        <MissionCreationModal
          isOpen={isMissionModalOpen}
          onClose={() => setIsMissionModalOpen(false)}
          initialShowId={selectedShowId}
          category={categoryParam as any || (selectedShowId ? getShowById(selectedShowId)?.category : undefined)}
        />

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="내 픽을 안전하게 보관하고 싶다면?"
          description="로그인하면 기기를 변경해도 내 참여 기록을 계속 확인할 수 있습니다!"
        />
      </div>
    </div>
  )
}
