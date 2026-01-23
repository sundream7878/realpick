"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Share2, MessageSquare, TrendingUp } from "lucide-react"

export function CommunityViralManage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>커뮤니티 바이럴 및 홍보 관리</CardTitle>
                    <CardDescription>주요 커뮤니티(디시인사이드, 에펨코리아, 더쿠 등)에 미션을 홍보하고 반응을 추적합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg bg-orange-50/50">
                            <TrendingUp className="w-5 h-5 text-orange-500 mb-2" />
                            <h3 className="font-bold text-sm">실시간 트렌드</h3>
                            <p className="text-xs text-gray-500 mt-1">디시 나는솔로 갤러리 북적이는 중</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-blue-50/50">
                            <MessageSquare className="w-5 h-5 text-blue-500 mb-2" />
                            <h3 className="font-bold text-sm">홍보 게시물</h3>
                            <p className="text-xs text-gray-500 mt-1">오늘 총 12건의 게시물 등록됨</p>
                        </div>
                        <div className="p-4 border rounded-lg bg-green-50/50">
                            <Share2 className="w-5 h-5 text-green-500 mb-2" />
                            <h3 className="font-bold text-sm">유입 효율</h3>
                            <p className="text-xs text-gray-500 mt-1">전일 대비 외부 유입 15% 증가</p>
                        </div>
                    </div>

                    <Button className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 gap-2">
                        <Share2 className="w-4 h-4" />
                        바이럴 홍보 시나리오 실행
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
