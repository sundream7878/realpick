"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Zap, Settings, RefreshCw } from "lucide-react"

export function AutoMissionGenerate() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI 자동 미션 생성 설정</CardTitle>
                    <CardDescription>방송 다시보기 및 뉴스 데이터를 분석하여 자동으로 미션을 생성합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg space-y-2">
                            <h3 className="font-bold flex items-center gap-2">
                                <Settings className="w-4 h-4 text-purple-600" />
                                생성 빈도
                            </h3>
                            <p className="text-sm text-gray-500">각 프로그램별 에피소드 방영 후 1시간 내 생성</p>
                        </div>
                        <div className="p-4 border rounded-lg space-y-2">
                            <h3 className="font-bold flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                주요 소스
                            </h3>
                            <p className="text-sm text-gray-500">유튜브 쇼츠 댓글, 네이버 TV 톡, 커뮤니티 반응</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                            <RefreshCw className="w-4 h-4" />
                            즉시 분석 및 생성 실행
                        </Button>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
                        <p>📢 현재 **'나는솔로 23기'** 관련 미션이 가장 활발하게 생성되고 있습니다.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
