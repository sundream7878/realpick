"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Home, Plus, AlertCircle, ChevronDown, ChevronRight, User, Megaphone } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import LoginModal from "@/components/c-login-modal/login-modal"
import { isAuthenticated } from "@/lib/auth-utils"

interface TSeasonOption {
  value: string
  label: string
  href: string
}

interface TSidebarNavigationProps {
  selectedShow: "나는솔로" | "돌싱글즈"
  selectedSeason: string
  isMissionStatusOpen: boolean
  onMissionStatusToggle: () => void
  onSeasonSelect: (season: string) => void
  onMissionModalOpen: () => void
  activeNavItem?: "home" | "missions" | "mypage" | "casting"
  seasonOptions?: TSeasonOption[]
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
}: TSidebarNavigationProps) {
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<"mission" | "mypage" | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserRole = async () => {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const getUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        console.log("[Sidebar] Current User:", user?.id)

        if (user) {
          const { data, error } = await supabase.from("t_users").select("f_role").eq("f_id", user.id).single()
          console.log("[Sidebar] Role Fetch Result:", data, error)
          if (data) {
            console.log("[Sidebar] Setting Role:", data.f_role)
            setUserRole(data.f_role)
          }
        } else {
          setUserRole(null)
        }
      }

      getUserRole()

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log("[Sidebar] Auth State Changed:", _event, session?.user?.id)
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
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block absolute h-full z-40 left-0 top-0 pt-16">
      <div className="p-6">
        <nav className="space-y-2">
          <Link href="/">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${activeNavItem === "home" ? "bg-pink-50 text-pink-600 hover:bg-pink-100" : "hover:bg-gray-50"
                }`}
            >
              <Home className="w-5 h-5" />
              홈
            </Button>
          </Link>



          <Link href="/p-casting">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 relative ${activeNavItem === "casting" ? "bg-pink-50 text-pink-600 hover:bg-pink-100" : "hover:bg-gray-50"
                }`}
            >
              <Megaphone className="w-5 h-5" />
              Real Casting
              <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                New
              </span>
            </Button>
          </Link>

          {(userRole === 'DEALER' || userRole === 'MAIN_DEALER' || userRole === 'ADMIN') && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 hover:bg-gray-50"
              onClick={handleMissionClick}
            >
              <Plus className="w-5 h-5" />
              미션 게시하기
            </Button>
          )}

          <div className="space-y-1">
            <Button
              variant="ghost"
              className={`w-full justify-between gap-3 ${activeNavItem === "missions" ? "bg-pink-50 text-pink-600 hover:bg-pink-100" : "hover:bg-gray-50"
                }`}
              onClick={onMissionStatusToggle}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <div className="text-left leading-tight">
                  <div>{selectedShow}</div>
                  <div className="text-sm">미션현황{getSeasonDisplayText()}</div>
                </div>
              </div>
              {isMissionStatusOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>

            {isMissionStatusOpen && (
              <div className="ml-8 space-y-1">
                {seasonOptions.map((option) => (
                  <Link key={option.value} href={option.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start text-sm ${selectedSeason === option.value ? "bg-pink-50 text-pink-600" : "hover:bg-gray-50"
                        }`}
                      onClick={() => onSeasonSelect(option.value)}
                    >
                      {option.label}
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/p-mypage" onClick={handleMyPageClick}>
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 ${activeNavItem === "mypage" ? "bg-pink-50 text-pink-600 hover:bg-pink-100" : "hover:bg-gray-50"
                }`}
            >
              <User className="w-5 h-5" />
              마이페이지
            </Button>
          </Link>

          {(userRole === 'DEALER' || userRole === 'MAIN_DEALER' || userRole === 'ADMIN') && (
            <Link href="/dealer/lounge">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 hover:bg-purple-50 text-purple-700 font-medium"
              >
                <User className="w-5 h-5 text-purple-600" />
                딜러 라운지
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

