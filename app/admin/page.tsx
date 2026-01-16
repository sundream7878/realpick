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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/c-ui/dialog"
import { useToast } from "@/hooks/h-toast/useToast.hook"
import { getAllOpenMissions, setMainMissionId, getMainMissionId, getShowStatuses, updateShowStatuses, getShowVisibility, updateShowVisibility, getCustomShows, addCustomShow, deleteCustomShow, updateShowInfo } from "@/lib/firebase/admin-settings"
import { getAllUsers, updateUserRole, searchUsers } from "@/lib/firebase/users"
import { SHOWS, CATEGORIES, type TShowCategory, getShowById } from "@/lib/constants/shows"
import { getUserId } from "@/lib/auth-utils"
import { auth, db } from "@/lib/firebase/config"
import { doc, getDoc } from "firebase/firestore"
import type { TUser } from "@/types/t-vote/vote.types"
import type { TUserRole } from "@/lib/utils/permissions"
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/utils/permissions"
import { Search, Lock, KeyRound, Eye, EyeOff, Plus, Trash2, Edit } from "lucide-react"
import { AdminLockScreen } from "@/components/c-admin/AdminLockScreen"

export default function AdminPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [missions, setMissions] = useState<any[]>([])
    const [currentMainMissionId, setCurrentMainMissionId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAdminRole, setIsAdminRole] = useState(false) // Check if user has ADMIN role in DB
    const [isUnlocked, setIsUnlocked] = useState(false) // Check if password unlocked

    // User management state
    const [users, setUsers] = useState<TUser[]>([])
    const [totalUsers, setTotalUsers] = useState(0)
    const [currentPage, setCurrentPage] = useState(0)
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)
    const usersPerPage = 20

    // Password Change State
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [confirmNewPassword, setConfirmNewPassword] = useState("")

    // Show Status State
    const [showStatuses, setShowStatuses] = useState<Record<string, string>>({})
    
    // Show Visibility State (프로그램 활성화/비활성화)
    const [showVisibility, setShowVisibility] = useState<Record<string, boolean>>({})
    
    // Custom Shows State
    const [customShows, setCustomShows] = useState<any[]>([])
    
    // Filtering State
    const [missionCategoryFilter, setMissionCategoryFilter] = useState<string>("ALL")
    const [programCategoryFilter, setProgramCategoryFilter] = useState<string>("ALL")
    const [userRoleFilter, setUserRoleFilter] = useState<string>("ALL")
    
    // Add/Edit Show Dialog State
    const [isShowDialogOpen, setIsShowDialogOpen] = useState(false)
    const [editingShowId, setEditingShowId] = useState<string | null>(null)
    const [newShow, setNewShow] = useState({
        id: "",
        name: "",
        displayName: "",
        category: "LOVE" as TShowCategory,
        officialUrl: ""
    })

    useEffect(() => {
        const checkPermissionAndLoad = async () => {
            const currentUser = auth.currentUser

            if (!currentUser) {
                router.push("/")
                return
            }

            // Check role first
            const userDoc = await getDoc(doc(db, "users", currentUser.uid))
            const userData = userDoc.data()

            if (userData?.role !== 'ADMIN') {
                router.push("/")
                toast({
                    title: "접근 거부",
                    description: "관리자 권한이 없습니다.",
                    variant: "destructive"
                })
                return
            }

            setIsAdminRole(true)
            
            // 관리자 역할이 확인되면 자동으로 unlock
            setIsUnlocked(true)
            sessionStorage.setItem("admin_unlocked", "true")

            // Load Admin Data
            try {
                const [missionsResult, mainMissionResult, showStatusesResult, showVisibilityResult, customShowsResult] = await Promise.all([
                    getAllOpenMissions(),
                    getMainMissionId(),
                    getShowStatuses(),
                    getShowVisibility(),
                    getCustomShows()
                ])

                if (missionsResult.success) {
                    setMissions(missionsResult.missions || [])
                }

                if (mainMissionResult.success) {
                    setCurrentMainMissionId(mainMissionResult.missionId)
                }

                if (showStatusesResult.success) {
                    setShowStatuses(showStatusesResult.statuses || {})
                }

                if (showVisibilityResult.success) {
                    setShowVisibility(showVisibilityResult.visibility || {})
                }

                if (customShowsResult.success) {
                    setCustomShows(customShowsResult.shows || [])
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

        checkPermissionAndLoad()
    }, [router, toast])

    const handleUnlock = () => {
        setIsUnlocked(true)
        sessionStorage.setItem("admin_unlocked", "true")
    }

    const handleChangePassword = async () => {
        if (!newPassword || newPassword !== confirmNewPassword) {
            toast({ title: "오류", description: "비밀번호가 일치하지 않습니다.", variant: "destructive" })
            return
        }

        try {
            const { auth } = await import("@/lib/firebase/config")
            const token = await auth.currentUser?.getIdToken()

            const res = await fetch("/api/admin/auth/update", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword }),
            })

            if (res.ok) {
                toast({ title: "성공", description: "비밀번호가 변경되었습니다." })
                setIsChangePasswordOpen(false)
                setNewPassword("")
                setConfirmNewPassword("")
            } else {
                const data = await res.json()
                throw new Error(data.error || "Failed to update password")
            }
        } catch (error: any) {
            console.error("Admin password change error:", error)
            toast({ title: "오류", description: error.message || "비밀번호 변경 중 오류가 발생했습니다.", variant: "destructive" })
        }
    }

    // Load users
    const [lastDoc, setLastDoc] = useState<any>(null)
    const [pageDocs, setPageDocs] = useState<Record<number, any>>({})

    const loadUsers = async (page: number = 0, role: string = userRoleFilter) => {
        try {
            console.log('[Admin] loadUsers 시작:', { page, role, currentFilter: userRoleFilter });
            
            // Reset pagination if filter changed
            const isFilterChanged = role !== userRoleFilter
            console.log('[Admin] 필터 변경 여부:', isFilterChanged);
            
            const currentLastDoc = (page === 0 || isFilterChanged) ? null : pageDocs[page - 1]
            
            console.log('[Admin] getAllUsers 호출 전...');
            const { users: fetchedUsers, lastVisible, total } = await getAllUsers(usersPerPage, currentLastDoc, role)
            console.log('[Admin] getAllUsers 결과:', { 
                fetchedCount: fetchedUsers.length, 
                total,
                hasLastVisible: !!lastVisible 
            });
            
            setUsers(fetchedUsers)
            setTotalUsers(total)
            setCurrentPage(page)
            setLastDoc(lastVisible)
            
            if (isFilterChanged) {
                console.log('[Admin] 필터 상태 업데이트:', role);
                setPageDocs({})
                setUserRoleFilter(role)
            }
            
            // Store the cursor for the next page
            if (lastVisible) {
                setPageDocs(prev => ({ ...prev, [page]: lastVisible }))
            }
        } catch (error) {
            console.error("[Admin] Failed to load users", error)
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
            console.error("Search failed", error)
            toast({
                title: "검색 실패",
                description: "유저 검색 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        } finally {
            setIsSearching(false)
        }
    }

    const handleRoleUpdate = async (userId: string, newRole: TUserRole) => {
        try {
            console.log('[Admin] 권한 수정 시작:', { userId, newRole })
            const success = await updateUserRole(userId, newRole)
            console.log('[Admin] 권한 수정 결과:', success)
            
            if (success) {
                toast({
                    title: "권한 수정 성공",
                    description: `유저 권한이 ${getRoleDisplayName(newRole)}(으)로 수정되었습니다.`
                })
                // Refresh list
                if (searchQuery.trim()) {
                    await handleSearch()
                } else {
                    await loadUsers(currentPage)
                }
            } else {
                throw new Error("Update failed")
            }
        } catch (error: any) {
            console.error('[Admin] 권한 수정 실패:', error)
            toast({
                title: "권한 수정 실패",
                description: error.message || "권한 수정 중 오류가 발생했습니다. 콘솔을 확인해주세요.",
                variant: "destructive"
            })
        }
    }

    const handleSetMainMission = async (missionId: string) => {
        try {
            const success = await setMainMissionId(missionId)
            if (success) {
                setCurrentMainMissionId(missionId)
                toast({
                    title: "메인 미션 설정 완료",
                    description: "메인 배너 미션이 변경되었습니다."
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
            const success = await setMainMissionId(null)
            if (success) {
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

    const handleShowStatusUpdate = async (showId: string, status: string) => {
        const newStatuses = { ...showStatuses, [showId]: status }
        setShowStatuses(newStatuses) // Optimistic update

        try {
            const result = await updateShowStatuses(newStatuses)
            if (result.success) {
                // localStorage를 사용하여 여러 탭 간 통신 (강제 업데이트를 위해 먼저 제거)
                const timestamp = Date.now()
                localStorage.removeItem('show-statuses-update')
                setTimeout(() => {
                    localStorage.setItem('show-statuses-update', JSON.stringify({
                        statuses: newStatuses,
                        timestamp
                    }))
                }, 10)
                
                // 현재 페이지에서도 이벤트 발생
                window.dispatchEvent(new CustomEvent('show-statuses-updated', {
                    detail: { statuses: newStatuses }
                }))
                
                toast({
                    title: "상태 업데이트 성공",
                    description: "프로그램 상태가 변경되었습니다."
                })
            } else {
                throw new Error("Failed to update")
            }
        } catch (error) {
            console.error("[Admin] Update failed:", error)
            setShowStatuses(showStatuses) // Revert
            toast({
                title: "업데이트 실패",
                description: "상태 변경 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    const handleShowVisibilityToggle = async (showId: string, isVisible: boolean) => {
        const newVisibility = { ...showVisibility, [showId]: isVisible }
        setShowVisibility(newVisibility) // Optimistic update

        try {
            const result = await updateShowVisibility(newVisibility)
            if (result.success) {
                // localStorage를 사용하여 여러 탭 간 통신 (강제 업데이트를 위해 먼저 제거)
                const timestamp = Date.now()
                localStorage.removeItem('show-visibility-update')
                setTimeout(() => {
                    localStorage.setItem('show-visibility-update', JSON.stringify({
                        visibility: newVisibility,
                        timestamp
                    }))
                }, 10)
                
                // 현재 페이지에서도 이벤트 발생
                window.dispatchEvent(new CustomEvent('show-visibility-updated', {
                    detail: { visibility: newVisibility }
                }))
                
                toast({
                    title: "표시 상태 업데이트 성공",
                    description: `프로그램이 ${isVisible ? '표시' : '숨김'} 처리되었습니다.`
                })
            } else {
                throw new Error("Failed to update visibility")
            }
        } catch (error) {
            console.error("[Admin] Visibility update failed:", error)
            setShowVisibility(showVisibility) // Revert
            toast({
                title: "업데이트 실패",
                description: "표시 상태 변경 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    const handleAddShow = async () => {
        if (!newShow.id || !newShow.name || !newShow.displayName) {
            toast({
                title: "입력 오류",
                description: "모든 필수 항목을 입력해주세요.",
                variant: "destructive"
            })
            return
        }

        try {
            let result;
            if (editingShowId) {
                // 수정 모드
                result = await updateShowInfo(editingShowId, newShow)
            } else {
                // 추가 모드
                result = await addCustomShow(newShow)
            }

            if (result.success) {
                toast({
                    title: editingShowId ? "프로그램 수정 성공" : "프로그램 추가 성공",
                    description: `${newShow.displayName}이(가) ${editingShowId ? '수정' : '추가'}되었습니다.`
                })
                
                // 목록 새로고침
                const customShowsResult = await getCustomShows()
                if (customShowsResult.success) {
                    const updatedShowsList = customShowsResult.shows || []
                    setCustomShows(updatedShowsList)
                    
                    // 이벤트 발생 (다른 탭 동기화용)
                    const timestamp = Date.now()
                    localStorage.removeItem('custom-shows-update')
                    setTimeout(() => {
                        localStorage.setItem('custom-shows-update', JSON.stringify({
                            shows: updatedShowsList,
                            timestamp
                        }))
                    }, 10)
                    
                    // 현재 탭 동기화
                    window.dispatchEvent(new CustomEvent('custom-shows-updated', {
                        detail: { shows: updatedShowsList }
                    }))
                }
                
                // 폼 초기화
                setNewShow({
                    id: "",
                    name: "",
                    displayName: "",
                    category: "LOVE",
                    officialUrl: ""
                })
                setEditingShowId(null)
                setIsShowDialogOpen(false)
            } else {
                throw new Error(result.error || (editingShowId ? "수정 실패" : "추가 실패"))
            }
        } catch (error: any) {
            toast({
                title: editingShowId ? "프로그램 수정 실패" : "프로그램 추가 실패",
                description: error.message || `프로그램 ${editingShowId ? '수정' : '추가'} 중 오류가 발생했습니다.`,
                variant: "destructive"
            })
        }
    }

    const handleEditShow = (show: any) => {
        setNewShow({
            id: show.id,
            name: show.name,
            displayName: show.displayName,
            category: show.category as TShowCategory,
            officialUrl: show.officialUrl || ""
        })
        setEditingShowId(show.id)
        setIsShowDialogOpen(true)
    }

    const handleDeleteShow = async (showId: string, showName: string) => {
        if (!confirm(`"${showName}"을(를) 정말 삭제하시겠습니까?`)) {
            return
        }

        try {
            // 커스텀 프로그램인지 기본 프로그램인지 확인
            const isCustom = validCustomShows.some((s: any) => s.id === showId);
            
            let result;
            if (isCustom) {
                // 커스텀 프로그램은 DB에서 삭제
                result = await deleteCustomShow(showId)
            } else {
                // 기본 프로그램은 숨김 처리로 대응 (물리적 삭제는 코드 수정 필요하므로)
                const newVisibility = { ...showVisibility, [showId]: false }
                result = await updateShowVisibility(newVisibility)
                setShowVisibility(newVisibility)
            }

            if (result.success) {
                toast({
                    title: "프로그램 삭제 성공",
                    description: isCustom ? `${showName}이(가) 삭제되었습니다.` : `${showName}이(가) 목록에서 제거(숨김)되었습니다.`
                })
                
                // 목록 새로고침
                const customShowsResult = await getCustomShows()
                if (customShowsResult.success) {
                    const updatedShowsList = customShowsResult.shows || []
                    setCustomShows(updatedShowsList)
                    
                    // 이벤트 발생 (다른 탭 동기화용)
                    const timestamp = Date.now()
                    localStorage.removeItem('custom-shows-update')
                    setTimeout(() => {
                        localStorage.setItem('custom-shows-update', JSON.stringify({
                            shows: updatedShowsList,
                            timestamp
                        }))
                    }, 10)
                    
                    // 현재 탭 동기화
                    window.dispatchEvent(new CustomEvent('custom-shows-updated', {
                        detail: { shows: updatedShowsList }
                    }))
                }
            } else {
                throw new Error("삭제 실패")
            }
        } catch (error) {
            console.error("Delete failed:", error);
            toast({
                title: "프로그램 삭제 실패",
                description: "프로그램 삭제 중 오류가 발생했습니다.",
                variant: "destructive"
            })
        }
    }

    // 기본 프로그램 + 커스텀 프로그램 통합 (customShows가 배열인지 확인)
    const validCustomShows = Array.isArray(customShows) ? customShows : []
    const groupedShows = {
        LOVE: [...SHOWS.LOVE, ...validCustomShows.filter((s: any) => s.category === 'LOVE')],
        VICTORY: [...SHOWS.VICTORY, ...validCustomShows.filter((s: any) => s.category === 'VICTORY')],
        STAR: [...SHOWS.STAR, ...validCustomShows.filter((s: any) => s.category === 'STAR')]
    }

    const totalPages = Math.ceil(totalUsers / usersPerPage)

    if (isLoading) return <div className="p-8 text-center">로딩 중...</div>

    // If not admin role, we already redirected, but just in case
    if (!isAdminRole) return null

    // If admin role but locked, show lock screen
    if (!isUnlocked) {
        return <AdminLockScreen onUnlock={handleUnlock} />
    }

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
                }}
            />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">관리자 페이지</h1>

                    <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <KeyRound className="w-4 h-4" />
                                비밀번호 변경
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>관리자 비밀번호 변경</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Input
                                        type="password"
                                        placeholder="새 비밀번호"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <Input
                                        type="password"
                                        placeholder="비밀번호 확인"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full bg-purple-600" onClick={handleChangePassword}>
                                    변경하기
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Tabs defaultValue="missions" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="missions">미션 관리</TabsTrigger>
                        <TabsTrigger value="programs">프로그램 관리</TabsTrigger>
                        <TabsTrigger value="users" onClick={() => loadUsers(0)}>유저 관리</TabsTrigger>
                    </TabsList>

                    <TabsContent value="missions" className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">현재 메인 미션 ID:</span>
                                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs">
                                    {currentMainMissionId || "없음 (자동 선정)"}
                                </Badge>
                                {currentMainMissionId && (
                                    <Button variant="ghost" size="sm" onClick={handleClearMainMission} className="text-rose-500 h-6">
                                        해제
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                            <Button 
                                variant={missionCategoryFilter === "ALL" ? "default" : "ghost"} 
                                size="sm" 
                                onClick={() => setMissionCategoryFilter("ALL")}
                                className="h-8 text-xs px-3"
                            >
                                전체
                            </Button>
                            {(Object.keys(CATEGORIES) as TShowCategory[])
                                .filter(cat => cat !== "UNIFIED")
                                .map((cat) => (
                                <Button 
                                    key={cat}
                                    variant={missionCategoryFilter === cat ? "default" : "ghost"} 
                                    size="sm" 
                                    onClick={() => setMissionCategoryFilter(cat)}
                                    className="h-8 text-xs gap-1 px-3"
                                >
                                    <span>{CATEGORIES[cat].label}</span>
                                </Button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {(Object.keys(groupedShows) as TShowCategory[])
                                .filter(cat => cat !== "UNIFIED")
                                .filter(cat => missionCategoryFilter === "ALL" || missionCategoryFilter === cat)
                                .map((category) => (
                                <section key={category} className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <img
                                            src={CATEGORIES[category].iconPath}
                                            alt={CATEGORIES[category].label}
                                            className="w-8 h-8 object-contain"
                                        />
                                        <h2 className="text-xl font-bold text-gray-800">{CATEGORIES[category].label}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {groupedShows[category].map((show) => {
                                            const showMissions = missions.filter(m => {
                                                if (show.id === 'nasolo') {
                                                    return m.showId === show.id || !m.showId
                                                }
                                                return m.showId === show.id
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
                                                                value={currentMainMissionId && showMissions.find(m => m.id === currentMainMissionId) ? currentMainMissionId : ""}
                                                            >
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="메인 미션으로 선정할 투표 선택" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {showMissions.length === 0 ? (
                                                                        <div className="p-2 text-sm text-gray-500 text-center">진행 중인 투표 없음</div>
                                                                    ) : (
                                                                        showMissions.map((mission) => (
                                                                            <SelectItem key={mission.id} value={mission.id}>
                                                                                <span className="truncate block max-w-[300px]">{mission.title}</span>
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

                    <TabsContent value="programs" className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                                <Button 
                                    variant={programCategoryFilter === "ALL" ? "default" : "ghost"} 
                                    size="sm" 
                                    onClick={() => setProgramCategoryFilter("ALL")}
                                    className="h-8 text-xs px-3"
                                >
                                    전체
                                </Button>
                                {(Object.keys(CATEGORIES) as TShowCategory[])
                                    .filter(cat => cat !== "UNIFIED")
                                    .map((cat) => (
                                    <Button 
                                        key={cat}
                                        variant={programCategoryFilter === cat ? "default" : "ghost"} 
                                        size="sm" 
                                        onClick={() => setProgramCategoryFilter(cat)}
                                        className="h-8 text-xs gap-1 px-3"
                                    >
                                        <span>{CATEGORIES[cat].label}</span>
                                    </Button>
                                ))}
                            </div>
                            <Button onClick={() => {
                                setEditingShowId(null)
                                setNewShow({ id: "", name: "", displayName: "", category: "LOVE", officialUrl: "" })
                                setIsShowDialogOpen(true)
                            }} className="gap-2 bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                                <Plus className="w-4 h-4" />
                                프로그램 추가
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            {(Object.keys(groupedShows) as TShowCategory[])
                                .filter(cat => cat !== "UNIFIED")
                                .filter(cat => programCategoryFilter === "ALL" || programCategoryFilter === cat)
                                .map((category) => (
                                <section key={category} className="space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <img
                                            src={CATEGORIES[category].iconPath}
                                            alt={CATEGORIES[category].label}
                                            className="w-8 h-8 object-contain"
                                        />
                                        <h2 className="text-xl font-bold text-gray-800">{CATEGORIES[category].label}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {groupedShows[category].map((show) => {
                                            const isVisible = showVisibility[show.id] !== false // 기본값 true
                                            return (
                                                <Card key={show.id} className={`border-gray-200 shadow-sm ${!isVisible ? 'opacity-60' : ''}`}>
                                                    <CardHeader className="py-3 px-4 bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <CardTitle className="text-base font-medium text-gray-900">
                                                                {show.displayName}
                                                            </CardTitle>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleShowVisibilityToggle(show.id, !isVisible)}
                                                                className="h-7 w-7 p-0"
                                                                title={isVisible ? "프로그램 숨기기" : "프로그램 표시"}
                                                            >
                                                                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditShow(show)}
                                                                className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                title="프로그램 수정"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteShow(show.id, show.displayName)}
                                                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                title="프로그램 삭제"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <Badge variant={showStatuses[show.id] === 'ACTIVE' || !showStatuses[show.id] ? 'default' : 'secondary'}>
                                                            {showStatuses[show.id] === 'ACTIVE' || !showStatuses[show.id] ? '방영중' :
                                                                showStatuses[show.id] === 'UPCOMING' ? '방영예정' : '방영미정'}
                                                        </Badge>
                                                    </CardHeader>
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-gray-700">방영 상태</label>
                                                            <Select
                                                                value={showStatuses[show.id] || 'ACTIVE'}
                                                                onValueChange={(value) => handleShowStatusUpdate(show.id, value)}
                                                                disabled={!isVisible}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="ACTIVE">방영중 (Active)</SelectItem>
                                                                    <SelectItem value="UPCOMING">방영예정 (Upcoming)</SelectItem>
                                                                    <SelectItem value="UNDECIDED">방영미정 (Undecided)</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        {!isVisible && (
                                                            <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 border border-gray-200">
                                                                ⚠️ 현재 헤더에서 숨겨진 상태입니다
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <CardTitle>유저 관리</CardTitle>
                                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg self-end">
                                        <Button 
                                            variant={userRoleFilter === "ALL" ? "default" : "ghost"} 
                                            size="sm" 
                                            onClick={() => loadUsers(0, "ALL")}
                                            className="h-8 text-xs"
                                        >
                                            전체
                                        </Button>
                                        <Button 
                                            variant={userRoleFilter === "PICKER" ? "default" : "ghost"} 
                                            size="sm" 
                                            onClick={() => loadUsers(0, "PICKER")}
                                            className="h-8 text-xs"
                                        >
                                            피커
                                        </Button>
                                        <Button 
                                            variant={userRoleFilter === "DEALER" ? "default" : "ghost"} 
                                            size="sm" 
                                            onClick={() => loadUsers(0, "DEALER")}
                                            className="h-8 text-xs"
                                        >
                                            딜러
                                        </Button>
                                        <Button 
                                            variant={userRoleFilter === "MAIN_DEALER" ? "default" : "ghost"} 
                                            size="sm" 
                                            onClick={() => loadUsers(0, "MAIN_DEALER")}
                                            className="h-8 text-xs"
                                        >
                                            메인 딜러
                                        </Button>
                                        <Button 
                                            variant={userRoleFilter === "ADMIN" ? "default" : "ghost"} 
                                            size="sm" 
                                            onClick={() => loadUsers(0, "ADMIN")}
                                            className="h-8 text-xs"
                                        >
                                            관리자
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="닉네임 검색..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                            className="pl-8"
                                        />
                                    </div>
                                    <Button onClick={handleSearch} disabled={isSearching}>
                                        {isSearching ? "검색 중..." : "검색"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>닉네임</TableHead>
                                            <TableHead>이메일</TableHead>
                                            <TableHead>포인트</TableHead>
                                            <TableHead>티어</TableHead>
                                            <TableHead>권한</TableHead>
                                            <TableHead>가입일</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                                    조건에 맞는 유저가 없습니다.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">{user.nickname}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>{user.points.toLocaleString()} P</TableCell>
                                                    <TableCell>{user.tier}</TableCell>
                                                    <TableCell>
                                                        <Select
                                                            defaultValue={user.role}
                                                            onValueChange={(value) => handleRoleUpdate(user.id, value as TUserRole)}
                                                        >
                                                            <SelectTrigger className="w-[140px]">
                                                                <SelectValue>
                                                                    <Badge className={getRoleBadgeColor(user.role)}>
                                                                        {getRoleDisplayName(user.role)}
                                                                    </Badge>
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="PICKER">피커 (일반)</SelectItem>
                                                                <SelectItem value="DEALER">딜러</SelectItem>
                                                                <SelectItem value="MAIN_DEALER">메인 딜러</SelectItem>
                                                                <SelectItem value="ADMIN">관리자</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>

                                {/* Pagination Controls */}
                                <div className="flex justify-center items-center gap-4 mt-6">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === 0 || isSearching}
                                        onClick={() => loadUsers(currentPage - 1)}
                                    >
                                        이전
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-medium text-purple-600">{currentPage + 1}</span>
                                        <span className="text-sm text-gray-400">/</span>
                                        <span className="text-sm text-gray-500">{Math.max(1, totalPages)}</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage + 1 >= totalPages || isSearching}
                                        onClick={() => loadUsers(currentPage + 1)}
                                    >
                                        다음
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
            <BottomNavigation />
            
            {/* 프로그램 추가/수정 다이얼로그 */}
            <Dialog open={isShowDialogOpen} onOpenChange={setIsShowDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingShowId ? "프로그램 수정" : "새 프로그램 추가"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">프로그램 ID *</label>
                            <Input
                                placeholder="예: new-show-1"
                                value={newShow.id}
                                onChange={(e) => setNewShow({ ...newShow, id: e.target.value })}
                                disabled={!!editingShowId}
                            />
                            {!editingShowId && <p className="text-xs text-gray-500">영문 소문자, 숫자, 하이픈만 사용</p>}
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">프로그램 이름 *</label>
                            <Input
                                placeholder="예: 새프로그램"
                                value={newShow.name}
                                onChange={(e) => setNewShow({ ...newShow, name: e.target.value })}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">표시 이름 *</label>
                            <Input
                                placeholder="예: 새 프로그램"
                                value={newShow.displayName}
                                onChange={(e) => setNewShow({ ...newShow, displayName: e.target.value })}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">카테고리 *</label>
                            <Select
                                value={newShow.category}
                                onValueChange={(value) => setNewShow({ ...newShow, category: value as TShowCategory })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOVE">❤️ Romance (로맨스)</SelectItem>
                                    <SelectItem value="VICTORY">🏆 Survival (서바이벌)</SelectItem>
                                    <SelectItem value="STAR">🌟 Audition (오디션)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">공식 URL (선택)</label>
                            <Input
                                placeholder="https://..."
                                value={newShow.officialUrl}
                                onChange={(e) => setNewShow({ ...newShow, officialUrl: e.target.value })}
                            />
                        </div>
                        
                        <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={handleAddShow}>
                            {editingShowId ? "수정하기" : "추가하기"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
