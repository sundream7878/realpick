"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users } from "lucide-react"
import { ResultSection } from "./result-section"
import { SubmissionSheet } from "./submission-sheet"
import { MockVoteRepo } from "@/lib/mock-vote-data"
import type { Mission } from "@/lib/vote-types"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

interface MultiVotePageProps {
  mission: Mission
}

export function MultiVotePage({ mission }: MultiVotePageProps) {
  const [selectedChoice, setSelectedChoice] = useState<string>("")
  const [showSubmissionSheet, setShowSubmissionSheet] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userVote, setUserVote] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Mock user ID - in real app this would come from auth
  const userId = "user123"

  useEffect(() => {
    const existingVote = localStorage.getItem(`rp_picked_${mission.id}`)
    if (existingVote) {
      setUserVote(existingVote)
    }
  }, [mission.id])

  const hasVoted = userVote !== null
  const canVote = mission.status === "open" && !hasVoted
  const showPercentages =
    hasVoted && (mission.status === "settled" || (mission.status === "open" && mission.revealPolicy === "realtime"))

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

  const handleSubmitVote = async () => {
    if (!selectedChoice) return

    setIsSubmitting(true)
    try {
      const success = await MockVoteRepo.submitVote({
        missionId: mission.id,
        userId,
        choice: selectedChoice,
        submittedAt: new Date().toISOString(),
      })

      if (success) {
        setUserVote(selectedChoice)
        localStorage.setItem(`rp_picked_${mission.id}`, selectedChoice)
        setShowSubmissionSheet(false)
        setSelectedChoice("")
        toast({
          title: "픽 완료!",
          description: "픽이 성공적으로 제출되었습니다.",
        })
      }
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

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
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
        <p className="text-lg text-gray-600">{mission.description}</p>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span className="font-semibold text-gray-900">{mission.totalVotes?.toLocaleString() || "0"}</span>명 참여
        </div>
      </div>

      {hasVoted && mission.status === "open" && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-1">픽 완료!</h3>
                <p className="text-sm text-gray-600">
                  마감일까지 결과를 기다려주세요. 아래에서 내가 선택한 항목을 확인할 수 있습니다.
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

      <div className="space-y-4">
        {mission.options?.map((option, index) => {
          const isSelected = selectedChoice === option
          const isUserChoice = userVote === option
          const percentage = showPercentages ? mission.result?.distribution[option] : undefined

          return (
            <Card
              key={option}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected
                  ? "border-rose-400 bg-gradient-to-r from-rose-100 to-pink-100 shadow-lg ring-2 ring-rose-300"
                  : isUserChoice
                    ? "border-purple-400 bg-gradient-to-r from-purple-100 to-pink-100 shadow-lg ring-2 ring-purple-300"
                    : "hover:border-rose-300 hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50 border-gray-200"
              } ${!canVote ? "cursor-not-allowed opacity-75" : ""}`}
              onClick={() => canVote && setSelectedChoice(option)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected || isUserChoice
                          ? "border-rose-500 bg-rose-500 shadow-md"
                          : "border-gray-300 hover:border-rose-400"
                      }`}
                    >
                      {(isSelected || isUserChoice) && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{option}</span>
                    {isUserChoice && <Badge className="bg-purple-500 text-white text-xs">내 픽</Badge>}
                  </div>

                  <div className="text-right">
                    {showPercentages && percentage !== undefined ? (
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-purple-500 bg-clip-text text-transparent">
                          {percentage}%
                        </span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-rose-400 to-purple-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    ) : hasVoted && mission.status === "open" && mission.revealPolicy === "onClose" ? (
                      <span className="text-3xl text-gray-400">?</span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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

      {/* Results Section */}
      {hasVoted && mission.status === "settled" && (
        <div id="results" className="mt-8">
          <ResultSection mission={mission} userChoice={userVote || undefined} userId={userId} />
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

      {canVote && (
        <div className="flex justify-center py-8">
          <Button
            size="lg"
            className={`px-16 py-4 text-lg font-semibold transition-all duration-200 ${
              selectedChoice
                ? "bg-rose-500 hover:bg-rose-600 text-white shadow-lg hover:shadow-xl"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            onClick={() => selectedChoice && setShowSubmissionSheet(true)}
            disabled={!selectedChoice}
          >
            픽하기
          </Button>
        </div>
      )}

      {/* Submission Sheet */}
      {showSubmissionSheet && (
        <SubmissionSheet
          mission={mission}
          selectedChoice={selectedChoice}
          onSubmit={handleSubmitVote}
          onCancel={() => setShowSubmissionSheet(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )
}
