"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { YoutubeDealerRecruit } from "./marketer/YoutubeDealerRecruit"
import { FakeUserBotManage } from "./marketer/FakeUserBotManage"
import { AutoMissionGenerate } from "./marketer/AutoMissionGenerate"
import { CommunityViralManage } from "./marketer/CommunityViralManage"
import { LayoutDashboard, Users, Zap, Sparkles } from "lucide-react"

export function MarketerManagement() {
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="px-0 pt-0">
        <Tabs defaultValue="auto" className="space-y-6">
          <TabsList className="bg-gray-100/80 p-1 flex-wrap h-auto">
            <TabsTrigger value="auto" className="gap-2">
              <Sparkles className="w-4 h-4" />
              완전 자동 미션 생성
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              유튜브 딜러 모집
            </TabsTrigger>
            <TabsTrigger value="bots" className="gap-2">
              <Users className="w-4 h-4" />
              가짜 유저 봇
            </TabsTrigger>
            <TabsTrigger value="viral" className="gap-2">
              <Zap className="w-4 h-4" />
              커뮤니티 바이럴
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto">
            <AutoMissionGenerate />
          </TabsContent>

          <TabsContent value="youtube">
            <YoutubeDealerRecruit />
          </TabsContent>

          <TabsContent value="bots">
            <FakeUserBotManage />
          </TabsContent>

          <TabsContent value="viral">
            <CommunityViralManage />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
