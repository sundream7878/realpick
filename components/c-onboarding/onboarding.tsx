"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/c-ui/button"
import { CheckCircle2, Users, TrendingUp, Vote, Heart, BarChart3, ArrowRight, Sparkles } from "lucide-react"
import Image from "next/image"

interface OnboardingProps {
  onGetStarted: () => void
}

export default function Onboarding({ onGetStarted }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      const step = Math.floor(scrollPosition / windowHeight)
      setCurrentStep(Math.min(step, 2))
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="flex-1 w-full">
      {/* Progress Indicator */}
      <div className="fixed top-20 right-8 z-50 hidden lg:flex flex-col gap-3">
        {[0, 1, 2].map((step) => (
          <button
            key={step}
            onClick={() => {
              window.scrollTo({
                top: step * window.innerHeight,
                behavior: 'smooth'
              })
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentStep === step 
                ? 'bg-gradient-to-r from-[#2C2745] to-[#3E757B] scale-125' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to step ${step + 1}`}
          />
        ))}
      </div>

      {/* STEP 1: 서비스 소개 */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className={`max-w-6xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center mb-16">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#2C2745]/10 to-[#3E757B]/10 rounded-full mb-6 animate-pulse">
              <Sparkles className="w-4 h-4 text-[#3E757B]" />
              <span className="text-sm font-medium bg-gradient-to-r from-[#2C2745] to-[#3E757B] bg-clip-text text-transparent">
                예능 시청의 새로운 경험
              </span>
            </div>

            {/* Main Message */}
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 leading-tight px-4">
              <span className="bg-gradient-to-r from-[#2C2745] to-[#3E757B] bg-clip-text text-transparent">
                예능을 보며,
              </span>
              <br />
              <span className="text-gray-900">
                실시간으로 판단하고 투표하는 곳
              </span>
            </h1>

            {/* Sub Message */}
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed px-4">
              연애, 오디션, 서바이벌 예능을<br className="md:hidden" />
              시청자들의 선택으로 기록합니다
            </p>

            {/* CTA Button */}
            <Button 
              onClick={onGetStarted}
              size="lg"
              className="bg-gradient-to-r from-[#2C2745] to-[#3E757B] hover:from-[#2C2745]/90 hover:to-[#3E757B]/90 text-white px-10 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              시작하기
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Visual Preview - 투표 카드 미리보기 */}
          <div className="relative max-w-6xl mx-auto px-2">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
              {/* 예시 투표 카드 1 - 로맨스 */}
              <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-100 hover:border-[#3E757B] transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#2C2745] to-[#3E757B] flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">나는 SOLO</h3>
                    <p className="text-sm text-gray-500">로맨스</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 font-medium">이번 회차 커플 예측</p>
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-[#3E757B]/20 to-[#3E757B]/10 rounded-lg p-3 border-2 border-[#3E757B]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-900">영수 ❤️ 영희</span>
                      <span className="text-sm font-bold text-[#2C2745]">68%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-[#2C2745] to-[#3E757B] h-2 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">영수 ❤️ 순자</span>
                      <span className="text-sm text-gray-600">32%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gray-400 h-2 rounded-full" style={{ width: '32%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 예시 투표 카드 2 - 서바이벌 */}
              <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-100 hover:border-[#3E757B] transition-all duration-300 transform hover:scale-105">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#2C2745] to-[#3E757B] flex items-center justify-center">
                    <Vote className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">흑백요리사</h3>
                    <p className="text-sm text-gray-500">서바이벌</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 font-medium">최종 우승자는?</p>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border-2 border-amber-200">
                  <span className="font-medium text-gray-900">나폴리 맛피아</span>
                  <span className="px-3 py-1 bg-amber-400 text-amber-900 rounded-full text-sm font-bold">
                    1위
                  </span>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-[#3E757B]">1,234명</span>이 이렇게 봤어요
                  </p>
                </div>
              </div>

              {/* 예시 투표 카드 3 - 오디션 */}
              <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-100 hover:border-[#3E757B] transition-all duration-300 transform hover:scale-105 sm:col-span-2 md:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#2C2745] to-[#3E757B] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">걸스온파이어</h3>
                    <p className="text-sm text-gray-500">오디션</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 font-medium">최종 데뷔 멤버는?</p>
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border-2 border-purple-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">⭐ 김지은</span>
                      <span className="px-2 py-1 bg-purple-500 text-white rounded-full text-xs font-bold">
                        득표 1위
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">⭐ 박수연</span>
                      <span className="text-xs text-gray-500">2위</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="flex justify-center animate-bounce">
              <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex items-start justify-center p-2">
                <div className="w-1 h-3 bg-gradient-to-b from-[#2C2745] to-[#3E757B] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 2: 핵심 가치 */}
      <section className="min-h-screen flex items-center justify-center px-4 py-12 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 px-4">
              <span className="bg-gradient-to-r from-[#2C2745] to-[#3E757B] bg-clip-text text-transparent">
                리얼픽이 특별한 이유
              </span>
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              단순한 투표가 아닌, 나만의 예측 데이터가 쌓입니다
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {/* 카드 1: 내 판단 확인 */}
            <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-[#3E757B] transform hover:-translate-y-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2C2745] to-[#3E757B] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900">
                내 판단, 맞았을까?
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                내가 고른 선택과 실제 결과를 비교하고
                정답률을 확인해보세요
              </p>
              <div className="mt-6 p-4 bg-gradient-to-r from-[#2C2745]/5 to-[#3E757B]/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">정답률</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#2C2745] to-[#3E757B] bg-clip-text text-transparent">
                    73%
                  </span>
                </div>
              </div>
            </div>

            {/* 카드 2: 다른 사람들의 생각 */}
            <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-[#3E757B] transform hover:-translate-y-2">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2C2745] to-[#3E757B] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900">
                사람들은 이렇게 봤어요
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                다수 의견과 인기 선택을 확인하고
                나와 비교해보세요
              </p>
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-gradient-to-r from-[#2C2745] to-[#3E757B] h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <span className="text-sm font-bold text-[#2C2745]">85%</span>
                </div>
                <p className="text-xs text-gray-500">다수 의견과 일치</p>
              </div>
            </div>

            {/* 카드 3: 패턴과 성향 */}
            <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-[#3E757B] transform hover:-translate-y-2 sm:col-span-2 md:col-span-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2C2745] to-[#3E757B] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-900">
                보다 보면, 패턴이 보입니다
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4">
                픽 기록, 점수, 티어로
                나만의 성향을 확인하세요
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">누적 포인트</p>
                  <p className="text-lg font-bold text-[#2C2745]">2,450P</p>
                </div>
                <div className="flex-1 p-3 bg-gradient-to-r from-[#2C2745]/10 to-[#3E757B]/10 rounded-lg text-center">
                  <p className="text-xs text-gray-600 mb-1">티어</p>
                  <p className="text-lg font-bold text-[#3E757B]">예측가</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 3: 핵심 기능 */}
      <section className="min-h-screen flex items-center justify-center px-4 py-12 sm:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 px-4">
              <span className="bg-gradient-to-r from-[#2C2745] to-[#3E757B] bg-clip-text text-transparent">
                이렇게 사용해요
              </span>
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-4">
              간단한 3단계로 예능 시청이 더 재미있어집니다
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12 mb-12 sm:mb-16">
            {/* 기능 1 */}
            <div className="text-center">
              <div className="relative mb-6 flex justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#2C2745] to-[#3E757B] rounded-3xl flex items-center justify-center shadow-xl transform hover:rotate-6 transition-transform">
                  <Vote className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 sm:right-auto sm:left-[calc(50%+2.5rem)] w-7 h-7 sm:w-8 sm:h-8 bg-[#3E757B] text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                  1
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900 px-2">
                장면마다 바로 투표하고
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-4">
                예능을 보면서 실시간으로
                내 생각을 투표로 남겨요
              </p>
            </div>

            {/* 기능 2 */}
            <div className="text-center">
              <div className="relative mb-6 flex justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#2C2745] to-[#3E757B] rounded-3xl flex items-center justify-center shadow-xl transform hover:rotate-6 transition-transform">
                  <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 sm:right-auto sm:left-[calc(50%+2.5rem)] w-7 h-7 sm:w-8 sm:h-8 bg-[#3E757B] text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                  2
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900 px-2">
                회차별로 결과를 예측하고
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-4">
                커플 매칭, 탈락자 등
                다음 회차 결과를 미리 예측해요
              </p>
            </div>

            {/* 기능 3 */}
            <div className="text-center sm:col-span-2 md:col-span-1">
              <div className="relative mb-6 flex justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#2C2745] to-[#3E757B] rounded-3xl flex items-center justify-center shadow-xl transform hover:rotate-6 transition-transform">
                  <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 sm:right-auto sm:left-[calc(50%+2.5rem)] w-7 h-7 sm:w-8 sm:h-8 bg-[#3E757B] text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                  3
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900 px-2">
                내 선택과 전체 선택을 비교합니다
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-4">
                다른 사람들의 생각과 비교하고
                내 예측 실력을 확인해요
              </p>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center px-4">
            <div className="inline-flex flex-col items-center gap-4 sm:gap-6 p-6 sm:p-8 bg-gradient-to-br from-[#2C2745]/5 to-[#3E757B]/5 rounded-3xl border-2 border-[#3E757B]/20 w-full max-w-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#3E757B]" />
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                  지금 시작해보세요
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-600 max-w-md px-2">
                로그인 후 바로 투표하고 예측할 수 있어요.<br />
                이메일만 있으면 3초 만에 시작 가능합니다!
              </p>
              <Button 
                onClick={onGetStarted}
                size="lg"
                className="bg-gradient-to-r from-[#2C2745] to-[#3E757B] hover:from-[#2C2745]/90 hover:to-[#3E757B]/90 text-white px-8 sm:px-12 py-5 sm:py-6 text-base sm:text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
              >
                시작하기
              </Button>
              <p className="text-xs sm:text-sm text-gray-500">
                ✓ 이메일 인증만으로 간편 가입
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

