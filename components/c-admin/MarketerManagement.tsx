"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Badge } from "@/components/c-ui/badge"
import { YoutubeDealerRecruit } from "./marketer/YoutubeDealerRecruit"
import { FakeUserBotManage } from "./marketer/FakeUserBotManage"
import { AutoMissionGenerate } from "./marketer/AutoMissionGenerate"
import { CommunityViralManage } from "./marketer/CommunityViralManage"
import { NaverCafeCrawl } from "./marketer/NaverCafeCrawl"
import { InstagramViralManage } from "./marketer/InstagramViralManage"
import { LayoutDashboard, Users, Zap, Sparkles, Coffee, Instagram } from "lucide-react"

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
            <TabsTrigger value="instagram" className="gap-2">
              <Instagram className="w-4 h-4" />
              인스타그램 바이럴
            </TabsTrigger>
            <TabsTrigger value="bots" className="gap-2">
              <Users className="w-4 h-4" />
              가짜 유저 봇
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-2">
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

          <TabsContent value="instagram">
            <InstagramViralManage />
          </TabsContent>

          <TabsContent value="bots">
            <FakeUserBotManage />
          </TabsContent>

          <TabsContent value="community" className="space-y-6">
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  커뮤니티 바이럴 관리
                </CardTitle>
                <CardDescription>
                  디시인사이드, 네이버 카페 등 커뮤니티에 자동으로 바이럴 콘텐츠를 배포합니다.
                </CardDescription>
              </CardHeader>
            </Card>

            <Tabs defaultValue="general" className="space-y-4">
              <TabsList className="bg-white border">
                <TabsTrigger value="general" className="gap-2">
                  <Zap className="w-4 h-4" />
                  게시판형 커뮤니티
                </TabsTrigger>
                <TabsTrigger value="naver-cafe" className="gap-2">
                  <Coffee className="w-4 h-4" />
                  네이버 카페
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <Card className="mb-4 border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-2">지원 사이트:</p>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        <Badge variant="outline" className="justify-center">디시인사이드</Badge>
                        <Badge variant="outline" className="justify-center">에펨코리아</Badge>
                        <Badge variant="outline" className="justify-center">더쿠</Badge>
                        <Badge variant="outline" className="justify-center">루리웹</Badge>
                        <Badge variant="outline" className="justify-center">아카라이브</Badge>
                        <Badge variant="outline" className="justify-center">엠팍</Badge>
                        <Badge variant="outline" className="justify-center">뽐뿌</Badge>
                        <Badge variant="outline" className="justify-center">인벤</Badge>
                        <Badge variant="outline" className="justify-center">네이트판</Badge>
                        <Badge variant="outline" className="justify-center">클리앙</Badge>
                        <Badge variant="outline" className="justify-center">82쿡</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <CommunityViralManage />
              </TabsContent>

              <TabsContent value="naver-cafe">
                <NaverCafeCrawl />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
