'use client';

import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  onToggleProgram?: () => void;
}

export default function Header({ onToggleProgram }: HeaderProps) {
  return (
    <header className="bg-[#f6fafe] border-b border-[#dfe3e7]/50 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 h-16 w-full max-w-[480px] mx-auto bg-[#f6fafe]">
        
        {/* Left: Original Logo */}
        <div className="flex-shrink-0">
          <Link href="/realview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/realpick-logo-new.png" 
              alt="RealPick Logo" 
              className="h-6 sm:h-7 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" 
            />
          </Link>
        </div>

        {/* Center: Centered Menu Items */}
        <nav className="flex items-center justify-center gap-4 flex-grow">
          <button 
            onClick={onToggleProgram}
            className="text-xs sm:text-sm font-semibold text-[#171c1f] hover:text-[#b90538] transition-colors"
          >
            프로그램
          </button>
          <Link 
            href="/realview/ocr" 
            className="text-xs sm:text-sm font-semibold text-[#171c1f] hover:text-[#b90538] transition-colors"
          >
            OCR인식
          </Link>
        </nav>

        {/* Right: Blue F Button */}
        <div className="flex-shrink-0">
          <a
            href="/realview/family"
            className="bg-[#1877F2] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-base shadow-sm hover:opacity-90 active:scale-95 transition-all"
          >
            F
          </a>
        </div>
      </div>
    </header>
  );
}
