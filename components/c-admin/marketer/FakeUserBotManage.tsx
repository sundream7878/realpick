"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Users, UserPlus, Play, Square } from "lucide-react"

export function FakeUserBotManage() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">활성 봇 수</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,240</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">오늘의 활동</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">8,420건</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">상태</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">운영 중</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>봇 설정 및 실행</CardTitle>
                    <CardDescription>가짜 유저 봇의 활동 주기와 투표 성향을 설정합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                            <Play className="w-4 h-4" />
                            전체 봇 가동
                        </Button>
                        <Button variant="outline" className="text-red-500 hover:text-red-600 gap-2">
                            <Square className="w-4 h-4" />
                            가동 중지
                        </Button>
                        <Button variant="secondary" className="gap-2">
                            <UserPlus className="w-4 h-4" />
                            새로운 봇 생성
                        </Button>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg border text-sm text-gray-600">
                        <p>💡 봇들은 현재 <strong>실시간 인기 미션</strong>에 우선적으로 참여하도록 설정되어 있습니다.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
