import { useState, useEffect } from 'react'
import { Card, CardContent } from './components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { LayoutDashboard, Users, Zap, Sparkles, Coffee, Instagram, Bell, User, LogOut } from 'lucide-react'
import { AutoMissionGenerate } from './components/AutoMissionGenerate'
import { YoutubeDealerRecruit } from './components/YoutubeDealerRecruit'
import { CommunityViralManage } from './components/CommunityViralManage'
import { NaverCafeCrawl } from './components/NaverCafeCrawl'
import { InstagramViralManage } from './components/InstagramViralManage'
import { FakeUserBotManage } from './components/FakeUserBotManage'
import { Badge } from './components/ui/badge'

function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')

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
              <Tabs defaultValue="auto" className="space-y-10">
                {/* 서브 탭 */}
                <div className="bg-white/70 backdrop-blur-sm p-2 rounded-2xl inline-flex border border-purple-100 shadow-sm">
                  <TabsList className="bg-transparent gap-1.5 h-auto">
                    {[
                      { value: 'auto', label: '완전 자동 미션 생성' },
                      { value: 'youtube', label: '유튜브 딜러 모집' },
                      { value: 'instagram', label: '인스타그램 바이럴' },
                      { value: 'bots', label: '가짜 유저 봇' },
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
                  <TabsContent value="auto" className="animate-in fade-in duration-300">
                    <AutoMissionGenerate />
                  </TabsContent>
                  <TabsContent value="youtube" className="animate-in fade-in duration-300">
                    <YoutubeDealerRecruit />
                  </TabsContent>
                  <TabsContent value="instagram" className="animate-in fade-in duration-300">
                    <InstagramViralManage />
                  </TabsContent>
                  <TabsContent value="bots" className="animate-in fade-in duration-300">
                    <FakeUserBotManage />
                  </TabsContent>
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
                </div>
              </Tabs>
            </div>
        </div>
      </main>
    </div>
  )
}

export default App
