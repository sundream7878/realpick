"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/c-ui/button"

interface MobileBottomBannerProps {
  className?: string
  mainCopy?: string
  ctaText?: string
  onClose?: () => void
  onClick?: () => void
}

export function MobileBottomBanner({
  className = "",
  mainCopy = "리얼픽과 함께하는 특별한 혜택!",
  ctaText = "받기",
  onClose,
  onClick
}: MobileBottomBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[90] h-14 bg-white/90 backdrop-blur-md border-t border-rose-100 flex items-center justify-between px-4 xl:hidden shadow-[0_-4px_20px_-1px_rgba(0,0,0,0.05)] ${className}`}>
      {/* AD Tag */}
      <div className="absolute top-1 left-4">
        <span className="text-[10px] font-bold tracking-wider text-rose-400/60">AD</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 mt-1">
        <p className="text-sm font-bold text-gray-800 truncate pr-2">
          {mainCopy}
        </p>
      </div>

      {/* CTA Button & Close */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => {
            onClick?.()
            console.log("Mobile Bottom Banner Clicked")
          }}
          className="bg-rose-500 text-white hover:bg-rose-600 rounded-full px-3 py-1.5 h-auto text-xs font-bold shadow-sm"
        >
          {ctaText}
        </Button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsVisible(false)
            onClose?.()
          }}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <X size={12} />
        </button>
      </div>

      {/* Clickable Overlay for the whole area except buttons */}
      <div 
        className="absolute inset-0 z-[-1] cursor-pointer"
        onClick={() => onClick?.()}
      />
    </div>
  )
}
