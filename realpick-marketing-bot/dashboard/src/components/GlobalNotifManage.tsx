import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Bell, Send, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "../hooks/useToast"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"

export function GlobalNotifManage() {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [link, setLink] = useState("")
    const [isSending, setIsSending] = useState(false)
    const { toast } = useToast()

    const handleSend = async () => {
        if (!title.trim() || !content.trim()) {
            toast({ title: "?�력 ?�류", description: "?�목�??�용???�력?�주?�요.", variant: "destructive" })
            return
        }

        if (!confirm("모든 ?�용?�에�??�림??발송?�시겠습?�까?")) return

        setIsSending(true)
        try {
            const res = await fetch("/api/admin/marketer/global-notif", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, link })
            })
            const data = await res.json()
            
            if (data.success) {
                toast({ title: "발송 ?�공", description: data.message })
                setTitle("")
                setContent("")
                setLink("")
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast({ title: "발송 ?�패", description: error.message, variant: "destructive" })
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-yellow-500" />
                    ?�체 ?�용???�림 발송
                </CardTitle>
                <CardDescription>
                    모든 가???��??�게 ?�앱 ?�림??발송?�니?? (공�??�항, ?�벤????
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">?�림 ?�목</label>
                    <Input 
                        placeholder="?? [공�?] ?�로??미션???�데?�트?�었?�니??" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">?�림 ?�용</label>
                    <Textarea 
                        placeholder="?�림 ?�용???�력?�세??.." 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">?�동 링크 (?�택)</label>
                    <Input 
                        placeholder="?? /p-mission/abc-123" 
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
                    ?�체 ?�용?�에�?발송 ?�작
                </Button>
            </CardContent>
        </Card>
    )
}



