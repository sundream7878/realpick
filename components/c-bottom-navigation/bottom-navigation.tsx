"use client"

import { User, Plus, Megaphone, Coins, Shield, Users } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import MissionCreationModal from "@/components/c-mission-creation-modal/mission-creation-modal"
import LoginModal from "@/components/c-login-modal/login-modal"
import { PointHistoryModal } from "@/components/c-common/PointHistoryModal"
import { isAuthenticated, getUserId } from "@/lib/auth-utils"
import { getUser } from "@/lib/supabase/users"
import { hasMinimumRole } from "@/lib/utils/permissions"
import type { TUserRole } from "@/lib/utils/permissions"
import type { TTierInfo } from "@/types/t-tier/tier.types"
import { getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"

interface BottomNavigationProps {
  onMissionClick?: () => void
  onStatusClick?: () => void
  userNickname?: string
  userPoints?: number
  userTier?: TTierInfo
}

export function BottomNavigation({ 
  onMissionClick, 
  onStatusClick,
  userNickname: propUserNickname,
  userPoints: propUserPoints,
  userTier: propUserTier 
}: BottomNavigationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPointHistoryModal, setShowPointHistoryModal] = useState(false)
  const [pendingMissionCreation, setPendingMissionCreation] = useState(false)
  const [userRole, setUserRole] = useState<TUserRole>("PICKER")
  const [canCreateMissions, setCanCreateMissions] = useState(false)
  const [localUserNickname, setLocalUserNickname] = useState("")
  const [localUserPoints, setLocalUserPoints] = useState(0)
  const [localUserTier, setLocalUserTier] = useState<TTierInfo | null>(null)
  
  // 현재 선택된 카테고리 쿼리 파라미터
  const selectedShowId = searchParams.get('show')
  const myPageUrl = selectedShowId ? `/p-mypage?show=${selectedShowId}` : "/p-mypage"

  // props가 있으면 사용, 없으면 자체적으로 로드
  const userNickname = propUserNickname || localUserNickname
  const userPoints = propUserPoints || localUserPoints
  const userTier = propUserTier || localUserTier

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated()) {
        setCanCreateMissions(false)
        setLocalUserNickname("")
        setLocalUserPoints(0)
        setLocalUserTier(null)
        return
      }

      const userId = getUserId()
      if (!userId) return

      try {
        const user = await getUser(userId)
        if (user) {
          setUserRole(user.role)
          setCanCreateMissions(hasMinimumRole(user.role, "DEALER"))
          setLocalUserNickname(user.nickname)
          setLocalUserPoints(user.points)
          setLocalUserTier(getTierFromDbOrPoints(user.tier, user.points))
        }
      } catch (error) {
        console.error("Failed to load user data:", error)
      }
    }

    loadUserData()

    // Listen for auth changes
    const handleAuthChange = () => {
      loadUserData()
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
    // 1. 리얼캐스팅
    {
      icon: Megaphone,
      label: "리얼캐스팅",
      href: "/p-casting",
      active: pathname === "/p-casting",
    },
    // 2. 미션게시 (딜러 이상)
    ...(canCreateMissions ? [{
      icon: Plus,
      label: "미션게시",
      onClick: handleMissionCreationClick,
      active: false,
    }] : []),
    // 3. 마이페이지
    {
      icon: User,
      label: "마이페이지",
      href: myPageUrl,
      active: pathname === "/p-mypage",
    },
    // 4. 딜러라운지 (딜러, 메인딜러, 관리자)
    ...((userRole === 'DEALER' || userRole === 'MAIN_DEALER' || userRole === 'ADMIN') ? [{
      icon: Users,
      label: "딜러라운지",
      href: "/dealer/lounge",
      active: pathname === "/dealer/lounge",
    }] : []),
    // 5. 포인트
    {
      icon: Coins,
      label: "포인트",
      custom: true,
      onClick: () => setShowPointHistoryModal(true),
      active: false,
    },
  ]

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-1">
          {navItems.map((item, index) => {
            const Icon = item.icon
            
            // 포인트 아이템 - 커스텀 렌더링 (onClick으로 모달 열기)
            if (item.custom === true && item.label === "포인트") {
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg transition-colors flex-1 min-w-0 text-gray-700 hover:bg-gray-50"
                >
                  <Coins className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] font-bold text-yellow-600 whitespace-nowrap">
                    {isAuthenticated() && userPoints ? `${userPoints.toLocaleString()}P` : "포인트"}
                  </span>
                </button>
              )
            }
            
            // onClick이 있는 아이템
            if (item.onClick) {
              return (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg transition-colors flex-1 min-w-0 ${item.active ? "text-pink-600 bg-pink-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{item.label}</span>
                </button>
              )
            }
            
            // Link 아이템
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg transition-colors flex-1 min-w-0 ${item.active ? "text-pink-600 bg-pink-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">{item.label}</span>
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
      <PointHistoryModal 
        isOpen={showPointHistoryModal} 
        onClose={() => setShowPointHistoryModal(false)} 
        totalPoints={userPoints}
      />
    </>
  )
}

export default BottomNavigation

