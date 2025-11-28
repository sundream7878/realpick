"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/c-ui/button"
import { Label } from "@/components/c-ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/c-ui/select"
import { updateUserAdditionalInfo } from "@/lib/supabase/users"
import { getUserId } from "@/lib/auth-utils"
import { useToast } from "@/hooks/h-toast/useToast.hook"

const AGE_RANGES = ["10대", "20대", "30대", "40대", "50대", "60대", "70대", "80대", "90대"] as const
const GENDERS = ["남성", "여성"] as const

export default function AuthSetupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const isNewUser = searchParams.get("new") === "true"

  const [ageRange, setAgeRange] = useState<string>("")
  const [gender, setGender] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // 로그인하지 않은 사용자는 홈으로 리다이렉트
    const userId = getUserId()
    if (!userId) {
      router.push("/")
      return
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ageRange || !gender) {
      toast({
        title: "입력 필요",
        description: "나잇대와 성별을 모두 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    const userId = getUserId()
    if (!userId) {
      toast({
        title: "오류",
        description: "로그인 정보를 찾을 수 없습니다. 다시 로그인해주세요.",
        variant: "destructive",
      })
      router.push("/")
      return
    }

    setIsSubmitting(true)

    try {
      const success = await updateUserAdditionalInfo(userId, {
        ageRange,
        gender,
      })

      if (!success) {
        throw new Error("정보 저장 실패")
      }

      // 인증 상태 변경 이벤트 발생
      window.dispatchEvent(new Event("auth-change"))

      toast({
        title: "저장 완료",
        description: "추가 정보가 저장되었습니다.",
      })

      // 홈으로 리다이렉트
      router.push("/")
    } catch (error) {
      console.error("추가 정보 저장 실패:", error)
      toast({
        title: "저장 실패",
        description: "추가 정보 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {/* 헤더 */}
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-2">
              RealPick
            </h1>
            <p className="text-gray-700 text-base">
              {isNewUser ? "환영합니다! 추가 정보를 입력해주세요." : "추가 정보를 입력해주세요."}
            </p>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 나잇대 선택 */}
            <div className="space-y-2">
              <Label htmlFor="ageRange" className="text-gray-700 text-sm font-medium">
                나잇대 <span className="text-rose-500">*</span>
              </Label>
              <Select value={ageRange} onValueChange={setAgeRange} required>
                <SelectTrigger id="ageRange" className="w-full h-12">
                  <SelectValue placeholder="나잇대를 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map((age) => (
                    <SelectItem key={age} value={age}>
                      {age}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 성별 선택 */}
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-gray-700 text-sm font-medium">
                성별 <span className="text-rose-500">*</span>
              </Label>
              <Select value={gender} onValueChange={setGender} required>
                <SelectTrigger id="gender" className="w-full h-12">
                  <SelectValue placeholder="성별을 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 제출 버튼 */}
            <Button
              type="submit"
              disabled={isSubmitting || !ageRange || !gender}
              className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </div>
              ) : (
                "저장하고 시작하기"
              )}
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center">
            이 정보는 통계 및 개인화된 서비스 제공을 위해 사용됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}

