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

  // URL에서 직접 category 파라미터 읽기 (클라이언트 사이드에서만)
  const [categoryFromUrl, setCategoryFromUrl] = useState<TShowCategory | null>(null)
  
  useEffect(() => {
    const updateCategoryFromUrl = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const cat = params.get('category') as TShowCategory | null
        setCategoryFromUrl(cat)
        console.log('[SidebarNavigation] 🔄 URL Category Updated:', cat)
      }
    }
    
    updateCategoryFromUrl()
    
    // URL 변경 감지 (popstate, pushState 감지)
    window.addEventListener('popstate', updateCategoryFromUrl)
    
    // pushState/replaceState 감지를 위한 커스텀 이벤트
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState
    
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args)
      updateCategoryFromUrl()
    }
    
    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args)
      updateCategoryFromUrl()
    }
    
    return () => {
      window.removeEventListener('popstate', updateCategoryFromUrl)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [])

  const category = propCategory || categoryFromUrl || (selectedShow ? getShowByName(selectedShow)?.category : undefined)
  const theme = getThemeColors(category)
  
  console.log('[SidebarNavigation] 🎨 Category:', category, 'from URL:', categoryFromUrl, 'from prop:', propCategory)
  
  // 테마 텍스트 색상 보정 (카테고리별 메인 색상 강제 적용)
  const getCategoryStyles = () => {
    switch (category) {
      case "LOVE": 
        return {
          text: "text-pink-600",
          hover: "hover:text-pink-700 hover:bg-pink-50",
          active: "bg-pink-100 text-pink-700",
          icon: "text-pink-600"
        }
      case "VICTORY": 
        return {
          text: "text-blue-600",
          hover: "hover:text-blue-700 hover:bg-blue-50",
          active: "bg-blue-100 text-blue-700",
          icon: "text-blue-600"
        }
      case "STAR": 
        return {
          text: "text-yellow-600",
          hover: "hover:text-yellow-700 hover:bg-yellow-50",
          active: "bg-yellow-100 text-yellow-700",
          icon: "text-yellow-600"
        }
      default: 
        return {
          text: "text-gray-700",
          hover: "hover:text-gray-900 hover:bg-gray-100",
          active: "bg-gray-100 text-gray-900",
          icon: "text-gray-500"
        }
    }
  }

  const categoryStyles = getCategoryStyles()
  const sidebarTextColor = categoryStyles.text
  const sidebarHoverStyle = categoryStyles.hover
  const sidebarActiveStyle = categoryStyles.active
  const iconColor = categoryStyles.icon

  // 현재 선택된 쿼리 파라미터 구성
  const buildUrlWithParams = (basePath: string) => {
    const params = new URLSearchParams()
    if (selectedShowId) params.set('show', selectedShowId)
    if (category) params.set('category', category)
    const queryString = params.toString()
    return queryString ? `${basePath}?${queryString}` : basePath
  }
  
  const currentQuery = selectedShowId ? `?show=${selectedShowId}` : ""
  const homeUrl = selectedShowId ? `/?show=${selectedShowId}` : "/"
  const dealerLoungeUrl = buildUrlWithParams('/dealer/lounge')
  const adminUrl = "/admin"
  const myPageUrl = buildUrlWithParams('/p-mypage')

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
              className={`w-full justify-start gap-3 transition-all font-bold ${sidebarTextColor} ${sidebarHoverStyle} flex items-center`}
              onClick={handleMissionClick}
              style={{
                color: category === 'LOVE' ? '#db2777' : category === 'VICTORY' ? '#2563eb' : category === 'STAR' ? '#ca8a04' : undefined
              }}
            >
              <Plus className={`w-5 h-5 ${iconColor}`} style={{
                color: category === 'LOVE' ? '#db2777' : category === 'VICTORY' ? '#2563eb' : category === 'STAR' ? '#ca8a04' : undefined
              }} />
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
              } flex items-center`}
              style={activeNavItem !== "mypage" ? {
                color: category === 'LOVE' ? '#db2777' : category === 'VICTORY' ? '#2563eb' : category === 'STAR' ? '#ca8a04' : undefined
              } : undefined}
            >
              <User className={`w-5 h-5`} style={activeNavItem !== "mypage" ? {
                color: category === 'LOVE' ? '#db2777' : category === 'VICTORY' ? '#2563eb' : category === 'STAR' ? '#ca8a04' : undefined
              } : undefined} />
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

