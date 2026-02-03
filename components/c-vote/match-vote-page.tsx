"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/c-ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Clock, Users, ArrowLeft, X, ChevronDown, BarChart3 } from "lucide-react"
import { ResultSection } from "./result-section"
import { SubmissionSheet } from "./submission-sheet"
import { EpisodeSelector } from "./episode-selector"
import { MockVoteRepo } from "@/lib/mock-vote-data"
import type { TMission, TMatchPairs } from "@/types/t-vote/vote.types"
import { findFirstCorrectEpisode } from "@/lib/utils/u-vote/vote.util"
import { getTimeRemaining, isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import { submitVote2, getAllVotes2, getVote2, getAggregatedVotes2, getAggregatedVotesMultipleEpisodes } from "@/lib/firebase/votes"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/c-ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/c-ui/dialog"
import LoginModal from "@/components/c-login-modal/login-modal"
import { isAuthenticated, getUserId } from "@/lib/auth-utils"

interface MatchVotePageProps {
  mission: TMission
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

// 실제 DB 데이터 사용

export function MatchVotePage({ mission }: MatchVotePageProps) {
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set())
  const [episodePicks, setEpisodePicks] = useState<Record<number, Array<{ left: string; right: string }>>>({})
  const [savedEpisodes, setSavedEpisodes] = useState<Set<number>>(new Set())
  const [submittedEpisode, setSubmittedEpisode] = useState<number | null>(null)
  const [submittedEpisodes, setSubmittedEpisodes] = useState<Set<number>>(new Set())

  const [connections, setConnections] = useState<Connection[]>([]) // 초기에는 빈 배열
  const [showSubmissionSheet, setShowSubmissionSheet] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState(false)
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
  const [aggregatedResults, setAggregatedResults] = useState<Record<string, number>>({})
  const [totalParticipants, setTotalParticipants] = useState<number>(0)
  const [loadingResults, setLoadingResults] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const userId = getUserId() || "user123"
  // 커플매칭 미션은 항상 멀티 에피소드로 처리 (episodes가 없으면 기본값 8)
  const isMultiEpisode = mission.form === "match" ? true : (mission.episodes && mission.episodes > 1)
  const totalEpisodes = mission.form === "match" ? (mission.episodes || 8) : (mission.episodes || 1)

  const hasVoted = userVote !== null
  const canVote =
    mission.status === "open" &&
    (!isMultiEpisode ||
      Object.keys(episodePicks).length === 0 ||
      Object.keys(episodePicks).some((ep) => !submittedEpisodes.has(Number.parseInt(ep))))
  // options가 TMatchPairs 형식일 수 있으므로 타입 체크
  const matchPairs = typeof mission.options === 'object' && mission.options !== null && !Array.isArray(mission.options)
    ? (mission.options as TMatchPairs)
    : null
  const leftItems = matchPairs?.left || []
  const rightItems = matchPairs?.right || []

  const canSubmit = connections.length >= 1

  const isConnected = (person: string) => {
    return connections.some((conn) => conn.left === person || conn.right === person)
  }

  // 1회차만 오픈하고 나머지는 잠그는 헬퍼 함수
  const getEpisodeStatus = useCallback((episodeNo: number) => {
    if (mission.episodeStatuses && mission.episodeStatuses[episodeNo]) {
      return mission.episodeStatuses[episodeNo]
    }
    // 데이터가 없으면 1회차만 open, 나머지는 locked
    return episodeNo === 1 ? "open" : "locked"
  }, [mission.episodeStatuses])

  // 실제 참여자 수 계산 (커플 매칭은 여러 회차에 참여할 수 있으므로, 실제 제출된 에피소드 수나 유니크 유저 수를 고려해야 함)
  // 여기서는 미션 전체 참여자 수를 보여주되, 만약 0명이면 임시로 1명으로 보여줌 (UX상)
  // 실제로는 DB에서 가져온 mission.stats.participants를 사용해야 함
  const displayParticipants = mission.stats.participants > 0
    ? mission.stats.participants
    : (submittedEpisodes.size > 0 ? 1 : 0) // 내가 참여했으면 최소 1명으로 표시

  // EpisodeSelector에 전달할 status 객체 생성
  const effectiveEpisodeStatuses = (() => {
    const statuses: Record<number, "open" | "settled" | "locked" | "preview"> = {}
    for (let i = 1; i <= totalEpisodes; i++) {
      statuses[i] = getEpisodeStatus(i) as any
    }
    return statuses
  })()

  const isCurrentEpisodeSettled = useCallback(() => {
    if (selectedEpisodes.size !== 1) return false
    const currentEpisode = Array.from(selectedEpisodes)[0]
    const status = getEpisodeStatus(currentEpisode)
    return status === "settled"
  }, [selectedEpisodes, getEpisodeStatus])

  const isCurrentEpisodeOpen = useCallback(() => {
    if (selectedEpisodes.size !== 1) return false
    const currentEpisode = Array.from(selectedEpisodes)[0]
    const status = getEpisodeStatus(currentEpisode)
    return status === "open"
  }, [selectedEpisodes, getEpisodeStatus])

  // 첫 회차 자동 선택 제거 - 사용자가 직접 선택하도록 변경

  useEffect(() => {
    let isMounted = true

    const loadVotesFromDB = async () => {
      try {
        const currentUserId = getUserId()
        if (!currentUserId) {
          // 로그인 안 된 경우 localStorage만 확인
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

            setEpisodePicks(loadedPicks)
            setSavedEpisodes(saved)
            setSubmittedEpisodes(submitted)
          }
          return
        }

        // 로그인된 경우 DB에서 투표 데이터 불러오기
        if (!isMultiEpisode) {
          // 단일 에피소드: getVote2로 첫 번째 에피소드 조회
          const vote = await getVote2(currentUserId, mission.id, 1)
          if (isMounted) {
            if (vote && vote.pairs) {
              setUserVote(vote.pairs)
              // connections도 업데이트
              const voteConnections = vote.pairs.map((pair) => ({
                left: pair.left,
                right: pair.right,
                id: `1-${pair.left}-${pair.right}`,
                episodeNo: 1,
              }))
              setConnections(voteConnections)

              // 단일 에피소드여도 episodePicks에 저장하여 상태 일관성 유지
              setEpisodePicks(prev => ({
                ...prev,
                1: vote.pairs || []
              }))
              setSavedEpisodes(new Set([1]))
              setSubmittedEpisodes(new Set([1]))
            } else {
              // DB에 없으면 localStorage 확인
              const existingVote = localStorage.getItem(`rp_picked_${mission.id}`)
              if (existingVote) {
                try {
                  const parsedVote = JSON.parse(existingVote)
                  setUserVote(parsedVote)
                } catch (error) {
                  console.error("Failed to parse existing vote:", error)
                }
              }
            }
          }
        } else {
          // 멀티 에피소드: getAllVotes2로 모든 에피소드 조회
          const allVotes = await getAllVotes2(currentUserId, mission.id)
          const loadedPicks: Record<number, Array<{ left: string; right: string }>> = {}
          const saved = new Set<number>()
          const submitted = new Set<number>()

          // DB에서 불러온 데이터로 업데이트
          allVotes.forEach((vote) => {
            if (vote.episodeNo && vote.pairs) {
              loadedPicks[vote.episodeNo] = vote.pairs
              saved.add(vote.episodeNo)
              submitted.add(vote.episodeNo)
            }
          })

          // localStorage도 백업으로 확인
          for (let ep = 1; ep <= totalEpisodes; ep++) {
            if (!loadedPicks[ep]) {
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
            }

            const submittedKey = `rp_matchpick_submitted_${mission.id}_${ep}`
            const isSubmitted = localStorage.getItem(submittedKey)
            if (isSubmitted === "true" && !submitted.has(ep)) {
              submitted.add(ep)
            }
          }

          if (isMounted) {
            setEpisodePicks(loadedPicks)
            setSavedEpisodes(saved)
            setSubmittedEpisodes(submitted)
            // connections는 useEffect에서 selectedEpisodes에 따라 자동으로 설정됨
          }
        }
      } catch (error) {
        console.error("투표 데이터 로딩 실패:", error)
      }
    }

    loadVotesFromDB()

    return () => {
      isMounted = false
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

      // 항상 현재 선택된 에피소드의 연결만 표시
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
    } else {
      // 에피소드가 선택되지 않았을 때는 connections를 비움
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
          description: "커플 매칭은 한 회차만 가능합니다.",
          variant: "destructive",
        })
        return
      }

      const leftPerson = column1 === "left" ? item1 : item2
      const rightPerson = column1 === "right" ? item1 : item2

      const currentEpisode = Array.from(selectedEpisodes)[0]

      // connections는 항상 현재 선택된 에피소드의 연결만 포함해야 함
      // 같은 에피소드 내에서 같은 커플 조합이 이미 있는지 확인
      const isDuplicate = connections.some(
        (conn) =>
          conn.episodeNo === currentEpisode &&
          conn.left === leftPerson &&
          conn.right === rightPerson,
      )

      if (isDuplicate) {
        // 이미 같은 커플 조합이 있으면 추가하지 않음
        return
      }

      // 같은 에피소드 내에서 같은 left 또는 right를 가진 기존 연결 제거 (한 사람은 하나의 연결만 가능)
      const filteredConnections = connections.filter(
        (conn) =>
          conn.episodeNo !== currentEpisode ||
          (conn.left !== leftPerson && conn.right !== rightPerson),
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

      // 드래그 가능 조건: canVote가 true이고, 회차가 선택되어 있고, 제출되지 않았고, episodeStatuses가 없거나 open인 경우
      // 수정: 1회차 외의 다른 회차도 드래그 가능해야 함.
      // canVote 체크 로직 수정: isMultiEpisode일 때는 현재 에피소드가 제출되었는지만 확인

      if (selectedEpisodes.size !== 1) {
        toast({
          title: "회차를 먼저 선택해주세요",
          description: "상단의 하트 아이콘을 클릭하여 회차를 선택해야 드래그가 가능합니다.",
          variant: "destructive",
        })
        return
      }
      if (isSubmitted) return

      // episodeStatuses가 없으면 기본적으로 open으로 간주 -> 수정: getEpisodeStatus 사용
      const episodeStatus = getEpisodeStatus(currentEpisode || 1)
      if (episodeStatus === "settled" || episodeStatus === "locked") return

      e.preventDefault()
      setDragState({
        isDragging: true,
        draggedItem: item,
        draggedColumn: column,
        ghostLine: null,
      })
    },
    [selectedEpisodes, submittedEpisodes, getEpisodeStatus, toast], // canVote 의존성 제거, toast 추가
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

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!dragState.isDragging || !dragState.draggedItem || !canvasRef.current) return

      e.preventDefault() // 스크롤 방지

      const touch = e.touches[0]
      if (!touch) return

      const rect = canvasRef.current.getBoundingClientRect()
      const itemRef =
        dragState.draggedColumn === "left"
          ? leftItemRefs.current[dragState.draggedItem]
          : rightItemRefs.current[dragState.draggedItem]

      if (!itemRef) return

      const itemRect = itemRef.getBoundingClientRect()
      const startX = itemRect.left + itemRect.width / 2 - rect.left
      const startY = itemRect.top + itemRect.height / 2 - rect.top
      const endX = touch.clientX - rect.left
      const endY = touch.clientY - rect.top

      setDragState((prev) => ({
        ...prev,
        ghostLine: { startX, startY, endX, endY },
      }))
    },
    [dragState.isDragging, dragState.draggedItem, dragState.draggedColumn],
  )

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      // 드래그 종료 시 canVote 체크 로직 제거: handleMouseDown에서 이미 체크하고 있고,
      // 연결 생성 시점에는 현재 에피소드의 상태만 중요함
      if (!dragState.isDragging || !dragState.draggedItem) {
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

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!dragState.isDragging || !dragState.draggedItem) {
        setDragState({ isDragging: false, draggedItem: null, draggedColumn: null, ghostLine: null })
        setHoveredTarget(null)
        return
      }

      const touch = e.changedTouches[0]
      if (!touch) return

      const target = document.elementFromPoint(touch.clientX, touch.clientY)
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
              const distance = Math.sqrt(Math.pow(touch.clientX - centerX, 2) + Math.pow(touch.clientY - centerY, 2))

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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, item: string, column: "left" | "right") => {
      const currentEpisode = selectedEpisodes.size === 1 ? Array.from(selectedEpisodes)[0] : null
      const isSubmitted = currentEpisode ? submittedEpisodes.has(currentEpisode) : false

      if (selectedEpisodes.size !== 1) {
        toast({
          title: "회차를 먼저 선택해주세요",
          description: "상단의 하트 아이콘을 클릭하여 회차를 선택해야 드래그가 가능합니다.",
          variant: "destructive",
        })
        return
      }
      if (isSubmitted) return

      const episodeStatus = getEpisodeStatus(currentEpisode || 1)
      if (episodeStatus === "settled" || episodeStatus === "locked") return

      e.preventDefault()
      setDragState({
        isDragging: true,
        draggedItem: item,
        draggedColumn: column,
        ghostLine: null,
      })
    },
    [selectedEpisodes, submittedEpisodes, getEpisodeStatus, toast],
  )

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchmove", handleTouchMove, { passive: false })
      document.addEventListener("touchend", handleTouchEnd, { passive: false })
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  const removeConnection = (connectionId: string) => {
    if (!canVote || selectedEpisodes.size !== 1 || !isCurrentEpisodeOpen()) return
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
    setIsSubmitting(true)
    try {
      // 제출 시점에 다시 한번 검증
      if (connections.length === 0) {
        toast({
          title: "커플을 선택해주세요",
          description: "최소 1개 이상의 커플을 매칭해주세요.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      if (selectedEpisodes.size !== 1) {
        toast({
          title: "회차를 하나만 선택해주세요",
          description: "제출하기는 한 회차만 가능합니다.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const currentEpisode = Array.from(selectedEpisodes)[0]
      const currentEpisodeConnections = connections.filter((conn) => conn.episodeNo === currentEpisode)

      if (currentEpisodeConnections.length === 0) {
        toast({
          title: "커플을 선택해주세요",
          description: "최소 1개 이상의 커플을 매칭해주세요.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const pairs = currentEpisodeConnections.map((conn) => ({ left: conn.left, right: conn.right }))

      // 사용자 ID 확인
      const currentUserId = getUserId()
      if (!currentUserId) {
        toast({
          title: "로그인이 필요합니다",
          description: "투표를 제출하려면 로그인이 필요합니다.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      console.log("Submitting vote2:", {
        missionId: mission.id,
        userId: currentUserId,
        episodeNo: currentEpisode,
        pairs: pairs
      })

      // DB에 커플매칭 투표 제출 (타임아웃 15초로 단축)
      console.log("🚀 투표 제출 시작...")
      
      const votePromise = submitVote2({
        missionId: mission.id,
        userId: currentUserId,
        pairs,
        episodeNo: currentEpisode,
        submittedAt: new Date().toISOString(),
      })
      
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => {
          console.log("⏰ 투표 제출 타임아웃 (15초)")
          reject(new Error("투표 제출 시간 초과 (15초). 네트워크 연결을 확인해주세요."))
        }, 15000)
      )
      
      const voteSuccess = await Promise.race([votePromise, timeoutPromise])
      console.log("✅ 투표 제출 결과:", voteSuccess)

      if (!voteSuccess) {
        throw new Error("투표 제출 실패")
      }

      // 참여자 수 증가는 submitVote2 내부에서 처리됨 (처음 투표하는 경우에만)
      // incrementMissionParticipants2는 submitMatchMissionAnswer에서 이미 호출됨

      // DB에서 제출한 투표 데이터 다시 불러오기
      const savedVote = await getVote2(currentUserId, mission.id, currentEpisode)

      if (savedVote && savedVote.pairs) {
        // episodePicks 업데이트 (useEffect가 자동으로 connections를 업데이트함)
        setEpisodePicks((prev) => ({
          ...prev,
          [currentEpisode]: savedVote.pairs || [],
        }))
      }

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

        // 실시간 동기화를 위한 이벤트 발생
        window.dispatchEvent(new CustomEvent('mission-vote-updated', {
          detail: { missionId: mission.id, userId, episodeNo: currentEpisode }
        }))

        toast({
          title: `${currentEpisode}회 제출 완료!`,
          description: "성공적으로 저장되었습니다.",
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
          localStorage.setItem(`rp_picked_${mission.id}`, JSON.stringify(pairs))
          toast({
            title: "제출 완료!",
            description: "커플 매칭을 성공적으로 제출했습니다.",
          })
        }
      }

      setShowSubmissionSheet(false)
    } catch (error) {
      console.error("❌ 제출 에러:", error)
      
      let errorMessage = "제출 중 오류가 발생했습니다."
      if (error instanceof Error) {
        if (error.message.includes("시간 초과")) {
          errorMessage = "네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요."
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "제출 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      console.log("🔄 투표 제출 완료 - isSubmitting을 false로 설정")
      setIsSubmitting(false)
    }
  }

  const getTypeBadge = () => {
    switch (mission.form) {
      case "binary":
        return "이진"
      case "multi":
        return "다자"
      case "match":
        return "커플매칭"
      default:
        return "투표"
    }
  }



  const handleResultView = () => {
    if (mission.status === "settled") {
      router.push(`/p-mission/${mission.id}/results`)
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
      description: "모든 저장된 픽 데이터를 삭제했습니다.",
    })
  }

  // 실시간 결과 로드 함수
  const loadAggregatedResults = async (episodeNo?: number) => {
    setLoadingResults(true)
    try {
      if (resultsTab === "overall") {
        // 전체 결과: 항상 모든 회차의 데이터를 통합
        const { pairCounts, totalParticipants } = await getAggregatedVotes2(mission.id)
        setAggregatedResults(pairCounts)
        setTotalParticipants(totalParticipants)
      } else if (selectedEpisodes.size === 0) {
        // 선택한 에피소드 결과에서 에피소드 미선택 시
        setAggregatedResults({})
        setTotalParticipants(0)
      } else if (selectedEpisodes.size === 1) {
        // 단일 에피소드 결과
        const episodeNo = Array.from(selectedEpisodes)[0]
        const { pairCounts, totalParticipants } = await getAggregatedVotes2(mission.id, episodeNo)
        setAggregatedResults(pairCounts)
        setTotalParticipants(totalParticipants)
      } else {
        // 여러 에피소드 결과 합산
        const episodeNos = Array.from(selectedEpisodes)
        const { pairCounts, totalParticipants } = await getAggregatedVotesMultipleEpisodes(mission.id, episodeNos)
        setAggregatedResults(pairCounts)
        setTotalParticipants(totalParticipants)
      }
    } catch (error) {
      console.error("Failed to load aggregated results:", error)
    } finally {
      setLoadingResults(false)
    }
  }

  // 실시간 결과 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (showRealtimeResults) {
      loadAggregatedResults() // 탭에 따라 자동으로 처리됨
    }
  }, [showRealtimeResults, resultsTab, selectedEpisodes, mission.id])

  // 실시간 투표 업데이트 감지
  useEffect(() => {
    const handleVoteUpdate = (event: any) => {
      const { missionId } = event.detail || {}
      if (missionId === mission.id && showRealtimeResults) {
        console.log("🔄 실시간 결과 업데이트 - 집계 데이터 새로고침")
        loadAggregatedResults()
      }
    }

    window.addEventListener("mission-vote-updated", handleVoteUpdate)
    return () => {
      window.removeEventListener("mission-vote-updated", handleVoteUpdate)
    }
  }, [mission.id, showRealtimeResults, loadAggregatedResults])

  // Return JSX
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRealtimeResults(true)}
            className="gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200 bg-transparent"
          >
            <BarChart3 className="w-4 h-4" />
            실시간 결과
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* 이미지 표시 */}
        {mission.imageUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 max-w-2xl mx-auto">
            <img
              src={mission.imageUrl}
              alt="미션 이미지"
              className="w-full h-auto object-cover max-h-[350px]"
            />
          </div>
        )}

        {/* 설명 및 더보기 */}
        <div className="relative max-w-2xl mx-auto">
          <p className={`text-base text-gray-600 ${!isExpanded ? "line-clamp-3" : ""}`}>
            {mission.description}
          </p>
          {mission.description && mission.description.length > 100 && (
            <Button
              variant="link"
              className="p-0 h-auto text-rose-500 font-semibold mt-1"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "접기" : "더보기"}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span className="font-semibold text-gray-900">{displayParticipants.toLocaleString()}</span>명 참여
        </div>
      </div>

      {isMultiEpisode && mission.status === "settled" && userScore && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-900">점수 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-700 mb-2">+{userScore.score}점</div>
              <div className="text-sm text-gray-600">최초 정답: {userScore.episodeNo}회</div>
            </div>
          </CardContent>
        </Card>
      )}

      {isMultiEpisode && mission.status === "settled" && !userScore && Object.keys(episodePicks).length > 0 && (
        <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700 mb-2">정답 없음 (0점)</div>
              <div className="text-sm text-gray-600">남은 기회를 활용해보세요!</div>
            </div>
          </CardContent>
        </Card>
      )}

      {hasVoted && !isMultiEpisode && mission.status === "open" && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-1">제출 완료!</h3>
                <p className="text-sm text-gray-600">
                  {mission.revealPolicy === "realtime"
                    ? "실시간으로 집계된 결과를 아래에서 확인하세요!"
                    : "마감까지 결과를 기다려주세요. 나중에 내가 선택한 커플 매칭을 확인할 수 있습니다."}
                </p>
              </div>
              {/* 커플매칭 미션은 회차별 관리이므로 마감 시간 표시하지 않음 */}
              {mission.form !== "match" && mission.deadline && !isDeadlinePassed(mission.deadline) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{getTimeRemaining(mission.deadline)}</span>
                </div>
              )}
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
                    {pair.left} - {pair.right}
                  </span>
                  <Badge className="bg-purple-500 text-white text-xs">매칭</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 에피소드 선택기 (상단 배치) */}
      {isMultiEpisode && (
        <div className="mb-6">
          <EpisodeSelector
            totalEpisodes={totalEpisodes}
            selectedEpisodes={selectedEpisodes}
            savedEpisodes={submittedEpisodes}
            episodeStatuses={effectiveEpisodeStatuses}
            onEpisodeToggle={handleEpisodeToggle}
            disabled={false}
          />
        </div>
      )}

      {/* 제출 여부나 투표 가능 여부와 상관없이, 미션이 오픈 상태이고 연결된 정보가 있으면 캔버스를 보여줍니다. */}
      {mission.status === "open" && (
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
                  <p className="text-lg font-bold text-green-900">{submittedEpisode}회 제출 완료!</p>
                  <p className="text-sm text-green-700">이미 성공적으로 저장되었습니다. 다른 회차도 참여해보세요!</p>
                </div>
              </div>
            </div>
          )}

          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 shadow-lg overflow-hidden max-w-3xl mx-auto">
            <CardHeader className="text-center py-4 px-4">
              <CardTitle className="text-xl font-bold text-gray-900">
                {isMultiEpisode && selectedEpisodes.size === 1
                  ? `${Array.from(selectedEpisodes)[0]}회 커플 매칭하기`
                  : isMultiEpisode && selectedEpisodes.size > 1
                    ? `${Array.from(selectedEpisodes)
                      .sort((a, b) => a - b)
                      .join(", ")}회 보기`
                    : isMultiEpisode && selectedEpisodes.size === 0
                      ? "회차를 선택해주세요"
                      : "커플 매칭하기"}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {selectedEpisodes.size === 1 && isCurrentEpisodeSettled()
                  ? "마감된 회차입니다(수정 불가)"
                  : selectedEpisodes.size === 1 && submittedEpisodes.has(Array.from(selectedEpisodes)[0])
                    ? "제출이 완료되었습니다 (수정 불가)"
                    : selectedEpisodes.size === 1 && getEpisodeStatus(Array.from(selectedEpisodes)[0]) === "locked"
                      ? "아직 열리지 않은 회차입니다"
                      : selectedEpisodes.size === 1
                        ? "드래그하여 커플을 연결해보세요"
                        : selectedEpisodes.size > 1
                          ? "여러 회차의 매칭을 확인하세요"
                          : "하트 아이콘을 클릭하여 회차를 선택하세요"}
              </p>
            </CardHeader>
            <CardContent className="p-4">
              <div ref={canvasRef} className="relative w-full mx-auto" style={{ minHeight: "400px" }}>
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

                <div className="grid grid-cols-2 gap-4 relative z-20 w-full mx-auto">
                  <div className="space-y-2">
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                        남성
                      </h3>
                    </div>
                    <div
                      className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 space-y-2 min-h-[350px]"
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
                        const isLocked = currentEpisode ? getEpisodeStatus(currentEpisode) === "locked" : false

                        return (
                          <div
                            key={person}
                            ref={(el) => {
                              leftItemRefs.current[person] = el
                            }}
                            data-item={person}
                            data-column="left"
                            className={`
                              relative p-2.5 rounded-lg border-2 transition-all duration-200 select-none
                              ${isSettled || isSubmitted || isLocked ? "cursor-not-allowed opacity-60" : "cursor-grab"}
                              ${connected
                                ? "border-blue-400 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 shadow-md"
                                : "border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50"
                              }
                              ${isDragging ? "scale-105 shadow-lg border-blue-500" : ""}
                              ${isHovered ? "border-purple-400 bg-purple-50 shadow-lg" : ""}
                              ${dragState.isDragging && dragState.draggedColumn === "right" && !isConnected(person) && !isSettled && !isSubmitted && !isLocked ? "hover:border-purple-400 hover:bg-purple-50" : ""}
                            `}
                            style={{ width: "75%", margin: "0 auto" }}
                            onMouseDown={(e) => handleMouseDown(e, person, "left")}
                            onTouchStart={(e) => handleTouchStart(e, person, "left")}
                            onMouseEnter={() => {
                              if (
                                dragState.isDragging &&
                                dragState.draggedColumn === "right" &&
                                !isConnected(person) &&
                                !isSettled &&
                                !isSubmitted &&
                                !isLocked
                              ) {
                                setHoveredTarget(person)
                              }
                            }}
                            onMouseLeave={() => setHoveredTarget(null)}
                          >
                            <div className="flex items-center justify-center text-center">
                              <span className="font-semibold text-base">{person}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                        여성
                      </h3>
                    </div>
                    <div
                      className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-3 space-y-2 min-h-[350px]"
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
                        const isLocked = currentEpisode ? getEpisodeStatus(currentEpisode) === "locked" : false

                        return (
                          <div
                            key={person}
                            ref={(el) => {
                              rightItemRefs.current[person] = el
                            }}
                            data-item={person}
                            data-column="right"
                            className={`
                              relative p-2.5 rounded-lg border-2 transition-all duration-200 select-none
                              ${isSettled || isSubmitted || isLocked ? "cursor-not-allowed opacity-60" : "cursor-grab"}
                              ${connected
                                ? "border-rose-400 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 shadow-md"
                                : "border-gray-300 bg-white hover:border-rose-300 hover:bg-rose-50"
                              }
                              ${isDragging ? "scale-105 shadow-lg border-rose-500" : ""}
                              ${isHovered ? "border-purple-400 bg-purple-50 shadow-lg" : ""}
                              ${dragState.isDragging && dragState.draggedColumn === "left" && !isConnected(person) && !isSettled && !isSubmitted && !isLocked ? "hover:border-purple-400 hover:bg-purple-50" : ""}
                            `}
                            style={{ width: "75%", margin: "0 auto" }}
                            onMouseDown={(e) => handleMouseDown(e, person, "right")}
                            onTouchStart={(e) => handleTouchStart(e, person, "right")}
                            onMouseEnter={() => {
                              if (
                                dragState.isDragging &&
                                dragState.draggedColumn === "left" &&
                                !isConnected(person) &&
                                !isSettled &&
                                !isSubmitted &&
                                !isLocked
                              ) {
                                setHoveredTarget(person)
                              }
                            }}
                            onMouseLeave={() => setHoveredTarget(null)}
                          >
                            <div className="flex items-center justify-center text-center">
                              <span className="font-semibold text-base">{person}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {connections.length > 0 && (() => {
                // 중복 제거: 같은 에피소드 내에서 같은 커플 조합은 하나만 표시
                const uniqueConnectionsMap = new Map<string, Connection>()
                connections.forEach((conn) => {
                  // 에피소드 번호를 포함한 고유 키 생성
                  const key = `${conn.episodeNo || 'default'}-${conn.left}-${conn.right}`
                  // 같은 키가 없거나, 있더라도 현재 연결이 더 최신인 경우 (id가 더 큰 경우) 업데이트
                  if (!uniqueConnectionsMap.has(key) ||
                    (uniqueConnectionsMap.get(key)?.id && conn.id > uniqueConnectionsMap.get(key)!.id)) {
                    uniqueConnectionsMap.set(key, conn)
                  }
                })
                const uniqueConnections = Array.from(uniqueConnectionsMap.values())

                return (
                  <div className="mt-4 p-3 bg-white rounded-xl border border-rose-200">
                    <h4 className="text-base font-semibold text-gray-900 mb-3">
                      현재 매칭 ({uniqueConnections.length}개
                      {selectedEpisodes.size > 1 &&
                        ` - ${Array.from(selectedEpisodes)
                          .sort((a, b) => a - b)
                          .join(", ")}회`}
                      )
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {uniqueConnections.map((conn) => (
                        <div
                          key={conn.id}
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-rose-100 to-pink-100 rounded-lg border border-rose-200"
                        >
                          <span className="font-semibold text-rose-700">
                            {conn.left} - {conn.right}
                            {conn.episodeNo && selectedEpisodes.size > 1 && (
                              <span className="text-xs ml-2 text-purple-600">({conn.episodeNo}회)</span>
                            )}
                          </span>
                          {selectedEpisodes.size === 1 &&
                            isCurrentEpisodeOpen() &&
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
                )
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {isMultiEpisode && (
        <div className="space-y-4">
          {selectedEpisodes.size === 1 && (
            <div className="flex justify-center py-4">
              {(() => {
                const currentEpisode = Array.from(selectedEpisodes)[0]
                const isSubmitted = submittedEpisodes.has(currentEpisode)
                const isSettled = isCurrentEpisodeSettled()

                return (
                  <Button
                    size="lg"
                    className={`px-16 py-4 text-lg font-semibold transition-all duration-200 ${isSubmitted || isSettled
                      ? "bg-green-500 text-white cursor-not-allowed opacity-75"
                      : canSubmit
                        ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg hover:shadow-xl"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    onClick={() => {
                      if (isSubmitted || isSettled || !canSubmit) return
                      // 로그인 체크
                      if (!isAuthenticated()) {
                        setPendingSubmit(true)
                        setShowLoginModal(true)
                      } else {
                        setShowSubmissionSheet(true)
                      }
                    }}
                    disabled={!canSubmit || isSubmitted || isSettled}
                  >
                    {isSettled
                      ? "마감된 회차"
                      : isSubmitted
                        ? `제출 완료 (${connections.filter((c) => c.episodeNo === currentEpisode).length}개)`
                        : `제출하기 (${connections.filter((c) => c.episodeNo === currentEpisode).length}개)`}
                  </Button>
                )
              })()}
            </div>
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
                className="px-16 py-4 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
              >
                결과 보기
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false)
          setPendingSubmit(false)
        }}
        onLoginSuccess={() => {
          // 로그인 성공 후 제출 시트 표시
          if (pendingSubmit) {
            setShowSubmissionSheet(true)
            setPendingSubmit(false)
          }
        }}
      />

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
            <DialogTitle className="text-2xl font-bold text-purple-900">실시간 결과</DialogTitle>
            <DialogDescription className="text-gray-600">
              다른 사용자들의 커플 매칭 예측을 확인해보세요
              {totalParticipants > 0 && (
                <span className="block mt-1 font-medium text-purple-700">
                  총 {totalParticipants.toLocaleString()}명이 참여했습니다
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b border-gray-200 mt-4">
            <button
              onClick={() => setResultsTab("overall")}
              className="px-4 py-2 font-semibold text-purple-700 border-b-2 border-purple-700"
            >
              전체 결과
            </button>
          </div>

          {resultsTab === "overall" && (
            <div className="space-y-4 mt-4">
              {loadingResults ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">실시간 결과를 불러오는 중...</p>
                </div>
              ) : Object.keys(aggregatedResults).length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-purple-900">전체 커플 랭킹</h4>
                  {Object.entries(aggregatedResults)
                    .sort(([, a], [, b]) => b - a) // 투표 수 내림차순 정렬
                    .map(([pair, count], index) => {
                      const totalVotes = Object.values(aggregatedResults).reduce((sum, c) => sum + c, 0)
                      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0

                      return (
                        <div key={pair} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center bg-white">
                              {index + 1}
                            </Badge>
                            <span className="font-medium text-gray-900">{pair}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-700">{percentage}%</div>
                            <div className="text-sm text-gray-500">{count}표</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>아직 투표 데이터가 없습니다.</p>
                  <p className="text-sm mt-2">다른 사용자들의 투표가 진행되면 결과가 표시됩니다.</p>
                </div>
              )}
            </div>
          )}

        </DialogContent>
      </Dialog>

    </div>
  )
}
