"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/c-ui/dialog"
import { Button } from "@/components/c-ui/button"
import { Link2, MessageCircle, Instagram, Twitter, Check } from "lucide-react"
import { toast } from "@/hooks/use-toast.hook"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  url: string
  hashtags?: string[]
}

export function ShareModal({
  isOpen,
  onClose,
  title,
  description = "리얼픽에서 나의 예측 결과를 확인해보세요!",
  url,
  hashtags = ["리얼픽", "예측", "픽"],
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  // 링크 복사 또는 공유
  const handleCopyLink = async () => {
    try {
      // 1. Web Share API 지원 확인 (모바일 우선)
      if (navigator.share && /Android|iPhone|iPad|iPod/.test(navigator.userAgent)) {
        try {
          await navigator.share({
            title: title,
            text: description,
            url: url,
          })
          toast({
            title: "공유 완료!",
            description: "선택한 앱으로 공유되었습니다.",
          })
          return
        } catch (shareError: any) {
          // 사용자가 공유를 취소한 경우 (AbortError)
          if (shareError.name === 'AbortError') {
            return // 조용히 종료
          }
          // 다른 에러는 아래 복사 로직으로 fallback
        }
      }

      // 2. 링크 복사 (fallback)
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast({
        title: "링크 복사 완료!",
        description: "클립보드에 링크가 복사되었습니다.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "링크 복사에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 카카오톡 공유 (앱 연결)
  const handleKakaoShare = async () => {
    const shareText = `${title}\n\n${description}\n\n${url}`
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    const isMobile = isIOS || isAndroid
    
    if (isMobile) {
      // 모바일: Web Share API 우선 사용
      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: `${description}\n\n`,
            url: url,
          })
          toast({
            title: "공유 완료!",
            description: "카카오톡으로 공유되었습니다.",
          })
          return
        } catch (shareError: any) {
          // 사용자가 취소한 경우
          if (shareError.name === 'AbortError') {
            return
          }
          // 실패 시 아래 fallback 로직 계속
        }
      }

      // Fallback: 링크 복사
      try {
        await navigator.clipboard.writeText(shareText)
        toast({
          title: "링크 복사 완료!",
          description: "카카오톡에 붙여넣기 해주세요.",
        })
      } catch (error) {
        toast({
          title: "복사 실패",
          description: "링크 복사에 실패했습니다.",
          variant: "destructive",
        })
      }
    } else {
      // 데스크톱: 카카오톡 PC 앱 연결 시도
      try {
        // 1. 링크 먼저 복사
        await navigator.clipboard.writeText(shareText)
        
        // 2. 카카오톡 PC 앱 실행 시도
        const kakaoScheme = `kakaotalk://send?text=${encodeURIComponent(shareText)}`
        
        // iframe을 사용하여 앱 실행 시도
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = kakaoScheme
        document.body.appendChild(iframe)
        
        // 카카오톡 앱이 열리면 성공, 아니면 복사 완료 메시지 표시
        let appOpened = false
        
        const blurHandler = () => {
          appOpened = true
          document.body.removeChild(iframe)
        }
        
        window.addEventListener('blur', blurHandler, { once: true })
        
        setTimeout(() => {
          window.removeEventListener('blur', blurHandler)
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
          
          if (!appOpened) {
            // 앱이 열리지 않았으면 링크 복사 알림
            toast({
              title: "링크 복사 완료!",
              description: "카카오톡 PC 버전에 붙여넣기 해주세요.",
            })
          } else {
            toast({
              title: "카카오톡 실행!",
              description: "카카오톡에 붙여넣기 해주세요.",
            })
          }
        }, 1000)
        
      } catch (error) {
        toast({
          title: "복사 실패",
          description: "링크 복사에 실패했습니다.",
          variant: "destructive",
        })
      }
    }
  }

  // 인스타그램 공유 (앱 연결)
  const handleInstagramShare = async () => {
    const shareText = `${title}\n\n${description}\n\n${url}`
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    const isMobile = isIOS || isAndroid
    
    if (isMobile) {
      // 모바일: Web Share API 우선, 실패하면 앱 실행
      try {
        // 1. Web Share API 시도
        if (navigator.share) {
          try {
            await navigator.share({
              title: title,
              text: `${description}\n\n`,
              url: url,
            })
            return
          } catch (shareError: any) {
            if (shareError.name === 'AbortError') {
              return // 사용자가 취소
            }
            // 실패 시 아래 로직 계속
          }
        }

        // 2. 링크 복사 후 앱 실행
        await navigator.clipboard.writeText(shareText)
        
        toast({
          title: "링크 복사 완료!",
          description: "인스타그램에 붙여넣기 해주세요.",
        })

        setTimeout(() => {
          window.location.href = "instagram://camera"
        }, 500)
      } catch (error) {
        toast({
          title: "공유 실패",
          description: "인스타그램 공유에 실패했습니다.",
          variant: "destructive",
        })
      }
    } else {
      // 데스크톱: 인스타그램 웹 팝업
      window.open("https://www.instagram.com/", "_blank", "width=600,height=700")
      
      // 링크 복사
      try {
        await navigator.clipboard.writeText(shareText)
        toast({
          title: "링크 복사 완료!",
          description: "인스타그램 웹에서 붙여넣기 해주세요.",
        })
      } catch (error) {
        // 복사 실패해도 웹은 열림
      }
    }
  }

  // 트위터(X) 공유
  const handleTwitterShare = () => {
    const text = `${title}\n\n${description}`
    const hashtagsStr = hashtags.join(",")
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    
    if (isIOS || isAndroid) {
      // 모바일: X(트위터) 앱으로 직접 이동
      const twitterAppUrl = `twitter://post?message=${encodeURIComponent(text + "\n" + url)}`
      const webFallback = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtagsStr)}`
      
      // 앱 실행 시도, 실패하면 웹으로 fallback
      window.location.href = twitterAppUrl
      
      // 1초 후 앱이 열리지 않으면 웹 버전 열기
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.open(webFallback, "_blank")
        }
      }, 1000)
    } else {
      // 데스크톱: 웹 버전 열기
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtagsStr)}`
      window.open(twitterUrl, "_blank", "width=600,height=400")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md !p-4 sm:!p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1 mb-3">
          <DialogTitle className="text-base sm:text-lg font-bold">공유하기</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-gray-600">
            친구들과 나의 예측 결과를 공유해보세요!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {/* 카카오톡 */}
          <Button
            onClick={handleKakaoShare}
            className="w-full h-10 sm:h-11 bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] font-semibold text-xs sm:text-sm gap-1.5 sm:gap-2 shadow-sm px-2 sm:px-3"
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>카카오톡으로 공유</span>
          </Button>

          {/* 인스타그램 */}
          <Button
            onClick={handleInstagramShare}
            className="w-full h-10 sm:h-11 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90 text-white font-semibold text-xs sm:text-sm gap-1.5 sm:gap-2 shadow-sm px-2 sm:px-3"
          >
            <Instagram className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>인스타그램으로 공유</span>
          </Button>

          {/* 트위터(X) */}
          <Button
            onClick={handleTwitterShare}
            className="w-full h-10 sm:h-11 bg-[#000000] hover:bg-[#1A1A1A] text-white font-semibold text-xs sm:text-sm gap-1.5 sm:gap-2 shadow-sm px-2 sm:px-3"
          >
            <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>X(트위터)로 공유</span>
          </Button>

          {/* 링크 복사 */}
          <Button
            onClick={handleCopyLink}
            className="w-full h-10 sm:h-11 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-xs sm:text-sm gap-1.5 sm:gap-2 shadow-sm px-2 sm:px-3"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-green-600" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>링크 복사</span>
              </>
            )}
          </Button>
        </div>

        {/* 공유 URL 표시 */}
        <div className="mt-2 p-2 sm:p-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">공유 링크</p>
          <p className="text-[10px] sm:text-xs text-gray-700 break-all font-mono leading-tight">{url}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

