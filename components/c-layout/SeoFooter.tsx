import { SHOWS, CATEGORIES, type TShowCategory } from "@/lib/constants/shows"
import Link from "next/link"

export function SeoFooter() {
  const allShows = Object.values(SHOWS).flat()
  
  return (
    <footer className="bg-gray-50 border-t border-gray-100 py-12 px-4 mt-20 hidden md:block">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">리얼픽 (RealPick)</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              나는솔로, 돌싱글즈 등 리얼 예능 프로그램의 결과를 예측하고 투표하는 시청자 참여형 플랫폼입니다. 당신의 촉을 믿고 최고의 픽마스터에 도전하세요.
            </p>
          </div>
          
          <div className="col-span-3">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">인기 프로그램 투표</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {allShows.map((show) => (
                <Link 
                  key={show.id} 
                  href={`/?show=${show.id}`}
                  className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
                >
                  {show.displayName} 투표
                </Link>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-400">
            © 2026 RealPick. All entertainment program names and logos are trademarks of their respective owners.
          </p>
          <div className="flex gap-6">
            <span className="text-xs text-gray-400">#나는솔로투표</span>
            <span className="text-xs text-gray-400">#돌싱글즈예측</span>
            <span className="text-xs text-gray-400">#연애예능커뮤니티</span>
            <span className="text-xs text-gray-400">#서바이벌결과</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
