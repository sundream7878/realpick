"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/c-ui/button"

interface BannerAdProps {
  className?: string
}

export function BannerAd({ className = "" }: BannerAdProps) {
  const [isVisible, setIsVisible] = useState(true) // 배너 표시 (모바일에서만)

  if (!isVisible) return null

  return (
    <div className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white relative w-full border-t-2 border-purple-300 shadow-lg md:hidden ${className}`}>
      <div className="px-4 py-3 flex items-center justify-between min-h-[60px]">
        <div className="flex-1 text-center">
          <div className="text-sm font-bold animate-pulse">
            🎉 리얼픽과 함께하는 특별한 혜택! 
          </div>
          <div className="text-xs opacity-90 mt-1 font-medium">
            지금 가입하고 1000포인트 받아가세요!
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setIsVisible(false)
            console.log("배너 광고 닫기!")
          }}
          className="text-white hover:bg-white/20 p-1 h-auto ml-2 z-10 relative"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* 클릭 가능한 영역 */}
      <div 
        className="absolute inset-0 cursor-pointer z-0"
        onClick={() => {
          // 광고 클릭 시 동작 (예: 외부 링크 이동)
          console.log("배너 광고 클릭!")
          alert("배너 광고가 클릭되었습니다!")
          // window.open("https://example.com", "_blank")
        }}
      />
    </div>
  )
}
