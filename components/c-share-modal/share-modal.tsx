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
import { Link2, MessageCircle, Facebook, Twitter, Check } from "lucide-react"
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

  // 링크 복사
  const handleCopyLink = async () => {
    try {
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

  // 카카오톡 공유
  const handleKakaoShare = () => {
    if (typeof window !== "undefined" && (window as any).Kakao) {
      const kakao = (window as any).Kakao
      
      if (!kakao.isInitialized()) {
        // 카카오 SDK가 초기화되지 않은 경우
        toast({
          title: "카카오톡 공유 준비 중",
          description: "잠시 후 다시 시도해주세요.",
        })
        return
      }

      try {
        kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: title,
            description: description,
            imageUrl: "https://your-domain.com/og-image.png", // OG 이미지 URL로 변경
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
          buttons: [
            {
              title: "결과 보기",
              link: {
                mobileWebUrl: url,
                webUrl: url,
              },
            },
          ],
        })
      } catch (error) {
        console.error("카카오톡 공유 오류:", error)
        toast({
          title: "공유 실패",
          description: "카카오톡 공유에 실패했습니다.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "카카오톡을 사용할 수 없습니다",
        description: "카카오톡 공유 기능이 준비되지 않았습니다.",
        variant: "destructive",
      })
    }
  }

  // 페이스북 공유
  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    window.open(facebookUrl, "_blank", "width=600,height=400")
  }

  // 트위터(X) 공유
  const handleTwitterShare = () => {
    const text = `${title}\n${description}`
    const hashtagsStr = hashtags.join(",")
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtagsStr)}`
    window.open(twitterUrl, "_blank", "width=600,height=400")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">공유하기</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            친구들과 나의 예측 결과를 공유해보세요!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* 카카오톡 */}
          <Button
            onClick={handleKakaoShare}
            className="w-full h-14 bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] font-semibold text-base gap-3 shadow-sm"
            variant="outline"
          >
            <MessageCircle className="w-5 h-5" />
            카카오톡으로 공유
          </Button>

          {/* 페이스북 */}
          <Button
            onClick={handleFacebookShare}
            className="w-full h-14 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold text-base gap-3 shadow-sm"
            variant="outline"
          >
            <Facebook className="w-5 h-5" />
            페이스북으로 공유
          </Button>

          {/* 트위터(X) */}
          <Button
            onClick={handleTwitterShare}
            className="w-full h-14 bg-[#000000] hover:bg-[#1A1A1A] text-white font-semibold text-base gap-3 shadow-sm"
            variant="outline"
          >
            <Twitter className="w-5 h-5" />
            X(트위터)로 공유
          </Button>

          {/* 링크 복사 */}
          <Button
            onClick={handleCopyLink}
            className="w-full h-14 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold text-base gap-3 shadow-sm"
            variant="outline"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-green-600" />
                복사 완료!
              </>
            ) : (
              <>
                <Link2 className="w-5 h-5" />
                링크 복사
              </>
            )}
          </Button>
        </div>

        {/* 공유 URL 표시 */}
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">공유 링크</p>
          <p className="text-sm text-gray-700 truncate font-mono">{url}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

