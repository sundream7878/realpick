"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Search, Youtube, Mail } from "lucide-react"
import { Input } from "@/components/c-ui/input"

export function YoutubeDealerRecruit() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>유튜브 채널 분석 및 딜러 모집</CardTitle>
                    <CardDescription>유튜브 키워드 검색을 통해 연애/서바이벌 관련 채널을 찾고 딜러 모집 메일을 발송합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="검색 키워드 (예: 나는솔로 리뷰, 돌싱글즈 분석)" className="pl-8" />
                        </div>
                        <Button className="bg-red-600 hover:bg-red-700 gap-2 text-white">
                            <Youtube className="w-4 h-4" />
                            채널 수집 시작
                        </Button>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left">채널명</th>
                                    <th className="px-4 py-2 text-left">구독자</th>
                                    <th className="px-4 py-2 text-left">최근 업로드</th>
                                    <th className="px-4 py-2 text-left">상태</th>
                                    <th className="px-4 py-2 text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b last:border-0">
                                    <td className="px-4 py-3 font-medium">연애분석 TV</td>
                                    <td className="px-4 py-3">12.5만</td>
                                    <td className="px-4 py-3">2시간 전</td>
                                    <td className="px-4 py-3"><span className="text-blue-500">대기 중</span></td>
                                    <td className="px-4 py-3 text-right">
                                        <Button variant="ghost" size="sm" className="text-purple-600 gap-1">
                                            <Mail className="w-3 h-3" /> 제안 발송
                                        </Button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
