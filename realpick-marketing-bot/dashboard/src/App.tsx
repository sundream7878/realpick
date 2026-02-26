import { useState, useEffect, lazy, Suspense } from 'react'
import { Card, CardContent } from './components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { LayoutDashboard, Users, Zap, Sparkles, Coffee, Video, Loader2 } from 'lucide-react'
import { Badge } from './ui/badge'

// 지연 로딩 (Lazy Loading) 적용
const AutoMissionGenerate = lazy(() => import('./components/AutoMissionGenerate').then(m => ({ default: m.AutoMissionGenerate })))
const YoutubeDealerRecruit = lazy(() => import('./components/YoutubeDealerRecruit').then(m => ({ default: m.YoutubeDealerRecruit })))
const CommunityViralManage = lazy(() => import('./components/CommunityViralManage').then(m => ({ default: m.CommunityViralManage })))
const NaverCafeCrawl = lazy(() => import('./components/NaverCafeCrawl').then(m => ({ default: m.NaverCafeCrawl })))
const SnsViralManage = lazy(() => import('./components/SnsViralManage').then(m => ({ default: m.SnsViralManage })))

// 로딩 컴포넌트
const TabLoading = () => (
  <div className="flex flex-col items-center justify-center py-20 space-y-4">
    <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
    <p className="text-gray-500 font-bold">페이지를 불러오는 중입니다...</p>
  </div>
)

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState('auto')

  useEffect(() => {
    const stored = sessionStorage.getItem('marketer_auth')
    if (stored) setAuthenticated(true)
  }, [])

  const handleLogin = () => {
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'realpick-admin-2024'
    if (password === envPassword) {
      sessionStorage.setItem('marketer_auth', password)
      setAuthenticated(true)
    } else {
      alert('비밀번호가 틀렸습니다.')
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 border border-purple-100">
          <div className="text-center mb-10">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-purple-200">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">리얼픽 마케터</h1>
            <p className="text-gray-400 text-base font-bold uppercase tracking-wider">Admin Access</p>
          </div>
          <div className="space-y-5">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-center text-base font-bold"
              autoFocus
            />
            <button
              onClick={handleLogin}
              className="w-full px-5 py-4 bg-purple-600 text-white rounded-2xl font-extrabold text-lg hover:bg-purple-700 transition-all shadow-lg shadow-purple-200"
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 font-sans text-slate-900">
      {/* 헤더 제거됨 */}

      {/* 메인 영역 - 더 넓게 사용 */}
      <main className="w-full p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-10">리얼픽 마케터</h2>

            {/* 프로그램 관리, 유저 관리 탭 제거됨 */}
            <div className="mt-8">
              <Tabs defaultValue="auto" value={activeTab} onValueChange={setActiveTab} className="space-y-10">
                {/* 서브 탭 */}
                <div className="bg-white/70 backdrop-blur-sm p-2 rounded-2xl inline-flex border border-purple-100 shadow-sm">
                  <TabsList className="bg-transparent gap-1.5 h-auto">
                    {[
                      { value: 'auto', label: '완전 자동 미션 생성' },
                      { value: 'youtube', label: '유튜브 딜러 모집' },
                      { value: 'sns', label: 'SNS 바이럴 (영상 생성)' },
                      { value: 'community', label: '커뮤니티 바이럴' },
                    ].map((tab) => (
                      <TabsTrigger 
                        key={tab.value}
                        value={tab.value} 
                        className="rounded-xl px-7 py-4 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg transition-all font-extrabold text-slate-500 text-base border border-transparent data-[state=active]:border-gray-100"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="mt-10">
                  <Suspense fallback={<TabLoading />}>
                    {activeTab === 'auto' && (
                      <TabsContent value="auto" className="animate-in fade-in duration-300">
                        <AutoMissionGenerate />
                      </TabsContent>
                    )}
                    {activeTab === 'youtube' && (
                      <TabsContent value="youtube" className="animate-in fade-in duration-300">
                        <YoutubeDealerRecruit />
                      </TabsContent>
                    )}
                    {activeTab === 'sns' && (
                      <TabsContent value="sns" className="animate-in fade-in duration-300">
                        <SnsViralManage />
                      </TabsContent>
                    )}
                    {activeTab === 'community' && (
                      <TabsContent value="community" className="animate-in fade-in duration-300">
                        <div className="space-y-10">
                          <Tabs defaultValue="general" className="w-full">
                            <TabsList className="bg-gray-100 p-1.5 rounded-xl mb-10 border border-gray-200 inline-flex">
                              <TabsTrigger value="general" className="rounded-lg font-extrabold py-4 px-12 data-[state=active]:bg-white text-base">
                                게시판형 커뮤니티
                              </TabsTrigger>
                              <TabsTrigger value="naver-cafe" className="rounded-lg font-extrabold py-4 px-12 data-[state=active]:bg-white text-base">
                                네이버 카페
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent value="general" className="animate-in fade-in duration-300">
                              <CommunityViralManage />
                            </TabsContent>
                            <TabsContent value="naver-cafe" className="animate-in fade-in duration-300">
                              <NaverCafeCrawl />
                            </TabsContent>
                          </Tabs>
                        </div>
                      </TabsContent>
                    )}
                  </Suspense>
                </div>
              </Tabs>
            </div>
        </div>
      </main>
    </div>
  )
}

export default App
