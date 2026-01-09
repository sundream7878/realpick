"use client"

import { useEffect } from "react"
import Script from "next/script"

export function KakaoSDK() {
  useEffect(() => {
    // SDK가 로드된 후 초기화
    const initializeKakao = () => {
      if (typeof window !== "undefined" && (window as any).Kakao) {
        const kakao = (window as any).Kakao
        const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
        
        if (kakaoKey && !kakao.isInitialized()) {
          try {
            kakao.init(kakaoKey)
            console.log("✅ 카카오 SDK 초기화 완료")
          } catch (error) {
            console.error("❌ 카카오 SDK 초기화 실패:", error)
          }
        }
      }
    }

    // SDK가 이미 로드되어 있으면 즉시 초기화
    if ((window as any).Kakao) {
      initializeKakao()
    }
  }, [])

  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== "undefined" && (window as any).Kakao) {
          const kakao = (window as any).Kakao
          const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
          
          if (kakaoKey && !kakao.isInitialized()) {
            try {
              kakao.init(kakaoKey)
              console.log("✅ 카카오 SDK 초기화 완료")
            } catch (error) {
              console.error("❌ 카카오 SDK 초기화 실패:", error)
            }
          }
        }
      }}
    />
  )
}

