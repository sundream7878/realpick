import { useState, useEffect } from "react"
import { getComments, createComment, createReply, deleteComment, deleteReply, toggleCommentLike, toggleReplyLike } from "@/lib/supabase/comments"
import { TComment } from "@/types/t-vote/vote.types"
import { CommentInput } from "./CommentInput"
import { CommentList } from "./CommentList"
import { useToast } from "@/hooks/h-toast/useToast.hook"

interface CommentSectionProps {
    missionId: string
    missionType: "mission1" | "mission2" // 미션 타입 구분
    currentUserId?: string
}

export function CommentSection({ missionId, missionType, currentUserId }: CommentSectionProps) {
    const [comments, setComments] = useState<TComment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    // 댓글 목록 불러오기
    const loadComments = async () => {
        // 로딩 상태는 처음에만 표시 (UX 개선)
        if (comments.length === 0) setIsLoading(true)

        const result = await getComments(missionId, currentUserId)
        if (result.success && result.comments) {
            setComments(result.comments)
        } else {
            console.error(result.error)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        loadComments()
    }, [missionId, currentUserId])

    // 댓글 작성 핸들러
    const handleAddComment = async (content: string) => {
        if (!currentUserId) {
            toast({
                title: "로그인 필요",
                description: "댓글을 작성하려면 로그인이 필요합니다.",
                variant: "destructive"
            })
            return
        }

        setIsSubmitting(true)
        const result = await createComment(missionId, missionType, currentUserId, content)

        if (result.success && result.comment) {
            // 즉시 UI 업데이트 (목록 끝에 추가)
            setComments(prev => [...prev, result.comment!])
        } else {
            toast({
                title: "등록 실패",
                description: result.error || "댓글 등록 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
        setIsSubmitting(false)
    }

    // 답글 작성 핸들러
    const handleReply = async (targetId: string, content: string) => {
        if (!currentUserId) {
            toast({
                title: "로그인 필요",
                description: "답글을 작성하려면 로그인이 필요합니다.",
                variant: "destructive"
            })
            return
        }

        // 타겟 댓글 찾기 (재귀 탐색)
        const findComment = (list: TComment[], id: string): TComment | null => {
            for (const c of list) {
                if (c.id === id) return c
                if (c.replies) {
                    const found = findComment(c.replies, id)
                    if (found) return found
                }
            }
            return null
        }

        const targetComment = findComment(comments, targetId)
        if (!targetComment) return

        // 부모 ID 결정 (타겟이 대댓글이면 그 부모가 부모, 아니면 타겟이 부모)
        const parentId = targetComment.parentId || targetComment.id

        // 대댓글 작성 요청
        // 주의: createReply는 'commentId'(부모)를 받음
        const result = await createReply(parentId, currentUserId, content)

        if (result.success && result.reply) {
            // 즉시 UI 업데이트
            setComments(prev => {
                const updateTree = (list: TComment[]): TComment[] => {
                    return list.map(c => {
                        if (c.id === parentId) {
                            return {
                                ...c,
                                replies: [...(c.replies || []), result.reply!],
                                repliesCount: (c.repliesCount || 0) + 1
                            }
                        }
                        if (c.replies && c.replies.length > 0) {
                            return { ...c, replies: updateTree(c.replies) }
                        }
                        return c
                    })
                }
                return updateTree(prev)
            })
        } else {
            toast({
                title: "등록 실패",
                description: result.error || "답글 등록 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    // 댓글 삭제 핸들러
    const handleDelete = async (commentId: string) => {
        if (!currentUserId) return

        // 타겟 찾기
        const findComment = (list: TComment[], id: string): TComment | null => {
            for (const c of list) {
                if (c.id === id) return c
                if (c.replies) {
                    const found = findComment(c.replies, id)
                    if (found) return found
                }
            }
            return null
        }
        const target = findComment(comments, commentId)
        if (!target) return

        // UI 업데이트
        setComments(prev => {
            const deleteNode = (list: TComment[]): TComment[] => {
                return list.filter(c => {
                    if (c.id === commentId) {
                        if (c.replies && c.replies.length > 0) {
                            c.isDeleted = true
                            c.content = "삭제된 댓글입니다."
                            return true
                        } else {
                            return false
                        }
                    }
                    if (c.replies && c.replies.length > 0) {
                        c.replies = deleteNode(c.replies)
                    }
                    return true
                })
            }
            return deleteNode([...prev])
        })

        // 서버 요청
        const isReply = !!target.parentId
        const result = isReply
            ? await deleteReply(commentId, currentUserId)
            : await deleteComment(commentId, currentUserId)

        if (!result.success) {
            await loadComments()
            toast({
                title: "삭제 실패",
                description: result.error || "삭제 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    // 좋아요 토글 핸들러
    const handleLike = async (commentId: string) => {
        if (!currentUserId) {
            toast({
                title: "로그인 필요",
                description: "좋아요를 누르려면 로그인이 필요합니다.",
                variant: "destructive"
            })
            return
        }

        // 타겟 찾기
        const findComment = (list: TComment[], id: string): TComment | null => {
            for (const c of list) {
                if (c.id === id) return c
                if (c.replies) {
                    const found = findComment(c.replies, id)
                    if (found) return found
                }
            }
            return null
        }
        const target = findComment(comments, commentId)
        if (!target) return

        // UI 업데이트
        setComments(prevComments => {
            const updateTree = (list: TComment[]): TComment[] => {
                return list.map(c => {
                    if (c.id === commentId) {
                        const newIsLiked = !c.isLiked
                        return {
                            ...c,
                            isLiked: newIsLiked,
                            likesCount: newIsLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1)
                        }
                    }
                    if (c.replies && c.replies.length > 0) {
                        return { ...c, replies: updateTree(c.replies) }
                    }
                    return c
                })
            }
            return updateTree(prevComments)
        })

        // 서버 요청
        const isReply = !!target.parentId
        const result = isReply
            ? await toggleReplyLike(commentId, currentUserId)
            : await toggleCommentLike(commentId, currentUserId)

        if (!result.success) {
            await loadComments()
            toast({
                title: "오류 발생",
                description: "좋아요 처리에 실패했습니다.",
                variant: "destructive"
            })
        }
    }

    return (
        <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-base font-bold text-gray-900">
                    댓글 <span className="text-gray-500 font-normal">{comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0) + (c.replies?.reduce((rAcc, r) => rAcc + (r.replies?.length || 0), 0) || 0), 0)}</span>
                </h3>
            </div>

            {/* 댓글 목록 */}
            <div className="mb-4 min-h-[100px]">
                {isLoading ? (
                    <div className="space-y-4 py-2">
                        {[1, 2].map(i => (
                            <div key={i} className="animate-pulse flex gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <CommentList
                        comments={comments}
                        currentUserId={currentUserId}
                        onReply={handleReply}
                        onDelete={handleDelete}
                        onLike={handleLike}
                    />
                )}
            </div>

            {/* 댓글 입력창 (하단 고정 느낌으로 배치하거나 목록 바로 아래) */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-2 pb-4 border-t border-gray-50 -mx-4 px-4 md:static md:bg-transparent md:border-none md:p-0 md:mx-0">
                <CommentInput
                    onSubmit={handleAddComment}
                    isLoading={isSubmitting}
                    placeholder={currentUserId ? "댓글 달기..." : "로그인 후 댓글을 남길 수 있습니다."}
                />
            </div>
        </div>
    )
}
