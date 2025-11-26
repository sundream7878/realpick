"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/c-ui/dialog"
import { X } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

type LoginStep = "email" | "verification"
const OTP_LENGTH = 6

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [step, setStep] = useState<LoginStep>("email")
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(OTP_LENGTH).fill(""))
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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
      setVerificationCode(Array(OTP_LENGTH).fill(""))
      setIsLoading(false)
      setIsResending(false)
    }
  }, [isOpen])

  // 인증코드 입력 필드 포커스 관리
  useEffect(() => {
    if (step === "verification" && inputRefs.current[0]) {
      inputRefs.current[0]?.focus()
    }
  }, [step])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes("@")) return

    setIsLoading(true)
    try {
      const { sendVerificationCode } = await import("@/lib/auth-api")
      const result = await sendVerificationCode(email)

      if (!result.success) {
        alert(result.error || "인증코드 전송에 실패했습니다.")
        return
      }

      // 개발 환경 안내 메시지
      if (process.env.NODE_ENV === "development") {
        console.log("💡 개발 환경: Supabase 대시보드 > Authentication > Users에서 OTP 코드를 확인할 수 있습니다.")
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

      setStep("verification")
    } catch (error) {
      console.error("인증코드 전송 실패:", error)
      alert("인증코드 전송 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationCodeChange = (index: number, value: string) => {
    // 숫자만 입력 허용
    if (value && !/^\d$/.test(value)) return

    const newCode = [...verificationCode]
    newCode[index] = value
    setVerificationCode(newCode)

    // 다음 필드로 자동 이동
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // OTP_LENGTH 자리 모두 입력되면 자동 제출
    if (newCode.every((digit) => digit !== "") && newCode.join("").length === OTP_LENGTH) {
      handleVerificationSubmit(newCode.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace 처리
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim()
    if (new RegExp(`^\\d{${OTP_LENGTH}}$`).test(pastedData)) {
      const digits = pastedData.split("")
      setVerificationCode(digits)
      // 마지막 필드에 포커스
      inputRefs.current[OTP_LENGTH - 1]?.focus()
      // 자동 제출
      setTimeout(() => {
        handleVerificationSubmit(pastedData)
      }, 100)
    }
  }

  const handleVerificationSubmit = async (code?: string) => {
    const finalCode = code || verificationCode.join("")
    if (finalCode.length !== OTP_LENGTH) return

    setIsLoading(true)
    try {
      const { verifyCode } = await import("@/lib/auth-api")
      const result = await verifyCode(email, finalCode)

      if (!result.success) {
        alert(result.error || "인증코드가 올바르지 않습니다.")
        setVerificationCode(Array(OTP_LENGTH).fill(""))
        inputRefs.current[0]?.focus()
        return
      }

      // 인증 상태 변경 이벤트 발생
      window.dispatchEvent(new Event("auth-change"))

      // 로그인 성공 콜백 호출
      if (onLoginSuccess) {
        onLoginSuccess()
      }
      onClose()
    } catch (error) {
      console.error("인증코드 검증 실패:", error)
      alert("인증코드 검증 중 오류가 발생했습니다.")
      // 에러 처리 (예: 인증코드 초기화)
      setVerificationCode(Array(OTP_LENGTH).fill(""))
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    try {
      const { resendVerificationCode } = await import("@/lib/auth-api")
      const result = await resendVerificationCode(email)

      if (!result.success) {
        alert(result.error || "인증코드 재전송에 실패했습니다.")
      } else {
        alert("인증코드가 재전송되었습니다.")
      }
    } catch (error) {
      console.error("인증코드 재전송 실패:", error)
      alert("인증코드 재전송 중 오류가 발생했습니다.")
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
              로그인하고 분석을 시작하세요
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
                  "인증코드 받기"
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                로그인하시면 이용약관 및 개인정보처리방침에 동의하게 됩니다.
              </p>
            </form>
          ) : (
            /* 인증코드 입력 단계 */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">인증코드 입력</h3>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email")
        setVerificationCode(Array(OTP_LENGTH).fill(""))
                  }}
                  className="text-sm text-rose-600 hover:text-rose-700"
                >
                  이메일 변경
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {email}로 발송된 6자리 코드를 입력하세요
                </p>
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {verificationCode.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleVerificationCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-semibold border-gray-300 focus:border-rose-500 focus:ring-rose-500"
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={() => handleVerificationSubmit()}
                disabled={isLoading || verificationCode.join("").length !== OTP_LENGTH}
                className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium text-base"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    확인 중...
                  </div>
                ) : (
                  "로그인"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-sm text-rose-600 hover:text-rose-700 disabled:text-gray-400"
                >
                  {isResending ? "재전송 중..." : "인증코드 재전송"}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                로그인하시면 이용약관 및 개인정보처리방침에 동의하게 됩니다.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

