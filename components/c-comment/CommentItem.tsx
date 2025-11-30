import { useState } from "react"
import { TComment } from "@/types/t-vote/vote.types"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { Heart } from "lucide-react"
import { CommentInput } from "./CommentInput"
import { cn } from "@/lib/utils"
import { TIERS } from "@/lib/utils/u-tier-system/tierSystem.util"
import Image from "next/image"

interface CommentItemProps {
    comment: TComment
    currentUserId?: string
    onReply: (parentId: string, content: string) => Promise<void>
    onDelete: (commentId: string) => Promise<void>
    onLike: (commentId: string) => Promise<void>
}

export function CommentItem({
    comment,
    currentUserId,
    onReply,
    onDelete,
    onLike
}: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const isOwner = currentUserId === comment.userId
    const isDeleted = comment.isDeleted

    const handleReplySubmit = async (content: string) => {
        setIsSubmitting(true)
        try {
            await onReply(comment.id, content)
            setIsReplying(false)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (confirm("정말로 삭제하시겠습니까?")) {
            await onDelete(comment.id)
        }
    }

    // 티어 이미지 찾기
    const tierInfo = TIERS.find(t => t.name === comment.userTier)
    const tierImage = tierInfo?.characterImage || "/tier-rookie.png"

    return (
        <div className={cn("group w-full", comment.parentId ? "pl-10 mt-3" : "mt-4")}>
            <div className="flex items-start gap-3">
                {/* 아바타 (티어 캐릭터 이미지) */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gray-50 border border-gray-100 relative">
                    <Image
                        src={tierImage}
                        alt={comment.userTier}
                        fill
                        className="object-cover"
                    />
                </div>

                {/* 내용 영역 */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div className="text-sm leading-relaxed break-words pr-2">
                            <span className="font-bold text-gray-900 mr-2">
                                {comment.userNickname}
                            </span>
                            <span className={cn("text-gray-800", isDeleted && "text-gray-400 italic")}>
                                {comment.content}
                            </span>
                        </div>

                        {/* 좋아요 버튼 (우측 끝) */}
                        {!isDeleted && (
                            <button
                                onClick={() => onLike(comment.id)}
                                className="flex-shrink-0 pt-0.5 pl-2"
                            >
                                <Heart
                                    className={cn(
                                        "w-4 h-4 transition-all active:scale-75",
                                        comment.isLiked ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-gray-600"
                                    )}
                                />
                            </button>
                        )}
                    </div>

                    {/* 하단 메타 정보 (시간, 좋아요 수, 답글 달기, 삭제) */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                        <span>
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false, locale: ko }).replace("약 ", "")}
                        </span>

                        {comment.likesCount > 0 && (
                            <span className="font-semibold text-gray-900">좋아요 {comment.likesCount}개</span>
                        )}

                        {!isDeleted && (
                            <>
                                <button
                                    onClick={() => setIsReplying(!isReplying)}
                                    className="hover:text-gray-900 transition-colors"
                                >
                                    답글 달기
                                </button>

                                {isOwner && (
                                    <button
                                        onClick={handleDelete}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        삭제
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* 답글 입력창 */}
                    {isReplying && (
                        <div className="mt-3">
                            <CommentInput
                                onSubmit={handleReplySubmit}
                                placeholder={`@${comment.userNickname}님에게 답글...`}
                                buttonLabel="게시"
                                isLoading={isSubmitting}
                                autoFocus
                                onCancel={() => setIsReplying(false)}
                                variant="reply"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 대댓글 리스트 (재귀) */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-1">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            currentUserId={currentUserId}
                            onReply={onReply}
                            onDelete={onDelete}
                            onLike={onLike}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
