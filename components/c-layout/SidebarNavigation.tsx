"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Plus, User, Shield } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import LoginModal from "@/components/c-login-modal/login-modal"
import { isAuthenticated } from "@/lib/auth-utils"

interface TSeasonOption {
  value: string
  label: string
  href: string
}

import { getThemeColors } from "@/lib/utils/u-theme/themeUtils"
import { TShowCategory, getShowByName } from "@/lib/constants/shows"

interface TSidebarNavigationProps {
  selectedShow?: string
  selectedSeason: string
  isMissionStatusOpen: boolean
  onMissionStatusToggle: () => void
  onSeasonSelect: (season: string) => void
  onMissionModalOpen: () => void
  activeNavItem?: "home" | "missions" | "mypage" | "admin" | "dealer"
  seasonOptions?: TSeasonOption[]
  category?: TShowCategory
  activeShowIds?: Set<string>
  selectedShowId?: string | null
}

export function SidebarNavigation({
  selectedShow,
  selectedSeason,
  isMissionStatusOpen,
  onMissionStatusToggle,
  onSeasonSelect,
  onMissionModalOpen,
  activeNavItem = "home",
  seasonOptions = [
    { value: "전체", label: "전체", href: "/p-missions?season=all" },
    { value: "29기", label: "29기", href: "/p-missions?season=29" },
    { value: "28기", label: "28기", href: "/p-missions?season=28" },
    { value: "27기", label: "27기", href: "/p-missions?season=27" },
  ],
  category: propCategory,
  activeShowIds = new Set(),
  selectedShowId = null,
}: TSidebarNavigationProps) {
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<"mission" | "mypage" | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  const category = propCategory || (selectedShow ? getShowByName(selectedShow)?.category : undefined)
  const theme = getThemeColors(category)
  
  // 테마 텍스트 색상 보정 (카테고리별 메인 색상 강제 적용)
  const getCategoryMainColor = () => {
    switch (category) {
      case "LOVE": return "!text-pink-600"
      case "VICTORY": return "!text-blue-600"
      case "STAR": return "!text-yellow-600"
      default: return "text-gray-700"
    }
  }

  const getCategoryHoverColor = () => {
    switch (category) {
      case "LOVE": return "hover:!text-pink-700 hover:!bg-pink-50"
      case "VICTORY": return "hover:!text-blue-700 hover:!bg-blue-50"
      case "STAR": return "hover:!text-yellow-700 hover:!bg-yellow-50"
      default: return "hover:text-gray-900 hover:bg-gray-100"
    }
  }

  const getCategoryActiveStyle = () => {
    switch (category) {
      case "LOVE": return "!bg-pink-100 !text-pink-700"
      case "VICTORY": return "!bg-blue-100 !text-blue-700"
      case "STAR": return "!bg-yellow-100 !text-yellow-700"
      default: return "bg-gray-100 text-gray-900"
    }
  }

  const sidebarTextColor = getCategoryMainColor()
  const sidebarHoverStyle = getCategoryHoverColor()
  const sidebarActiveStyle = getCategoryActiveStyle()

  // 아이콘 색상 추출
  const getIconColor = () => {
    switch (category) {
      case "LOVE": return "!text-pink-600"
      case "VICTORY": return "!text-blue-600"
      case "STAR": return "!text-yellow-600"
      default: return "text-gray-500"
    }
  }
  const iconColor = getIconColor()

  // 현재 선택된 쿼리 파라미터 구성
  const currentQuery = selectedShowId ? `?show=${selectedShowId}` : ""
  const homeUrl = selectedShowId ? `/?show=${selectedShowId}` : "/"
  const dealerLoungeUrl = selectedShowId ? `/dealer/lounge?show=${selectedShowId}` : "/dealer/lounge"
  const adminUrl = "/admin"
  const myPageUrl = selectedShowId ? `/p-mypage?show=${selectedShowId}` : "/p-mypage"

  useEffect(() => {
    const fetchUserRole = async () => {
      const { auth } = await import("@/lib/firebase/config")
      const { getUser } = await import("@/lib/firebase/users")
      const { onAuthStateChanged } = await import("firebase/auth")

      const getUserRole = async (userId: string) => {
        try {
          const user = await getUser(userId)
          if (user) {
            console.log('[Sidebar] 유저 역할 로드 완료:', user.role)
            setUserRole(user.role)
          } else {
            setUserRole(null)
          }
        } catch (error) {
          console.error('[Sidebar] 유저 역할 로드 실패:', error)
          setUserRole(null)
        }
      }

      // 초기 상태 확인
      const currentUserId = localStorage.getItem("rp_user_id")
      if (currentUserId) {
        getUserRole(currentUserId)
      } else if (auth.currentUser) {
        getUserRole(auth.currentUser.uid)
      }

      // 인증 상태 변경 감지 (로그인/로그아웃)
      const handleAuthChange = () => {
        const newUserId = localStorage.getItem("rp_user_id")
        if (newUserId) {
          getUserRole(newUserId)
        } else {
          setUserRole(null)
        }
      }

      window.addEventListener("auth-change", handleAuthChange)
      
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          getUserRole(user.uid)
        } else {
          const localId = localStorage.getItem("rp_user_id")
          if (!localId) setUserRole(null)
        }
      })

      return () => {
        window.removeEventListener("auth-change", handleAuthChange)
        unsubscribe()
      }
    }
    fetchUserRole()
  }, [])

  const getSeasonDisplayText = () => {
    return selectedSeason !== "전체" ? `(${selectedSeason})` : ""
  }

  const handleMissionClick = () => {
    if (isAuthenticated()) {
      onMissionModalOpen()
    } else {
      setPendingAction("mission")
      setShowLoginModal(true)
    }
  }

  const handleMyPageClick = (e: React.MouseEvent) => {
    if (!isAuthenticated()) {
      e.preventDefault()
      setPendingAction("mypage")
      setShowLoginModal(true)
    }
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    if (pendingAction === "mission") {
      onMissionModalOpen()
    } else if (pendingAction === "mypage") {
      router.push("/p-mypage")
    }
    setPendingAction(null)
  }

  return (
    <aside className={`w-64 border-r flex-shrink-0 hidden md:block absolute h-full z-40 left-0 top-0 pt-16 ${theme.bgGradient ? theme.bgGradient : 'bg-white'} ${theme.border} transition-colors duration-300`}>
      <div className="p-6">
        <nav className="space-y-2">
          {(userRole === 'DEALER' || userRole === 'MAIN_DEALER' || userRole === 'ADMIN') && (
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 transition-all font-bold ${sidebarTextColor} ${sidebarHoverStyle} !flex !items-center`}
              onClick={handleMissionClick}
            >
              <Plus className={`w-5 h-5 ${iconColor}`} />
              <span>미션 게시하기</span>
            </Button>
          )}

          <Link href={myPageUrl} onClick={handleMyPageClick}>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 transition-all font-bold ${
                activeNavItem === "mypage" 
                  ? sidebarActiveStyle 
                  : `${sidebarTextColor} ${sidebarHoverStyle}`
              } !flex !items-center`}
            >
              <User className={`w-5 h-5`} />
              <span>마이페이지</span>
            </Button>
          </Link>

          {(userRole === 'DEALER' || userRole === 'MAIN_DEALER' || userRole === 'ADMIN') && (
            <Link href={dealerLoungeUrl}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 transition-all font-bold ${
                  activeNavItem === "dealer" 
                    ? "bg-purple-100 text-purple-900" 
                    : "text-purple-700 hover:bg-purple-100 hover:text-purple-900"
                } !flex !items-center`}
              >
                <User className={`w-5 h-5 ${activeNavItem === "dealer" ? "text-purple-900" : "text-purple-600"}`} />
                <span className={activeNavItem === "dealer" ? "text-purple-900" : "text-purple-700"}>딜러 라운지</span>
              </Button>
            </Link>
          )}

          {userRole === 'ADMIN' && (
            <Link href={adminUrl}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 transition-all font-bold ${
                  activeNavItem === "admin" 
                    ? "bg-red-100 text-red-900" 
                    : "text-red-700 hover:bg-red-100 hover:text-red-900"
                } !flex !items-center`}
              >
                <Shield className={`w-5 h-5 ${activeNavItem === "admin" ? "text-red-900" : "text-red-600"}`} />
                <span className={activeNavItem === "admin" ? "text-red-900" : "text-red-700"}>관리자 페이지</span>
              </Button>
            </Link>
          )}

        </nav>
      </div>

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false)
          setPendingAction(null)
        }}
        onLoginSuccess={handleLoginSuccess}
      />
    </aside>
  )
}

