"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { handleMagicLinkCallback } from "@/lib/auth-api"
import { getUser } from "@/lib/supabase/users"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    const processCallback = async () => {
      try {
        // 링크 콜백 처리
        const result = await handleMagicLinkCallback()

        if (!result.success) {
          setStatus("error")
          setErrorMessage(result.error || "인증 처리에 실패했습니다.")
          return
        }

        if (!result.userId) {
          setStatus("error")
          setErrorMessage("사용자 정보를 가져올 수 없습니다.")
          return
        }

        // 신규 사용자 여부 확인
        const isNewUser = result.isNewUser
        const needsSetup = result.needsSetup ?? false

        // 나잇대/성별이 없으면 추가 정보 입력 페이지로 리다이렉트
        if (needsSetup || isNewUser) {
          router.push(`/auth/setup?new=${isNewUser}`)
        } else {
          // 모든 정보가 있으면 홈으로 리다이렉트
          window.dispatchEvent(new Event("auth-change"))
          // 다른 탭 동기화를 위해 강제 이벤트 발생
          localStorage.setItem("rp_auth_sync", Date.now().toString())
          router.push("/")
        }
      } catch (error) {
        console.error("콜백 처리 중 오류:", error)
        setStatus("error")
        setErrorMessage("인증 처리 중 오류가 발생했습니다.")
      }
    }

    processCallback()
  }, [router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 text-lg">인증 처리 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">인증 실패</h1>
        <p className="text-gray-700 mb-6">{errorMessage}</p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  )
}

