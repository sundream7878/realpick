"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Input } from "@/components/c-ui/input"
import { Lock, Unlock, KeyRound } from "lucide-react"
import { useToast } from "@/hooks/h-toast/useToast.hook"

interface AdminLockScreenProps {
    onUnlock: () => void
}

export function AdminLockScreen({ onUnlock }: AdminLockScreenProps) {
    const { toast } = useToast()
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSettingMode, setIsSettingMode] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState("")

    const handleVerify = async () => {
        if (!password) return

        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            })
            const data = await res.json()

            if (data.status === "success") {
                onUnlock()
                toast({ title: "인증 성공", description: "관리자 페이지에 접근합니다." })
            } else if (data.status === "not_set") {
                setIsSettingMode(true)
                toast({ title: "비밀번호 설정 필요", description: "관리자 비밀번호를 설정해주세요." })
            } else {
                toast({ title: "인증 실패", description: "비밀번호가 올바르지 않습니다.", variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "오류 발생", description: "인증 중 오류가 발생했습니다.", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSetPassword = async () => {
        if (!password || password !== confirmPassword) {
            toast({ title: "비밀번호 불일치", description: "비밀번호가 일치하지 않습니다.", variant: "destructive" })
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch("/api/admin/auth/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword: password }),
            })

            if (res.ok) {
                toast({ title: "설정 완료", description: "비밀번호가 설정되었습니다." })
                onUnlock()
            } else {
                throw new Error("Failed to set password")
            }
        } catch (error) {
            toast({ title: "오류 발생", description: "비밀번호 설정 중 오류가 발생했습니다.", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto bg-gray-100 p-3 rounded-full w-fit mb-2">
                        {isSettingMode ? <KeyRound className="w-6 h-6 text-purple-600" /> : <Lock className="w-6 h-6 text-gray-600" />}
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {isSettingMode ? "관리자 비밀번호 설정" : "관리자 접근 제한"}
                    </CardTitle>
                    <CardDescription>
                        {isSettingMode
                            ? "새로운 관리자 비밀번호를 설정해주세요."
                            : "관리자 페이지에 접근하려면 비밀번호를 입력하세요."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder={isSettingMode ? "새 비밀번호" : "비밀번호 입력"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (isSettingMode ? null : handleVerify())}
                        />
                        {isSettingMode && (
                            <Input
                                type="password"
                                placeholder="비밀번호 확인"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        )}
                    </div>
                    <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={isSettingMode ? handleSetPassword : handleVerify}
                        disabled={isLoading}
                    >
                        {isLoading ? "처리 중..." : (isSettingMode ? "비밀번호 설정" : "잠금 해제")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
