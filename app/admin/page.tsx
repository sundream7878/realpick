"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/c-layout/AppHeader"
import { BottomNavigation } from "@/components/c-bottom-navigation/bottom-navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/c-ui/card"
import { Button } from "@/components/c-ui/button"
import { Badge } from "@/components/c-ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/c-ui/select"
import { Input } from "@/components/c-ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/c-ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/c-ui/table"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { getAllOpenMissions, setMainMissionId, getMainMissionId } from "@/lib/supabase/admin"
import { getAllUsers, updateUserRole, searchUsers } from "@/lib/supabase/users"
import { SHOWS, CATEGORIES, type TShowCategory } from "@/lib/constants/shows"
import { getUserId } from "@/lib/auth-utils"
import type { TUser } from "@/types/t-vote/vote.types"
import type { TUserRole } from "@/lib/utils/permissions"
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/utils/permissions"
import { Search } from "lucide-react"

export default function AdminPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [missions, setMissions] = useState<any[]>([])
    const [currentMainMissionId, setCurrentMainMissionId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    // User management state
    const [users, setUsers] = useState<TUser[]>([])
    const [totalUsers, setTotalUsers] = useState(0)
    const [currentPage, setCurrentPage] = useState(0)
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const usersPerPage = 20

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            const userId = getUserId()
            setIsAdmin(true)

            try {
                const [missionsResult, mainMissionResult] = await Promise.all([
                    getAllOpenMissions(),
                    getMainMissionId()
                ])

                if (missionsResult.success) {
                    setMissions(missionsResult.missions || [])
                }

                if (mainMissionResult.success) {
                    setCurrentMainMissionId(mainMissionResult.missionId)
                }
            } catch (error) {
                console.error("Failed to load admin data", error)
                toast({
                    title: "로딩 실패",
                    description: "데이터를 불러오는 중 오류가 발생했습니다.",
                    variant: "destructive"
                })
            } finally {
                setIsLoading(false)
            }
        }

        checkAuthAndLoad()
    }, [])

    // Load users
    const loadUsers = async (page: number = 0) => {
        try {
            const { users: fetchedUsers, total } = await getAllUsers(usersPerPage, page * usersPerPage)
            setUsers(fetchedUsers)
            setTotalUsers(total)
            setCurrentPage(page)
        } catch (error) {
            console.error("Failed to load users", error)
            toast({
                title: "유저 로딩 실패",
                description: "유저 목록을 불러오는 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    // Search users
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadUsers(0)
            setIsSearching(false)
            return
        }

        try {
            setIsSearching(true)
            const searchResults = await searchUsers(searchQuery)
            setUsers(searchResults)
            setTotalUsers(searchResults.length)
        } catch (error) {
            console.error("Failed to search users", error)
            toast({
                title: "검색 실패",
                description: "유저 검색 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    // Handle role change
    const handleRoleChange = async (userId: string, newRole: TUserRole) => {
        try {
            const success = await updateUserRole(userId, newRole)
            if (success) {
                toast({
                    title: "역할 변경 완료",
                    description: `유저의 역할이 ${getRoleDisplayName(newRole)}(으)로 변경되었습니다.`
                })
                // Reload users
                if (isSearching) {
                    handleSearch()
                } else {
                    loadUsers(currentPage)
                }
            } else {
                throw new Error("Failed to update role")
            }
        } catch (error) {
            toast({
                title: "역할 변경 실패",
                description: "역할 변경 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    const handleSetMainMission = async (missionId: string) => {
        try {
            const result = await setMainMissionId(missionId)
            if (result.success) {
                setCurrentMainMissionId(missionId)
                toast({
                    title: "메인 미션 설정 완료",
                    description: "메인 배너가 업데이트되었습니다."
                })
            } else {
                throw new Error("Failed to set main mission")
            }
        } catch (error) {
            toast({
                title: "설정 실패",
                description: "메인 미션 설정 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    const handleClearMainMission = async () => {
        try {
            const result = await setMainMissionId(null)
            if (result.success) {
                setCurrentMainMissionId(null)
                toast({
                    title: "메인 미션 해제 완료",
                    description: "메인 배너가 기본 로직으로 돌아갑니다."
                })
            }
        } catch (error) {
            console.error(error)
        }
    }

    const groupedShows = {
        LOVE: SHOWS.LOVE,
        VICTORY: SHOWS.VICTORY,
        STAR: SHOWS.STAR
    }

    const totalPages = Math.ceil(totalUsers / usersPerPage)

    if (isLoading) return <div className="p-8 text-center">로딩 중...</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <AppHeader
                selectedShow="나는솔로"
                onShowChange={() => { }}
                userNickname="관리자"
                userPoints={0}
                userTier={{
                    name: "관리자",
                    minPoints: 0,
                    maxPoints: 0,
                    color: "bg-gray-500",
                    icon: "👑"
                }}
            />

            <main className="container max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">관리자 대시보드</h1>

                <Tabs defaultValue="missions" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="missions">메인 미션 관리</TabsTrigger>
                        <TabsTrigger value="users" onClick={() => !users.length && loadUsers(0)}>
                            유저 관리
                        </TabsTrigger>
                    </TabsList>

                    {/* Main Mission Management Tab */}
                    <TabsContent value="missions">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">현재 메인 미션 ID:</span>
                                <Badge variant="outline" className="font-mono">
                                    {currentMainMissionId || "없음 (자동 선정)"}
                                </Badge>
                                {currentMainMissionId && (
                                    <Button variant="ghost" size="sm" onClick={handleClearMainMission} className="text-rose-500 h-6">
                                        해제
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-8">
                            {(Object.keys(groupedShows) as TShowCategory[]).map((category) => (
                                <section key={category} className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">{CATEGORIES[category].emoji}</span>
                                        <h2 className="text-xl font-bold text-gray-800">{CATEGORIES[category].label}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {groupedShows[category].map((show) => {
                                            const showMissions = missions.filter(m => {
                                                if (show.id === 'nasolo') {
                                                    return m.f_show_id === show.id || !m.f_show_id
                                                }
                                                return m.f_show_id === show.id
                                            })

                                            return (
                                                <Card key={show.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                    <CardHeader className="py-3 px-4 bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
                                                        <CardTitle className="text-base font-medium text-gray-900">
                                                            {show.displayName}
                                                        </CardTitle>
                                                        <Badge variant="secondary" className="bg-white text-gray-500 border border-gray-200">
                                                            {showMissions.length}개 진행중
                                                        </Badge>
                                                    </CardHeader>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <Select
                                                                onValueChange={handleSetMainMission}
                                                                value={currentMainMissionId && showMissions.find(m => m.f_id === currentMainMissionId) ? currentMainMissionId : ""}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="메인 미션으로 선정할 투표 선택" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {showMissions.length === 0 ? (
                                                                        <div className="p-2 text-sm text-gray-500 text-center">진행 중인 투표 없음</div>
                                                                    ) : (
                                                                        showMissions.map((mission) => (
                                                                            <SelectItem key={mission.f_id} value={mission.f_id}>
                                                                                <span className="truncate block max-w-[300px]">{mission.f_title}</span>
                                                                            </SelectItem>
                                                                        ))
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </TabsContent>

                    {/* User Management Tab */}
                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>유저 관리</CardTitle>
                                    <Badge variant="secondary">총 {totalUsers}명</Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            placeholder="닉네임 또는 이메일로 검색..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Button onClick={handleSearch}>검색</Button>
                                    {isSearching && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setSearchQuery("")
                                                setIsSearching(false)
                                                loadUsers(0)
                                            }}
                                        >
                                            초기화
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>닉네임</TableHead>
                                            <TableHead>이메일</TableHead>
                                            <TableHead className="text-center">역할</TableHead>
                                            <TableHead className="text-center">티어</TableHead>
                                            <TableHead className="text-right">포인트</TableHead>
                                            <TableHead className="text-center">역할 변경</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                                    유저가 없습니다
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">{user.nickname}</TableCell>
                                                    <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={getRoleBadgeColor(user.role)}>
                                                            {getRoleDisplayName(user.role)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline">{user.tier}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {user.points.toLocaleString()}P
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={user.role}
                                                            onValueChange={(value) => handleRoleChange(user.id, value as TUserRole)}
                                                        >
                                                            <SelectTrigger className="w-[140px] mx-auto">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="PICKER">일반 유저</SelectItem>
                                                                <SelectItem value="DEALER">딜러</SelectItem>
                                                                <SelectItem value="MAIN_DEALER">메인 딜러</SelectItem>
                                                                <SelectItem value="ADMIN">관리자</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {!isSearching && totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-6">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => loadUsers(currentPage - 1)}
                                            disabled={currentPage === 0}
                                        >
                                            이전
                                        </Button>
                                        <span className="text-sm text-gray-600">
                                            {currentPage + 1} / {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => loadUsers(currentPage + 1)}
                                            disabled={currentPage >= totalPages - 1}
                                        >
                                            다음
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <BottomNavigation />
        </div>
    )
}
