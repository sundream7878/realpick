"use client"

import { Home, AlertCircle, User, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import LoginModal from "@/components/c-login-modal/login-modal"
import { isAuthenticated, getUserId } from "@/lib/auth-utils"
import { getUser } from "@/lib/supabase/users"
import { hasMinimumRole } from "@/lib/utils/permissions"
import type { TUserRole } from "@/lib/utils/permissions"

interface BottomNavigationProps {
  onMissionClick?: () => void
  onStatusClick?: () => void
}

export function BottomNavigation({ onMissionClick, onStatusClick }: BottomNavigationProps) {
  const pathname = usePathname()
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingMissionCreation, setPendingMissionCreation] = useState(false)
  const [userRole, setUserRole] = useState<TUserRole>("PICKER")
  const [canCreateMissions, setCanCreateMissions] = useState(false)

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      if (!isAuthenticated()) {
        setCanCreateMissions(false)
        return
      }

      const userId = getUserId()
      if (!userId) return

      try {
        const user = await getUser(userId)
        if (user) {
          setUserRole(user.role)
          setCanCreateMissions(hasMinimumRole(user.role, "DEALER"))
        }
      } catch (error) {
        console.error("Failed to load user role:", error)
      }
    }

    loadUserRole()

    // Listen for auth changes
    const handleAuthChange = () => {
      loadUserRole()
    }
    window.addEventListener('auth-change', handleAuthChange)
    return () => window.removeEventListener('auth-change', handleAuthChange)
  }, [])

  const handleMissionCreationClick = () => {
    // 로그인 체크
    if (!isAuthenticated()) {
      setPendingMissionCreation(true)
      setShowLoginModal(true)
    } else {
      if (onMissionClick) {
        onMissionClick()
      } else {
        setIsMissionModalOpen(true)
      }
    }
  }

  const navItems = [
    {
      icon: Home,
      label: "홈",
      href: "/",
      active: pathname === "/",
    },
    ...(canCreateMissions ? [{
      icon: Plus,
      label: "미션게시",
      onClick: handleMissionCreationClick,
      active: false,
    }] : []),
    {
      icon: AlertCircle,
      label: "미션현황",
      // onStatusClick이 있으면 onClick으로 처리, 없으면 href로 이동
      ...(onStatusClick
        ? { onClick: onStatusClick, active: false }
        : { href: "/p-missions?season=all", active: pathname === "/p-missions" }),
    },
    {
      icon: User,
      label: "마이페이지",
      href: "/p-mypage",
      active: pathname === "/p-mypage",
    },
  ]

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon
            if (item.onClick) {
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors flex-1 ${item.active ? "text-pink-600 bg-pink-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
            }
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors flex-1 ${item.active ? "text-pink-600 bg-pink-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false)
          setPendingMissionCreation(false)
        }}
        onLoginSuccess={() => {
          // 로그인 성공 후 미션 생성 모달 표시
          if (pendingMissionCreation) {
            setIsMissionModalOpen(true)
            setPendingMissionCreation(false)
          }
        }}
      />
      <MissionCreationModal isOpen={isMissionModalOpen} onClose={() => setIsMissionModalOpen(false)} />
    </>
  )
}

export default BottomNavigation

