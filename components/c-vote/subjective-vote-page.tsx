"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Card, CardContent } from "@/components/c-ui/card"
import { Input } from "@/components/c-ui/input"
import { Badge } from "@/components/c-ui/badge"
import { Clock, Users } from "lucide-react"
import { submitVote1, getVote1 } from "@/lib/firebase/votes"
import { getMissionById as getMission } from "@/lib/firebase/missions"
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

interface SubjectiveVotePageProps {
  mission: TMission
}

export function SubjectiveVotePage({ mission }: SubjectiveVotePageProps) {
  const [subjectiveAnswer, setSubjectiveAnswer] = useState<string>("")
  const [showSubmissionSheet, setShowSubmissionSheet] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userVote, setUserVote] = useState<string | null>(null)
  const [pendingSubmit, setPendingSubmit] = useState(false)
  const [currentMission, setCurrentMission] = useState<TMission>(mission)
  const [isExpanded, setIsExpanded] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // 사용자 ID 가져오기
  const userId = getUserId() || "user123"

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
          setUserVote(Array.isArray(vote.choice) ? vote.choice[0] : vote.choice)
        }
      } else {
        // 비인증 사용자는 localStorage 확인
        const existingVote = localStorage.getItem(`rp_picked_${mission.id}`)
        if (existingVote) {
          setUserVote(existingVote)
        }
      }
    }

    checkExistingVote()
  }, [mission.id, mission.form, userId])

  const hasVoted = userVote !== null
  const canVote = currentMission.status === "open" && !hasVoted

  const handleSubmitVote = async () => {
    if (!subjectiveAnswer.trim()) return

    setIsSubmitting(true)
    try {
      // 1. Supabase에 투표 제출
      const voteSuccess = await submitVote1({
        missionId: mission.id,
        userId,
        choice: subjectiveAnswer.trim(),
        submittedAt: new Date().toISOString(),
      })

      if (!voteSuccess) {
        throw new Error("투표 제출 실패")
      }

      console.log("투표 제출 완료 - submitVote1에서 모든 카운트 업데이트 완료")
      // submitVote1에서 이미 participants, totalVotes, optionVoteCounts를 원자적으로 업데이트했으므로
      // incrementMissionParticipants 호출은 중복이며 제거합니다.

      // 2. 업데이트된 미션 데이터 다시 가져오기
      const updatedMissionResult = await getMission(mission.id)
      if (updatedMissionResult.success && updatedMissionResult.mission) {
        const m = updatedMissionResult.mission;
        const updatedMission: TMission = {
          id: m.id,
          title: m.title,
          kind: m.kind,
          form: m.form,
          seasonType: m.seasonType || "전체",
          seasonNumber: m.seasonNumber || undefined,
          options: m.options || [],
          deadline: m.deadline,
          revealPolicy: m.revealPolicy,
          status: m.status,
          stats: {
            participants: m.participants || 0,
            totalVotes: m.stats?.totalVotes || 0
          },
          result: {
            distribution: m.optionVoteCounts || {},
            totalVotes: m.stats?.totalVotes || 0
          },
          createdAt: m.createdAt?.toDate?.()?.toISOString() || m.createdAt,
          description: m.description || undefined,
          referenceUrl: m.referenceUrl || undefined,
          imageUrl: m.imageUrl || undefined,
          thumbnailUrl: m.thumbnailUrl || undefined
        }
        setCurrentMission(updatedMission)
      }

      // 4. 로컬 상태 업데이트
      setUserVote(subjectiveAnswer.trim())
      localStorage.setItem(`rp_picked_${mission.id}`, subjectiveAnswer.trim())
      setShowSubmissionSheet(false)
      setSubjectiveAnswer("")

      toast({
        title: "제출 완료!",
        description: "성공적으로 제출되었습니다",
      })

      // 포인트 업데이트를 위해 auth-change 이벤트 발생
      window.dispatchEvent(new Event('auth-change'))
    } catch (error) {
      console.error("투표 제출 에러:", error)
      toast({
        title: "제출 실패",
        description: "제출 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              주관식
            </Badge>
            {currentMission.revealPolicy === "realtime" && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                실시간 공개
              </Badge>
            )}
            {currentMission.revealPolicy === "onClose" && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                마감 후 공개
              </Badge>
            )}
            {currentMission.deadline && !isDeadlinePassed(currentMission.deadline) && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{getTimeRemaining(currentMission.deadline)}</span>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 text-balance">{currentMission.title}</h1>

          {/* 이미지 표시 */}
          {currentMission.imageUrl && (
            <div className="rounded-lg overflow-hidden border border-gray-200 mt-4">
              <img
                src={currentMission.imageUrl}
                alt="미션 이미지"
                className="w-full h-auto object-cover max-h-[400px]"
              />
            </div>
          )}

          {/* 설명 및 더보기 */}
          <div className="relative mt-2">
            <p className={`text-lg text-gray-600 ${!isExpanded ? "line-clamp-3" : ""}`}>
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

          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
            <Users className="w-4 h-4" />
            <span className="font-semibold text-gray-900">{currentMission.stats?.participants?.toLocaleString() || "0"}</span>명 참여
          </div>
        </div>
      </div>

      {/* 투표 전에만 입력 필드 표시 */}
      {!hasVoted && (
        <>
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="text-lg">답변을 입력해주세요</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                placeholder={mission.subjectivePlaceholder || "내용을 입력하세요"}
                value={subjectiveAnswer}
                onChange={(e) => setSubjectiveAnswer(e.target.value)}
                className="text-lg py-6"
                disabled={!canVote}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 text-right">
                {subjectiveAnswer.length}/200
              </p>
            </CardContent>
          </Card>

          {canVote && (
            <div className="flex justify-center py-8">
              <Button
                size="lg"
                className={`px-16 py-4 text-lg font-semibold transition-all duration-200 ${subjectiveAnswer.trim()
                    ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg hover:shadow-xl"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                onClick={() => {
                  if (!subjectiveAnswer.trim()) return
                  // 로그인 체크
                  if (!isAuthenticated()) {
                    setPendingSubmit(true)
                    setShowLoginModal(true)
                  } else {
                    setShowSubmissionSheet(true)
                  }
                }}
                disabled={!subjectiveAnswer.trim()}
              >
                제출하기
              </Button>
            </div>
          )}
        </>
      )}

      {/* 투표 완료 후 내 답변 표시 */}
      {hasVoted && (
        <div className="mt-8 space-y-6">
          <Card className="border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                내 답변
                <Badge className="bg-purple-500 text-white text-xs">제출 완료</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold text-gray-900 break-words">{userVote}</p>
            </CardContent>
          </Card>

        </div>
      )}

      {/* 제출 확인 시트 */}
      {showSubmissionSheet && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 md:items-center">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900">제출 확인</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">다음 내용으로 제출하시겠습니까?</p>
              <Card className="bg-gray-50 p-4">
                <p className="text-base font-medium text-gray-900 break-words">{subjectiveAnswer}</p>
              </Card>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSubmissionSheet(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
                onClick={handleSubmitVote}
                disabled={isSubmitting}
              >
                {isSubmitting ? "제출 중..." : "제출하기"}
              </Button>
            </div>
          </div>
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
    </div>
  )
}
