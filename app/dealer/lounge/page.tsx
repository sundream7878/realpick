
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Loader2, Trophy, Users, Layout, Crown } from "lucide-react"

interface DealerStat {
    id: string
    nickname: string
    tier: string
    role: string
    missionCount: number
    totalParticipants: number
}

export default function DealerLoungePage() {
    const router = useRouter()
    const [stats, setStats] = useState<DealerStat[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        const checkPermissionAndLoadData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push("/login")
                return
            }

            // Check role
            const { data: userData } = await supabase
                .from("t_users")
                .select("f_role, f_nickname")
                .eq("f_id", user.id)
                .single()

            if (!userData || (userData.f_role !== 'DEALER' && userData.f_role !== 'MAIN_DEALER' && userData.f_role !== 'ADMIN')) {
                router.push("/")
                return
            }

            setCurrentUser({ ...user, ...userData })

            // Fetch stats
            try {
                const res = await fetch('/api/dealer/stats')
                const data = await res.json()

                if (!res.ok) throw new Error(data.error || 'Failed to fetch stats')

                setStats(data.stats)
            } catch (err: any) {
                console.error("Error loading dealer stats:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        checkPermissionAndLoadData()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    const myStat = stats.find(s => s.id === currentUser?.id)
    const rank = stats.findIndex(s => s.id === currentUser?.id) + 1

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Crown className="w-8 h-8 text-yellow-500" />
                        딜러 라운지
                    </h1>
                    <p className="text-gray-600 mt-2">
                        딜러님들의 미션 현황과 성과를 한눈에 확인하세요.
                    </p>
                </div>

                {/* My Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">내 랭킹</p>
                                <p className="text-2xl font-bold text-gray-900">{rank}위</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                                <Layout className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">생성한 미션</p>
                                <p className="text-2xl font-bold text-gray-900">{myStat?.missionCount || 0}개</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg text-green-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">총 참여자 수</p>
                                <p className="text-2xl font-bold text-gray-900">{myStat?.totalParticipants?.toLocaleString() || 0}명</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Participants Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">딜러별 총 참여자 수</h3>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="nickname" type="category" width={80} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    />
                                    <Bar dataKey="totalParticipants" name="참여자 수" radius={[0, 4, 4, 0]} barSize={20}>
                                        {stats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.id === currentUser?.id ? '#8b5cf6' : '#cbd5e1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Missions Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">딜러별 생성 미션 수</h3>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="nickname" type="category" width={80} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    />
                                    <Bar dataKey="missionCount" name="미션 수" radius={[0, 4, 4, 0]} barSize={20}>
                                        {stats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.id === currentUser?.id ? '#3b82f6' : '#cbd5e1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
