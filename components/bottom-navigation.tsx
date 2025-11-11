"use client"

import { Home, AlertCircle, User, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import MissionCreationModal from "./mission-creation-modal"

export function BottomNavigation() {
  const pathname = usePathname()
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false)

  const navItems = [
    {
      icon: Home,
      label: "홈",
      href: "/",
      active: pathname === "/",
    },
    {
      icon: Plus,
      label: "미션게시",
      onClick: () => setIsMissionModalOpen(true),
      active: false,
    },
    {
      icon: AlertCircle,
      label: "미션현황",
      href: "/missions?season=all",
      active: pathname === "/missions",
    },
    {
      icon: User,
      label: "마이페이지",
      href: "/mypage",
      active: pathname === "/mypage",
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
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors flex-1 ${
                    item.active ? "text-pink-600 bg-pink-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors flex-1 ${
                  item.active ? "text-pink-600 bg-pink-50" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      <MissionCreationModal isOpen={isMissionModalOpen} onClose={() => setIsMissionModalOpen(false)} />
    </>
  )
}

export default BottomNavigation
