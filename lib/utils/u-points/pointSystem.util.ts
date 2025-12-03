export type TMissionType = 'binary' | 'multi' | 'match';

interface TPointInfo {
    win: number;
    lose: number;
    label: string; // UI 표시용 텍스트 (예: "+10P", "±100P")
}

/**
 * 미션 타입과 옵션에 따른 획득 가능 포인트를 계산합니다.
 * @param kind 미션 종류 ('poll' | 'predict' | 'majority')
 * @param type 미션 형태 ('binary' | 'multi' | 'match')
 * @param optionsCount 선택지 개수 (기본값 2)
 */
export const calculatePotentialPoints = (
    kind: 'poll' | 'predict' | 'majority',
    type: TMissionType,
    optionsCount: number = 2
): TPointInfo => {
    // 1. 공감 픽 (Poll/Majority)
    // 무조건 참여 시 +10P
    if (kind === 'poll' || kind === 'majority') {
        return {
            win: 10,
            lose: 0,
            label: "+10P"
        };
    }

    // 2. 예측 픽 (Predict)
    // 정답당 +100P, 오답당 -50P
    if (kind === 'predict') {
        if (type === 'multi') {
            // 다중 선택의 경우 정답 개수에 따라 달라지므로 "개당" 표시
            return {
                win: 100,
                lose: -50,
                label: "정답당 +100P"
            };
        }

        // 단일 선택 (Binary / Match 등)
        return {
            win: 100,
            lose: -50,
            label: "±100P" // 성공 시 +100, 실패 시 -50이지만 간략히 표기
        };
    }

    // 기본값
    return {
        win: 10,
        lose: 0,
        label: "+10P"
    };
};
