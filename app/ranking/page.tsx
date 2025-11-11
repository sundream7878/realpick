"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Star, TrendingUp, Crown, Medal, Award } from "lucide-react"
import Link from "next/link"
import BottomNavigation from "@/components/bottom-navigation"

export default function RankingPage() {
  const [activeTab, setActiveTab] = useState("points")
  const [selectedShow, setSelectedShow] = useState<"나는솔로" | "돌싱글즈">("나는솔로")
  const userPoints = 1250

  // Mock ranking data
  const pointsRanking = [
    {
      rank: 1,
      name: "예능킹",
      points: 45230,
      level: 28,
      avatar: "/user-avatar.jpg",
      badge: "👑",
      isCurrentUser: false,
    },
    {
      rank: 2,
      name: "리얼마스터",
      points: 42150,
      level: 26,
      avatar: "/user-avatar.jpg",
      badge: "🥈",
      isCurrentUser: false,
    },
    {
      rank: 3,
      name: "솔로지옥전문가",
      points: 38920,
      level: 25,
      avatar: "/user-avatar.jpg",
      badge: "🥉",
      isCurrentUser: false,
    },
    {
      rank: 234,
      name: "김리얼",
      points: 12450,
      level: 15,
      avatar: "/user-avatar.jpg",
      badge: "",
      isCurrentUser: true,
    },
  ]

  const accuracyRanking = [
    {
      rank: 1,
      name: "예측신",
      accuracy: 94.2,
      totalVotes: 127,
      avatar: "/user-avatar.jpg",
      isCurrentUser: false,
    },
    {
      rank: 2,
      name: "미래예언자",
      accuracy: 91.8,
      totalVotes: 203,
      avatar: "/user-avatar.jpg",
      isCurrentUser: false,
    },
    {
      rank: 3,
      name: "정답머신",
      accuracy: 89.5,
      totalVotes: 156,
      avatar: "/user-avatar.jpg",
      isCurrentUser: false,
    },
    {
      rank: 45,
      name: "김리얼",
      accuracy: 70.1,
      totalVotes: 127,
      avatar: "/user-avatar.jpg",
      isCurrentUser: true,
    },
  ]

  const weeklyRanking = [
    {
      rank: 1,
      name: "이번주왕",
      weeklyPoints: 2340,
      change: "+5",
      avatar: "/user-avatar.jpg",
      isCurrentUser: false,
    },
    {
      rank: 2,
      name: "주간마스터",
      weeklyPoints: 2180,
      change: "-1",
      avatar: "/user-avatar.jpg",
      isCurrentUser: false,
    },
    {
      rank: 3,
      name: "위클리킹",
      weeklyPoints: 1950,
      change: "+12",
      avatar: "/user-avatar.jpg",
      isCurrentUser: false,
    },
    {
      rank: 67,
      name: "김리얼",
      weeklyPoints: 450,
      change: "+23",
      avatar: "/user-avatar.jpg",
      isCurrentUser: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-gray-200 h-16">
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full gap-2">
            <Link href="/" className="flex-shrink-0">
              <img
                src="/realpick-logo.png"
                alt="RealPick"
                className="w-auto h-10 md:h-12 cursor-pointer hover:opacity-80 transition-opacity"
              />
            </Link>

            <div className="flex items-center gap-2 md:gap-4 text-xs md:text-base flex-shrink-0">
              <button
                className={`font-semibold transition-colors ${
                  selectedShow === "나는솔로"
                    ? "text-pink-600 hover:text-pink-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setSelectedShow("나는솔로")}
              >
                나는솔로
              </button>
              <div className="w-px h-4 md:h-6 bg-gray-300"></div>
              <button
                className={`font-semibold transition-colors ${
                  selectedShow === "돌싱글즈"
                    ? "text-pink-600 hover:text-pink-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setSelectedShow("돌싱글즈")}
              >
                돌싱글즈
              </button>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900">Sundream</span>
                <span className="text-gray-400">|</span>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-gray-900">{userPoints.toLocaleString()}P</span>
              </div>
              <div className="md:hidden flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="font-medium">{(userPoints / 1000).toFixed(1)}K</span>
              </div>
              <Avatar className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 flex-shrink-0">
                <AvatarImage src="/placeholder.svg" alt="User" />
                <AvatarFallback>S</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 pb-20 md:pb-6">
        {/* Top 3 Podium */}
        <Card className="bg-gradient-to-r from-accent/10 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-end justify-center gap-4">
              {/* 2nd Place */}
              <div className="text-center">
                <div className="relative mb-2">
                  <Avatar className="w-16 h-16 mx-auto">
                    <AvatarImage src={pointsRanking[1].avatar || "/placeholder.svg"} />
                    <AvatarFallback>{pointsRanking[1].name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                    <Medal className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium">{pointsRanking[1].name}</p>
                <p className="text-xs text-muted-foreground">{pointsRanking[1].points.toLocaleString()}P</p>
                <div className="w-12 h-16 bg-muted/50 rounded-t-lg mx-auto mt-2 flex items-end justify-center pb-2">
                  <span className="text-lg font-bold text-muted-foreground">2</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center">
                <div className="relative mb-2">
                  <Avatar className="w-20 h-20 mx-auto">
                    <AvatarImage src={pointsRanking[0].avatar || "/placeholder.svg"} />
                    <AvatarFallback>{pointsRanking[0].name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                    <Crown className="w-5 h-5 text-accent-foreground" />
                  </div>
                </div>
                <p className="text-base font-bold">{pointsRanking[0].name}</p>
                <p className="text-sm text-primary font-semibold">{pointsRanking[0].points.toLocaleString()}P</p>
                <div className="w-16 h-20 bg-primary/20 rounded-t-lg mx-auto mt-2 flex items-end justify-center pb-2">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center">
                <div className="relative mb-2">
                  <Avatar className="w-16 h-16 mx-auto">
                    <AvatarImage src={pointsRanking[2].avatar || "/placeholder.svg"} />
                    <AvatarFallback>{pointsRanking[2].name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                    <Award className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm font-medium">{pointsRanking[2].name}</p>
                <p className="text-xs text-muted-foreground">{pointsRanking[2].points.toLocaleString()}P</p>
                <div className="w-12 h-12 bg-muted/50 rounded-t-lg mx-auto mt-2 flex items-end justify-center pb-2">
                  <span className="text-lg font-bold text-muted-foreground">3</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranking Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="points">포인트</TabsTrigger>
            <TabsTrigger value="accuracy">정답률</TabsTrigger>
            <TabsTrigger value="weekly">주간</TabsTrigger>
          </TabsList>

          {/* Points Ranking */}
          <TabsContent value="points" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-accent" />
                  포인트 랭킹
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pointsRanking.map((user) => (
                  <div
                    key={user.rank}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      user.isCurrentUser ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        user.rank === 1
                          ? "bg-accent text-accent-foreground"
                          : user.rank <= 3
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {user.rank}
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name}</p>
                        {user.isCurrentUser && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            나
                          </Badge>
                        )}
                        {user.badge && <span className="text-sm">{user.badge}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">Lv.{user.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{user.points.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">포인트</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accuracy Ranking */}
          <TabsContent value="accuracy" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  정답률 랭킹
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accuracyRanking.map((user) => (
                  <div
                    key={user.rank}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      user.isCurrentUser ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        user.rank === 1
                          ? "bg-primary text-primary-foreground"
                          : user.rank <= 3
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {user.rank}
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name}</p>
                        {user.isCurrentUser && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            나
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.totalVotes}회 참여</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{user.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">정답률</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Ranking */}
          <TabsContent value="weekly" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  주간 랭킹
                </CardTitle>
                <p className="text-sm text-muted-foreground">이번 주 획득 포인트 기준</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {weeklyRanking.map((user) => (
                  <div
                    key={user.rank}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      user.isCurrentUser ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        user.rank === 1
                          ? "bg-accent text-accent-foreground"
                          : user.rank <= 3
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {user.rank}
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name}</p>
                        {user.isCurrentUser && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            나
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-muted-foreground">순위 변동:</p>
                        <span
                          className={`text-sm font-medium ${
                            user.change.startsWith("+") ? "text-primary" : "text-destructive"
                          }`}
                        >
                          {user.change}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-accent">{user.weeklyPoints.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">주간 포인트</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Padding */}
      <BottomNavigation />
    </div>
  )
}
