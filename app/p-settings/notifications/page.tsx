"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/c-ui/button"
import { Switch } from "@/components/c-ui/switch"
import { ArrowLeft, Bell, Mail } from "lucide-react"

interface NotificationPreferences {
    f_id?: string
    f_email_enabled: boolean
    f_categories: string[]
}

const CATEGORIES = [
    { id: 'LOVE', name: '로맨스', emoji: '❤️', description: '나는 SOLO, 돌싱글즈 등' },
    { id: 'VICTORY', name: '서바이벌', emoji: '🏆', description: '최강야구, 골때리는 그녀들 등' },
    { id: 'STAR', name: '오디션', emoji: '⭐', description: '미스터트롯, 프로젝트7 등' }
]

export default function NotificationSettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        f_email_enabled: true,
        f_categories: ['LOVE', 'VICTORY', 'STAR']
    })
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        loadPreferences()
    }, [])

    async function loadPreferences() {
        try {
            const supabase = createClient()

            // 현재 사용자 확인
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }

            setUserId(user.id)

            // 알림 설정 조회
            const { data, error } = await supabase
                .from('t_notification_preferences')
                .select('*')
                .eq('f_user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error loading preferences:', error)
            }

            if (data) {
                setPreferences({
                    f_id: data.f_id,
                    f_email_enabled: data.f_email_enabled,
                    f_categories: data.f_categories || []
                })
            }
        } catch (error) {
            console.error('Failed to load preferences:', error)
        } finally {
            setLoading(false)
        }
    }

    async function savePreferences() {
        if (!userId) return

        setSaving(true)
        try {
            const supabase = createClient()

            const payload = {
                f_user_id: userId,
                f_email_enabled: preferences.f_email_enabled,
                f_categories: preferences.f_categories
            }

            if (preferences.f_id) {
                // 업데이트
                const { error } = await supabase
                    .from('t_notification_preferences')
                    .update(payload)
                    .eq('f_id', preferences.f_id)

                if (error) throw error
            } else {
                // 생성
                const { error } = await supabase
                    .from('t_notification_preferences')
                    .insert([payload])

                if (error) throw error
            }

            alert('알림 설정이 저장되었습니다!')
        } catch (error: any) {
            console.error('Failed to save preferences:', error)
            alert('저장 실패: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    function toggleCategory(categoryId: string) {
        setPreferences(prev => {
            const categories = prev.f_categories.includes(categoryId)
                ? prev.f_categories.filter(c => c !== categoryId)
                : [...prev.f_categories, categoryId]

            return { ...prev, f_categories: categories }
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">로딩 중...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto bg-white min-h-screen shadow-lg">
                {/* 헤더 */}
                <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
                    <div className="flex items-center gap-4 p-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Bell className="w-6 h-6 text-purple-600" />
                            <h1 className="text-xl font-bold">알림 설정</h1>
                        </div>
                    </div>
                </header>

                {/* 콘텐츠 */}
                <main className="p-6 space-y-8">
                    {/* 이메일 알림 ON/OFF */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="w-5 h-5 text-purple-600" />
                            <h2 className="text-lg font-semibold">이메일 알림</h2>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-xl p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900">이메일 알림 받기</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        새로운 미션이 등록되면 이메일로 알려드립니다
                                    </p>
                                </div>
                                <Switch
                                    checked={preferences.f_email_enabled}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({ ...prev, f_email_enabled: checked }))
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    {/* 카테고리 구독 */}
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-lg font-semibold mb-2">관심 카테고리</h2>
                            <p className="text-sm text-gray-600">
                                선택한 카테고리의 새 미션만 알림을 받습니다
                            </p>
                        </div>

                        <div className="space-y-3">
                            {CATEGORIES.map(category => {
                                const isSelected = preferences.f_categories.includes(category.id)

                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => toggleCategory(category.id)}
                                        className={`
                      w-full p-4 rounded-xl border-2 transition-all text-left
                      ${isSelected
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                            }
                    `}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{category.emoji}</span>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{category.name}</p>
                                                    <p className="text-sm text-gray-600">{category.description}</p>
                                                </div>
                                            </div>
                                            <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${isSelected
                                                    ? 'border-purple-500 bg-purple-500'
                                                    : 'border-gray-300'
                                                }
                      `}>
                                                {isSelected && (
                                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    {/* 저장 버튼 */}
                    <div className="sticky bottom-0 bg-white pt-4 pb-6 border-t border-gray-200">
                        <Button
                            onClick={savePreferences}
                            disabled={saving}
                            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white py-6 text-lg font-semibold"
                        >
                            {saving ? '저장 중...' : '설정 저장'}
                        </Button>
                    </div>
                </main>
            </div>
        </div>
    )
}
