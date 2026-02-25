import { useState, useEffect } from "react"
import { getComments, createComment, createReply, deleteComment, deleteReply, toggleCommentLike } from "@/lib/firebase/comments"
import { getUser } from "@/lib/firebase/users"
import { TComment } from "@/types/t-vote/vote.types"
import { CommentInput } from "./CommentInput"
import { CommentList } from "./CommentList"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { getUserId, getAnonNickname, isAuthenticated } from "@/lib/auth-utils"

interface CommentSectionProps {
    missionId: string
    missionType: "mission1" | "mission2" // 미션 타입 구분
    currentUserId?: string
}

export function CommentSection({ missionId, missionType, currentUserId: propUserId }: CommentSectionProps) {
    const [comments, setComments] = useState<TComment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [currentUserInfo, setCurrentUserInfo] = useState<{ nickname: string; tier: string } | null>(null)
    const { toast } = useToast()

    // 실제 사용할 유저 ID (로그인 안된 경우 익명 ID)
    const currentUserId = propUserId || getUserId() || "anon"

    // 사용자 정보 불러오기
    useEffect(() => {
        const fetchUserInfo = async () => {
            if (isAuthenticated() && propUserId) {
                const user = await getUser(propUserId)
                if (user) {
                    setCurrentUserInfo({
                        nickname: user.nickname,
                        tier: user.tier
                    })
                }
            } else {
                // 익명 사용자 정보 설정
                setCurrentUserInfo({
                    nickname: getAnonNickname(),
                    tier: "새내기" // 기본 티어
                })
            }
        }
        fetchUserInfo()
    }, [propUserId])

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
        if (!currentUserId || !currentUserInfo) {
            toast({
                title: "오류",
                description: "사용자 정보를 확인할 수 없습니다.",
                variant: "destructive"
            })
            return
        }

        setIsSubmitting(true)
        const result = await createComment(
            missionId, 
            missionType, 
            currentUserId, 
            currentUserInfo.nickname, 
            currentUserInfo.tier, 
            content
        )

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
        if (!currentUserId || !currentUserInfo) {
            toast({
                title: "오류",
                description: "사용자 정보를 확인할 수 없습니다.",
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
        const result = await createReply(
            parentId, 
            currentUserId, 
            currentUserInfo.nickname, 
            currentUserInfo.tier, 
            content,
            missionId,
            missionType
        )

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

        // 서버 요청 (Firebase에서는 replies도 comments와 같은 레벨일 수 있지만 여기서는 commentId만)
        const result = await deleteComment(commentId, currentUserId)

        if (result.success) {
            // UI 업데이트
            setComments(prev => {
                const deleteNode = (list: TComment[]): TComment[] => {
                    return list.map(c => {
                        if (c.id === commentId) {
                            return { ...c, isDeleted: true, content: "삭제된 댓글입니다." }
                        }
                        if (c.replies && c.replies.length > 0) {
                            return { ...c, replies: deleteNode(c.replies) }
                        }
                        return c
                    })
                }
                return deleteNode([...prev])
            })
        } else {
            toast({
                title: "삭제 실패",
                description: result.error || "삭제 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    // 좋아요 토글 핸들러
    const handleLike = async (commentId: string) => {
        if (!currentUserId) return

        // 서버 요청
        const result = await toggleCommentLike(commentId, currentUserId)

        if (result.success) {
            // UI 업데이트
            setComments(prevComments => {
                const updateTree = (list: TComment[]): TComment[] => {
                    return list.map(c => {
                        if (c.id === commentId) {
                            return {
                                ...c,
                                isLiked: result.isLiked!,
                                likesCount: result.likesCount!
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
        } else {
            toast({
                title: "오류 발생",
                description: "좋아요 처리에 실패했습니다.",
                variant: "destructive"
            })
        }
    }

    // 댓글 정렬: 베스트 댓글(좋아요 3개 이상)을 맨 위로, 나머지는 최신순
    const sortedComments = [...comments].sort((a, b) => {
        const aIsBest = !a.isDeleted && a.likesCount >= 3
        const bIsBest = !b.isDeleted && b.likesCount >= 3
        
        // 둘 다 베스트면 좋아요 수로 정렬
        if (aIsBest && bIsBest) {
            return b.likesCount - a.likesCount
        }
        
        // 하나만 베스트면 베스트를 위로
        if (aIsBest) return -1
        if (bIsBest) return 1
        
        // 둘 다 일반 댓글이면 최신순
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const totalCommentCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0) + (c.replies?.reduce((rAcc, r) => rAcc + (r.replies?.length || 0), 0) || 0), 0)

    return (
        <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-lg font-bold text-gray-900">
                    댓글 달기 <span className="text-gray-500 font-normal">({totalCommentCount})</span>
                </h3>
            </div>

            {/* 댓글 입력창 (최상단) */}
            <div className="mb-6">
                <CommentInput
                    onSubmit={handleAddComment}
                    isLoading={isSubmitting}
                    placeholder="내용을 입력해주세요."
                />
            </div>

            {/* 댓글 목록 */}
            <div className="min-h-[100px]">
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
                ) : sortedComments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        첫 댓글을 남겨보세요!
                    </div>
                ) : (
                    <CommentList
                        comments={sortedComments}
                        currentUserId={currentUserId}
                        onReply={handleReply}
                        onDelete={handleDelete}
                        onLike={handleLike}
                    />
                )}
            </div>
        </div>
    )
}
