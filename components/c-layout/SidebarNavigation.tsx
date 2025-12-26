"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Home, Plus, AlertCircle, ChevronDown, ChevronRight, User, Megaphone, Settings, Shield } from "lucide-react"
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
  activeNavItem?: "home" | "missions" | "mypage" | "casting" | "admin" | "dealer"
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
  
  // 현재 선택된 쿼리 파라미터 구성
  const currentQuery = selectedShowId ? `?show=${selectedShowId}` : ""
  const homeUrl = selectedShowId ? `/?show=${selectedShowId}` : "/"
  const castingUrl = selectedShowId ? `/p-casting?show=${selectedShowId}` : "/p-casting"
  const dealerLoungeUrl = selectedShowId ? `/dealer/lounge?show=${selectedShowId}` : "/dealer/lounge"
  const adminUrl = "/admin"
  const myPageUrl = selectedShowId ? `/p-mypage?show=${selectedShowId}` : "/p-mypage"

  useEffect(() => {
    const fetchUserRole = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const getUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        // console.log("[Sidebar] Current User:", user?.id)

        if (user) {
          const { data, error } = await supabase.from("t_users").select("f_role").eq("f_id", user.id).single()
          // console.log("[Sidebar] Role Fetch Result:", data, error)
          if (data) {
            // console.log("[Sidebar] Setting Role:", data.f_role)
            setUserRole(data.f_role)
          }
        } else {
          setUserRole(null)
        }
      }

      getUserRole()

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        // console.log("[Sidebar] Auth State Changed:", _event, session?.user?.id)
        getUserRole()
      })

      return () => {
        subscription.unsubscribe()
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
          <Link href={homeUrl}>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${activeNavItem === "home" ? `${theme.subBadge} ${theme.text} hover:${theme.subBadge}` : `${theme.text} hover:bg-white/10 hover:${theme.text}`}`}
            >
              <Home className="w-5 h-5" />
              홈
            </Button>
          </Link>

          <Link href={castingUrl}>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${activeNavItem === "casting" ? `${theme.subBadge} ${theme.text} hover:${theme.subBadge}` : `${theme.text} hover:bg-white/10 hover:${theme.text}`}`}
            >
              <Megaphone className="w-5 h-5" />
              <span>Real Casting</span>
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse ml-auto">
                New
              </span>
            </Button>
          </Link>

          {(userRole === 'DEALER' || userRole === 'MAIN_DEALER' || userRole === 'ADMIN') && (
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${theme.text} hover:${theme.subBadge}`}
              onClick={handleMissionClick}
            >
              <Plus className="w-5 h-5" />
              미션 게시하기
            </Button>
          )}

          <div className="space-y-1">
            <Button
              variant="ghost"
              className={`w-full justify-between gap-3 ${activeNavItem === "missions" ? `${theme.subBadge} ${theme.text} hover:${theme.subBadge}` : `${theme.text} hover:bg-white/10 hover:${theme.text}`}`}
              onClick={onMissionStatusToggle}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <div className="text-left leading-tight">
                  {selectedShow && <div>{selectedShow}</div>}
                  <div className="text-sm">미션현황{getSeasonDisplayText()}</div>
                </div>
              </div>
              {isMissionStatusOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>

            {isMissionStatusOpen && (
              <div className="ml-8 space-y-1">
                {seasonOptions.map((option) => {
                  // 기존 href에 show 파라미터 추가
                  const href = selectedShowId 
                    ? `${option.href}&show=${selectedShowId}`
                    : option.href
                  
                  return (
                    <Link key={option.value} href={href}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`w-full justify-start text-sm ${selectedSeason === option.value ? `${theme.subBadge} ${theme.text}` : `${theme.text} hover:bg-white/10 hover:${theme.text}`}`}
                        onClick={() => onSeasonSelect(option.value)}
                      >
                        {option.label}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <Link href={myPageUrl} onClick={handleMyPageClick}>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${activeNavItem === "mypage" ? `${theme.subBadge} ${theme.text} hover:${theme.subBadge}` : `${theme.text} hover:bg-white/10 hover:${theme.text}`}`}
            >
              <User className="w-5 h-5" />
              마이페이지
            </Button>
          </Link>

          {(userRole === 'DEALER' || userRole === 'MAIN_DEALER' || userRole === 'ADMIN') && (
            <Link href={dealerLoungeUrl}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 ${activeNavItem === "dealer" ? "bg-purple-100 text-purple-700 hover:bg-purple-100" : "hover:bg-purple-50 text-purple-700"} font-medium`}
              >
                <User className="w-5 h-5 text-purple-600" />
                딜러 라운지
              </Button>
            </Link>
          )}

          {userRole === 'ADMIN' && (
            <Link href={adminUrl}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 ${activeNavItem === "admin" ? "bg-red-100 text-red-700 hover:bg-red-100" : "hover:bg-red-50 text-red-700"} font-medium`}
              >
                <Shield className="w-5 h-5 text-red-600" />
                관리자 페이지
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

