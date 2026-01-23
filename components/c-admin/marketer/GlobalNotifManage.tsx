"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Bell, Send, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { Input } from "@/components/c-ui/input"
import { Textarea } from "@/components/c-ui/textarea"

export function GlobalNotifManage() {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [link, setLink] = useState("")
    const [isSending, setIsSending] = useState(false)
    const { toast } = useToast()

    const handleSend = async () => {
        if (!title.trim() || !content.trim()) {
            toast({ title: "입력 오류", description: "제목과 내용을 입력해주세요.", variant: "destructive" })
            return
        }

        if (!confirm("모든 사용자에게 알림을 발송하시겠습니까?")) return

        setIsSending(true)
        try {
            const res = await fetch("/api/admin/marketer/global-notif", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, link })
            })
            const data = await res.json()
            
            if (data.success) {
                toast({ title: "발송 성공", description: data.message })
                setTitle("")
                setContent("")
                setLink("")
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast({ title: "발송 실패", description: error.message, variant: "destructive" })
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-yellow-500" />
                    전체 사용자 알림 발송
                </CardTitle>
                <CardDescription>
                    모든 가입 유저에게 인앱 알림을 발송합니다. (공지사항, 이벤트 등)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">알림 제목</label>
                    <Input 
                        placeholder="예: [공지] 새로운 미션이 업데이트되었습니다!" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">알림 내용</label>
                    <Textarea 
                        placeholder="알림 내용을 입력하세요..." 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">이동 링크 (선택)</label>
                    <Input 
                        placeholder="예: /p-mission/abc-123" 
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                    />
                </div>
                <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                    onClick={handleSend}
                    disabled={isSending}
                >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    전체 사용자에게 발송 시작
                </Button>
            </CardContent>
        </Card>
    )
}
