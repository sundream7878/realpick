"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { CATEGORIES, SHOWS, type TShowCategory } from "@/lib/constants/shows"
import { useRouter } from "next/navigation"

interface TShowMenuProps {
    category: TShowCategory
}

export function ShowMenu({ category }: TShowMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const categoryInfo = CATEGORIES[category]
    const shows = SHOWS[category]

    // 외부 클릭 감지
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    const handleShowClick = (showId: string) => {
        setIsOpen(false)

        // 나는 SOLO만 메인 페이지로 이동
        if (showId === "nasolo") {
            router.push("/")
        }
        // 나머지는 아무 동작 없음 (허수)
    }

    return (
        <div className="relative" ref={menuRef}>
            {/* 메뉴 버튼 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium text-sm
          transition-all duration-200
          ${isOpen
                        ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg"
                        : "bg-white/70 text-gray-700 hover:bg-white hover:shadow-md"
                    }
        `}
            >
                {/* 모바일: 텍스트만, 데스크톱: 이모지 + 텍스트 */}
                <span className="hidden sm:inline text-lg">{categoryInfo.emoji}</span>
                <span className="text-sm sm:text-base">
                    {isOpen ? categoryInfo.label : categoryInfo.description}
                </span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* 드롭다운 메뉴 */}
            {isOpen && (
                <div
                    className="
            absolute top-full left-0 mt-2 w-56
            bg-white rounded-xl shadow-2xl border border-gray-100
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200
            z-50
          "
                >
                    {/* 프로그램 목록 (헤더 제거) */}
                    <div className="py-2 max-h-96 overflow-y-auto">
                        {shows.map((show) => (
                            <button
                                key={show.id}
                                onClick={() => handleShowClick(show.id)}
                                className="
                  w-full px-4 py-2.5 text-left text-sm
                  hover:bg-gradient-to-r hover:from-rose-50 hover:to-pink-50
                  transition-all duration-150
                  text-gray-700 hover:text-rose-600
                  font-medium
                "
                            >
                                {show.displayName}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
