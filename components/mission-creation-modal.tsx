"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, X, ArrowLeft, Check, Circle } from "lucide-react"

interface MissionCreationModalProps {
  isOpen: boolean
  onClose: () => void
}

type MissionStep = "type-selection" | "binary-choice" | "multiple-choice" | "couple-matching"
type MissionType = "prediction" | "majority"
type MissionFormat = "binary" | "multiple" | "couple"

interface AIVerificationResult {
  status: "pass" | "revise"
  suggestions: string[]
  reasons: string[]
}

export default function MissionCreationModal({ isOpen, onClose }: MissionCreationModalProps) {
  const [currentStep, setCurrentStep] = useState<MissionStep>("type-selection")
  const [missionType, setMissionType] = useState<MissionType | null>(null)
  const [missionFormat, setMissionFormat] = useState<MissionFormat | null>(null)
  const [title, setTitle] = useState("")
  const [seasonType, setSeasonType] = useState<"전체" | "기수별">("전체")
  const [seasonNumber, setSeasonNumber] = useState("")
  const [options, setOptions] = useState<string[]>(["", ""])
  const [deadline, setDeadline] = useState("")
  const [resultVisibility, setResultVisibility] = useState("")
  const [maleOptions, setMaleOptions] = useState<string[]>(["", ""])
  const [femaleOptions, setFemaleOptions] = useState<string[]>(["", ""])

  const [showAIModal, setShowAIModal] = useState(false)
  const [aiResult, setAiResult] = useState<AIVerificationResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const handleTypeSelection = (type: MissionType, format: MissionFormat) => {
    setMissionType(type)
    setMissionFormat(format)

    if (format === "binary") {
      setCurrentStep("binary-choice")
      setOptions(["", ""])
    } else if (format === "multiple") {
      setCurrentStep("multiple-choice")
      setOptions(["", "", ""])
    } else if (format === "couple") {
      setCurrentStep("couple-matching")
      setMaleOptions(["", ""])
      setFemaleOptions(["", ""])
    }
  }

  const handleMissionTypeSelect = (type: MissionType) => {
    setMissionType(type)
  }

  const addOption = () => {
    setOptions([...options, ""])
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const addMaleOption = () => {
    setMaleOptions([...maleOptions, ""])
  }

  const removeMaleOption = (index: number) => {
    if (maleOptions.length > 1) {
      setMaleOptions(maleOptions.filter((_, i) => i !== index))
    }
  }

  const updateMaleOption = (index: number, value: string) => {
    const newOptions = [...maleOptions]
    newOptions[index] = value
    setMaleOptions(newOptions)
  }

  const addFemaleOption = () => {
    setFemaleOptions([...femaleOptions, ""])
  }

  const removeFemaleOption = (index: number) => {
    if (femaleOptions.length > 1) {
      setFemaleOptions(femaleOptions.filter((_, i) => i !== index))
    }
  }

  const updateFemaleOption = (index: number, value: string) => {
    const newOptions = [...femaleOptions]
    newOptions[index] = value
    setFemaleOptions(newOptions)
  }

  const handleSubmit = () => {
    // TODO: 미션 생성 로직 구현
    console.log("Mission created:", {
      missionType,
      missionFormat,
      title,
      seasonType,
      seasonNumber: seasonType === "기수별" ? Number.parseInt(seasonNumber) : undefined,
      options,
      maleOptions,
      femaleOptions,
      deadline,
      resultVisibility,
    })
    onClose()
    resetForm()
  }

  const resetForm = () => {
    setCurrentStep("type-selection")
    setMissionType(null)
    setMissionFormat(null)
    setTitle("")
    setSeasonType("전체")
    setSeasonNumber("")
    setOptions(["", ""])
    setMaleOptions(["", ""])
    setFemaleOptions(["", ""])
    setDeadline("")
    setResultVisibility("")
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  const handleBack = () => {
    if (currentStep === "type-selection") {
      handleClose()
    } else {
      setCurrentStep("type-selection")
      setMissionFormat(null)
    }
  }

  const handleAIVerification = async () => {
    setIsVerifying(true)

    try {
      const requestData = {
        title,
        kind: missionType === "prediction" ? "predict" : "majority",
        form: missionFormat === "binary" ? "binary" : missionFormat === "multiple" ? "multi" : "match",
        seasonType,
        seasonNumber: seasonType === "기수별" ? Number.parseInt(seasonNumber) : undefined,
        options: missionFormat === "couple" ? [] : options.filter((opt) => opt.trim()),
        matchPairs:
          missionFormat === "couple"
            ? {
                left: maleOptions.filter((opt) => opt.trim()),
                right: femaleOptions.filter((opt) => opt.trim()),
              }
            : undefined,
        revealPolicy: resultVisibility === "realtime" ? "realtime" : "onClose",
        deadline: deadline ? new Date(deadline).toISOString() : "",
        tags: [],
        category: "",
      }

      const response = await fetch("/api/ai/validate-mission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] AI verification failed:", errorText)
        throw new Error(`AI verification failed: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("[v0] Invalid response format:", responseText.substring(0, 200))
        throw new Error("서버에서 올바른 응답을 받지 못했습니다.")
      }

      const result: AIVerificationResult = await response.json()
      setAiResult(result)
      setShowAIModal(true)
    } catch (error) {
      console.error("[v0] AI verification failed:", error)
      alert(
        `AI 검증 중 오류가 발생했습니다.\n\n${error instanceof Error ? error.message : "알 수 없는 오류"}\n\n다시 시도해주세요.`,
      )
    } finally {
      setIsVerifying(false)
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)

    try {
      const requestData = {
        title,
        kind: missionType === "prediction" ? "predict" : "majority",
        form: missionFormat === "binary" ? "binary" : missionFormat === "multiple" ? "multi" : "match",
        seasonType,
        seasonNumber: seasonType === "기수별" ? Number.parseInt(seasonNumber) : undefined,
        options: missionFormat === "couple" ? [] : options.filter((opt) => opt.trim()),
        matchPairs:
          missionFormat === "couple"
            ? {
                left: maleOptions.filter((opt) => opt.trim()),
                right: femaleOptions.filter((opt) => opt.trim()),
              }
            : undefined,
        revealPolicy: resultVisibility === "realtime" ? "realtime" : "onClose",
        deadline: deadline ? new Date(deadline).toISOString() : "",
        tags: [],
        category: "",
      }

      const response = await fetch("/api/missions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Mission creation failed:", errorText)
        throw new Error(`Mission creation failed: ${response.status}`)
      }

      const createdMission = await response.json()
      console.log("[v0] Mission published:", createdMission)

      showUndoSnackbar()

      setShowAIModal(false)
      onClose()
      resetForm()
    } catch (error) {
      console.error("[v0] Publishing failed:", error)
      alert(
        `미션 게시 중 오류가 발생했습니다.\n\n${error instanceof Error ? error.message : "알 수 없는 오류"}\n\n다시 시도해주세요.`,
      )
    } finally {
      setIsPublishing(false)
    }
  }

  const handleBackToEdit = () => {
    setShowAIModal(false)
  }

  const showUndoSnackbar = () => {
    const snackbar = document.createElement("div")
    snackbar.className =
      "fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3"
    snackbar.innerHTML = `
      <span>등록 완료!</span>
      <div class="w-px h-4 bg-gray-600"></div>
      <button class="text-blue-400 hover:text-blue-300 font-medium">되돌리기</button>
      <div class="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div class="h-full bg-blue-500 rounded-full animate-countdown"></div>
      </div>
    `

    document.body.appendChild(snackbar)

    setTimeout(() => {
      if (document.body.contains(snackbar)) {
        document.body.removeChild(snackbar)
      }
    }, 10000)

    const undoButton = snackbar.querySelector("button")
    undoButton?.addEventListener("click", () => {
      console.log("Undo mission creation")
      document.body.removeChild(snackbar)
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-lg max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="p-1 hover:bg-gray-100">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <DialogTitle className="text-lg sm:text-xl font-semibold">
                {currentStep === "type-selection"
                  ? "Mission 게시"
                  : currentStep === "binary-choice"
                    ? "Mission - 양자선택"
                    : currentStep === "multiple-choice"
                      ? "Mission - 다자선택"
                      : "Mission - 커플매칭"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {currentStep === "type-selection" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-medium mb-4">Mission 유형을 선택하세요</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Card
                    className={`cursor-pointer transition-all border-2 ${
                      missionType === "prediction"
                        ? "bg-pink-100 border-pink-400 shadow-md"
                        : "hover:bg-pink-50 border-pink-200"
                    }`}
                    onClick={() => handleMissionTypeSelect("prediction")}
                  >
                    <CardContent className="p-4 sm:p-6 text-center">
                      <div className="text-xl sm:text-2xl mb-2">🎯</div>
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base">결과를 맞춰보는 픽</h4>
                      <p className="text-xs sm:text-sm text-pink-600 mt-1">예측픽</p>
                      <p className="text-xs text-gray-500 mt-2 hidden sm:block">
                        방송의 최종 커플 매칭, 특정 결과 예측 등
                      </p>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer transition-all border-2 ${
                      missionType === "majority"
                        ? "bg-pink-100 border-pink-400 shadow-md"
                        : "hover:bg-pink-50 border-pink-200"
                    }`}
                    onClick={() => handleMissionTypeSelect("majority")}
                  >
                    <CardContent className="p-4 sm:p-6 text-center">
                      <div className="text-xl sm:text-2xl mb-2">👥</div>
                      <h4 className="font-medium text-gray-900 text-sm sm:text-base">과연 다수의 선택은?</h4>
                      <p className="text-xs sm:text-sm text-pink-600 mt-1">다수픽</p>
                      <p className="text-xs text-gray-500 mt-2 hidden sm:block">호감/비호감, 매너 좋다/눈치 없다 등</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {missionType && (
                <div>
                  <h3 className="text-base sm:text-lg font-medium mb-4">Mission 형식을 선택하세요</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Card
                      className="cursor-pointer hover:bg-pink-50 transition-colors border-pink-200"
                      onClick={() => handleTypeSelection(missionType, "binary")}
                    >
                      <CardContent className="p-4 sm:p-6 text-center flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                        <div className="text-xl sm:text-2xl font-bold mb-2">A or B</div>
                        <p className="text-xs sm:text-sm text-pink-600">양자선택</p>
                      </CardContent>
                    </Card>
                    <Card
                      className="cursor-pointer hover:bg-pink-50 transition-colors border-pink-200"
                      onClick={() => handleTypeSelection(missionType, "multiple")}
                    >
                      <CardContent className="p-4 sm:p-6 text-center flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                        <div className="text-xl sm:text-2xl mb-2">📝</div>
                        <p className="text-xs sm:text-sm text-pink-600">다자선택</p>
                      </CardContent>
                    </Card>
                    <Card
                      className="cursor-pointer hover:bg-pink-50 transition-colors border-pink-200"
                      onClick={() => handleTypeSelection(missionType, "couple")}
                    >
                      <CardContent className="p-4 sm:p-6 text-center flex flex-col items-center justify-center min-h-[100px] sm:min-h-[120px]">
                        <div className="text-xl sm:text-2xl mb-2">👫❤️</div>
                        <p className="text-xs sm:text-sm text-pink-600">커플매칭</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === "binary-choice" && (
            <div className="space-y-6">
              <div>
                <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700">
                  썸네일 업로드
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium">기수 분류</Label>
                <div className="space-y-3 mt-2">
                  <Select value={seasonType} onValueChange={(value: "전체" | "기수별") => setSeasonType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="기수 분류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="전체">전체</SelectItem>
                      <SelectItem value="기수별">기수별</SelectItem>
                    </SelectContent>
                  </Select>
                  {seasonType === "기수별" && (
                    <div>
                      <Label className="text-sm font-medium">기수 번호</Label>
                      <Input
                        value={seasonNumber}
                        onChange={(e) => setSeasonNumber(e.target.value)}
                        placeholder="예: 29"
                        type="number"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  제목입력
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Pick 선택지</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Input value={options[0]} onChange={(e) => updateOption(0, e.target.value)} placeholder="선택지 A" />
                  <Input value={options[1]} onChange={(e) => updateOption(1, e.target.value)} placeholder="선택지 B" />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">옵션</Label>
                <div className="space-y-3 mt-2">
                  <Select value={resultVisibility} onValueChange={setResultVisibility}>
                    <SelectTrigger>
                      <SelectValue placeholder="결과 공개" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">실시간 공개</SelectItem>
                      <SelectItem value="auto"> 마감 후 자동 공개</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Label className="text-sm font-medium">마감 날짜</Label>
                    <Input
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="마감시간 설정"
                      type="datetime-local"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleAIVerification}
                  disabled={isVerifying}
                >
                  {isVerifying ? "검증 중..." : "PICK 체크 및 게시"}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "multiple-choice" && (
            <div className="space-y-6">
              <div>
                <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700">
                  썸네일 업로드
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium">기수 분류</Label>
                <div className="space-y-3 mt-2">
                  <Select value={seasonType} onValueChange={(value: "전체" | "기수별") => setSeasonType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="기수 분류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="전체">전체</SelectItem>
                      <SelectItem value="기수별">기수별</SelectItem>
                    </SelectContent>
                  </Select>
                  {seasonType === "기수별" && (
                    <div>
                      <Label className="text-sm font-medium">기수 번호</Label>
                      <Input
                        value={seasonNumber}
                        onChange={(e) => setSeasonNumber(e.target.value)}
                        placeholder="예: 29"
                        type="number"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  제목입력
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Pick 선택지</Label>
                <div className="space-y-2 mt-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`내용입력`}
                      />
                      {options.length > 2 && (
                        <Button variant="outline" size="sm" onClick={() => removeOption(index)} className="px-3">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="w-full border-dashed bg-transparent"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    선택지 추가
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">옵션</Label>
                <div className="space-y-3 mt-2">
                  <Select value={resultVisibility} onValueChange={setResultVisibility}>
                    <SelectTrigger>
                      <SelectValue placeholder="결과 공개" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">실시간 공개</SelectItem>
                      <SelectItem value="auto"> 마감 후 자동 공개</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Label className="text-sm font-medium">마감 날짜</Label>
                    <Input
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="마감시간 설정"
                      type="datetime-local"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleAIVerification}
                  disabled={isVerifying}
                >
                  {isVerifying ? "검증 중..." : "PICK 체크 및 게시"}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "couple-matching" && (
            <div className="space-y-6">
              <div>
                <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700">
                  썸네일 업로드
                </Button>
              </div>

              <div>
                <Label className="text-sm font-medium">기수 분류</Label>
                <div className="space-y-3 mt-2">
                  <Select value={seasonType} onValueChange={(value: "전체" | "기수별") => setSeasonType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="기수 분류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="전체">전체</SelectItem>
                      <SelectItem value="기수별">기수별</SelectItem>
                    </SelectContent>
                  </Select>
                  {seasonType === "기수별" && (
                    <div>
                      <Label className="text-sm font-medium">기수 번호</Label>
                      <Input
                        value={seasonNumber}
                        onChange={(e) => setSeasonNumber(e.target.value)}
                        placeholder="예: 29"
                        type="number"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  제목입력
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Pick 선택지</Label>
                <div className="grid grid-cols-2 gap-6 mt-4">
                  <div className="bg-pink-100 p-4 rounded-lg">
                    <h4 className="text-center font-medium mb-3">남성</h4>
                    <div className="space-y-2">
                      {maleOptions.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateMaleOption(index, e.target.value)}
                            placeholder="이름 입력"
                          />
                          {maleOptions.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeMaleOption(index)}
                              className="px-2"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={addMaleOption}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="bg-pink-100 p-4 rounded-lg">
                    <h4 className="text-center font-medium mb-3">여성</h4>
                    <div className="space-y-2">
                      {femaleOptions.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => updateFemaleOption(index, e.target.value)}
                            placeholder="이름 입력"
                          />
                          {femaleOptions.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFemaleOption(index)}
                              className="px-2"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={addFemaleOption}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">옵션</Label>
                <div className="space-y-3 mt-2">
                  <Select value={resultVisibility} onValueChange={setResultVisibility}>
                    <SelectTrigger>
                      <SelectValue placeholder="결과 공개" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">실시간 공개</SelectItem>
                      <SelectItem value="auto"> 마감 후 자동 공개</SelectItem>
                    </SelectContent>
                  </Select>
                  <div>
                    <Label className="text-sm font-medium">마감 날짜</Label>
                    <Input
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      placeholder="마감시간 설정"
                      type="datetime-local"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleAIVerification}
                  disabled={isVerifying}
                >
                  {isVerifying ? "검증 중..." : "PICK 체크 및 게시"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">AI 검증 결과</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                aiResult?.status === "pass" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {aiResult?.status === "pass" ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
                <h3 className={`font-medium ${aiResult?.status === "pass" ? "text-green-900" : "text-gray-500"}`}>
                  AI 검증을 통과했습니다 🎉
                </h3>
              </div>
              {aiResult?.status === "pass" && (
                <>
                  <p className="text-sm text-green-700 mb-4">중복 및 부적절한 내용이 없어 바로 게시할 수 있습니다.</p>
                  <Button
                    variant="outlineSoft"
                    intent="pass"
                    className="w-full h-11 px-20 rounded-xl"
                    onClick={handlePublish}
                    disabled={isPublishing || aiResult?.status !== "pass"}
                  >
                    {isPublishing ? "게시 중..." : "미션 게시하기"}
                  </Button>
                </>
              )}
              {aiResult?.status !== "pass" && (
                <Button
                  variant="outlineSoft"
                  className="w-full h-11 px-20 rounded-xl bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                  disabled
                >
                  미션 게시하기
                </Button>
              )}
            </div>

            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                aiResult?.status === "revise"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-gray-50 border-gray-200 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                {aiResult?.status === "revise" ? (
                  <Check className="w-5 h-5 text-yellow-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
                <h3 className={`font-medium ${aiResult?.status === "revise" ? "text-yellow-900" : "text-gray-500"}`}>
                  몇 가지 수정이 필요합니다
                </h3>
              </div>
              {aiResult?.status === "revise" && (
                <>
                  <div className="space-y-2 mb-3">
                    <p className="text-sm font-medium text-yellow-800">사유:</p>
                    {aiResult.reasons.map((reason, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        • {reason}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-yellow-800">수정제안:</p>
                    {aiResult.suggestions.map((suggestion, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        • {suggestion}
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outlineSoft"
                    intent="revise"
                    className="w-full h-11 px-20 rounded-xl"
                    onClick={handleBackToEdit}
                  >
                    이전으로 돌아가 다시 작성하기
                  </Button>
                </>
              )}
              {aiResult?.status !== "revise" && (
                <Button
                  variant="outlineSoft"
                  className="w-full h-11 px-20 rounded-xl bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed"
                  disabled
                >
                  이전으로 돌아가 다시 작성하기
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes countdown {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-countdown {
          animation: countdown 10s linear forwards;
        }
      `}</style>
    </>
  )
}
