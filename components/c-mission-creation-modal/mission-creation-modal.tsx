"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Card, CardContent } from "@/components/c-ui/card"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/c-ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/c-ui/dialog"
import { Checkbox } from "@/components/c-ui/checkbox"
import { Plus, X, ArrowLeft, Check, Circle, Trophy, Lock } from "lucide-react"
import { createMission } from "@/lib/supabase/missions"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { uploadMissionImage } from "@/lib/supabase/storage"
import { createClient } from "@/lib/supabase/client"
import { SHOWS, CATEGORIES, type TShowCategory } from "@/lib/constants/shows"
import { getUser } from "@/lib/supabase/users"
import { canCreateMission, hasMinimumRole, getRoleDisplayName } from "@/lib/utils/permissions"
import type { TUserRole } from "@/lib/utils/permissions"
import { getUserId } from "@/lib/auth-utils"

interface MissionCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onMissionCreated?: () => void // 미션 생성 성공 후 콜백
}

type MissionStep = "format-selection" | "binary-choice" | "multiple-choice" | "couple-matching" | "subjective-choice" | "tournament-choice"
type MissionType = "prediction" | "majority"
type MissionFormat = "binary" | "multiple" | "couple" | "subjective" | "tournament"

interface AIVerificationResult {
  status: "pass" | "revise"
  suggestions: string[]
  reasons: string[]
}

interface MissionCommonFieldsProps {
  seasonType: "전체" | "기수별"
  setSeasonType: (value: "전체" | "기수별") => void
  seasonNumber: string
  setSeasonNumber: (value: string) => void
  title: string
  setTitle: (value: string) => void
  referenceUrl: string
  setReferenceUrl: (value: string) => void
  description: string
  setDescription: (value: string) => void
  imageUrl: string
  setImageUrl: (value: string) => void
  isUploading: boolean
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  hideSeason?: boolean

}

const MissionCommonFields = ({
  seasonType,
  setSeasonType,
  seasonNumber,
  setSeasonNumber,
  title,
  setTitle,
  referenceUrl,
  setReferenceUrl,
  description,
  setDescription,
  imageUrl,
  setImageUrl,
  isUploading,
  handleImageUpload,
  hideSeason = false,
}: MissionCommonFieldsProps) => (
  <>
    {!hideSeason && (
      <div>
        <Label className="text-sm font-medium">기수 분류</Label>
        <div className="space-y-3 mt-2">
          <Select value={seasonType} onValueChange={setSeasonType}>
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
    )}

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

    {/* 추가 정보 입력 섹션 */}
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <h4 className="text-sm font-bold text-gray-700">상세 정보 (선택)</h4>

      <div>
        <Label className="text-xs font-medium text-gray-600">관련 영상 URL</Label>
        <Input
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
          placeholder="미션 내용과 정확히 부합하는 영상 URL을 넣어주세요"
          className="mt-1 bg-white"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-600">상세 설명</Label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="미션에 대한 상세한 설명을 적어주세요 (최대 1000자)"
          className="w-full mt-1 p-2 text-sm border rounded-md min-h-[100px] bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          maxLength={1000}
        />
        <div className="text-right text-xs text-gray-400">
          {description.length}/1000
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-600">이미지 업로드</Label>
        <div className="flex gap-2 mt-1">
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isUploading}
            className="bg-white"
          />
        </div>
        {imageUrl && (
          <div className="mt-2 relative w-full h-40 rounded-md overflow-hidden border border-gray-200">
            <img src={imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 bg-white/80 hover:bg-white p-1 h-auto rounded-full"
              onClick={() => setImageUrl("")}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  </>
)

export default function MissionCreationModal({ isOpen, onClose, onMissionCreated }: MissionCreationModalProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<MissionStep>("format-selection")
  const [missionType, setMissionType] = useState<MissionType>("prediction")
  const [submissionType, setSubmissionType] = useState<"selection" | "text">("selection")
  const [requiredAnswerCount, setRequiredAnswerCount] = useState(1)

  const [missionFormat, setMissionFormat] = useState<MissionFormat | null>(null)
  const [title, setTitle] = useState("")
  const [seasonType, setSeasonType] = useState<"전체" | "기수별">("전체")
  const [seasonNumber, setSeasonNumber] = useState("")
  const [options, setOptions] = useState<string[]>(["", ""])
  const [deadline, setDeadline] = useState("")
  const [resultVisibility, setResultVisibility] = useState("")
  const [maleOptions, setMaleOptions] = useState<string[]>(["", ""])
  const [femaleOptions, setFemaleOptions] = useState<string[]>(["", ""])
  const [subjectivePlaceholder, setSubjectivePlaceholder] = useState("")
  const [totalEpisodes, setTotalEpisodes] = useState("8")

  // 추가 필드 (영상, 설명, 이미지)
  const [referenceUrl, setReferenceUrl] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")

  const [showAIModal, setShowAIModal] = useState(false)
  const [aiResult, setAiResult] = useState<AIVerificationResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // User role state
  const [userRole, setUserRole] = useState<TUserRole>("PICKER")
  const [isLoadingRole, setIsLoadingRole] = useState(true)

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      const userId = getUserId()
      if (!userId) {
        setIsLoadingRole(false)
        return
      }

      try {
        const user = await getUser(userId)
        if (user) {
          setUserRole(user.role)
        }
      } catch (error) {
        console.error("Failed to load user role:", error)
      } finally {
        setIsLoadingRole(false)
      }
    }

    if (isOpen) {
      loadUserRole()
    }
  }, [isOpen])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const result = await uploadMissionImage(file)
      if (result.success && result.url) {
        setImageUrl(result.url)
        toast({
          title: "이미지 업로드 성공",
          description: "이미지가 성공적으로 업로드되었습니다.",
        })
      } else {
        throw new Error(result.error || "이미지 업로드 실패")
      }
    } catch (error) {
      console.error("Image upload failed:", error)
      toast({
        title: "이미지 업로드 실패",
        description: "이미지 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFormatSelection = (format: MissionFormat) => {
    // Check permission
    const formatMap: Record<MissionFormat, "binary" | "multi" | "match" | "tournament"> = {
      binary: "binary",
      multiple: "multi",
      couple: "match",
      subjective: "multi",
      tournament: "tournament"
    }

    if (!canCreateMission(userRole, formatMap[format])) {
      toast({
        title: "권한 없음",
        description: `${getRoleDisplayName(userRole)} 역할로는 이 미션 형식을 생성할 수 없습니다.`,
        variant: "destructive"
      })
      return
    }

    setMissionFormat(format)
    setMissionType("prediction")
    setSubmissionType("selection")
    setRequiredAnswerCount(1)

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

  const addOption = () => {
    if (options.length >= 10) {
      toast({
        title: "선택지 제한",
        description: "보기 선택은 최대 10개까지만 가능합니다. 11개 이상은 '직접 입력' 방식을 이용해주세요.",
        variant: "destructive",
      })
      return
    }
    setOptions([...options, ""])
  }

  const removeOption = (index: number) => {
    // 토너먼트는 최소 4개, 나머지는 최소 2개
    const minOptions = missionFormat === "tournament" ? 4 : 2
    if (options.length > minOptions) {
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
    setCurrentStep("format-selection")
    setMissionType("prediction")
    setMissionFormat(null)
    setTitle("")
    setSeasonType("전체")
    setSeasonNumber("")
    setOptions(["", ""])
    setMaleOptions(["", ""])
    setFemaleOptions(["", ""])
    setDeadline("")
    setResultVisibility("")
    setSubjectivePlaceholder("")
    setTotalEpisodes("8")
    setReferenceUrl("")
    setDescription("")
    setImageUrl("")
    setSubmissionType("selection")
    setRequiredAnswerCount(1)
  }

  // ... (existing handlers)

  const handlePublish = async () => {
    setIsPublishing(true)

    try {
      // Supabase 미션 생성 API 호출
      const missionData = {
        showId: undefined,
        category: undefined,
        title,
        type: missionType === "prediction" ? "prediction" : "majority",
        format: missionFormat === "binary" ? "binary" : missionFormat === "multiple" ? "multi" : missionFormat === "couple" ? "couple" : "tournament",
        seasonType,
        seasonNumber: seasonType === "기수별" ? seasonNumber : undefined,
        options: missionFormat === "couple" || (missionFormat === "multiple" && submissionType === "text") ? undefined : options.filter((opt) => opt.trim()),
        maleOptions: missionFormat === "couple" ? maleOptions.filter((opt) => opt.trim()) : undefined,
        femaleOptions: missionFormat === "couple" ? femaleOptions.filter((opt) => opt.trim()) : undefined,
        placeholder: (missionFormat === "multiple" && submissionType === "text") ? subjectivePlaceholder : undefined,
        totalEpisodes: missionFormat === "couple" ? parseInt(totalEpisodes) || 8 : undefined,
        deadline: missionFormat === "couple"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        resultVisibility: missionFormat === "couple"
          ? "onClose"
          : resultVisibility === "realtime" ? "realtime" : "onClose",
        referenceUrl: referenceUrl.trim() || undefined,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        submissionType: missionFormat === "multiple" ? submissionType : undefined,
        requiredAnswerCount: missionFormat === "multiple" ? requiredAnswerCount : undefined,
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "로그인 필요",
          description: "미션을 생성하려면 로그인이 필요합니다.",
          variant: "destructive",
        })
        setIsPublishing(false)
        return
      }

      const result = await createMission(missionData as any, user.id)

      if (!result.success) {
        throw new Error(result.error || "미션 게시에 실패했습니다")
      }

      console.log("미션 게시 성공:", result.missionId)

      setShowAIModal(false)
      onClose()
      resetForm()

      // 미션 생성 성공 후 콜백 호출 (메인 화면 목록 새로고침용)
      if (onMissionCreated) {
        onMissionCreated()
      }

      // 성공 토스트 표시
      toast({
        title: "미션 게시 완료",
        description: "미션이 성공적으로 게시되었습니다.",
      })
    } catch (error) {
      console.error("[v0] Publishing failed:", error)
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류"

      toast({
        title: "미션 게시 실패",
        description: `미션 게시 중 오류가 발생했습니다. ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleBackToEdit = () => {
    setShowAIModal(false)
  }



  // 공감픽 체크박스 컴포넌트
  const ConsensusCheckbox = () => (
    <div className="flex items-center space-x-2 p-3 bg-pink-50 rounded-lg border border-pink-100">
      <Checkbox
        id="consensus-mode"
        checked={missionType === "majority"}
        onCheckedChange={(checked) => setMissionType(checked ? "majority" : "prediction")}
        className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
      />
      <div className="grid gap-1.5 leading-none">
        <label
          htmlFor="consensus-mode"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-pink-700"
        >
          공감픽으로 설정
        </label>
        <p className="text-xs text-pink-600">
          체크 시 정답이 없는 '공감픽' 미션이 됩니다.
        </p>
      </div>
    </div>
  )

  const handleAIVerification = async () => {
    setIsVerifying(true)

    // AI 검증 시뮬레이션 (실제 API 연동 필요)
    setTimeout(() => {
      setAiResult({
        status: "pass",
        suggestions: ["미션 내용이 명확합니다.", "적절한 카테고리입니다."],
        reasons: ["규정 위반 사항 없음"]
      })
      setIsVerifying(false)
      setShowAIModal(true)
    }, 1500)
  }

  const handleBack = () => {
    if (currentStep === "format-selection") {
      onClose()
      return
    }
    setCurrentStep("format-selection")
    setMissionFormat(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
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
                {currentStep === "format-selection"
                  ? "Mission 형식 선택"
                  : currentStep === "binary-choice"
                    ? "Mission - 양자선택"
                    : currentStep === "multiple-choice"
                      ? "Mission - 다자선택"
                      : currentStep === "couple-matching"
                        ? "Mission - 커플매칭"
                        : currentStep === "tournament-choice"
                          ? "Mission - 토너먼트"
                          : "Mission - 주관식"}
              </DialogTitle>
            </div>
          </DialogHeader>

          {currentStep === "format-selection" && (
            <div className="space-y-6">
              {isLoadingRole ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">권한 확인 중...</p>
                </div>
              ) : (
                <div>
                  <h3 className="text-base sm:text-lg font-medium mb-2">Mission 형식을 선택하세요</h3>
                  <p className="text-xs text-gray-500 mb-4">현재 역할: {getRoleDisplayName(userRole)}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Card
                      className={`cursor-pointer transition-colors border-pink-200 ${canCreateMission(userRole, "binary")
                          ? "hover:bg-pink-50"
                          : "opacity-50 cursor-not-allowed"
                        }`}
                      onClick={() => canCreateMission(userRole, "binary") && handleFormatSelection("binary")}
                    >
                      <CardContent className="p-3 sm:p-4 text-center flex flex-col items-center justify-center h-full min-h-[100px] relative">
                        {!canCreateMission(userRole, "binary") && (
                          <div className="absolute top-2 right-2">
                            <Lock className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="text-xl sm:text-2xl font-bold mb-2">A or B</div>
                        <p className="text-sm font-medium text-gray-900">양자선택</p>
                        <p className="text-xs text-pink-600 mt-1">두 가지 중 하나 선택</p>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-colors border-pink-200 ${canCreateMission(userRole, "multi")
                          ? "hover:bg-pink-50"
                          : "opacity-50 cursor-not-allowed"
                        }`}
                      onClick={() => canCreateMission(userRole, "multi") && handleFormatSelection("multiple")}
                    >
                      <CardContent className="p-3 sm:p-4 text-center flex flex-col items-center justify-center h-full min-h-[100px] relative">
                        {!canCreateMission(userRole, "multi") && (
                          <div className="absolute top-2 right-2">
                            <Lock className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="text-xl sm:text-2xl mb-2">📝</div>
                        <p className="text-sm font-medium text-gray-900">다자선택</p>
                        <p className="text-xs text-pink-600 mt-1">여러 보기 중 선택</p>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-colors border-pink-200 ${canCreateMission(userRole, "match")
                          ? "hover:bg-pink-50"
                          : "opacity-50 cursor-not-allowed"
                        }`}
                      onClick={() => canCreateMission(userRole, "match") && handleFormatSelection("couple")}
                    >
                      <CardContent className="p-3 sm:p-4 text-center flex flex-col items-center justify-center h-full min-h-[100px] relative">
                        {!canCreateMission(userRole, "match") && (
                          <div className="absolute top-2 right-2">
                            <Lock className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="text-xl sm:text-2xl mb-2">👫❤️</div>
                        <p className="text-sm font-medium text-gray-900">커플매칭</p>
                        <p className="text-xs text-pink-600 mt-1">최종 커플 예측</p>
                        {!canCreateMission(userRole, "match") && (
                          <p className="text-xs text-gray-500 mt-1">메인딜러 전용</p>
                        )}
                      </CardContent>
                    </Card>

                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-yellow-800">
                      💡 보기가 11개 이상인 경우, <strong>주관식 형식</strong>을 선택해주세요!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === "binary-choice" && (
            <div className="space-y-6">
              <ConsensusCheckbox />
              <MissionCommonFields
                seasonType={seasonType}
                setSeasonType={setSeasonType}
                seasonNumber={seasonNumber}
                setSeasonNumber={setSeasonNumber}
                title={title}
                setTitle={setTitle}
                referenceUrl={referenceUrl}
                setReferenceUrl={setReferenceUrl}
                description={description}
                setDescription={setDescription}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
              />

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
              <ConsensusCheckbox />
              <MissionCommonFields
                seasonType={seasonType}
                setSeasonType={setSeasonType}
                seasonNumber={seasonNumber}
                setSeasonNumber={setSeasonNumber}
                title={title}
                setTitle={setTitle}
                referenceUrl={referenceUrl}
                setReferenceUrl={setReferenceUrl}
                description={description}
                setDescription={setDescription}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
              />

              {/* Submission Type Selection */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                <div>
                  <Label className="text-sm font-medium">PICK 방식</Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="sub-selection"
                        name="submissionType"
                        value="selection"
                        checked={submissionType === "selection"}
                        onChange={() => setSubmissionType("selection")}
                        className="w-4 h-4 text-purple-600"
                      />
                      <Label htmlFor="sub-selection">보기 선택</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="sub-text"
                        name="submissionType"
                        value="text"
                        checked={submissionType === "text"}
                        onChange={() => setSubmissionType("text")}
                        className="w-4 h-4 text-purple-600"
                      />
                      <Label htmlFor="sub-text">직접 입력</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">정답(선택) 개수</Label>
                  <Input
                    type="number"
                    min={1}
                    max={submissionType === "selection" ? options.length : 10}
                    value={requiredAnswerCount}
                    onChange={(e) => setRequiredAnswerCount(parseInt(e.target.value) || 1)}
                    className="mt-1 bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {submissionType === "selection"
                      ? "사용자가 선택해야 하는 보기의 개수입니다."
                      : "사용자가 입력해야 하는 정답의 개수입니다."}
                  </p>
                </div>
              </div>

              {submissionType === "selection" ? (
                <div>
                  <Label className="text-sm font-medium">Pick 선택지</Label>
                  <div className="space-y-2 mt-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`보기 ${index + 1}`}
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
              ) : (
                <div>
                  <Label className="text-sm font-medium">입력 가이드 (Placeholder)</Label>
                  <Input
                    value={subjectivePlaceholder}
                    onChange={(e) => setSubjectivePlaceholder(e.target.value)}
                    placeholder="예: 정답을 입력해주세요"
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">사용자에게 보여질 입력창의 안내 문구입니다.</p>
                </div>
              )}

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

          {currentStep === "tournament-choice" && (
            <div className="space-y-6">
              {/* 토너먼트는 공감픽 옵션 없음 (기본 예측픽) */}
              <MissionCommonFields
                seasonType={seasonType}
                setSeasonType={setSeasonType}
                seasonNumber={seasonNumber}
                setSeasonNumber={setSeasonNumber}
                title={title}
                setTitle={setTitle}
                referenceUrl={referenceUrl}
                setReferenceUrl={setReferenceUrl}
                description={description}
                setDescription={setDescription}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
                hideSeason={true}
              />

              <div>
                <Label className="text-sm font-medium">토너먼트 강수 선택</Label>
                <div className="mt-2">
                  <Select
                    value={options.length.toString()}
                    onValueChange={(value) => {
                      const count = parseInt(value)
                      // 기존 옵션 유지하면서 크기 조절
                      const newOptions = Array(count).fill("").map((_, i) => options[i] || "")
                      setOptions(newOptions)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="강수 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="32">32강 (32명)</SelectItem>
                      <SelectItem value="16">16강 (16명)</SelectItem>
                      <SelectItem value="8">8강 (8명)</SelectItem>
                      <SelectItem value="4">4강 (4명)</SelectItem>
                      <SelectItem value="2">결승 (2명)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">대진표 입력 ({options.length}명)</Label>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 border rounded-lg p-4 bg-gray-50/50">
                  {Array.from({ length: Math.ceil(options.length / 2) }).map((_, matchIndex) => {
                    const player1Index = matchIndex * 2
                    const player2Index = matchIndex * 2 + 1
                    return (
                      <div key={matchIndex} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-2">
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">MATCH {matchIndex + 1}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Input
                              value={options[player1Index] || ""}
                              onChange={(e) => updateOption(player1Index, e.target.value)}
                              placeholder={`후보 ${player1Index + 1}`}
                              className="text-sm"
                            />
                          </div>
                          <div className="font-bold text-gray-400 text-sm">VS</div>
                          <div className="flex-1">
                            <Input
                              value={options[player2Index] || ""}
                              onChange={(e) => updateOption(player2Index, e.target.value)}
                              placeholder={`후보 ${player2Index + 1}`}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * 대진표 순서대로 매칭됩니다. (1번 vs 2번, 3번 vs 4번...)
                </p>
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
              {/* 커플매칭은 공감픽 옵션 없음 */}
              <MissionCommonFields
                seasonType={seasonType}
                setSeasonType={setSeasonType}
                seasonNumber={seasonNumber}
                setSeasonNumber={setSeasonNumber}
                title={title}
                setTitle={setTitle}
                referenceUrl={referenceUrl}
                setReferenceUrl={setReferenceUrl}
                description={description}
                setDescription={setDescription}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
              />

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
                  <div>
                    <Label className="text-sm font-medium">총 회차 수</Label>
                    <Input
                      value={totalEpisodes}
                      onChange={(e) => setTotalEpisodes(e.target.value)}
                      placeholder="예: 8"
                      type="number"
                      min="1"
                      max="20"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      커플매칭은 회차별로 예측이 가능합니다.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 <strong>커플매칭 특성</strong><br />
                      • 모든 회차 방영이 끝난 후, 최종 커플 선택이 완료되었을 때만 결과를 알 수 있습니다.<br />
                      • 따라서 결과는 <strong>마감 후 자동 공개</strong>로만 설정됩니다.<br />
                      • 전체 미션 마감 날짜는 설정하지 않으며, 각 회차별로 관리됩니다.
                    </p>
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

          {currentStep === "subjective-choice" && (
            <div className="space-y-6">
              <ConsensusCheckbox />
              <MissionCommonFields
                seasonType={seasonType}
                setSeasonType={setSeasonType}
                seasonNumber={seasonNumber}
                setSeasonNumber={setSeasonNumber}
                title={title}
                setTitle={setTitle}
                referenceUrl={referenceUrl}
                setReferenceUrl={setReferenceUrl}
                description={description}
                setDescription={setDescription}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
              />

              <div>
                <Label className="text-sm font-medium">주관식 안내 문구</Label>
                <Input
                  value={subjectivePlaceholder}
                  onChange={(e) => setSubjectivePlaceholder(e.target.value)}
                  placeholder="내용을 입력하세요!"
                  className="mt-1"
                />
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
      </Dialog >

      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">AI 검증 결과</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border-2 transition-all ${aiResult?.status === "pass" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200 opacity-60"
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
              className={`p-4 rounded-lg border-2 transition-all ${aiResult?.status === "revise"
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
