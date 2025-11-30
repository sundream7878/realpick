import { TComment } from "@/types/t-vote/vote.types"
import { CommentItem } from "./CommentItem"

interface CommentListProps {
    comments: TComment[]
    currentUserId?: string
    onReply: (parentId: string, content: string) => Promise<void>
    onDelete: (commentId: string) => Promise<void>
    onLike: (commentId: string) => Promise<void>
}

export function CommentList({
    comments,
    currentUserId,
    onReply,
    onDelete,
    onLike
}: CommentListProps) {
    if (comments.length === 0) {
        return (
            <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p>아직 댓글이 없습니다.</p>
                <p className="text-sm mt-1">첫 번째 의견을 남겨보세요!</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {comments.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    onReply={onReply}
                    onDelete={onDelete}
                    onLike={onLike}
                />
            ))}
        </div>
    )
}
