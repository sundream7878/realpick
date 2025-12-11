/**
 * [숨쉬는 불빛 (Breathing Light) 알림 배지]
 * - 적용 위치: 탭 메뉴 텍스트 옆이나 아이콘 위 (relative 부모 필요)
 * - 그라데이션 색상: #4B466F (보라) -> #6EA4A9 (청록)
 * - 필수: Tailwind CSS 설정에서 animate-ping 유틸리티가 활성화되어 있어야 함 (기본값임).
 */

export default function BreathingLightBadge() {
    return (
        // 1. 위치 잡기 (부모 요소 기준 우상단 배치 예시)
        <span className="absolute top-3 right-3 flex h-3 w-3">

            {/* 2. 퍼져나가는 파동 효과 (Ping Animation) - 청록색 */}
            <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: '#6EA4A9' }}
            ></span>

            {/* 3. 중심점 그라데이션 및 발광 효과 (Glowing Dot) */}
            <span
                className="relative inline-flex rounded-full h-3 w-3"
                style={{
                    background: 'linear-gradient(135deg, #4B466F 0%, #6EA4A9 100%)',
                    boxShadow: '0 0 10px rgba(75, 70, 111, 0.6), 0 0 20px rgba(110, 164, 169, 0.4)'
                }}
            ></span>

        </span>
    );
}
