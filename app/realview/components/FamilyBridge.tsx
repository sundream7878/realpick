'use client';

import React from 'react';

export default function FamilyBridge() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-8 text-center shadow-md">
      <div className="flex justify-center items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
        <span className="text-pink-500 font-bold text-xs tracking-wider uppercase">Merlin Family</span>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">리얼픽은 멀린 패밀리앱의 서비스입니다</h3>
      <p className="text-[11px] text-slate-400 mb-4">
        다양한 리얼예능 정보와 투표, 이벤트를 멀린의 다른 앱에서도 만나보세요.
      </p>
      
      <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
        <a
          href="/realview/family"
          className="flex flex-col items-center p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-all text-center"
        >
          <span className="text-lg mb-1">🔮</span>
          <span className="text-xs text-white font-semibold">멀린 허브</span>
          <span className="text-[9px] text-slate-500">패밀리앱 목록</span>
        </a>
        <button
          onClick={() => alert('이미 PWA 기능이 활성화되어 있습니다. 홈 화면에 추가를 눌러 앱처럼 사용해보세요!')}
          className="flex flex-col items-center p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-all text-center"
        >
          <span className="text-lg mb-1">📱</span>
          <span className="text-xs text-white font-semibold">PWA 앱 설치</span>
          <span className="text-[9px] text-slate-500">홈 화면에 추가</span>
        </button>
      </div>
    </div>
  );
}
