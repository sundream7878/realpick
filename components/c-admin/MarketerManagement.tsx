"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { YoutubeDealerRecruit } from "./marketer/YoutubeDealerRecruit"
import { FakeUserBotManage } from "./marketer/FakeUserBotManage"
import { AutoMissionGenerate } from "./marketer/AutoMissionGenerate"
import { CommunityViralManage } from "./marketer/CommunityViralManage"
import { LayoutDashboard, Users, Zap, Share2 } from "lucide-react"

export function MarketerManagement() {
    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    🚀 리얼픽 마케터
                </CardTitle>
                <CardDescription>
                    자동화된 마케팅 툴과 봇을 관리합니다.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <Tabs defaultValue="bots" className="space-y-6">
                    <TabsList className="bg-gray-100/80 p-1">
                        <TabsTrigger value="bots" className="gap-2">
                            <Users className="w-4 h-4" />
                            가짜 유저 봇
                        </TabsTrigger>
                        <TabsTrigger value="youtube" className="gap-2">
                            <LayoutDashboard className="w-4 h-4" />
                            유튜브 딜러 모집
                        </TabsTrigger>
                        <TabsTrigger value="auto-mission" className="gap-2">
                            <Zap className="w-4 h-4" />
                            자동 미션 생성
                        </TabsTrigger>
                        <TabsTrigger value="viral" className="gap-2">
                            <Share2 className="w-4 h-4" />
                            커뮤니티 바이럴
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="bots">
                        <FakeUserBotManage />
                    </TabsContent>

                    <TabsContent value="youtube">
                        <YoutubeDealerRecruit />
                    </TabsContent>

                    <TabsContent value="auto-mission">
                        <AutoMissionGenerate />
                    </TabsContent>

                    <TabsContent value="viral">
                        <CommunityViralManage />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
