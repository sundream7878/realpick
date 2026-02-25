"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase/config"
import { getNotificationPreferences, saveNotificationPreferences } from "@/lib/firebase/notifications"
import { Button } from "@/components/c-ui/button"
import { Switch } from "@/components/c-ui/switch"
import { ArrowLeft, Bell, Mail } from "lucide-react"
import { CATEGORIES as GLOBAL_CATEGORIES } from "@/lib/constants/shows"
import LoginModal from "@/components/c-login-modal/login-modal"
import { isAuthenticated } from "@/lib/auth-utils"

interface NotificationPreferences {
    id?: string
    emailEnabled: boolean
    categories: string[]
}

const CATEGORIES = [
    { id: 'LOVE', name: GLOBAL_CATEGORIES.LOVE.description, icon: GLOBAL_CATEGORIES.LOVE.iconPath, description: '나는 SOLO, 돌싱글즈 등' },
    { id: 'VICTORY', name: GLOBAL_CATEGORIES.VICTORY.description, icon: GLOBAL_CATEGORIES.VICTORY.iconPath, description: '최강야구, 골때리는 그녀들 등' },
    { id: 'STAR', name: GLOBAL_CATEGORIES.STAR.description, icon: GLOBAL_CATEGORIES.STAR.iconPath, description: '미스터트롯, 프로젝트7 등' }
]

export default function NotificationSettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        emailEnabled: true,
        categories: ['LOVE', 'VICTORY', 'STAR']
    })
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setUserId(user.uid)
                loadPreferences(user.uid)
            } else {
                // 로그인되지 않은 경우 로그인 모달 표시
                setLoading(false)
                setShowLoginModal(true)
            }
        })
        return () => unsubscribe()
    }, [])

    async function loadPreferences(uid: string) {
        try {
            const result = await getNotificationPreferences(uid)

            if (result.success && result.preferences) {
                const data = result.preferences as any;
                setPreferences({
                    id: data.id,
                    emailEnabled: data.emailEnabled ?? true,
                    categories: data.categories || ['LOVE', 'VICTORY', 'STAR']
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
            const result = await saveNotificationPreferences(userId, {
                emailEnabled: preferences.emailEnabled,
                categories: preferences.categories
            })

            if (!result.success) throw result.error

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
            const categories = prev.categories.includes(categoryId)
                ? prev.categories.filter(c => c !== categoryId)
                : [...prev.categories, categoryId]

            return { ...prev, categories }
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
                                    checked={preferences.emailEnabled}
                                    onCheckedChange={(checked) =>
                                        setPreferences(prev => ({ ...prev, emailEnabled: checked }))
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
                                const isSelected = preferences.categories.includes(category.id)

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
                                                {category.icon ? (
                                                    <img src={category.icon} alt={category.name} className="w-10 h-10 object-contain" />
                                                ) : (
                                                    <span className="text-3xl">{(category as any).emoji}</span>
                                                )}
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

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => {
                    setShowLoginModal(false)
                    if (!userId) router.push('/')
                }}
                title="알림을 받고 싶다면?"
                description="로그인하고 관심 있는 프로그램의 새로운 미션 소식을 받아보세요!"
            />
        </div>
    )
}
