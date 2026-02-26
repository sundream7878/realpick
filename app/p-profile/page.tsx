"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/c-ui/button"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"
import { Switch } from "@/components/c-ui/switch"
import { Edit2, LogOut, UserX, Bell, Mail, Clock } from "lucide-react"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { PointHistoryModal } from "@/components/c-common/PointHistoryModal"
import LoginModal from "@/components/c-login-modal/login-modal"
import { DesktopWingBanner } from "@/components/c-banner-ad/desktop-wing-banner"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { BannerAd } from "@/components/c-banner-ad/banner-ad"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { isAuthenticated, getUserId, getAnonNickname } from "@/lib/auth-utils"
import { logout } from "@/lib/auth-api"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { getTierFromPoints, getTierFromDbOrPoints, TIERS } from "@/lib/utils/u-tier-system/tierSystem.util"
import { getUser, updateUserProfile } from "@/lib/firebase/users"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import Image from "next/image"
import { getShowByName, getShowById, normalizeShowId, CATEGORIES as GLOBAL_CATEGORIES } from "@/lib/constants/shows"
import { db } from "@/lib/firebase/config"
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [selectedShowId, setSelectedShowId] = useState<string | null>(searchParams.get('show'))
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<string>("전체")
  
  // User Data States
  const [userNickname, setUserNickname] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [isLoading, setIsLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedNickname, setEditedNickname] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showPointHistoryModal, setShowPointHistoryModal] = useState(false)

  // Notification States
  const [emailNotification, setEmailNotification] = useState(false)
  const [deadlineEmailNotification, setDeadlineEmailNotification] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isSavingNotification, setIsSavingNotification] = useState(false)

  // Show Statuses, Visibility, Custom Shows Fetching & Sync
  const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
  const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
  const [customShows, setCustomShows] = useState<any[]>([])

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true)
      const isAuth = isAuthenticated()
      const userId = getUserId()
      
      if (!userId) {
        setIsLoading(false)
        return
      }

      if (!isAuth) {
        // 익명 사용자 기본 정보 설정
        setUserNickname(getAnonNickname())
        setUserEmail("익명 사용자 (로그인 필요)")
        setUserPoints(0)
        setUserTier(getTierFromPoints(0))
        setIsLoading(false)
        return
      }

      try {
        // 1. 유저 정보 조회
        const user = await getUser(userId)
        if (user) {
          setUserNickname(user.nickname)
          setUserEmail(user.email)
          setUserPoints(user.points)
          setUserTier(getTierFromDbOrPoints(user.tier, user.points))
          setEditedNickname(user.nickname)
        }

        // 2. 알림 설정 조회
        const prefRef = doc(db, 'notification_preferences', userId)
        const prefSnap = await getDoc(prefRef)
        
        if (prefSnap.exists()) {
          const data = prefSnap.data()
          setEmailNotification(data.emailEnabled || false)
          setDeadlineEmailNotification(data.deadlineEmailEnabled || false)
          setSelectedCategories(data.categories || [])
        }
      } catch (error) {
        console.error("데이터 로딩 실패:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()

    // 인증 상태 변경 감지
    const handleAuthChange = () => loadUserData()
    window.addEventListener("auth-change", handleAuthChange)
    window.addEventListener("storage", handleAuthChange)

    return () => {
      window.removeEventListener("auth-change", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
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

  const handleSeasonSelect = (season: string) => {
    setSelectedSeason(season)
  }

  const handleSave = async () => {
    if (!isAuthenticated()) {
      setShowLoginModal(true)
      return
    }
    if (!editedNickname.trim()) {
      toast({
        title: "저장 실패",
        description: "닉네임을 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const currentUserId = getUserId()
      if (!currentUserId) {
        throw new Error("사용자 ID를 찾을 수 없습니다.")
      }

      const success = await updateUserProfile(currentUserId, {
        nickname: editedNickname.trim(),
      })

      if (!success) {
        throw new Error("닉네임 업데이트에 실패했습니다.")
      }

      setUserNickname(editedNickname.trim())
      setIsEditing(false)

      if (typeof window !== "undefined") {
        localStorage.setItem("rp_user_nickname", editedNickname.trim())
        window.dispatchEvent(new Event("storage"))
      }

      toast({
        title: "저장 완료",
        description: "프로필이 업데이트되었습니다.",
      })
    } catch (error) {
      console.error("닉네임 업데이트 실패:", error)
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "프로필 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const forceLogout = () => {
    localStorage.removeItem("rp_auth_token")
    localStorage.removeItem("rp_user_id")
    localStorage.removeItem("rp_user_email")
    localStorage.removeItem("rp_user_nickname")
    localStorage.removeItem("rp_saved_emails")
    window.dispatchEvent(new Event("auth-change"))
    window.location.href = "/"
  }

  const handleLogout = async () => {
    try {
      const result = await logout()
      if (result.success) {
        window.location.href = "/"
      } else {
        forceLogout()
      }
    } catch (error) {
      forceLogout()
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm("정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      try {
        const result = await logout()
        if (result.success) {
          window.location.href = "/"
        } else {
          toast({
            title: "탈퇴 실패",
            description: result.error || "탈퇴 중 오류가 발생했습니다.",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "탈퇴 실패",
          description: "탈퇴 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    }
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSaveNotification = async () => {
    if (!isAuthenticated()) {
      setShowLoginModal(true)
      return
    }
    setIsSavingNotification(true)
    try {
      const currentUserId = getUserId()
      if (!currentUserId) {
        throw new Error("사용자 ID를 찾을 수 없습니다.")
      }

      const payload = {
        userId: currentUserId,
        emailEnabled: emailNotification,
        deadlineEmailEnabled: deadlineEmailNotification,
        categories: selectedCategories,
        updatedAt: new Date()
      }

      // Firestore에서 알림 설정 저장 (collection 'notification_preferences')
      const prefRef = doc(db, 'notification_preferences', currentUserId)
      await setDoc(prefRef, payload, { merge: true })

      toast({
        title: "저장 완료",
        description: "알림 설정이 저장되었습니다.",
      })
    } catch (error) {
      console.error("알림 설정 저장 실패:", error)
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : "알림 설정 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSavingNotification(false)
    }
  }

  const CATEGORIES = [
    { id: 'LOVE', name: GLOBAL_CATEGORIES.LOVE.description, icon: GLOBAL_CATEGORIES.LOVE.iconPath },
    { id: 'VICTORY', name: GLOBAL_CATEGORIES.VICTORY.description, icon: GLOBAL_CATEGORIES.VICTORY.iconPath },
    { id: 'STAR', name: GLOBAL_CATEGORIES.STAR.description, icon: GLOBAL_CATEGORIES.STAR.iconPath }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2C2745]/10 via-[#3E757B]/10 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3E757B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative overflow-x-hidden">
      <DesktopWingBanner side="left" />
      <DesktopWingBanner side="right" />

      <div className="max-w-5xl mx-auto bg-white min-h-screen shadow-lg flex flex-col relative z-10">
        <AppHeader
          selectedShow={selectedShowId ? (getShowById(selectedShowId)?.name as "나는솔로" | "돌싱글즈") || "나는솔로" : "나는솔로"}
          onShowChange={() => { }}
          userNickname={userNickname}
          userPoints={userPoints}
          userTier={userTier}
          onAvatarClick={() => {
            // 프로필 페이지에서는 페이지 상단으로 스크롤
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onPointsClick={() => setShowPointHistoryModal(true)}
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
          showStatuses={showStatuses}
        />

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-40 max-w-full overflow-hidden pb-32 md:pb-16 min-w-0">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col-reverse lg:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-[#2C2745] to-[#3E757B] bg-clip-text text-transparent">
                    등급 로드맵
                  </h1>
                </div>
                {userTier.minPoints < 5000 && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-[#3E757B]/20 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#2C2745]/10 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">다음 등급 목표</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        {(() => {
                          const nextTier = [...TIERS].reverse().find(t => t.minPoints > userPoints);
                          return nextTier ? `${nextTier.name}까지` : "최고 등급입니다!";
                        })()}
                      </span>
                      <span className="text-sm font-bold text-[#3E757B]">
                        {(() => {
                          const nextTier = [...TIERS].reverse().find(t => t.minPoints > userPoints);
                          return nextTier ? `${(nextTier.minPoints - userPoints).toLocaleString()}P 남음` : "";
                        })()}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#2C2745] to-[#3E757B] rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: (() => {
                            const nextTier = [...TIERS].reverse().find(t => t.minPoints > userPoints);
                            if (!nextTier) return "100%";
                            const currentTier = TIERS.find(t => t.minPoints <= userPoints && t.minPoints < nextTier.minPoints) || TIERS[TIERS.length - 1];
                            const totalRange = nextTier.minPoints - currentTier.minPoints;
                            const progress = userPoints - currentTier.minPoints;
                            return `${Math.min(100, Math.max(0, (progress / totalRange) * 100))}%`;
                          })()
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {TIERS.map((tier, index) => {
                    const isCurrent = userTier.name === tier.name;
                    const currentTierIndex = TIERS.findIndex(t => t.name === userTier.name);
                    const isNextTarget = index === currentTierIndex - 1;

                    return (
                      <div
                        key={tier.name}
                        className={`relative flex items-center p-4 rounded-2xl border transition-all duration-300 ${isCurrent
                          ? "bg-white border-[#3E757B] shadow-md ring-2 ring-[#3E757B]/20 z-10"
                          : isNextTarget
                            ? "bg-white border-[#3E757B]/50 shadow-[0_0_15px_rgba(62,117,123,0.15)] scale-[1.01] z-10"
                            : "bg-white border-gray-100"
                          }`}
                      >
                        {isNextTarget && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#2C2745] to-[#3E757B] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-bounce">
                            도전! NEXT LEVEL
                          </div>
                        )}

                        <div className={`relative w-16 h-16 flex-shrink-0 rounded-full flex items-center justify-center mr-4 ${isCurrent ? "bg-[#3E757B]/10" : isNextTarget ? "bg-[#3E757B]/5" : "bg-gray-50"
                          }`}>
                          <Image
                            src={tier?.characterImage || "/placeholder.svg"}
                            alt={tier?.name || "Tier"}
                            width={64}
                            height={64}
                            className="w-14 h-14 object-contain"
                          />
                          {isCurrent && (
                            <div className="absolute -bottom-1 -right-1 bg-[#2C2745] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              MY
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-bold text-lg ${isCurrent || isNextTarget ? "text-gray-900" : "text-gray-700"}`}>
                              {tier.name}
                            </h4>
                            <span className={`text-sm font-medium ${isCurrent || isNextTarget ? "text-[#3E757B]" : "text-gray-500"}`}>
                              {tier.minPoints.toLocaleString()}P 이상
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${isCurrent || isNextTarget ? "text-gray-700" : "text-gray-500"}`}>
                            {tier.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="w-full lg:w-96 flex-shrink-0">
                <div className="sticky top-24">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#3E757B]/20 p-8 mb-6">
                    <div className="flex flex-col items-center text-center mb-8">
                      <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2C2745]/20 to-[#3E757B]/20 flex items-center justify-center overflow-hidden shadow-lg border-4 border-white">
                          <Image
                            src={userTier?.characterImage || "/placeholder.svg"}
                            alt={userTier?.name || "Tier"}
                            width={128}
                            height={128}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {/* 등급명 배지 (프로필 사진 오른쪽 하단) */}
                        <span className="absolute bottom-0 right-0 text-xs lg:text-sm text-pink-600 font-bold bg-white px-2 py-1 rounded-full border-2 border-pink-200 shadow-md whitespace-nowrap">
                          {userTier.name}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-gray-800">{userNickname}</h2>
                        {!isAuthenticated() ? (
                          <div className="mt-2 p-4 rounded-xl bg-[#3E757B]/5 border border-[#3E757B]/20 text-left">
                            <div className="flex items-center gap-2 mb-2">
                              <Mail className="w-4 h-4 text-[#3E757B]" />
                              <span className="font-bold text-[#2C2745] text-sm">이메일을 등록해봐요! 😊</span>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              로그인하시면 분석 기록 보존, 알림 수신, 기기 변경 시 데이터 유지 등 다양한 혜택을 누리실 수 있습니다.
                            </p>
                            <Button 
                              size="sm" 
                              onClick={() => setShowLoginModal(true)}
                              className="w-full mt-3 bg-gradient-to-r from-[#2C2745] to-[#3E757B] hover:opacity-90 text-white text-xs font-bold h-8 border-none"
                            >
                              로그인하고 혜택 받기
                            </Button>
                          </div>
                        ) : (
                          <p className="text-gray-600">{userEmail}</p>
                        )}
                        <div className="flex items-center justify-center gap-4 mt-4">
                          <div 
                            className="bg-gradient-to-r from-purple-100 to-pink-100 px-5 py-2.5 rounded-full cursor-pointer hover:shadow-md transition-all active:scale-95"
                            onClick={() => setShowPointHistoryModal(true)}
                          >
                            <span className="text-base font-bold text-[#3E757B]">{userPoints.toLocaleString()} <span className="font-semibold">Point</span></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-[#2C2745]/5 to-[#3E757B]/5 rounded-xl p-6 mb-6 border border-[#3E757B]/20">
                      <Label className="text-sm font-medium text-gray-700 mb-4 block">닉네임</Label>
                      {isEditing ? (
                        <div className="space-y-4">
                          <Input
                            value={editedNickname}
                            onChange={(e) => setEditedNickname(e.target.value)}
                            placeholder="닉네임을 입력하세요"
                            className="border-[#3E757B]/30 focus:border-[#3E757B] focus:ring-[#3E757B] bg-white/70"
                          />
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white/70"
                              onClick={() => {
                                setIsEditing(false)
                                setEditedNickname(userNickname)
                              }}
                            >
                              취소
                            </Button>
                            <Button
                              className="flex-1 bg-gradient-to-r from-[#2C2745] to-[#3E757B] hover:from-[#221e36] hover:to-[#2f5a60] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                              onClick={handleSave}
                              disabled={isSaving}
                            >
                              {isSaving ? "저장 중..." : "저장"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-gray-900">{userNickname}</span>
                          <Button
                            variant="outline"
                            className="border-[#3E757B]/50 text-[#3E757B] hover:bg-[#3E757B]/10 bg-white/70"
                            onClick={() => setIsEditing(true)}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            변경
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 이메일 알림 설정 */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#3E757B]/20 p-8 mb-6">
                    <div className="flex items-center gap-2 mb-6">
                      <Bell className="w-5 h-5 text-[#3E757B]" />
                      <h3 className="text-lg font-semibold text-gray-800">이메일 알림</h3>
                    </div>

                    {/* 미션 마감 알림 ON/OFF */}
                    <div className="bg-gradient-to-r from-[#2C2745]/5 to-[#3E757B]/5 rounded-xl p-4 mb-3 border border-[#3E757B]/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#3E757B]" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">미션 마감 알림</p>
                            <p className="text-xs text-gray-600 mt-0.5">참여한 미션 마감 시 이메일</p>
                          </div>
                        </div>
                        <Switch
                          checked={deadlineEmailNotification}
                          onCheckedChange={setDeadlineEmailNotification}
                        />
                      </div>
                    </div>

                    {/* 새 미션 알림 ON/OFF */}
                    <div className="bg-gradient-to-r from-[#2C2745]/5 to-[#3E757B]/5 rounded-xl p-4 mb-6 border border-[#3E757B]/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-[#3E757B]" />
                          <div>
                            <p className="font-medium text-gray-900 text-sm">새 미션 알림</p>
                            <p className="text-xs text-gray-600 mt-0.5">관심 카테고리의 새 미션 등록 시 이메일</p>
                          </div>
                        </div>
                        <Switch
                          checked={emailNotification}
                          onCheckedChange={setEmailNotification}
                        />
                      </div>
                    </div>

                    {/* 카테고리 선택 */}
                    {emailNotification && (
                      <div className="space-y-3 mb-6">
                        <Label className="text-sm font-medium text-gray-700">관심 카테고리</Label>
                        <div className="space-y-2">
                          {CATEGORIES.map(category => {
                            const isSelected = selectedCategories.includes(category.id)
                            return (
                              <button
                                key={category.id}
                                onClick={() => toggleCategory(category.id)}
                                className={`
                                  w-full p-3 rounded-xl border-2 transition-all text-left
                                  ${isSelected
                                    ? 'border-[#3E757B] bg-[#3E757B]/10'
                                    : 'border-gray-200 bg-white/70 hover:border-gray-300'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {category.icon ? (
                                      <img src={category.icon} alt={category.name} className="w-8 h-8 object-contain" />
                                    ) : (
                                      <span className="text-xl">{'emoji' in category ? (category as any).emoji : ''}</span>
                                    )}
                                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                                  </div>
                                  <div className={`
                                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                                    ${isSelected
                                      ? 'border-[#3E757B] bg-[#3E757B]'
                                      : 'border-gray-300'
                                    }
                                  `}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* 저장 버튼 */}
                    <Button
                      onClick={handleSaveNotification}
                      disabled={isSavingNotification}
                      className="w-full bg-gradient-to-r from-[#2C2745] to-[#3E757B] hover:from-[#221e36] hover:to-[#2f5a60] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {isSavingNotification ? "저장 중..." : "알림 설정 저장"}
                    </Button>
                  </div>

                  {/* 계정 관리 */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-[#3E757B]/20 p-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">계정 관리</h3>
                    <div className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start border-gray-200 text-gray-700 hover:bg-gray-50 bg-white/70 h-12"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-5 h-5 mr-3" />
                        로그아웃
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 bg-white/70 h-12"
                        onClick={handleDeleteAccount}
                      >
                        <UserX className="w-5 h-5 mr-3" />
                        계정 탈퇴
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNavigation />
          <BannerAd />
        </div>

        <SidebarNavigation
          selectedShow={selectedShowId ? (getShowById(selectedShowId)?.name as "나는솔로" | "돌싱글즈") || "나는솔로" : "나는솔로"}
          selectedSeason={selectedSeason}
          isMissionStatusOpen={isMissionStatusOpen}
          onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
          onSeasonSelect={handleSeasonSelect}
          onMissionModalOpen={() => { }}
          activeNavItem={undefined}
          category={selectedShowId ? getShowById(selectedShowId)?.category : undefined}
          selectedShowId={selectedShowId}
        />

        <PointHistoryModal
          isOpen={showPointHistoryModal}
          onClose={() => setShowPointHistoryModal(false)}
          totalPoints={userPoints}
        />

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          title="알림 및 설정을 저장하고 싶다면?"
          description="로그인하시면 실시간 알림을 받아보실 수 있습니다."
        />
      </div>
    </div>
  )
}
