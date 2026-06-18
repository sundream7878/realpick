'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mockPrograms } from './mockData';
import AdBanner from './components/AdBanner';
import Header from './components/Header';

export default function RealViewHome() {
  const router = useRouter();
  const [selectedProgram, setSelectedProgram] = useState('iam-solo');
  const [selectedSeason, setSelectedSeason] = useState('32');
  const [showProgramSelect, setShowProgramSelect] = useState(false);

  const handleGoToProgram = () => {
    router.push(`/realview/show/${selectedProgram}/${selectedSeason}`);
  };

  const handleToggleProgramMenu = () => {
    setShowProgramSelect(!showProgramSelect);
  };

  return (
    <div className="bg-[#f6fafe] text-[#171c1f] min-h-screen relative pb-[160px] font-sans antialiased max-w-[480px] mx-auto">
      {/* Google Material Symbols Outlined */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>

      {/* Unified Header */}
      <Header onToggleProgram={handleToggleProgramMenu} />

      <main className="w-full px-4 flex flex-col gap-6 mt-4">
        {/* Hero Section */}
        <section className="flex flex-col gap-3 items-center text-center py-8 bg-[#f0f4f8] rounded-2xl p-6 shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-[#dfe3e7]">
          <h2 className="text-2xl font-bold text-[#171c1f]">누가 누구였지?</h2>
          <p className="text-xs text-[#5b4041] max-w-[280px]">방송 보다가 헷갈릴 때, 출연자 정보를 바로 확인하세요.</p>
          <div className="flex flex-col gap-2 w-full mt-2">
            <Link
              href="/realview/ocr"
              className="w-full bg-[#b90538] text-white rounded-full py-3 px-6 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
            >
              <span className="material-symbols-outlined text-base">camera_alt</span>
              방송 화면 인식하기
            </Link>
          </div>

          <div className="flex items-center my-2 w-full">
            <hr className="flex-grow border-[#dfe3e7]" />
            <span className="px-3 text-[10px] text-slate-400 uppercase tracking-widest">or</span>
            <hr className="flex-grow border-[#dfe3e7]" />
          </div>

          {/* 복원 및 고도화된 직관적인 프로그램/기수 셀렉터 */}
          <div className="w-full space-y-3 text-left">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-[#5b4041] font-semibold mb-1">
                  프로그램 선택
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="w-full bg-white border border-[#dfe3e7] text-[#171c1f] text-xs font-semibold rounded-xl p-3 focus:outline-none focus:border-[#b90538] transition-colors shadow-sm"
                >
                  {mockPrograms.map((prog) => (
                    <option key={prog.slug} value={prog.slug}>
                      {prog.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[11px] text-[#5b4041] font-semibold mb-1">
                  기수 선택
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full bg-white border border-[#dfe3e7] text-[#171c1f] text-xs font-semibold rounded-xl p-3 focus:outline-none focus:border-[#b90538] transition-colors shadow-sm"
                >
                  <option value="32">32기 (최신)</option>
                  <option value="31">31기</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGoToProgram}
              className="w-full bg-[#575e70] hover:bg-[#404758] text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm active:scale-95 flex justify-center items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">arrow_forward</span>
              선택한 기수로 이동
            </button>
          </div>
        </section>

        {/* Dropdown Program Menu via Header Click */}
        {showProgramSelect && (
          <section className="bg-white border border-[#dfe3e7] rounded-xl p-4 shadow-sm animate-fadeIn">
            <h4 className="text-xs font-bold text-[#5b4041] mb-2">원하는 방송사를 선택하세요</h4>
            <div className="grid grid-cols-1 gap-2">
              {mockPrograms.map((prog) => (
                <button
                  key={prog.slug}
                  onClick={() => router.push(`/realview/show/${prog.slug}/32`)}
                  className="w-full text-left text-xs font-semibold p-3 hover:bg-[#f6fafe] rounded-lg transition-colors border border-transparent hover:border-[#dfe3e7]"
                >
                  📺 {prog.title}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Program Cards Grid */}
        <section className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-[#171c1f] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#b90538] text-lg">live_tv</span> 인기 프로그램
          </h3>
          <div className="grid grid-cols-2 gap-4">
            
            {/* Card 1: 나는 솔로 32기 (핵심) */}
            <div 
              onClick={() => router.push('/realview/show/iam-solo/32')}
              className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-[#dfe3e7] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="w-full h-28 bg-[#dfe3e7] relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  alt="나는 솔로 32기"
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&h=250&q=80"
                />
                <span className="absolute top-2 left-2 bg-[#b90538] text-white px-2 py-0.5 rounded text-[8px] font-bold">HOT</span>
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                <h4 className="text-xs font-bold text-[#171c1f] truncate group-hover:text-[#b90538] transition-colors">나는 솔로 32기</h4>
                <div className="flex flex-wrap gap-1">
                  <span className="bg-[#FDF2F8] text-[#b90538] px-1.5 py-0.5 rounded text-[9px] font-semibold">자기소개 기준</span>
                  <span className="bg-[#f0f4f8] text-[#5b4041] px-1.5 py-0.5 rounded text-[9px] font-semibold">스포일러 없음</span>
                </div>
              </div>
            </div>

            {/* Card 2: 나는 솔로 31기 */}
            <div 
              onClick={() => router.push('/realview/show/iam-solo/31')}
              className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-[#dfe3e7] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="w-full h-28 bg-[#dfe3e7] relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  alt="나는 솔로 31기"
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&h=250&q=80"
                />
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                <h4 className="text-xs font-bold text-[#171c1f] truncate group-hover:text-[#b90538] transition-colors">나는 솔로 31기</h4>
                <div className="flex flex-wrap gap-1">
                  <span className="bg-[#f0f4f8] text-[#5b4041] px-1.5 py-0.5 rounded text-[9px] font-semibold">자기소개 기준</span>
                </div>
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* Prominent OCR FAB */}
      <Link 
        href="/realview/ocr"
        className="fixed bottom-28 right-4 z-40 bg-[#b90538] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-[0_8px_20px_rgba(185,5,56,0.3)] hover:scale-105 active:scale-95 transition-all md:right-[calc(50%-220px)]"
      >
        <span className="material-symbols-outlined text-[28px]">camera_alt</span>
      </Link>

      {/* BottomNavBar */}
      <nav className="bg-white fixed bottom-[60px] left-0 w-full z-40 rounded-t-xl shadow-[0_-4px_15px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center px-4 pb-4 pt-2 max-w-[480px] mx-auto bg-white">
          <Link href="/realview" className="flex flex-col items-center justify-center bg-[#FDF2F8] text-[#b90538] rounded-xl px-3 py-1 scale-90 transition-all">
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] mt-1 font-bold">홈</span>
          </Link>
          <button onClick={handleToggleProgramMenu} className="flex flex-col items-center justify-center text-[#575e70] hover:text-[#b90538] transition-all">
            <span className="material-symbols-outlined">tv</span>
            <span className="text-[10px] mt-1 font-medium">프로그램</span>
          </button>
          <Link href="/realview/ocr" className="flex flex-col items-center justify-center text-[#575e70] hover:text-[#b90538] transition-all">
            <span className="material-symbols-outlined">details</span>
            <span className="text-[10px] mt-1 font-medium">OCR 인식</span>
          </Link>
          <a href="/realview/family" className="flex flex-col items-center justify-center text-[#575e70] hover:text-[#b90538] transition-all">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] mt-1 font-medium">마이</span>
          </a>
        </div>
      </nav>

      {/* Persistent Ad Banner */}
      <AdBanner />
    </div>
  );
}

