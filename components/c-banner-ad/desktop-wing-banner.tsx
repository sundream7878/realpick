"use client"

import { X } from "lucide-react"

interface DesktopWingBannerProps {
  side: "left" | "right"
  className?: string
}

export function DesktopWingBanner({ side, className = "" }: DesktopWingBannerProps) {
  const isLeft = side === "left"
  
  // 가이드에 따른 위치 계산: 중앙 컨텐츠(max-w-7xl = 1280px) 양옆 여백 활용
  // 1280px / 2 = 640px (중앙에서 끝까지 거리)
  // 중앙에서 640px + 20px(여백) 떨어진 위치에 배치
  const positionStyle = isLeft 
    ? { right: "calc(50% + 660px)" } 
    : { left: "calc(50% + 660px)" }

  return (
    <div 
      className={`fixed top-24 w-[160px] hidden 2xl:block bg-white border border-rose-100 shadow-xl transition-all hover:border-rose-300 overflow-hidden rounded-2xl z-40 ${className}`}
      style={{ ...positionStyle, height: isLeft ? "600px" : "auto" }}
    >
      {isLeft ? (
        /* 좌측 배너 (Wing Left) - 리얼픽 핑크/퍼플 테마 */
        <div className="flex flex-col h-full">
          <div className="p-2 bg-rose-50/50 border-b border-rose-100">
            <span className="text-[10px] font-bold tracking-wider text-rose-400">ADVERTISING</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-purple-500 rounded-2xl mb-4 shadow-md flex items-center justify-center">
              <span className="text-3xl">🎁</span>
            </div>
            <h4 className="text-sm font-bold text-gray-800 mb-2">프리미엄 혜택</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              지금 리얼픽 멤버십에<br/>가입하고 더 많은<br/>포인트를 쌓으세요!
            </p>
          </div>
          <div className="p-4">
            <button className="w-full py-2 bg-rose-500 text-white text-xs font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-sm">
              자세히 보기
            </button>
          </div>
        </div>
      ) : (
        /* 우측 배너 (Wing Right) - 2단 분리 */
        <div className="flex flex-col gap-4 bg-transparent border-none shadow-none" style={{ border: 'none' }}>
          {/* 상단: 파트너/카페 */}
          <div className="h-[220px] bg-white border border-rose-100 rounded-2xl p-4 flex flex-col hover:border-rose-300 transition-all shadow-xl">
            <span className="text-[10px] font-bold tracking-wider text-rose-400 mb-2">PARTNER</span>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-3xl mb-2">☕</div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">리얼픽 공식 카페</h4>
              <p className="text-[11px] text-gray-500">팬들과 함께 소통하고<br/>이벤트를 확인하세요!</p>
            </div>
            <button className="w-full py-1.5 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-lg hover:bg-rose-100 transition-colors border border-rose-100">
              카페 바로가기
            </button>
          </div>

          {/* 하단: 앱 설치 유도 */}
          <div className="h-[220px] bg-white border border-rose-100 rounded-2xl p-4 flex flex-col hover:border-rose-300 transition-all shadow-xl">
            <span className="text-[10px] font-bold tracking-wider text-rose-400 mb-2">PWA APP</span>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-rose-50 p-1 rounded-xl mb-2 flex items-center justify-center border border-rose-100">
                {/* QR 코드 영역 (임시) */}
                <div className="w-full h-full bg-white rounded-lg flex items-center justify-center text-[10px] text-rose-300 font-bold">QR CODE</div>
              </div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">앱으로 즐기기</h4>
              <p className="text-[11px] text-gray-500">홈 화면에 추가하여<br/>빠르게 접속하세요!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
