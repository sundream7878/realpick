"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Card, CardContent } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { Label } from "@/components/c-ui/label"
import { Input } from "@/components/c-ui/input"
import { Clock, Users } from "lucide-react"
import { ResultSection } from "./result-section"
import { SubmissionSheet } from "./submission-sheet"
import { MockVoteRepo } from "@/lib/mock-vote-data"
import { submitVote1, getVote1 } from "@/lib/supabase/votes"
import { incrementMissionParticipants, updateOptionVoteCounts, getMission } from "@/lib/supabase/missions"
import { getUserId } from "@/lib/auth-utils"
import { getTimeRemaining, isDeadlinePassed } from "@/lib/utils/u-time/timeUtils.util"
import type { TMission } from "@/types/t-vote/vote.types"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import LoginModal from "@/components/c-login-modal/login-modal"
import { isAuthenticated } from "@/lib/auth-utils"
import { CardHeader, CardTitle } from "@/components/c-ui/card"
import { isYoutubeUrl, getYoutubeEmbedUrl } from "@/lib/utils/u-media/youtube.util"

interface MultiVotePageProps {
  mission: TMission
}

export function MultiVotePage({ mission }: MultiVotePageProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | string[] | null>(null)
  const [textInputs, setTextInputs] = useState<string[]>(Array(mission.requiredAnswerCount || 1).fill(""))
  const [textInput, setTextInput] = useState("")
  const [showSubmissionSheet, setShowSubmissionSheet] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userVote, setUserVote] = useState<string | string[] | null>(null)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [currentMission, setCurrentMission] = useState<TMission>(mission)
  const [isExpanded, setIsExpanded] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // 사용자 ID 가져오기
  const userId = getUserId() || "user123"

  // Sync userVote to inputs
  useEffect(() => {
    if (userVote) {
      if (Array.isArray(userVote)) {
        setSelectedChoice(userVote)
        if (currentMission.submissionType === 'text') {
          setTextInputs(userVote)
        }
      } else {
        setSelectedChoice(userVote)
        if (currentMission.submissionType === 'text') {
          setTextInputs([userVote])
          setTextInput(userVote)
        }
      }
    }
  }, [userVote, currentMission.submissionType])

  // Check localStorage
  useEffect(() => {
    if (!userVote && !isAuthenticated()) {
      const existingVote = localStorage.getItem(`rp_picked_${mission.id}`)
      if (existingVote) {
        try {
          const parsed = JSON.parse(existingVote);
          setUserVote(parsed);
        } catch {
          setUserVote(existingVote);
        }
      }
    }
  }, [userVote, mission.id])

  useEffect(() => {
    const checkExistingVote = async () => {
      // 커플매칭 미션은 이 컴포넌트를 사용하지 않으므로 스킵
      if (mission.form === "match") {
        return
      }

      // 인증된 사용자인 경우 Supabase에서 투표 확인
      if (isAuthenticated()) {
        const vote = await getVote1(userId, mission.id)
        if (vote && vote.choice) {
          setUserVote(vote.choice)
        }
      }
    }

    checkExistingVote()
  }, [mission.id, mission.form, userId])

  const hasVoted = userVote !== null
  const canVote = currentMission.status === "open" && !hasVoted
  const showPercentages =
    hasVoted && (currentMission.status === "settled" || (currentMission.status === "open" && currentMission.revealPolicy === "realtime"))

  const handleResultView = () => {
    // 마감된 경우에만 최종 결과 페이지로 이동
    if (currentMission.deadline && isDeadlinePassed(currentMission.deadline)) {
      router.push(`/p-mission/${currentMission.id}/results`)
    } else {
      // 진행 중인 경우 현재 페이지의 결과 섹션으로 스크롤
      const resultsElement = document.getElementById("live-results")
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }

  const handleSubmitVote = async () => {
    if (!selectedChoice) return

    setIsSubmitting(true)
    try {
      console.log("투표 제출 시작:", { missionId: mission.id, userId, choice: selectedChoice })

      // 1. Supabase에 투표 제출
      const voteSuccess = await submitVote1({
        missionId: mission.id,
        userId,
        choice: selectedChoice,
        submittedAt: new Date().toISOString(),
      })

      if (!voteSuccess) {
        console.error("투표 제출 실패: submitVote1이 false를 반환했습니다")
        throw new Error("투표 제출 실패: 데이터베이스에 저장할 수 없습니다")
      }

      console.log("투표 제출 성공, 저장 확인 중...")

      // 제출이 실제로 저장되었는지 확인
      const verifyVote = await getVote1(userId, mission.id)

      const isVoteVerified = verifyVote && (
        Array.isArray(verifyVote.choice) && Array.isArray(selectedChoice)
          ? JSON.stringify(verifyVote.choice) === JSON.stringify(selectedChoice)
          : verifyVote.choice === selectedChoice
      )

      if (!isVoteVerified) {
        console.error("투표 저장 확인 실패:", { verifyVote, expected: selectedChoice })
        throw new Error("투표가 제대로 저장되지 않았습니다. 다시 시도해주세요.")
      }

      console.log("투표 저장 확인 완료, 참여자 수 증가 중...")

      // 2. 미션 참여자 수 증가
      const participantsResult = await incrementMissionParticipants(mission.id)
      if (!participantsResult.success) {
        console.error("참여자 수 증가 실패:", participantsResult.error)
        // 참여자 수 증가 실패는 치명적이지 않으므로 경고만 표시
      }

      console.log("투표 수 집계 업데이트 중...")

      // 3. 투표 수 집계 업데이트
      const voteCountsResult = await updateOptionVoteCounts(mission.id)
      if (!voteCountsResult.success) {
        console.error("투표 수 집계 실패:", voteCountsResult.error)
        // 투표 수 집계 실패는 치명적이지 않으므로 경고만 표시
      }

      console.log("미션 데이터 다시 가져오는 중...")

      // 4. 업데이트된 미션 데이터 다시 가져오기
      const updatedMissionResult = await getMission(mission.id)
      if (updatedMissionResult.success && updatedMissionResult.mission) {
        const updatedMission: TMission = {
          id: updatedMissionResult.mission.f_id,
          title: updatedMissionResult.mission.f_title,
          kind: updatedMissionResult.mission.f_kind,
          form: updatedMissionResult.mission.f_form,
          seasonType: updatedMissionResult.mission.f_season_type || "전체",
          seasonNumber: updatedMissionResult.mission.f_season_number || undefined,
          options: updatedMissionResult.mission.f_options || [],
          deadline: updatedMissionResult.mission.f_deadline,
          revealPolicy: updatedMissionResult.mission.f_reveal_policy,
          status: updatedMissionResult.mission.f_status,
          stats: {
            participants: updatedMissionResult.mission.f_stats_participants || 0,
            totalVotes: updatedMissionResult.mission.f_stats_total_votes || 0
          },
          result: {
            distribution: updatedMissionResult.mission.f_option_vote_counts || {},
            totalVotes: updatedMissionResult.mission.f_stats_total_votes || 0
          },
          createdAt: updatedMissionResult.mission.f_created_at,
          description: updatedMissionResult.mission.f_description || undefined,
          referenceUrl: updatedMissionResult.mission.f_reference_url || undefined,
          imageUrl: updatedMissionResult.mission.f_image_url || undefined,
          thumbnailUrl: updatedMissionResult.mission.f_thumbnail_url || undefined
        }
        setCurrentMission(updatedMission)
      } else {
        console.warn("미션 데이터 업데이트 실패:", updatedMissionResult.error)
      }

      // 5. 로컬 상태 업데이트 (제출 성공 후 무조건 실행)
      setUserVote(selectedChoice)
      localStorage.setItem(`rp_picked_${mission.id}`, JSON.stringify(selectedChoice))
      setShowSubmissionSheet(false)
      setSelectedChoice("")
      setTextInput("")

      // 실시간 동기화를 위한 이벤트 발생
      window.dispatchEvent(new CustomEvent('mission-vote-updated', {
        detail: { missionId: mission.id, userId }
      }))

      console.log("투표 제출 완료!")

      toast({
        title: "제출 완료!",
        description: "성공적으로 제출되었습니다",
      })

      // 6. 중간 결과 섹션으로 스크롤
      setTimeout(() => {
        const resultsElement = document.getElementById("live-results")
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 500)
    } catch (error) {
      console.error("투표 제출 에러:", error)
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다"

      // 에러 발생 시 모달은 열어두고 제출 상태만 해제
      // setShowSubmissionSheet(false)를 호출하지 않음

      toast({
        title: "제출 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOptionClick = (option: string) => {
    if (!canVote) return

    const requiredCount = currentMission.requiredAnswerCount || 1

    if (requiredCount > 1) {
      // 다중 선택 로직
      let newSelection: string[] = []
      if (Array.isArray(selectedChoice)) {
        newSelection = [...selectedChoice]
      } else if (selectedChoice) {
        newSelection = [selectedChoice]
      }

      if (newSelection.includes(option)) {
        newSelection = newSelection.filter(item => item !== option)
      } else {
        if (newSelection.length < requiredCount) {
          newSelection.push(option)
        } else {
          toast({
            title: "선택 제한",
            description: `최대 ${requiredCount}개까지만 선택할 수 있습니다.`,
            variant: "destructive",
          })
          return
        }
      }
      setSelectedChoice(newSelection)
    } else {
      // 단일 선택 로직
      setSelectedChoice(option)
    }
  }

  const getTypeBadge = () => {
    switch (currentMission.form) {
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
    return currentMission.revealPolicy === "realtime" ? "실시간" : "마감"
  }

  const options = Array.isArray(currentMission.options) ? currentMission.options : []

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {/* 이미지 표시 */}
        {currentMission.imageUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 max-w-2xl mx-auto">
            <img
              src={currentMission.imageUrl}
              alt="미션 이미지"
              className="w-full h-auto object-cover max-h-[350px]"
            />
          </div>
        )}

        {/* 설명 및 더보기 */}
        <div className="relative max-w-2xl mx-auto">
          <p className={`text-base text-gray-600 ${!isExpanded ? "line-clamp-3" : ""}`}>
            {currentMission.description}
          </p>
          {currentMission.description && currentMission.description.length > 100 && (
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
          <span className="font-semibold text-gray-900">{currentMission.stats?.participants?.toLocaleString() || "0"}</span>명 참여
        </div>
      </div>

      {/* 투표 전에만 선택지 표시 */}
      {!hasVoted && (
        <>
          {currentMission.submissionType === "text" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: currentMission.requiredAnswerCount || 1 }).map((_, index) => (
                  <div key={index} className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">
                      {index + 1}
                    </div>
                    <Input
                      value={textInputs[index] || ""}
                      onChange={(e) => {
                        const newInputs = [...textInputs]
                        newInputs[index] = e.target.value
                        setTextInputs(newInputs)

                        const validInputs = newInputs.filter(input => input.trim() !== "")
                        if (validInputs.length > 0) {
                          if ((currentMission.requiredAnswerCount || 1) === 1) {
                            setSelectedChoice(validInputs[0])
                          } else {
                            setSelectedChoice(validInputs)
                          }
                        } else {
                          setSelectedChoice(null)
                        }
                      }}
                      placeholder="정답 입력"
                      className="w-full pl-11 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      disabled={!canVote}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 text-right mt-2">
                {textInputs.filter(t => t.trim()).length} / {currentMission.requiredAnswerCount || 1} 개 입력됨
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {options.map((option, index) => {
                const isSelected = Array.isArray(selectedChoice) ? (selectedChoice as string[]).includes(option) : selectedChoice === option
                const isUserChoice = Array.isArray(userVote) ? (userVote as string[]).includes(option) : userVote === option
                const percentage = showPercentages ? currentMission.result?.distribution[option] : undefined

                return (
                  <Card
                    key={option}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg max-w-2xl mx-auto ${isSelected
                      ? "border-rose-400 bg-gradient-to-r from-rose-100 to-pink-100 shadow-lg ring-2 ring-rose-300"
                      : isUserChoice
                        ? "border-purple-400 bg-gradient-to-r from-purple-100 to-pink-100 shadow-lg ring-2 ring-purple-300"
                        : "hover:border-rose-300 hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 border-gray-200"
                      } ${!canVote ? "cursor-not-allowed opacity-75" : ""}`}
                    onClick={() => handleOptionClick(option)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isSelected || isUserChoice
                              ? "border-rose-500 bg-rose-500 shadow-md"
                              : "border-gray-300 hover:border-rose-400"
                              }`}
                          >
                            {(isSelected || isUserChoice) && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-base font-semibold text-gray-900">{option}</span>
                          {isUserChoice && <Badge className="bg-purple-500 text-white text-xs">내 선택</Badge>}
                        </div>

                        <div className="text-right">
                          {showPercentages && percentage !== undefined ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold bg-gradient-to-r from-rose-500 to-purple-500 bg-clip-text text-transparent">
                                {percentage}%
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-gradient-to-r from-rose-400 to-purple-400 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          ) : hasVoted && currentMission.status === "open" && currentMission.revealPolicy === "onClose" ? (
                            <span className="text-2xl text-gray-400">?</span>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {canVote && (
            <div className="flex justify-center py-8">
              <Button
                size="lg"
                className={`px-16 py-4 text-lg font-semibold transition-all duration-200 ${selectedChoice
                  ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg hover:shadow-xl"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                onClick={() => {
                  if (!selectedChoice) return
                  // 로그인 체크
                  if (!isAuthenticated()) {
                    setPendingSubmit(true)
                    setShowLoginModal(true)
                  } else {
                    setShowSubmissionSheet(true)
                  }
                }}
                disabled={!selectedChoice}
              >
                제출하기
              </Button>
            </div>
          )}
        </>
      )}

      {/* 투표 완료 후 중간 결과만 표시 */}
      {hasVoted && (
        <div id="live-results" className="mt-8 space-y-4">
          {/* 픽 완료 메시지 */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 max-w-2xl mx-auto">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900 mb-1">픽 완료!</h3>
                  <p className="text-sm text-gray-600">
                    마감까지 결과를 기다려주세요. 아래에서 내가 선택한 항목을 확인할 수 있습니다.
                  </p>
                </div>
                {currentMission.deadline && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{getTimeRemaining(currentMission.deadline)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 투표 결과 */}
          <Card className="border-2 border-purple-200 max-w-2xl mx-auto">
            <CardHeader className="py-4 px-4">
              <CardTitle className="text-lg flex items-center gap-2">
                투표 결과
                {currentMission.revealPolicy === "realtime" && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs">실시간 중간 결과</Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {currentMission.revealPolicy === "realtime"
                  ? "실시간으로 집계 중입니다"
                  : "마감될 때까지 결과는 공개되지 않습니다"}
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {options.map((option, index) => {
                  const isUserChoice = userVote === option
                  const percentage = showPercentages ? currentMission.result?.distribution[option] || 0 : 0
                  const shouldShowPercentage = currentMission.revealPolicy === "realtime" && showPercentages

                  return (
                    <div
                      key={option}
                      className={`p-3 rounded-lg border-2 transition-all ${isUserChoice ? "border-purple-300 bg-purple-50" : "border-gray-200 bg-gray-50"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 flex-1">
                          <Badge
                            variant="outline"
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isUserChoice ? "border-purple-500 bg-purple-100" : ""
                              }`}
                          >
                            {index + 1}
                          </Badge>
                          <span className={`font-semibold text-sm ${isUserChoice ? "text-purple-700" : "text-gray-900"}`}>
                            {option}
                          </span>
                          {isUserChoice && (
                            <Badge className="bg-purple-500 text-white text-xs">내 픽</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          {shouldShowPercentage ? (
                            <span className="text-lg font-bold text-purple-600">{percentage}%</span>
                          ) : (
                            <span className="text-xl text-gray-400">?</span>
                          )}
                        </div>
                      </div>
                      {shouldShowPercentage && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${isUserChoice ? "bg-gradient-to-r from-purple-400 to-pink-400" : "bg-gray-400"
                              }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 마감 후에만 최종 결과 페이지 버튼 */}
          {currentMission.deadline && isDeadlinePassed(currentMission.deadline) && (
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => router.push(`/p-mission/${currentMission.id}/results`)}
                className="px-16 py-4 text-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                최종 결과 보기
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 참조 URL - 유튜브 임베드 플레이어 */}
      {currentMission.referenceUrl && isYoutubeUrl(currentMission.referenceUrl) ? (
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-2xl">
            <div className="relative w-full overflow-hidden rounded-lg shadow-md" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={getYoutubeEmbedUrl(currentMission.referenceUrl) || ''}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : currentMission.referenceUrl ? (
        <div className="flex items-center gap-2 text-sm text-blue-600 mt-6">
          <Link href={currentMission.referenceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
            🔗 참고 링크 확인하기
          </Link>
        </div>
      ) : null}

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

      {/* SubTMission Sheet */}
      {showSubmissionSheet && (
        <SubmissionSheet
          mission={currentMission}
          selectedChoice={selectedChoice ?? undefined}
          onSubmit={handleSubmitVote}
          onCancel={() => setShowSubmissionSheet(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
