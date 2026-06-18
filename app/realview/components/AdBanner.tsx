'use client';

import React, { useState } from 'react';

export default function AdBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 p-2 shadow-lg flex justify-between items-center max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">AD</div>
        <div className="text-left">
          <p className="text-xs text-white font-medium">실시간 예측하고 포인트 적립!</p>
          <p className="text-[10px] text-slate-400">멀린 패밀리앱에서 무료 이벤트 혜택받기</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="/realview/family"
          className="bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition-colors"
        >
          보기
        </a>
        <button
          onClick={() => setVisible(false)}
          className="text-slate-400 hover:text-white text-xs p-1"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
