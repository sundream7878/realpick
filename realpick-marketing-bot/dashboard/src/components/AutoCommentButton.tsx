import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Loader2, CheckCircle2, XCircle, Send } from "lucide-react"
import { useToast } from "../hooks/useToast"

type CommentStatus = null | "posting" | "posted" | "failed"

interface Props {
  post: ViralPost
  collectionType: "board" | "cafe"
  initialStatus?: CommentStatus
}

const base = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  ? 'http://localhost:3001'
  : ''

export function AutoCommentButton({ post, collectionType, initialStatus }: Props) {
  const [status, setStatus] = useState<CommentStatus>(initialStatus ?? (post as any).commentStatus ?? null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const { toast } = useToast()

  // 등록 중일 때 1초마다 상태 폴링
  useEffect(() => {
    if (status !== 'posting') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${base}/api/auto-comment/${post.id}?collectionType=${collectionType}`
        )
        const data = await res.json()
        if (data.commentStatus === 'posted') {
          setStatus('posted')
          clearInterval(interval)
          toast({ title: "댓글 등록 완료", description: "게시글에 댓글이 달렸습니다." })
        } else if (data.commentStatus === 'failed') {
          setStatus('failed')
          setErrorMsg(data.commentError || '오류 발생')
          clearInterval(interval)
          toast({
            title: "댓글 등록 실패",
            description: data.commentError || '오류가 발생했습니다.',
            variant: "destructive"
          })
        }
      } catch (_) {}
    }, 1500)
    return () => clearInterval(interval)
  }, [status, post.id, collectionType])

  const handleClick = async () => {
    if (status === 'posting' || status === 'posted') return

    setStatus('posting')
    setErrorMsg('')

    try {
      const res = await fetch(`${base}/api/auto-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          postId: post.id, 
          collectionType
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setStatus('failed')
        setErrorMsg(data.error || '요청 실패')
        toast({
          title: "댓글 등록 실패",
          description: data.error || '요청 중 오류가 발생했습니다.',
          variant: "destructive"
        })
      }
      // success면 polling이 이어서 처리
    } catch (e: any) {
      setStatus('failed')
      setErrorMsg(e.message)
    }
  }

  if (status === 'posted') {
    return (
      <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium px-3 py-2">
        <CheckCircle2 className="w-4 h-4" />
        댓글 등록됨
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col gap-1">
        <Button
          size="default"
          variant="outline"
          className="gap-2 border-red-200 text-red-600 hover:bg-red-50 h-10 px-3"
          onClick={handleClick}
        >
          <XCircle className="w-4 h-4" />
          재시도
        </Button>
        {errorMsg && (
          <span className="text-xs text-red-500 max-w-[140px] break-words">{errorMsg}</span>
        )}
      </div>
    )
  }

  if (status === 'posting') {
    return (
      <Button
        size="default"
        disabled
        className="gap-2 bg-orange-100 text-orange-700 h-10 px-3 cursor-not-allowed"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        등록 중...
      </Button>
    )
  }

  return (
    <Button
      size="default"
      className="gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white h-10 px-3"
      onClick={handleClick}
    >
      <Send className="w-4 h-4" />
      자동 댓글 달기
    </Button>
  )
}
