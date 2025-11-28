"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/c-ui/button"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"
import { Camera, Edit2, LogOut, UserX } from "lucide-react"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { SidebarNavigation } from "@/components/c-layout/SidebarNavigation"
import { isAuthenticated, getUserId } from "@/lib/auth-utils"
import { logout } from "@/lib/auth-api"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { getTierFromPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { getUser, updateUserProfile } from "@/lib/supabase/users"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import Image from "next/image"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const [isMissionStatusOpen, setIsMissionStatusOpen] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<string>("전체")

  // 사용자 정보
  const [userNickname, setUserNickname] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPoints, setUserPoints] = useState(0)
  const [userTier, setUserTier] = useState<TTierInfo>(getTierFromPoints(0))
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | undefined>(undefined)

  const [isEditing, setIsEditing] = useState(false)
  const [editedNickname, setEditedNickname] = useState(userNickname)
  const [isSaving, setIsSaving] = useState(false)

  // 로그인 체크 및 리다이렉트
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/")
    }
  }, [router])

  // 사용자 정보 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (isAuthenticated()) {
        const currentUserId = getUserId()
        if (currentUserId) {
          try {
            const user = await getUser(currentUserId)
            if (user) {
              setUserNickname(user.nickname)
              setUserEmail(user.email)
              setUserPoints(user.points)
              setUserTier(getTierFromPoints(user.points))
              setUserAvatarUrl(user.avatarUrl)
              setEditedNickname(user.nickname)
            }
          } catch (error) {
            console.error("유저 데이터 로딩 실패:", error)
            // 실패 시 localStorage에서 기본값 가져오기
            if (typeof window !== "undefined") {
              const email = localStorage.getItem("rp_user_email")
              const nickname = localStorage.getItem("rp_user_nickname")
              if (email) setUserEmail(email)
              if (nickname) {
                setUserNickname(nickname)
                setEditedNickname(nickname)
              }
            }
          }
        }
      } else {
        // 비로그인 상태일 때 기본값
        setUserNickname("")
        setUserEmail("")
        setUserPoints(0)
        setUserTier(getTierFromPoints(0))
        setUserAvatarUrl(undefined)
      }
    }

    loadUserData()

    // 인증 상태 변경 감지
    const handleAuthChange = () => {
      loadUserData()
    }

    window.addEventListener("auth-change", handleAuthChange)
    window.addEventListener("storage", handleAuthChange)

    return () => {
      window.removeEventListener("auth-change", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
    }
  }, [])

  const handleSeasonSelect = (season: string) => {
    setSelectedSeason(season)
  }

  const handleSave = async () => {
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

      // 데이터베이스에 닉네임 업데이트
      const success = await updateUserProfile(currentUserId, {
        nickname: editedNickname.trim(),
      })

      if (!success) {
        throw new Error("닉네임 업데이트에 실패했습니다.")
      }

      // 로컬 상태 업데이트
      setUserNickname(editedNickname.trim())
      setIsEditing(false)

      // localStorage에도 닉네임 업데이트
      if (typeof window !== "undefined") {
        localStorage.setItem("rp_user_nickname", editedNickname.trim())
        // storage 이벤트 발생시켜서 다른 컴포넌트들이 업데이트를 감지하도록 함
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

  // 강제 로그아웃 함수 (API 호출 없이 바로 정리)
  const forceLogout = () => {
    console.log("🚨 강제 로그아웃 실행")
    
    // localStorage 직접 정리
    localStorage.removeItem("rp_auth_token")
    localStorage.removeItem("rp_user_id")
    localStorage.removeItem("rp_user_email")
    localStorage.removeItem("rp_user_nickname")
    localStorage.removeItem("rp_saved_emails")
    
    // auth-change 이벤트 발생
    window.dispatchEvent(new Event("auth-change"))
    
    console.log("강제 로그아웃 후 localStorage 정리 완료")
    
    // 홈으로 리다이렉트
    window.location.href = "/"
  }

  const handleLogout = async () => {
    console.log("🔴 로그아웃 버튼 클릭됨")
    
    try {
      const result = await logout()
      console.log("로그아웃 API 결과:", result)
      
      if (result.success) {
        console.log("🔄 홈페이지로 리다이렉트 중...")
        window.location.href = "/"
      } else {
        console.error("로그아웃 API 실패, 강제 로그아웃 실행:", result.error)
        forceLogout()
      }
    } catch (error) {
      console.error("로그아웃 API 오류, 강제 로그아웃 실행:", error)
      forceLogout()
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm("정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      try {
        // TODO: 실제 API 호출로 계정 탈퇴 (Supabase Auth의 deleteUser 사용)
        // 현재는 로그아웃만 수행
        const result = await logout()
        if (result.success) {
          // 탈퇴 성공 시 즉시 홈으로 리다이렉트
          window.location.href = "/"
        } else {
          toast({
            title: "탈퇴 실패",
            description: result.error || "탈퇴 중 오류가 발생했습니다.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("탈퇴 실패:", error)
        toast({
          title: "탈퇴 실패",
          description: "탈퇴 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      }
    }
  }

  const handleProfileImageClick = () => {
    // TODO: 프로필 이미지 업로드 기능 구현
    alert("프로필 이미지 업로드 기능은 준비 중입니다.")
  }

  if (!isAuthenticated()) {
    return null // 리다이렉트 중
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex">
      <SidebarNavigation
        selectedShow={selectedShow}
        selectedSeason={selectedSeason}
        isMissionStatusOpen={isMissionStatusOpen}
        onMissionStatusToggle={() => setIsMissionStatusOpen(!isMissionStatusOpen)}
        onSeasonSelect={handleSeasonSelect}
        onMissionModalOpen={() => {}}
        activeNavItem="profile"
      />

      <div className="flex-1 flex flex-col">
        <AppHeader
          selectedShow={selectedShow}
          onShowChange={setSelectedShow}
          userNickname={userNickname}
          userPoints={userPoints}
          userTier={userTier}
          userAvatarUrl={userAvatarUrl}
          onAvatarClick={() => router.push("/p-profile")}
        />

        <main className="flex-1 px-4 lg:px-8 py-6 md:ml-64 max-w-full overflow-hidden">
          <div className="max-w-2xl mx-auto">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                프로필
              </h1>
            </div>

            {/* 프로필 카드 */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-rose-100 p-8 mb-6">
              {/* 프로필 이미지 및 기본 정보 */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-rose-200 to-pink-200 flex items-center justify-center overflow-hidden shadow-lg">
                    {userAvatarUrl ? (
                      <Image
                        src={userAvatarUrl}
                        alt={userNickname || "프로필"}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={userTier.characterImage || "/placeholder.svg"}
                        alt={userTier.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div
                    className="absolute bottom-2 right-2 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full p-3 cursor-pointer hover:from-rose-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                    onClick={handleProfileImageClick}
                  >
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-800">{userNickname}님</h2>
                  <p className="text-gray-600">{userEmail}</p>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="bg-gradient-to-r from-rose-100 to-pink-100 px-4 py-2 rounded-full">
                      <span className="text-sm font-medium text-rose-700">{userTier.name}</span>
                    </div>
                    <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full">
                      <span className="text-sm font-medium text-purple-700">{userPoints.toLocaleString()}P</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 닉네임 편집 섹션 */}
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-6 mb-6 border border-rose-100">
                <Label className="text-sm font-medium text-gray-700 mb-4 block">닉네임</Label>
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      value={editedNickname}
                      onChange={(e) => setEditedNickname(e.target.value)}
                      placeholder="닉네임을 입력하세요"
                      className="border-rose-200 focus:border-rose-400 focus:ring-rose-400 bg-white/70"
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
                        className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
                      className="border-rose-300 text-rose-600 hover:bg-rose-50 bg-white/70"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      변경
                    </Button>
                  </div>
                )}
              </div>

              {/* 계정 관리 섹션 */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">계정 관리</h3>
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
        </main>

        <BottomNavigation />
      </div>
    </div>
  )
}
