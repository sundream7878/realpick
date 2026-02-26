"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Card, CardContent } from "@/components/c-ui/card"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/c-ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/c-ui/dialog"
import { Checkbox } from "@/components/c-ui/checkbox"
import { Plus, X, ArrowLeft, Check, Circle, Trophy, Lock } from "lucide-react"
import { createMission } from "@/lib/firebase/missions"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { uploadMissionImage } from "@/lib/firebase/storage"
import { auth } from "@/lib/firebase/config"
import { SHOWS, CATEGORIES, type TShowCategory } from "@/lib/constants/shows"
import { getThemeColors } from "@/lib/utils/u-theme/themeUtils"
import { getUser } from "@/lib/firebase/users"
import { canCreateMission, hasMinimumRole, getRoleDisplayName } from "@/lib/utils/permissions"
import type { TUserRole } from "@/lib/utils/permissions"
import { getUserId } from "@/lib/auth-utils"
import { onAuthStateChanged } from "firebase/auth"
import { isYoutubeUrl, getYoutubeVideoId, getYoutubeThumbnailUrl } from "@/lib/utils/u-media/youtube.util"

interface MissionCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onMissionCreated?: () => void // 미션 생성 성공 후 콜백
  initialShowId?: string | null
  category?: TShowCategory
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
  showId: string | undefined
  setShowId: (value: string) => void
  isLocked?: boolean
  category?: TShowCategory
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
  showId,
  setShowId,
  isLocked = false,
  category,
}: MissionCommonFieldsProps) => {
  const getSeasonLabel = () => {
    if (showId === "nasolo") return "기수"
    if (showId === "nasolsagye") return "" // 나솔사계는 분류 없음
    return "시즌"
  }

  const seasonLabel = getSeasonLabel()
  const currentHideSeason = hideSeason || showId === "nasolsagye"

  return (
    <>
      {/* 관련 프로그램 선택 - isLocked이면 숨기고 텍스트로만 표시, 아니면 선택창 표시 */}
      {!isLocked ? (
        <div>
          <Label className="text-sm font-medium">관련 프로그램 (필수)</Label>
          <Select value={showId} onValueChange={setShowId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="프로그램을 선택해주세요" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SHOWS).map(([showCategory, shows]) => {
                // 1. 현재 선택된 카테고리와 일치하는지 확인 (카테고리가 전달된 경우)
                const isMatchingCategory = !category || category === showCategory;
                if (!isMatchingCategory) return null;

                // 2. 활성화된 프로그램만 필터링
                const activeShows = shows.filter(show => show.isActive !== false);
                if (activeShows.length === 0) return null;
                
                return (
                  <SelectGroup key={showCategory}>
                    <SelectLabel>{CATEGORIES[showCategory as TShowCategory].label}</SelectLabel>
                    {activeShows.map(show => (
                      <SelectItem key={show.id} value={show.id}>{show.displayName}</SelectItem>
                    ))}
                  </SelectGroup>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      ) : (
        // isLocked일 때는 어떤 프로그램인지 텍스트로만 표시 (사용자가 바꿀 수 없게)
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <Label className="text-xs text-gray-500 font-medium">게시되는 프로그램</Label>
          <div className="text-sm font-bold text-gray-900 mt-1">
            {Object.values(SHOWS).flat().find(s => s.id === showId)?.displayName || showId || "선택되지 않음"}
          </div>
        </div>
      )}

      {!currentHideSeason && (
        <div>
          <Label className="text-sm font-medium">{seasonLabel} 분류</Label>
          <div className="space-y-3 mt-2">
            <Select value={seasonType} onValueChange={setSeasonType}>
              <SelectTrigger>
                <SelectValue placeholder={`${seasonLabel} 분류 선택`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체</SelectItem>
                <SelectItem value="기수별">{seasonLabel}별</SelectItem>
              </SelectContent>
            </Select>
            {seasonType === "기수별" && (
              <div>
                <Label className="text-sm font-medium">{seasonLabel} 번호</Label>
                <Input
                  value={seasonNumber}
                  onChange={(e) => setSeasonNumber(e.target.value)}
                  placeholder={`예: ${showId === "nasolo" ? "29" : "1"}`}
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
          <Label htmlFor="referenceUrl" className="text-xs text-gray-500 font-medium">
            관련 영상/기사 URL
          </Label>
          <Input
            id="referenceUrl"
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="mt-1 text-sm h-8"
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-xs text-gray-500 font-medium">
            미션 설명
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="미션에 대한 추가 설명을 적어주세요"
            className="mt-1 text-sm h-8"
          />
        </div>

        <div>
          <Label className="text-xs text-gray-500 font-medium">대표 이미지</Label>
          <div className="mt-1 flex items-center gap-3">
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="text-xs h-8"
            />
            {isUploading && <span className="text-[10px] text-gray-400 animate-pulse">업로드 중...</span>}
          </div>
        </div>

        {imageUrl && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-200">
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
    </>
  )
}

export default function MissionCreationModal({ isOpen, onClose, onMissionCreated, initialShowId, category }: MissionCreationModalProps) {
  const { toast } = useToast()
  const theme = getThemeColors(category)
  
  // 카테고리별 버튼 색상 클래스 (Tailwind는 동적 클래스를 지원하지 않으므로 조건부로 반환)
  const getButtonClass = () => {
    switch (category) {
      case 'LOVE':
        return 'bg-pink-600 hover:bg-pink-700'
      case 'VICTORY':
        return 'bg-indigo-600 hover:bg-indigo-700'
      case 'STAR':
        return 'bg-yellow-500 hover:bg-yellow-600'
      default:
        return 'bg-purple-600 hover:bg-purple-700'
    }
  }
  
  const getSubBadgeClass = () => {
    switch (category) {
      case 'LOVE':
        return 'bg-pink-100/60 border-pink-200 text-pink-800'
      case 'VICTORY':
        return 'bg-indigo-100/60 border-indigo-200 text-indigo-800'
      case 'STAR':
        return 'bg-yellow-100/60 border-yellow-200 text-yellow-900'
      default:
        return 'bg-purple-50 border-purple-200 text-purple-700'
    }
  }

  const getIconTextClass = () => {
    switch (category) {
      case 'LOVE':
        return 'text-pink-600'
      case 'VICTORY':
        return 'text-indigo-600'
      case 'STAR':
        return 'text-yellow-700'
      default:
        return 'text-purple-600'
    }
  }
  
  const buttonClass = getButtonClass()
  const subBadgeClass = getSubBadgeClass()
  const iconTextClass = getIconTextClass()
  
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
  const [resultVisibility, setResultVisibility] = useState("realtime") // 무조건 실시간 공개로 고정
  const [maleOptions, setMaleOptions] = useState<string[]>(["", ""])
  const [femaleOptions, setFemaleOptions] = useState<string[]>(["", ""])
  const [subjectivePlaceholder, setSubjectivePlaceholder] = useState("")
  const [startEpisode, setStartEpisode] = useState("1")
  const [showId, setShowId] = useState<string | undefined>(initialShowId || undefined)

  // Live Mission State
  const [isLive, setIsLive] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState("60")
  const [durationSeconds, setDurationSeconds] = useState("0")

  // 추가 필드 (영상, 설명, 이미지)
  const [referenceUrl, setReferenceUrl] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [broadcastDay, setBroadcastDay] = useState<string>("수")
  const [broadcastTime, setBroadcastTime] = useState<string>("22:30")

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

  // 초기 showId 설정
  useEffect(() => {
    if (isOpen && initialShowId) {
      setShowId(initialShowId)
    }
  }, [isOpen, initialShowId])

  // 유튜브 링크 감지 및 자동 썸네일 추출
  useEffect(() => {
    if (referenceUrl && isYoutubeUrl(referenceUrl)) {
      const videoId = getYoutubeVideoId(referenceUrl)
      if (videoId) {
        const thumbnailUrl = getYoutubeThumbnailUrl(videoId, 'hqdefault')
        console.log('유튜브 썸네일 자동 추출:', thumbnailUrl)
        setImageUrl(thumbnailUrl)
        toast({
          title: "유튜브 썸네일 자동 추출",
          description: "유튜브 영상의 썸네일이 자동으로 설정되었습니다.",
        })
      }
    }
  }, [referenceUrl])

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
    setStartEpisode("1")
    setReferenceUrl("")
    setDescription("")
    setImageUrl("")
    setSubmissionType("selection")
    setSubmissionType("selection")
    setRequiredAnswerCount(1)
    setIsLive(false)
    setDurationMinutes("60")
    setDurationSeconds("0")
    setShowId(initialShowId || undefined)
  }

  // ... (existing handlers)

  const handlePublish = async () => {
    setIsPublishing(true)

    try {
      // Supabase 미션 생성 API 호출
      const missionData = {
        showId: showId,
        category: showId ? Object.values(SHOWS).flat().find(s => s.id === showId)?.category : undefined,
        title,
        type: missionType === "prediction" ? "prediction" : "majority",
        format: missionFormat === "binary" ? "binary" : missionFormat === "multiple" ? "multi" : missionFormat === "couple" ? "couple" : "tournament",
        seasonType,
        seasonNumber: seasonType === "기수별" ? seasonNumber : undefined,
        options: missionFormat === "couple" || (missionFormat === "multiple" && submissionType === "text") ? undefined : options.filter((opt) => opt.trim()),
        maleOptions: missionFormat === "couple" ? maleOptions.filter((opt) => opt.trim()) : undefined,
        femaleOptions: missionFormat === "couple" ? femaleOptions.filter((opt) => opt.trim()) : undefined,
        placeholder: (missionFormat === "multiple" && submissionType === "text") ? subjectivePlaceholder : undefined,
        startEpisode: missionFormat === "couple" ? parseInt(startEpisode) || 1 : undefined,
        broadcastDay: missionFormat === "couple" ? broadcastDay : undefined,
        broadcastTime: missionFormat === "couple" ? broadcastTime : undefined,
        deadline: missionFormat === "couple"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : isLive
            ? new Date(Date.now() + (parseInt(durationMinutes) * 60 + parseInt(durationSeconds)) * 1000).toISOString()
            : deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        resultVisibility: resultVisibility === "realtime" ? "realtime" : "onClose",
        referenceUrl: referenceUrl.trim() || undefined,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        submissionType: missionFormat === "multiple" ? submissionType : undefined,
        requiredAnswerCount: missionFormat === "multiple" ? requiredAnswerCount : undefined,
        isLive,
      }

      const user = auth.currentUser

      if (!user) {
        toast({
          title: "로그인 필요",
          description: "미션을 생성하려면 로그인이 필요합니다.",
          variant: "destructive",
        })
        setIsPublishing(false)
        return
      }

    const result = await createMission(missionData as any, user.uid)

    if (!result.success) {
      throw new Error(result.error || "미션 게시에 실패했습니다")
    }

    console.log("미션 게시 성공:", result.missionId)

    // 🔔 알림 생성 (즉시 발송)
    try {
      const { createGlobalNotification } = await import("@/lib/firebase/admin-notifications")
      await createGlobalNotification({
        missionId: result.missionId!,
        missionTitle: missionData.title,
        category: missionData.category || "LOVE",
        showId: missionData.showId || "nasolo",
        creatorId: user.uid,
        creatorNickname: creatorNickname
      })
      console.log('[Notification] 새 미션 알림 생성 완료')
    } catch (notifError) {
      console.error('[Notification] 알림 생성 중 오류:', notifError)
    }

    // 🔔 새 미션 생성 이벤트 발생 (로컬 UI 업데이트용)
      if (result.missionId) {
        window.dispatchEvent(new CustomEvent('new-mission-created', {
          detail: { missionId: result.missionId }
        }))
        console.log('[Notification] 새 미션 생성 이벤트 발생:', result.missionId)
      }

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
  const ConsensusCheckbox = () => {
    const checkboxClass = {
      LOVE: "data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500",
      VICTORY: "data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500",
      STAR: "data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500",
    }[category || "LOVE"]

    const consensusTheme = {
      LOVE: {
        bg: "bg-pink-50",
        border: "border-pink-100",
        text: "text-pink-700",
        subText: "text-pink-600"
      },
      VICTORY: {
        bg: "bg-indigo-50",
        border: "border-indigo-100",
        text: "text-indigo-700",
        subText: "text-indigo-600"
      },
      STAR: {
        bg: "bg-yellow-50",
        border: "border-yellow-100",
        text: "text-yellow-700",
        subText: "text-yellow-600"
      }
    }[category || "LOVE"] || {
      bg: "bg-purple-50",
      border: "border-purple-100",
      text: "text-purple-700",
      subText: "text-purple-600"
    }

    return (
      <div className={`flex items-center space-x-2 p-3 rounded-lg border ${consensusTheme.bg} ${consensusTheme.border}`}>
        <Checkbox
          id="consensus-mode"
          checked={missionType === "majority"}
          onCheckedChange={(checked) => setMissionType(checked ? "majority" : "prediction")}
          className={checkboxClass}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="consensus-mode"
            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${consensusTheme.text}`}
          >
            공감픽으로 설정
          </label>
          <p className={`text-xs ${consensusTheme.subText}`}>
            체크 시 정답이 없는 '공감픽' 미션이 됩니다.
          </p>
        </div>
      </div>
    )
  }

  // 라이브 미션 체크박스 컴포넌트
  const LiveMissionCheckbox = () => (
    <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-100">
      <Checkbox
        id="live-mode-toggle"
        checked={isLive}
        onCheckedChange={(checked) => setIsLive(checked as boolean)}
        className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
      />
      <div className="grid gap-1.5 leading-none">
        <label
          htmlFor="live-mode-toggle"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-red-700 flex items-center gap-1"
        >
          <span className="relative flex h-2 w-2 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          라이브 미션으로 설정
        </label>
        <p className="text-xs text-red-600">
          체크 시 마감 시간을 '분/초 단위'로 설정할 수 있습니다. (방송 중 실시간 투표용)
        </p>
      </div>
    </div>
  )

  const handleAIVerification = async () => {
    setIsVerifying(true)

    try {
      const response = await fetch("/api/missions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          missionType,
          missionFormat,
          showId
        })
      })

      if (!response.ok) throw new Error("Verification failed")

      const result = await response.json()
      setAiResult(result)
      setShowAIModal(true)
    } catch (error) {
      console.error("Verification error:", error)
      toast({
        title: "검증 실패",
        description: "AI 검증 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsVerifying(false)
    }
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
                      className={`cursor-pointer transition-colors ${theme.border} ${theme.subBadge} ${canCreateMission(userRole, "binary")
                        ? `hover:opacity-80`
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
                        <div className={`text-xl sm:text-2xl font-bold mb-2 ${iconTextClass}`}>A or B</div>
                        <p className="text-sm font-medium text-gray-900">양자선택</p>
                        <p className={`text-xs ${iconTextClass} mt-1`}>두 가지 중 하나 선택</p>
                      </CardContent>
                    </Card>
                    <Card
                      className={`cursor-pointer transition-colors ${theme.border} ${theme.subBadge} ${canCreateMission(userRole, "multi")
                        ? `hover:opacity-80`
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
                        <p className={`text-xs ${iconTextClass} mt-1`}>여러 보기 중 선택</p>
                      </CardContent>
                    </Card>

                    <Card
                      className={`cursor-pointer transition-colors ${theme.border} ${theme.subBadge} ${canCreateMission(userRole, "match")
                        ? `hover:opacity-80`
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
                        <p className={`text-xs ${iconTextClass} mt-1`}>최종 커플 예측</p>
                        {!canCreateMission(userRole, "match") && (
                          <p className="text-xs text-gray-500 mt-1">메인딜러 전용</p>
                        )}
                      </CardContent>
                    </Card>

                  </div>
                  <div className={`mt-4 p-3 border rounded-lg ${subBadgeClass}`}>
                    <p className={`text-xs sm:text-sm ${category === 'STAR' ? 'text-yellow-900' : category === 'LOVE' ? 'text-pink-800' : category === 'VICTORY' ? 'text-indigo-800' : 'text-purple-800'}`}>
                      💡 보기가 11개 이상인 경우, <strong>주관식 형식</strong>을 선택해주세요!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === "binary-choice" && (
            <div className="space-y-6">
              <LiveMissionCheckbox />
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
                showId={showId}
                setShowId={setShowId}
                isLocked={!!initialShowId}
                category={category}
              />

              <div>
                <Label className="text-sm font-medium">Pick 선택지 (최대 5쌍)</Label>
                <div className="space-y-3 mt-2">
                  {Array.from({ length: Math.ceil(options.length / 2) }).map((_, pairIndex) => {
                    const indexA = pairIndex * 2
                    const indexB = pairIndex * 2 + 1
                    return (
                      <div key={pairIndex} className="flex items-center gap-2">
                        <div className="flex-1 flex gap-2 items-center">
                          <Input
                            value={options[indexA] || ""}
                            onChange={(e) => updateOption(indexA, e.target.value)}
                            placeholder={`선택지 A-${pairIndex + 1}`}
                            className="text-center"
                          />
                          <span className="font-bold text-sm text-gray-400">VS</span>
                          <Input
                            value={options[indexB] || ""}
                            onChange={(e) => updateOption(indexB, e.target.value)}
                            placeholder={`선택지 B-${pairIndex + 1}`}
                            className="text-center"
                          />
                        </div>
                        {options.length > 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...options]
                              newOptions.splice(indexA, 2)
                              setOptions(newOptions)
                            }}
                            className="px-3"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                  {options.length < 10 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (options.length >= 10) return
                        setOptions([...options, "", ""])
                      }}
                      className="w-full border-dashed bg-transparent hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      선택지 쌍 추가
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">옵션</Label>
                <div className="space-y-3 mt-2">
                  {/* 결과 공개는 무조건 실시간 공개로 고정 */}
                  <div className={`px-3 py-2 border rounded-lg text-sm font-medium ${subBadgeClass}`}>
                    ✓ 실시간 공개 (자동 설정)
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">마감 설정 {isLive && <span className="text-red-500 text-xs ml-2">(라이브 미션)</span>}</Label>
                    </div>
                    {isLive ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value)}
                            placeholder="분"
                            className="mt-1"
                            min="0"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">분</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={durationSeconds}
                            onChange={(e) => setDurationSeconds(e.target.value)}
                            placeholder="초"
                            className="mt-1"
                            min="0"
                            max="59"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">초 후 마감</span>
                        </div>
                      </div>
                    ) : (
                      <Input
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        placeholder="마감시간 설정"
                        type="datetime-local"
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className={`flex-1 ${buttonClass} text-white`}
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
              <LiveMissionCheckbox />
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
                showId={showId}
                setShowId={setShowId}
                isLocked={!!initialShowId}
                category={category}
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
                  {/* 결과 공개는 무조건 실시간 공개로 고정 */}
                  <div className={`px-3 py-2 border rounded-lg text-sm font-medium ${subBadgeClass}`}>
                    ✓ 실시간 공개 (자동 설정)
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">마감 설정 {isLive && <span className="text-red-500 text-xs ml-2">(라이브 미션)</span>}</Label>
                    </div>
                    {isLive ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value)}
                            placeholder="분"
                            className="mt-1"
                            min="0"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">분</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={durationSeconds}
                            onChange={(e) => setDurationSeconds(e.target.value)}
                            placeholder="초"
                            className="mt-1"
                            min="0"
                            max="59"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">초 후 마감</span>
                        </div>
                      </div>
                    ) : (
                      <Input
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        placeholder="마감시간 설정"
                        type="datetime-local"
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className={`flex-1 ${buttonClass} text-white`}
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
              <LiveMissionCheckbox />
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
                showId={showId}
                setShowId={setShowId}
                isLocked={!!initialShowId}
                category={category}
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
                          <span className={`px-2 py-0.5 rounded ${subBadgeClass}`}>MATCH {matchIndex + 1}</span>
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
                  {/* 결과 공개는 무조건 실시간 공개로 고정 */}
                  <div className={`px-3 py-2 border rounded-lg text-sm font-medium ${subBadgeClass}`}>
                    ✓ 실시간 공개 (자동 설정)
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">마감 설정 {isLive && <span className="text-red-500 text-xs ml-2">(라이브 미션)</span>}</Label>
                    </div>
                    {isLive ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value)}
                            placeholder="분"
                            className="mt-1"
                            min="0"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">분</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={durationSeconds}
                            onChange={(e) => setDurationSeconds(e.target.value)}
                            placeholder="초"
                            className="mt-1"
                            min="0"
                            max="59"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">초 후 마감</span>
                        </div>
                      </div>
                    ) : (
                      <Input
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        placeholder="마감시간 설정"
                        type="datetime-local"
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className={`flex-1 ${buttonClass} text-white`}
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
              <LiveMissionCheckbox />
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
                showId={showId}
                setShowId={setShowId}
                isLocked={!!initialShowId}
                category={category}
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
                      className={`w-full mt-2 ${buttonClass} text-white`}
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
                      className={`w-full mt-2 ${buttonClass} text-white`}
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">방송 요일</Label>
                      <Select value={broadcastDay} onValueChange={setBroadcastDay}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="요일 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
                            <SelectItem key={day} value={day}>{day}요일</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">방송 시간</Label>
                      <Input
                        type="time"
                        value={broadcastTime}
                        onChange={(e) => setBroadcastTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">시작 회차</Label>
                      <Input
                        value={startEpisode}
                        onChange={(e) => setStartEpisode(e.target.value)}
                        placeholder="예: 1"
                        type="number"
                        min="1"
                        max="20"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        중간부터 시작 시 입력
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 <strong>커플매칭 특성</strong><br />
                      • 회차별로 예측이 가능하며, 투표 결과는 <strong>실시간으로 공개</strong>됩니다.<br />
                      • 전체 미션 마감 날짜는 설정하지 않으며, 각 회차별로 관리됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className={`flex-1 ${buttonClass} text-white`}
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
              <LiveMissionCheckbox />
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
                showId={showId}
                setShowId={setShowId}
                isLocked={!!initialShowId}
                category={category}
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
                  {/* 결과 공개는 무조건 실시간 공개로 고정 */}
                  <div className={`px-3 py-2 border rounded-lg text-sm font-medium ${subBadgeClass}`}>
                    ✓ 실시간 공개 (자동 설정)
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">마감 설정 {isLive && <span className="text-red-500 text-xs ml-2">(라이브 미션)</span>}</Label>
                    </div>
                    {isLive ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(e.target.value)}
                            placeholder="분"
                            className="mt-1"
                            min="0"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">분</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="number"
                            value={durationSeconds}
                            onChange={(e) => setDurationSeconds(e.target.value)}
                            placeholder="초"
                            className="mt-1"
                            min="0"
                            max="59"
                          />
                          <span className="text-sm text-gray-500 whitespace-nowrap">초 후 마감</span>
                        </div>
                      </div>
                    ) : (
                      <Input
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        placeholder="마감시간 설정"
                        type="datetime-local"
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className={`flex-1 ${buttonClass} text-white`}
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
