"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getUser } from "@/lib/firebase/users"
import { getTierFromDbOrPoints } from "@/lib/utils/u-tier-system/tierSystem.util"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import Image from "next/image"
import { ArrowLeft, Star, Trophy, Target } from "lucide-react"
import { Button } from "@/components/c-ui/button"

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const id = params.id as string
      try {
        const userData = await getUser(id)
        if (userData) {
          setUser(userData)
        }
      } catch (error) {
        console.error("Failed to load user:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [params.id])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p>사용자를 찾을 수 없습니다.</p>
        <Button onClick={() => router.back()}>뒤로 가기</Button>
      </div>
    )
  }

  const tier = getTierFromDbOrPoints(user.tier, user.points)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto bg-white min-h-screen shadow-lg flex flex-col">
        <div className="p-4 flex items-center gap-4 border-b">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-bold">프로필</h1>
        </div>

        <main className="flex-1 p-6">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2C2745]/20 to-[#3E757B]/20 flex items-center justify-center overflow-hidden shadow-lg border-4 border-white">
                <Image
                  src={tier?.characterImage || "/placeholder.svg"}
                  alt={tier?.name || "Tier"}
                  width={128}
                  height={128}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -bottom-2 right-0 bg-[#2C2745] text-white text-xs font-bold px-3 py-1 rounded-full border-2 border-white shadow-md">
                {tier?.name}
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-2">{user.nickname}</h2>
            <div className="flex items-center gap-2 text-gray-500 mb-6">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-[#3E757B]">{user.points.toLocaleString()}P</span>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
                  <Trophy className="w-4 h-4" />
                  <span className="text-xs font-medium">활동 등급</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{tier.name}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-medium">총 포인트</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{user.points.toLocaleString()}P</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">최근 활동 정보</h3>
            <p className="text-center py-12 text-gray-400 text-sm">
              준비 중인 기능입니다. 곧 사용자의 예측 적중 기록을 확인하실 수 있습니다!
            </p>
          </div>
        </main>

        <BottomNavigation />
      </div>
    </div>
  )
}
