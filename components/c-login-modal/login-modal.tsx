"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/c-ui/dialog"
import { Mail } from "lucide-react"
import Image from "next/image"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: () => void
}

type LoginStep = "email" | "code"

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [step, setStep] = useState<LoginStep>("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

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
      setCode("")
      setIsLoading(false)
      setIsResending(false)
      setIsVerifying(false)
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
        alert(result.error || "인증 코드 전송에 실패했습니다.")
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

      setStep("code")
    } catch (error) {
      console.error("인증 코드 전송 실패:", error)
      alert("인증 코드 전송 중 오류가 발생했습니다.")
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
        alert(result.error || "인증 코드 재전송에 실패했습니다.")
      } else {
        alert("인증 코드가 재전송되었습니다.")
        setCode("") // 코드 입력 초기화
      }
    } catch (error) {
      console.error("인증 코드 재전송 실패:", error)
      alert("인증 코드 재전송 중 오류가 발생했습니다.")
    } finally {
      setIsResending(false)
    }
  }

  const handleCodeVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.length !== 6) return

    setIsVerifying(true)
    try {
      const { verifyOtpCode } = await import("@/lib/auth-api")
      const result = await verifyOtpCode(email, code)

      if (!result.success) {
        alert(result.error || "인증 코드가 올바르지 않습니다.")
        return
      }

      // 로그인 성공
      if (result.needsSetup || result.isNewUser) {
        // 추가 정보 입력 필요
        window.location.href = `/auth/setup?new=${result.isNewUser}`
      } else {
        // 로그인 완료
        window.dispatchEvent(new Event("auth-change"))
        localStorage.setItem("rp_auth_sync", Date.now().toString())

        if (onLoginSuccess) {
          onLoginSuccess()
        }
        onClose()
      }
    } catch (error) {
      console.error("인증 코드 검증 실패:", error)
      alert("인증 코드 검증 중 오류가 발생했습니다.")
    } finally {
      setIsVerifying(false)
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
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
              <Image 
                src="/favicon-32x32.png" 
                alt="리얼픽 로고" 
                width={28} 
                height={28}
                className="object-contain sm:w-8 sm:h-8"
              />
              <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#2C2745] to-[#3E757B] bg-clip-text text-transparent">
                리얼픽
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-700 text-sm sm:text-base">
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
                    className="h-12 border-gray-200 focus:border-[#3E757B] focus:ring-[#3E757B]"
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
                className="w-full h-11 sm:h-12 bg-gradient-to-r from-[#2C2745] to-[#3E757B] hover:from-[#2C2745]/90 hover:to-[#3E757B]/90 text-white font-medium text-sm sm:text-base"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    전송 중...
                  </div>
                ) : (
                  "인증 코드 받기"
                )}
              </Button>

              <p className="text-[10px] sm:text-xs text-gray-500 text-center leading-relaxed">
                로그인하시면 이용약관 및 개인정보처리방침에 동의하게 됩니다.
              </p>
            </form>
          ) : (
            /* OTP 코드 입력 단계 */
            <form onSubmit={handleCodeVerify} className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4 py-2">
                <div className="w-16 h-16 bg-[#3E757B]/10 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-[#3E757B]" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">인증 코드를 입력하세요</h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{email}</span>로 6자리 코드를 전송했습니다.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code" className="text-gray-700">
                  인증 코드
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                  className="h-12 text-center text-2xl tracking-widest border-gray-200 focus:border-[#3E757B] focus:ring-[#3E757B]"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isVerifying || code.length !== 6}
                className="w-full h-11 sm:h-12 bg-gradient-to-r from-[#2C2745] to-[#3E757B] hover:from-[#2C2745]/90 hover:to-[#3E757B]/90 text-white font-medium text-sm sm:text-base"
              >
                {isVerifying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    확인 중...
                  </div>
                ) : (
                  "로그인"
                )}
              </Button>

              <div className="space-y-4">
                <Button
                  type="button"
                  onClick={() => {
                    setStep("email")
                    setEmail("")
                    setCode("")
                  }}
                  variant="outline"
                  className="w-full h-11 sm:h-12 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                >
                  이메일 변경
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="text-sm text-[#3E757B] hover:text-[#2C2745] disabled:text-gray-400"
                  >
                    {isResending ? "재전송 중..." : "코드 재전송"}
                  </button>
                </div>
              </div>

              <p className="text-[10px] sm:text-xs text-gray-500 text-center leading-relaxed">
                이메일이 보이지 않나요? 스팸 폴더를 확인해주세요.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
