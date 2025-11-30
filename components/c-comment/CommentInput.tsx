import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface CommentInputProps {
    onSubmit: (content: string) => Promise<void>
    placeholder?: string
    buttonLabel?: string
    isLoading?: boolean
    autoFocus?: boolean
    onCancel?: () => void
    variant?: "default" | "reply"
}

export function CommentInput({
    onSubmit,
    placeholder = "댓글 달기...",
    buttonLabel = "게시",
    isLoading = false,
    autoFocus = false,
    onCancel,
    variant = "default"
}: CommentInputProps) {
    const [content, setContent] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // 자동 높이 조절
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [content])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim() || isLoading) return

        await onSubmit(content)
        setContent("")
        if (textareaRef.current) textareaRef.current.style.height = "auto"
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    return (
        <form onSubmit={handleSubmit} className={cn("relative flex items-center gap-2", variant === "reply" ? "py-1" : "py-3 border-t border-gray-100")}>
            {/* 아바타 자리 (선택 사항) */}
            {/* <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" /> */}

            <div className="flex-1 relative">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={1}
                    className={cn(
                        "w-full resize-none bg-transparent focus:outline-none text-sm placeholder-gray-400 py-2",
                        "max-h-24 overflow-y-auto"
                    )}
                    autoFocus={autoFocus}
                    disabled={isLoading}
                />
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600 px-2"
                    >
                        취소
                    </button>
                )}
                <button
                    type="submit"
                    disabled={!content.trim() || isLoading}
                    className={cn(
                        "text-sm font-semibold transition-colors px-2",
                        !content.trim() || isLoading ? "text-blue-300 cursor-not-allowed" : "text-blue-500 hover:text-blue-700"
                    )}
                >
                    {isLoading ? "..." : buttonLabel}
                </button>
            </div>
        </form>
    )
}
