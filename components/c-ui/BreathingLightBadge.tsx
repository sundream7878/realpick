/**
 * [숨쉬는 불빛 (Breathing Light) 알림 배지]
 * - 적용 위치: 탭 메뉴 텍스트 옆이나 아이콘 위 (relative 부모 필요)
 * - 색상: 빨간색 (#ef4444, red-500)
 * - 필수: Tailwind CSS 설정에서 animate-ping 유틸리티가 활성화되어 있어야 함 (기본값임).
 */

export default function BreathingLightBadge() {
    return (
        // 1. 위치 잡기 (부모 요소 기준 우상단 배치)
        <span className="flex h-2 w-2">

            {/* 2. 퍼져나가는 파동 효과 (Ping Animation) - 빨간색 */}
            <span
                className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-500 opacity-75"
            ></span>

            {/* 3. 중심점 발광 효과 (Glowing Dot) */}
            <span
                className="relative inline-flex rounded-full h-2 w-2 bg-red-500"
                style={{
                    boxShadow: '0 0 6px rgba(239, 68, 68, 0.8), 0 0 12px rgba(239, 68, 68, 0.5)'
                }}
            ></span>

        </span>
    );
}
