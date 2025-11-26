"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface ResultCharacterPopupProps {
  isSuccess: boolean
  missionType: "predict" | "majority" | "match"
  comment: string
  missionId: string
}

export function ResultCharacterPopup({ isSuccess, missionType, comment, missionId }: ResultCharacterPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Check if popup was already shown for this mission in this session
    const storageKey = `result-popup-shown-${missionId}`
    const alreadyShown = sessionStorage.getItem(storageKey)

    if (alreadyShown) {
      return
    }

    // Mark as shown
    sessionStorage.setItem(storageKey, "true")

    // Show popup
    setShouldRender(true)

    // Fade in after a brief delay
    setTimeout(() => {
      setIsVisible(true)
    }, 100)

    // Fade out after 3.5 seconds
    setTimeout(() => {
      setIsVisible(false)
    }, 3500)

    // Remove from DOM after fade out animation completes
    setTimeout(() => {
      setShouldRender(false)
    }, 4000)
  }, [missionId])

  if (!shouldRender) {
    return null
  }

  const getTitle = () => {
    if (missionType === "predict") {
      return isSuccess ? "예측픽 성공!" : "예측픽 실패!"
    } else if (missionType === "majority") {
      return isSuccess ? "다수픽 성공!" : "다수픽 실패!"
    } else {
      return isSuccess ? "예측 성공!" : "예측 실패!"
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`flex flex-col items-center gap-6 rounded-3xl bg-white p-8 shadow-2xl transition-all duration-500 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <Image
          src={isSuccess ? "/images/success.png" : "/images/failure.png"}
          alt={isSuccess ? "성공" : "실패"}
          width={200}
          height={200}
          className="animate-bounce"
          style={{ animationDuration: "1s", animationIterationCount: "3" }}
        />
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
          <p className="text-center text-lg text-gray-600">{comment}</p>
        </div>
      </div>
    </div>
  )
}

