"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ArrowLeft, X, ChevronDown, BarChart3 } from "lucide-react"
import { ResultSection } from "./result-section"
import { SubmissionSheet } from "./submission-sheet"
import { EpisodeSelector } from "./episode-selector"
import { MockVoteRepo } from "@/lib/mock-vote-data"
import type { Mission } from "@/lib/vote-types"
import { findFirstCorrectEpisode } from "@/lib/vote-types"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface MatchVotePageProps {
  mission: Mission
}

interface Connection {
  left: string
  right: string
  id: string
  episodeNo?: number
}

interface DragState {
  isDragging: boolean
  draggedItem: string | null
  draggedColumn: "left" | "right" | null
  ghostLine: { startX: number; startY: number; endX: number; endY: number } | null
}

const previousSeasonResults = [
  { season: "26기", couples: ["영수-정숙", "광수-영순", "영호-순자"] },
  { season: "25기", couples: ["민수-지은", "태현-예린", "준호-서연"] },
  { season: "24기", couples: ["상철-현숙", "대훈-미정", "정식-옥순"] },
]

const mockAggregatedResults = [
  { left: "영수", right: "영순", count: 245, percentage: 42 },
  { left: "영호", right: "정숙", count: 198, percentage: 34 },
  { left: "영철", right: "영자", count: 156, percentage: 27 },
  { left: "광수", right: "순자", count: 134, percentage: 23 },
  { left: "영식", right: "옥순", count: 89, percentage: 15 },
  { left: "상철", right: "현숙", count: 67, percentage: 12 },
]

const mockEpisodeResults: Record<number, Array<{ left: string; right: string; count: number; percentage: number }>> = {
  1: [
    { left: "영수", right: "정숙", count: 89, percentage: 45 },
    { left: "영호", right: "영순", count: 67, percentage: 34 },
    { left: "광수", right: "순자", count: 54, percentage: 27 },
    { left: "영철", right: "옥순", count: 43, percentage: 22 },
  ],
  2: [
    { left: "영수", right: "영순", count: 102, percentage: 51 },
    { left: "영호", right: "정숙", count: 78, percentage: 39 },
    { left: "영철", right: "영자", count: 56, percentage: 28 },
    { left: "광수", right: "순자", count: 45, percentage: 23 },
  ],
  3: [
    { left: "영수", right: "영순", count: 143, percentage: 72 },
    { left: "영호", right: "정숙", count: 120, percentage: 60 },
    { left: "영철", right: "영자", count: 100, percentage: 50 },
    { left: "광수", right: "순자", count: 89, percentage: 45 },
  ],
}

export function MatchVotePage({ mission }: MatchVotePageProps) {
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set())
  const [episodePicks, setEpisodePicks] = useState<Record<number, Array<{ left: string; right: string }>>>({})
  const [savedEpisodes, setSavedEpisodes] = useState<Set<number>>(new Set())
  const [submittedEpisode, setSubmittedEpisode] = useState<number | null>(null)
  const [submittedEpisodes, setSubmittedEpisodes] = useState<Set<number>>(new Set())

  const [connections, setConnections] = useState<Connection[]>([])
  const [showSubmissionSheet, setShowSubmissionSheet] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userVote, setUserVote] = useState<Array<{ left: string; right: string }> | null>(null)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    draggedColumn: null,
    ghostLine: null,
  })
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null)
  const prevSelectedEpisodesRef = useRef<Set<number>>(new Set())
  const loadedEpisodeRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const leftItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const rightItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const { toast } = useToast()
  const router = useRouter()
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [showRealtimeResults, setShowRealtimeResults] = useState(false)
  const [resultsTab, setResultsTab] = useState<"overall" | "selected">("overall")

  const userId = "user123"
  const isMultiEpisode = mission.episodes && mission.episodes > 1
  const totalEpisodes = mission.episodes || 1

  const hasVoted = userVote !== null
  const canVote =
    mission.status === "open" &&
    (!isMultiEpisode ||
      Object.keys(episodePicks).length === 0 ||
      Object.keys(episodePicks).some((ep) => !submittedEpisodes.has(Number.parseInt(ep))))
  const leftItems = mission.matchPairs?.left || []
  const rightItems = mission.matchPairs?.right || []

  const canSubmit = connections.length >= 1

  const isConnected = (person: string) => {
    return connections.some((conn) => conn.left === person || conn.right === person)
  }

  const isCurrentEpisodeSettled = useCallback(() => {
    if (selectedEpisodes.size !== 1) return false
    const currentEpisode = Array.from(selectedEpisodes)[0]
    const episodeStatus = mission.episodeStatuses?.[currentEpisode]
    return episodeStatus === "settled"
  }, [selectedEpisodes, mission.episodeStatuses])

  useEffect(() => {
    if (!isMultiEpisode) {
      const existingVote = localStorage.getItem(`rp_picked_${mission.id}`)
      if (existingVote) {
        try {
          const parsedVote = JSON.parse(existingVote)
          setUserVote(parsedVote)
        } catch (error) {
          console.error("Failed to parse existing vote:", error)
        }
      }
    } else {
      const loadedPicks: Record<number, Array<{ left: string; right: string }>> = {}
      const saved = new Set<number>()
      const submitted = new Set<number>()

      for (let ep = 1; ep <= totalEpisodes; ep++) {
        const key = `rp_matchpick_${mission.id}_${ep}`
        const stored = localStorage.getItem(key)
        if (stored) {
          try {
            const pairs = JSON.parse(stored)
            if (pairs && pairs.length > 0) {
              loadedPicks[ep] = pairs
              saved.add(ep)
            }
          } catch (error) {
            console.error(`Failed to parse episode ${ep} pick:`, error)
          }
        }

        const submittedKey = `rp_matchpick_submitted_${mission.id}_${ep}`
        const isSubmitted = localStorage.getItem(submittedKey)
        if (isSubmitted === "true") {
          submitted.add(ep)
        }
      }

      // Default pairs for episode 2 if no existing vote
      if (!loadedPicks[2] && totalEpisodes >= 2) {
        const episode2DefaultPairs = [
          { left: "영수", right: "정숙" },
          { left: "영호", right: "영순" },
          { left: "광수", right: "순자" },
        ]
        loadedPicks[2] = episode2DefaultPairs
        // Don't add to savedEpisodes so user can still modify it
      }

      setEpisodePicks(loadedPicks)
      setSavedEpisodes(saved)
      setSubmittedEpisodes(submitted)
    }
  }, [mission.id, isMultiEpisode, totalEpisodes])

  useEffect(() => {
    const prevSet = prevSelectedEpisodesRef.current
    const currentSet = selectedEpisodes

    const hasChanged =
      prevSet.size !== currentSet.size ||
      Array.from(prevSet).some((ep) => !currentSet.has(ep)) ||
      Array.from(currentSet).some((ep) => !prevSet.has(ep))

    if (!hasChanged) {
      return
    }

    prevSelectedEpisodesRef.current = new Set(selectedEpisodes)

    if (isMultiEpisode && selectedEpisodes.size > 1) {
      const displayConnections: Connection[] = []

      Array.from(selectedEpisodes)
        .sort((a, b) => a - b)
        .forEach((ep) => {
          if (episodePicks[ep]) {
            episodePicks[ep].forEach((pair) => {
              displayConnections.push({
                left: pair.left,
                right: pair.right,
                id: `${ep}-${pair.left}-${pair.right}`,
                episodeNo: ep,
              })
            })
          }
        })

      setConnections(displayConnections)
      loadedEpisodeRef.current = null
    } else if (selectedEpisodes.size === 1) {
      const currentEpisode = Array.from(selectedEpisodes)[0]

      if (loadedEpisodeRef.current !== currentEpisode) {
        if (episodePicks[currentEpisode]) {
          const savedConnections = episodePicks[currentEpisode].map((pair) => ({
            left: pair.left,
            right: pair.right,
            id: `${currentEpisode}-${pair.left}-${pair.right}`,
            episodeNo: currentEpisode,
          }))
          setConnections(savedConnections)
        } else {
          setConnections([])
        }
        loadedEpisodeRef.current = currentEpisode
      }
    } else {
      setConnections([])
      loadedEpisodeRef.current = null
    }
  }, [selectedEpisodes, episodePicks, isMultiEpisode])

  // Removed the useEffect that auto-saves connections to localStorage
  // This ensures unsaved picks are cleared when navigating away

  const createConnection = useCallback(
    (item1: string, item2: string, column1: "left" | "right", column2: "left" | "right") => {
      if (selectedEpisodes.size !== 1) {
        toast({
          title: "회차를 하나만 선택해주세요",
          description: "커플 매칭은 한 회차씩만 가능합니다.",
          variant: "destructive",
        })
        return
      }

      const leftPerson = column1 === "left" ? item1 : item2
      const rightPerson = column1 === "right" ? item1 : item2

      const currentEpisode = Array.from(selectedEpisodes)[0]

      const filteredConnections = connections.filter(
        (conn) => conn.episodeNo !== currentEpisode || (conn.left !== leftPerson && conn.right !== rightPerson),
      )

      const newConnection: Connection = {
        left: leftPerson,
        right: rightPerson,
        id: `${currentEpisode}-${leftPerson}-${rightPerson}`,
        episodeNo: currentEpisode,
      }

      setConnections([...filteredConnections, newConnection])
    },
    [connections, selectedEpisodes, toast],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, item: string, column: "left" | "right") => {
      const currentEpisode = selectedEpisodes.size === 1 ? Array.from(selectedEpisodes)[0] : null
      const isSubmitted = currentEpisode ? submittedEpisodes.has(currentEpisode) : false

      if (!canVote || selectedEpisodes.size !== 1 || isCurrentEpisodeSettled() || isSubmitted) return

      e.preventDefault()
      setDragState({
        isDragging: true,
        draggedItem: item,
        draggedColumn: column,
        ghostLine: null,
      })
    },
    [canVote, selectedEpisodes, isCurrentEpisodeSettled, submittedEpisodes],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.draggedItem || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const itemRef =
        dragState.draggedColumn === "left"
          ? leftItemRefs.current[dragState.draggedItem]
          : rightItemRefs.current[dragState.draggedItem]

      if (!itemRef) return

      const itemRect = itemRef.getBoundingClientRect()
      const startX = itemRect.left + itemRect.width / 2 - rect.left
      const startY = itemRect.top + itemRect.height / 2 - rect.top
      const endX = e.clientX - rect.left
      const endY = e.clientY - rect.top

      setDragState((prev) => ({
        ...prev,
        ghostLine: { startX, startY, endX, endY },
      }))
    },
    [dragState.isDragging, dragState.draggedItem, dragState.draggedColumn],
  )

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.draggedItem || !canVote) {
        setDragState({ isDragging: false, draggedItem: null, draggedColumn: null, ghostLine: null })
        setHoveredTarget(null)
        return
      }

      const target = document.elementFromPoint(e.clientX, e.clientY)
      let targetItem = target?.getAttribute("data-item")
      let targetColumn = target?.getAttribute("data-column") as "left" | "right" | null

      if (!targetItem || !targetColumn) {
        let currentElement = target
        while (currentElement && currentElement !== document.body) {
          targetItem = targetItem || currentElement.getAttribute("data-item")
          targetColumn = targetColumn || (currentElement.getAttribute("data-column") as "left" | "right" | null)
          if (targetItem && targetColumn) break
          currentElement = currentElement.parentElement
        }
      }

      if (!targetItem || !targetColumn) {
        const columnArea = target?.closest("[data-column-area]")
        if (columnArea) {
          targetColumn = columnArea.getAttribute("data-column-area") as "left" | "right"

          const items = targetColumn === "left" ? leftItems : rightItems
          const itemRefs = targetColumn === "left" ? leftItemRefs.current : rightItemRefs.current

          let closestItem = null
          let closestDistance = Number.POSITIVE_INFINITY

          items.forEach((item) => {
            const itemRef = itemRefs[item]
            if (itemRef && !isConnected(item)) {
              const rect = itemRef.getBoundingClientRect()
              const centerX = rect.left + rect.width / 2
              const centerY = rect.top + rect.height / 2
              const distance = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2))

              if (distance < closestDistance) {
                closestDistance = distance
                closestItem = item
              }
            }
          })

          if (closestItem) {
            targetItem = closestItem
          }
        }
      }

      if (targetItem && targetColumn && targetColumn !== dragState.draggedColumn) {
        createConnection(dragState.draggedItem, targetItem, dragState.draggedColumn!, targetColumn)
      }

      setDragState({ isDragging: false, draggedItem: null, draggedColumn: null, ghostLine: null })
      setHoveredTarget(null)
    },
    [dragState, canVote, leftItems, rightItems, createConnection],
  )

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp])

  const removeConnection = (connectionId: string) => {
    if (!canVote || selectedEpisodes.size !== 1 || isCurrentEpisodeSettled()) return
    setConnections(connections.filter((conn) => conn.id !== connectionId))
  }

  const getConnectionFor = (person: string) => {
    return connections.find((conn) => conn.left === person || conn.right === person)
  }

  const getConnectionLines = () => {
    if (!canvasRef.current) return []

    const rect = canvasRef.current.getBoundingClientRect()

    const pairMap = new Map<string, { episodes: number[]; line: any }>()

    connections.forEach((conn) => {
      const leftRef = leftItemRefs.current[conn.left]
      const rightRef = rightItemRefs.current[conn.right]

      if (!leftRef || !rightRef) return

      const leftRect = leftRef.getBoundingClientRect()
      const rightRect = rightRef.getBoundingClientRect()

      const startX = leftRect.right - rect.left
      const startY = leftRect.top + leftRect.height / 2 - rect.top
      const endX = rightRect.left - rect.left
      const endY = rightRect.top + rightRect.height / 2 - rect.top

      const pairKey = `${conn.left}-${conn.right}`

      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          episodes: [],
          line: {
            id: conn.id,
            startX,
            startY,
            endX,
            endY,
            connection: conn,
          },
        })
      }

      if (conn.episodeNo) {
        pairMap.get(pairKey)!.episodes.push(conn.episodeNo)
      }
    })

    return Array.from(pairMap.values()).map(({ episodes, line }) => ({
      ...line,
      episodes: episodes.sort((a, b) => a - b),
    }))
  }

  const handleSubmitVote = async () => {
    if (connections.length === 0) return

    if (selectedEpisodes.size !== 1) {
      toast({
        title: "회차를 하나만 선택해주세요",
        description: "픽하기는 한 회차씩만 가능합니다.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const currentEpisode = Array.from(selectedEpisodes)[0]
      const currentEpisodeConnections = connections.filter((conn) => conn.episodeNo === currentEpisode)
      const pairs = currentEpisodeConnections.map((conn) => ({ left: conn.left, right: conn.right }))

      if (isMultiEpisode) {
        const key = `rp_matchpick_${mission.id}_${currentEpisode}`
        localStorage.setItem(key, JSON.stringify(pairs))

        const submittedKey = `rp_matchpick_submitted_${mission.id}_${currentEpisode}`
        localStorage.setItem(submittedKey, "true")

        setSavedEpisodes((prev) => new Set([...prev, currentEpisode]))
        setSubmittedEpisodes((prev) => new Set([...prev, currentEpisode]))

        setEpisodePicks((prev) => ({
          ...prev,
          [currentEpisode]: pairs,
        }))

        setSubmittedEpisode(currentEpisode)

        setTimeout(() => {
          setSubmittedEpisode(null)
        }, 3000)

        toast({
          title: `${currentEpisode}회차 제출 완료!`,
          description: "픽이 성공적으로 저장되었습니다.",
        })
      } else {
        const success = await MockVoteRepo.submitVote({
          missionId: mission.id,
          userId,
          pairs,
          submittedAt: new Date().toISOString(),
        })

        if (success) {
          setUserVote(pairs)
          localStorage.setItem(`rp_picked_${mission.id}`, JSON.JSON.stringify(pairs))
          toast({
            title: "픽 완료!",
            description: "커플 매칭이 성공적으로 제출되었습니다.",
          })
        }
      }

      setShowSubmissionSheet(false)
    } catch (error) {
      toast({
        title: "픽 실패",
        description: "픽 제출 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeBadge = () => {
    switch (mission.form) {
      case "binary":
        return "양자"
      case "multi":
        return "다자"
      case "match":
        return "커플매칭"
      default:
        return "투표"
    }
  }

  const getRevealBadge = () => {
    return mission.revealPolicy === "realtime" ? "실시간" : "마감후"
  }

  const handleResultView = () => {
    if (mission.status === "settled") {
      router.push(`/mission/${mission.id}/results`)
    } else if (mission.status === "open") {
      const resultsElement = document.getElementById("results")
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }

  const userScore =
    isMultiEpisode && mission.status === "settled" && mission.finalAnswer
      ? findFirstCorrectEpisode(episodePicks, mission.finalAnswer, totalEpisodes)
      : null

  const handleEpisodeToggle = (episodeNo: number) => {
    setSelectedEpisodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(episodeNo)) {
        newSet.delete(episodeNo)
      } else {
        newSet.add(episodeNo)
      }
      return newSet
    })
  }

  const handleClearAllData = () => {
    if (!confirm("모든 저장된 픽 데이터를 삭제하시겠습니까?")) {
      return
    }

    // Clear multi-episode data
    for (let ep = 1; ep <= totalEpisodes; ep++) {
      const key = `rp_matchpick_${mission.id}_${ep}`
      localStorage.removeItem(key)
      const submittedKey = `rp_matchpick_submitted_${mission.id}_${ep}`
      localStorage.removeItem(submittedKey)
    }

    // Clear single episode data
    localStorage.removeItem(`rp_picked_${mission.id}`)

    // Reset state
    setEpisodePicks({})
    setSavedEpisodes(new Set())
    setSubmittedEpisodes(new Set())
    setConnections([])
    setUserVote(null)
    loadedEpisodeRef.current = null

    toast({
      title: "데이터 삭제 완료",
      description: "모든 저장된 픽 데이터가 삭제되었습니다.",
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRealtimeResults(true)}
            className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200 bg-transparent"
          >
            <BarChart3 className="w-4 h-4" />
            실시간 픽 결과
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                이전 기수 결과
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {previousSeasonResults.map((season) => (
                <DropdownMenuItem key={season.season} className="flex flex-col items-start py-3">
                  <div className="font-semibold text-sm mb-1">{season.season}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {season.couples.map((couple, idx) => (
                      <div key={idx}>• {couple}</div>
                    ))}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className="bg-rose-500 hover:bg-rose-600 text-white">{getTypeBadge()}</Badge>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {getRevealBadge()}
          </Badge>
          {mission.status === "open" && (
            <Badge variant="outline" className="border-rose-300 text-rose-600">
              <Clock className="w-3 h-3 mr-1" />
              1일 23시간 남음
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 text-balance">{mission.title}</h1>
        <h2 className="text-lg text-gray-600">{mission.description}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span className="font-semibold text-gray-900">{mission.totalVotes?.toLocaleString() || "0"}</span>명 참여
        </div>
      </div>

      {isMultiEpisode && mission.status === "settled" && userScore && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-900">내 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-700 mb-2">+{userScore.score}점</div>
              <div className="text-sm text-gray-600">최초 정답: {userScore.episodeNo}회차</div>
            </div>
          </CardContent>
        </Card>
      )}

      {isMultiEpisode && mission.status === "settled" && !userScore && Object.keys(episodePicks).length > 0 && (
        <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700 mb-2">정답 없음 (0점)</div>
              <div className="text-sm text-gray-600">다음 기회에 도전해보세요!</div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasVoted && !isMultiEpisode && mission.status === "open" && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-1">픽 완료!</h3>
                <p className="text-sm text-gray-600">
                  마감일까지 결과를 기다려주세요. 아래에서 내가 선택한 커플 매칭을 확인할 수 있습니다.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>1일 23시간 남음</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasVoted && userVote && !isMultiEpisode && mission.status === "open" && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-900">내가 선택한 커플 매칭</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userVote.map((pair, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200"
                >
                  <span className="font-semibold text-purple-700">
                    {pair.left} ↔ {pair.right}
                  </span>
                  <Badge className="bg-purple-500 text-white text-xs">내 픽</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canVote && (
        <div className="relative">
          {submittedEpisode && selectedEpisodes.has(submittedEpisode) && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-green-500 rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-900">{submittedEpisode}회차 제출 완료!</p>
                  <p className="text-sm text-green-700">픽이 성공적으로 저장되었습니다. 다른 회차도 픽해보세요!</p>
                </div>
              </div>
            </div>
          )}

          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 shadow-lg overflow-hidden">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {isMultiEpisode && selectedEpisodes.size === 1
                  ? `${Array.from(selectedEpisodes)[0]}회차 커플 매칭하기`
                  : isMultiEpisode && selectedEpisodes.size > 1
                    ? `${Array.from(selectedEpisodes)
                        .sort((a, b) => a - b)
                        .join(", ")}회차 보기`
                    : isMultiEpisode && selectedEpisodes.size === 0
                      ? "회차를 선택해주세요"
                      : "커플 매칭하기"}
              </CardTitle>
              <p className="text-gray-600">
                {selectedEpisodes.size === 1 && isCurrentEpisodeSettled()
                  ? "마감된 회차입니다 (수정 불가)"
                  : selectedEpisodes.size === 1
                    ? "드래그해서 커플을 연결해보세요"
                    : selectedEpisodes.size > 1
                      ? "여러 회차의 매칭을 확인하세요"
                      : "하트를 클릭하여 회차를 선택하세요"}
              </p>
            </CardHeader>
            <CardContent className="p-8">
              <div ref={canvasRef} className="relative w-full max-w-4xl mx-auto" style={{ minHeight: "400px" }}>
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-30"
                  style={{ overflow: "visible" }}
                >
                  <defs>
                    <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="8" height="8">
                      <path d="M0,8 l8,-8 M-2,2 l4,-4 M6,10 l4,-4" stroke="#654321" strokeWidth="1.5" />
                    </pattern>
                  </defs>

                  {getConnectionLines().map(
                    (line) =>
                      line && (
                        <g key={line.id}>
                          <line
                            x1={line.startX}
                            y1={line.startY}
                            x2={line.endX}
                            y2={line.endY}
                            stroke="#ec4899"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          {line.episodes && line.episodes.length > 0 && selectedEpisodes.size > 1 && (
                            <g>
                              {line.episodes.map((episodeNo: number, index: number) => {
                                const totalEpisodes = line.episodes.length
                                const spacing = 35
                                const centerX = (line.startX + line.endX) / 2
                                const centerY = (line.startY + line.endY) / 2
                                const startOffset = (-(totalEpisodes - 1) * spacing) / 2
                                const x = centerX + startOffset + index * spacing
                                const y = centerY

                                return (
                                  <image
                                    key={`${line.id}-ep-${episodeNo}`}
                                    href={`/acorn-${episodeNo}.png`}
                                    x={x - 12}
                                    y={y - 12}
                                    width="24"
                                    height="24"
                                  />
                                )
                              })}
                            </g>
                          )}
                        </g>
                      ),
                  )}

                  {dragState.ghostLine && (
                    <line
                      x1={dragState.ghostLine.startX}
                      y1={dragState.ghostLine.startY}
                      x2={dragState.ghostLine.endX}
                      y2={dragState.ghostLine.endY}
                      stroke="#ec4899"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  )}
                </svg>

                <div className="grid grid-cols-2 gap-8 relative z-20 max-w-3xl mx-auto">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        남성
                      </h3>
                    </div>
                    <div
                      className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 space-y-3 min-h-[400px]"
                      style={{ backgroundColor: "#E6F0FF" }}
                      data-column-area="left"
                    >
                      {leftItems.map((person) => {
                        const connected = isConnected(person)
                        const connection = getConnectionFor(person)
                        const isDragging = dragState.draggedItem === person
                        const isHovered = hoveredTarget === person
                        const isSettled = isCurrentEpisodeSettled()
                        const currentEpisode = selectedEpisodes.size === 1 ? Array.from(selectedEpisodes)[0] : null
                        const isSubmitted = currentEpisode ? submittedEpisodes.has(currentEpisode) : false

                        return (
                          <div
                            key={person}
                            ref={(el) => {
                              leftItemRefs.current[person] = el
                            }}
                            data-item={person}
                            data-column="left"
                            className={`
                              relative p-4 rounded-xl border-2 transition-all duration-200 select-none
                              ${isSettled || isSubmitted ? "cursor-not-allowed opacity-60" : "cursor-grab"}
                              ${
                                connected
                                  ? "border-blue-400 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 shadow-md"
                                  : "border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50"
                              }
                              ${isDragging ? "scale-105 shadow-lg border-blue-500" : ""}
                              ${isHovered ? "border-purple-400 bg-purple-50 shadow-lg" : ""}
                              ${dragState.isDragging && dragState.draggedColumn === "right" && !isConnected(person) && !isSettled && !isSubmitted ? "hover:border-purple-400 hover:bg-purple-50" : ""}
                            `}
                            style={{ width: "60%", margin: "0 auto" }}
                            onMouseDown={(e) => handleMouseDown(e, person, "left")}
                            onMouseEnter={() => {
                              if (
                                dragState.isDragging &&
                                dragState.draggedColumn === "right" &&
                                !isConnected(person) &&
                                !isSettled &&
                                !isSubmitted
                              ) {
                                setHoveredTarget(person)
                              }
                            }}
                            onMouseLeave={() => setHoveredTarget(null)}
                          >
                            <div className="flex items-center justify-center text-center">
                              <span className="font-semibold text-lg">{person}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                        여성
                      </h3>
                    </div>
                    <div
                      className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 space-y-3 min-h-[400px]"
                      data-column-area="right"
                    >
                      {rightItems.map((person) => {
                        const connected = isConnected(person)
                        const connection = getConnectionFor(person)
                        const isDragging = dragState.draggedItem === person
                        const isHovered = hoveredTarget === person
                        const isSettled = isCurrentEpisodeSettled()
                        const currentEpisode = selectedEpisodes.size === 1 ? Array.from(selectedEpisodes)[0] : null
                        const isSubmitted = currentEpisode ? submittedEpisodes.has(currentEpisode) : false

                        return (
                          <div
                            key={person}
                            ref={(el) => {
                              rightItemRefs.current[person] = el
                            }}
                            data-item={person}
                            data-column="right"
                            className={`
                              relative p-4 rounded-xl border-2 transition-all duration-200 select-none
                              ${isSettled || isSubmitted ? "cursor-not-allowed opacity-60" : "cursor-grab"}
                              ${
                                connected
                                  ? "border-rose-400 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 shadow-md"
                                  : "border-gray-300 bg-white hover:border-rose-300 hover:bg-rose-50"
                              }
                              ${isDragging ? "scale-105 shadow-lg border-rose-500" : ""}
                              ${isHovered ? "border-purple-400 bg-purple-50 shadow-lg" : ""}
                              ${dragState.isDragging && dragState.draggedColumn === "left" && !isConnected(person) && !isSettled && !isSubmitted ? "hover:border-purple-400 hover:bg-purple-50" : ""}
                            `}
                            style={{ width: "60%", margin: "0 auto" }}
                            onMouseDown={(e) => handleMouseDown(e, person, "right")}
                            onMouseEnter={() => {
                              if (
                                dragState.isDragging &&
                                dragState.draggedColumn === "left" &&
                                !isConnected(person) &&
                                !isSettled &&
                                !isSubmitted
                              ) {
                                setHoveredTarget(person)
                              }
                            }}
                            onMouseLeave={() => setHoveredTarget(null)}
                          >
                            <div className="flex items-center justify-center text-center">
                              <span className="font-semibold text-lg">{person}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {connections.length > 0 && (
                <div className="mt-8 p-6 bg-white rounded-xl border border-rose-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    현재 매칭 ({connections.length}쌍)
                    {selectedEpisodes.size > 1 &&
                      ` - ${Array.from(selectedEpisodes)
                        .sort((a, b) => a - b)
                        .join(", ")}회차`}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {connections.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-rose-100 to-pink-100 rounded-lg border border-rose-200"
                      >
                        <span className="font-semibold text-rose-700">
                          {conn.left} ↔ {conn.right}
                          {conn.episodeNo && selectedEpisodes.size > 1 && (
                            <span className="text-xs ml-2 text-purple-600">({conn.episodeNo}회차)</span>
                          )}
                        </span>
                        {selectedEpisodes.size === 1 &&
                          !isCurrentEpisodeSettled() &&
                          !submittedEpisodes.has(Array.from(selectedEpisodes)[0]) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeConnection(conn.id)}
                              className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-200"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isMultiEpisode && canVote && (
        <div className="space-y-4">
          <EpisodeSelector
            totalEpisodes={totalEpisodes}
            selectedEpisodes={selectedEpisodes}
            savedEpisodes={submittedEpisodes}
            episodeStatuses={mission.episodeStatuses}
            onEpisodeToggle={handleEpisodeToggle}
            disabled={false}
          />

          {selectedEpisodes.size === 1 && !isCurrentEpisodeSettled() && (
            <div className="flex justify-center py-4">
              {(() => {
                const currentEpisode = Array.from(selectedEpisodes)[0]
                const isSubmitted = submittedEpisodes.has(currentEpisode)

                return (
                  <Button
                    size="lg"
                    className={`px-16 py-4 text-lg font-semibold transition-all duration-200 ${
                      isSubmitted
                        ? "bg-green-500 text-white cursor-not-allowed opacity-75"
                        : canSubmit
                          ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg hover:shadow-xl"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    onClick={() => !isSubmitted && canSubmit && setShowSubmissionSheet(true)}
                    disabled={!canSubmit || isSubmitted}
                  >
                    {isSubmitted
                      ? `픽 완료 (${connections.filter((c) => c.episodeNo === currentEpisode).length}쌍)`
                      : `픽하기 (${connections.filter((c) => c.episodeNo === currentEpisode).length}쌍)`}
                  </Button>
                )
              })()}
            </div>
          )}

          {selectedEpisodes.size > 1 && connections.length > 0 && (
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-purple-900">
                  선택한 회차 결과 (
                  {Array.from(selectedEpisodes)
                    .sort((a, b) => a - b)
                    .join(", ")}
                  회차)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(selectedEpisodes)
                    .sort((a, b) => a - b)
                    .map((ep) => {
                      const epConnections = connections.filter((c) => c.episodeNo === ep)
                      if (epConnections.length === 0) return null

                      return (
                        <div key={ep} className="space-y-2">
                          <h4 className="font-semibold text-purple-700">{ep}회차</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {epConnections.map((conn) => (
                              <div key={conn.id} className="p-2 bg-white rounded-lg border border-purple-200">
                                <span className="text-sm font-medium text-gray-700">
                                  {conn.left} ↔ {conn.right}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {hasVoted && (
        <div id="results" className="mt-8">
          <ResultSection mission={mission} userPairs={userVote || undefined} userId={userId} />
          {hasVoted && mission.status === "settled" && (
            <div className="flex justify-center py-8">
              <Button
                size="lg"
                onClick={handleResultView}
                className="px-16 py-4 text-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                결과 보기
              </Button>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-4">
            <Link href="/">
              <Button
                size="lg"
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                aria-label="다른 미션 보기"
              >
                다른 미션 보기
              </Button>
            </Link>
          </div>
        </div>
      )}

      {showSubmissionSheet && (
        <SubmissionSheet
          mission={mission}
          selectedPairs={connections
            .filter((conn) => conn.episodeNo === Array.from(selectedEpisodes)[0])
            .map((conn) => ({ left: conn.left, right: conn.right }))}
          onSubmit={handleSubmitVote}
          onCancel={() => setShowSubmissionSheet(false)}
          isSubmitting={isSubmitting}
        />
      )}

      <Dialog open={showRealtimeResults} onOpenChange={setShowRealtimeResults}>
        <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-purple-900">실시간 픽 결과</DialogTitle>
            <DialogDescription className="text-gray-600">다른 유저들의 커플 매칭 예측을 확인해보세요</DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b border-gray-200 mt-4">
            <button
              onClick={() => setResultsTab("overall")}
              className={`px-4 py-2 font-semibold transition-colors ${
                resultsTab === "overall"
                  ? "text-purple-700 border-b-2 border-purple-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              전체 결과
            </button>
            <button
              onClick={() => setResultsTab("selected")}
              className={`px-4 py-2 font-semibold transition-colors ${
                resultsTab === "selected"
                  ? "text-purple-700 border-b-2 border-purple-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              선택한 회차 결과
            </button>
          </div>

          {resultsTab === "overall" && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>
                  총 참여자: <strong className="text-purple-700">580명</strong>
                </span>
                <span className="text-xs text-gray-500">전체 회차 종합</span>
              </div>

              {mockAggregatedResults.map((result, index) => (
                <div
                  key={`${result.left}-${result.right}`}
                  className="relative overflow-hidden rounded-lg border border-purple-200 bg-white"
                >
                  <div className="relative z-10 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-lg text-gray-900">
                          {result.left} ↔ {result.right}
                        </div>
                        <div className="text-sm text-gray-600">{result.count}명 예측</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-700">{result.percentage}%</div>
                    </div>
                  </div>

                  <div
                    className="absolute inset-0 bg-gradient-to-r from-purple-100 to-pink-100 opacity-50"
                    style={{ width: `${result.percentage}%` }}
                  />
                </div>
              ))}

              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-700 text-center">
                  💡 전체 회차에서 가장 많은 예측을 받은 커플은{" "}
                  <strong className="text-purple-700">
                    {mockAggregatedResults[0].left}-{mockAggregatedResults[0].right}
                  </strong>{" "}
                  커플입니다!
                </p>
              </div>
            </div>
          )}

          {resultsTab === "selected" && (
            <>
              {selectedEpisodes.size === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <BarChart3 className="w-16 h-16 mx-auto" />
                  </div>
                  <p className="text-gray-600 font-medium">회차를 선택해주세요</p>
                  <p className="text-sm text-gray-500 mt-2">
                    하트 아이콘을 클릭하여 회차를 선택하면 결과를 확인할 수 있습니다
                  </p>
                </div>
              ) : selectedEpisodes.size === 1 ? (
                <div className="space-y-4 mt-4">
                  {(() => {
                    const episodeNo = Array.from(selectedEpisodes)[0]
                    const results = mockEpisodeResults[episodeNo] || []

                    return (
                      <>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                          <span>
                            총 참여자: <strong className="text-purple-700">200명</strong>
                          </span>
                          <span className="text-xs text-gray-500">{episodeNo}회차 결과</span>
                        </div>

                        {results.length > 0 ? (
                          <>
                            {results.map((result, index) => (
                              <div
                                key={`${result.left}-${result.right}`}
                                className="relative overflow-hidden rounded-lg border border-purple-200 bg-white"
                              >
                                <div className="relative z-10 p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-lg text-gray-900">
                                        {result.left} ↔ {result.right}
                                      </div>
                                      <div className="text-sm text-gray-600">{result.count}명 예측</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-purple-700">{result.percentage}%</div>
                                  </div>
                                </div>

                                <div
                                  className="absolute inset-0 bg-gradient-to-r from-purple-100 to-pink-100 opacity-50"
                                  style={{ width: `${result.percentage}%` }}
                                />
                              </div>
                            ))}

                            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="text-sm text-gray-700 text-center">
                                💡 {episodeNo}회차에서 가장 많은 예측을 받은 커플은{" "}
                                <strong className="text-purple-700">
                                  {results[0].left}-{results[0].right}
                                </strong>{" "}
                                커플입니다!
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="py-8 text-center text-gray-500">아직 픽 데이터가 없습니다</div>
                        )}
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  {(() => {
                    const aggregatedMap = new Map<string, { left: string; right: string; count: number }>()

                    Array.from(selectedEpisodes).forEach((episodeNo) => {
                      const results = mockEpisodeResults[episodeNo] || []
                      results.forEach((result) => {
                        const key = `${result.left}-${result.right}`
                        if (aggregatedMap.has(key)) {
                          aggregatedMap.get(key)!.count += result.count
                        } else {
                          aggregatedMap.set(key, {
                            left: result.left,
                            right: result.right,
                            count: result.count,
                          })
                        }
                      })
                    })

                    const aggregatedResults = Array.from(aggregatedMap.values())
                      .sort((a, b) => b.count - a.count)
                      .map((result) => ({
                        ...result,
                        percentage: Math.round((result.count / (selectedEpisodes.size * 200)) * 100),
                      }))

                    const totalParticipants = selectedEpisodes.size * 200

                    return (
                      <>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                          <span>
                            총 참여자: <strong className="text-purple-700">{totalParticipants}명</strong>
                          </span>
                          <span className="text-xs text-gray-500">
                            {Array.from(selectedEpisodes)
                              .sort((a, b) => a - b)
                              .join(", ")}
                            회차 종합
                          </span>
                        </div>

                        {aggregatedResults.length > 0 ? (
                          <>
                            {aggregatedResults.map((result, index) => (
                              <div
                                key={`${result.left}-${result.right}`}
                                className="relative overflow-hidden rounded-lg border border-purple-200 bg-white"
                              >
                                <div className="relative z-10 p-4 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-lg text-gray-900">
                                        {result.left} ↔ {result.right}
                                      </div>
                                      <div className="text-sm text-gray-600">{result.count}명 예측</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-purple-700">{result.percentage}%</div>
                                  </div>
                                </div>

                                <div
                                  className="absolute inset-0 bg-gradient-to-r from-purple-100 to-pink-100 opacity-50"
                                  style={{ width: `${result.percentage}%` }}
                                />
                              </div>
                            ))}

                            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="text-sm text-gray-700 text-center">
                                💡 선택한 회차들에서 가장 많은 예측을 받은 커플은{" "}
                                <strong className="text-purple-700">
                                  {aggregatedResults[0].left}-{aggregatedResults[0].right}
                                </strong>{" "}
                                커플입니다!
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="py-8 text-center text-gray-500">아직 픽 데이터가 없습니다</div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="h-40" />
    </div>
  )
}
