"use client"

interface TShowSelectorProps {
  selectedShow: "나는솔로" | "돌싱글즈"
  onShowChange: (show: "나는솔로" | "돌싱글즈") => void
  className?: string
}

export function ShowSelector({ selectedShow, onShowChange, className = "" }: TShowSelectorProps) {
  return (
    <div className={`flex items-center gap-1 sm:gap-4 ${className}`}>
      <button
        className={`text-xs sm:text-base font-semibold transition-colors ${
          selectedShow === "나는솔로"
            ? "text-pink-600 hover:text-pink-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => onShowChange("나는솔로")}
      >
        나는솔로
      </button>
      <div className="w-px h-3 sm:h-5 bg-gray-300"></div>
      <button
        className={`text-xs sm:text-base font-semibold transition-colors ${
          selectedShow === "돌싱글즈"
            ? "text-pink-600 hover:text-pink-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => onShowChange("돌싱글즈")}
      >
        돌싱글즈
      </button>
    </div>
  )
}

