"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Card, CardContent } from "@/components/c-ui/card"
import { YoutubeDealerRecruit } from "./marketer/YoutubeDealerRecruit"
import { FakeUserBotManage } from "./marketer/FakeUserBotManage"
import { LayoutDashboard, Users } from "lucide-react"

export function MarketerManagement() {
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="px-0 pt-0">
        <Tabs defaultValue="youtube" className="space-y-6">
          <TabsList className="bg-gray-100/80 p-1 flex-wrap h-auto">
            <TabsTrigger value="youtube" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              유튜브 딜러 모집
            </TabsTrigger>
            <TabsTrigger value="bots" className="gap-2">
              <Users className="w-4 h-4" />
              가짜 유저 봇
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <YoutubeDealerRecruit />
          </TabsContent>

          <TabsContent value="bots">
            <FakeUserBotManage />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
