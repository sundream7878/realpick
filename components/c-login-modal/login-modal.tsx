"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/c-ui/dialog"
import { Mail } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

type LoginStep = "email" | "sent"

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [step, setStep] = useState<LoginStep>("email")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)

  // 이메일 입력 시 이전 이메일 목록 (localStorage에서 가져오기)
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    // localStorage에서 저장된 이메일 목록 가져오기
    const savedEmails = localStorage.getItem("rp_saved_emails")
    if (savedEmails) {
      try {
        const emails = JSON.parse(savedEmails)
        setEmailSuggestions(emails)
      } catch (e) {
        // 파싱 실패 시 무시
      }
    }
  }, [])

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setStep("email")
      setEmail("")
      setIsLoading(false)
      setIsResending(false)
    }
  }, [isOpen])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes("@")) return

    setIsLoading(true)
    try {
      const { sendVerificationCode } = await import("@/lib/auth-api")
      const result = await sendVerificationCode(email)

      if (!result.success) {
        alert(result.error || "매직링크 전송에 실패했습니다.")
        return
      }

      // 이메일을 저장된 목록에 추가
      const savedEmails = localStorage.getItem("rp_saved_emails")
      let emails: string[] = []
      if (savedEmails) {
        try {
          emails = JSON.parse(savedEmails)
        } catch (e) {
          emails = []
        }
      }
      if (!emails.includes(email)) {
        emails.unshift(email)
        // 최대 10개만 저장
        emails = emails.slice(0, 10)
        localStorage.setItem("rp_saved_emails", JSON.stringify(emails))
      }

      setStep("sent")
    } catch (error) {
      console.error("매직링크 전송 실패:", error)
      alert("매직링크 전송 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendLink = async () => {
    setIsResending(true)
    try {
      const { resendVerificationCode } = await import("@/lib/auth-api")
      const result = await resendVerificationCode(email)

      if (!result.success) {
        alert(result.error || "매직링크 재전송에 실패했습니다.")
      } else {
        alert("매직링크가 재전송되었습니다.")
      }
    } catch (error) {
      console.error("매직링크 재전송 실패:", error)
      alert("매직링크 재전송 중 오류가 발생했습니다.")
    } finally {
      setIsResending(false)
    }
  }

  const handleEmailSuggestionClick = (suggestedEmail: string) => {
    setEmail(suggestedEmail)
    setShowSuggestions(false)
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (value && emailSuggestions.length > 0) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <div className="p-6 sm:p-8">
          {/* 헤더 */}
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-2">
              RealPick
            </DialogTitle>
            <DialogDescription className="text-gray-700 text-base">
              {step === "email" ? "로그인하고 분석을 시작하세요" : "이메일을 확인해주세요"}
            </DialogDescription>
          </DialogHeader>

          {step === "email" ? (
            /* 이메일 입력 단계 */
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  이메일 주소
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    onFocus={() => {
                      if (emailSuggestions.length > 0) {
                        setShowSuggestions(true)
                      }
                    }}
                    onBlur={() => {
                      // 약간의 지연을 두어 클릭 이벤트가 먼저 실행되도록
                      setTimeout(() => setShowSuggestions(false), 200)
                    }}
                    required
                    className="h-12 border-gray-200 focus:border-rose-400 focus:ring-rose-400"
                  />
                  {showSuggestions && emailSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {emailSuggestions
                        .filter((suggestedEmail) =>
                          email ? suggestedEmail.toLowerCase().includes(email.toLowerCase()) : true
                        )
                        .map((suggestedEmail, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleEmailSuggestionClick(suggestedEmail)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                          >
                            {suggestedEmail}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || !email.includes("@")}
                className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium text-base"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    전송 중...
                  </div>
                ) : (
                  "매직링크 받기"
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                로그인하시면 이용약관 및 개인정보처리방침에 동의하게 됩니다.
              </p>
            </form>
          ) : (
            /* 매직링크 전송 완료 안내 */
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-rose-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">이메일을 확인해주세요</h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{email}</span>로 매직링크를 전송했습니다.
                  </p>
                  <p className="text-sm text-gray-600">
                    이메일의 링크를 클릭하면 로그인됩니다.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => {
                    setStep("email")
                    setEmail("")
                  }}
                  variant="outline"
                  className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  이메일 변경
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendLink}
                    disabled={isResending}
                    className="text-sm text-rose-600 hover:text-rose-700 disabled:text-gray-400"
                  >
                    {isResending ? "재전송 중..." : "매직링크 재전송"}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center">
                이메일이 보이지 않나요? 스팸 폴더를 확인해주세요.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
