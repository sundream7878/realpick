"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/c-ui/button"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"

export default function SetupPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate saving nickname
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Redirect to main page
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-rose-100">
          <div className="flex flex-col items-center space-y-8">
            {/* Welcome Icon */}
            <div className="relative w-24 h-24 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                환영합니다!
              </h1>
              <p className="text-gray-600 text-sm">사용하실 닉네임을 설정해주세요</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-gray-700">
                  닉네임
                </Label>
                <Input
                  id="nickname"
                  type="text"
                  placeholder="닉네임을 입력하세요"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  maxLength={20}
                  className="h-12 border-gray-200 focus:border-rose-400 focus:ring-rose-400"
                />
                <p className="text-xs text-gray-500">{nickname.length}/20자</p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !nickname.trim()}
                className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-medium text-base shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    설정 중...
                  </div>
                ) : (
                  "시작하기"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
