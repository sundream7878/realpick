export type TMissionType = 'binary' | 'multi' | 'match';

interface TPointInfo {
    win: number;
    lose: number;
    label: string; // UI 표시용 텍스트 (예: "+10P", "±100P")
}

/**
 * 미션 타입과 옵션에 따른 획득 가능 포인트를 계산합니다.
 * @param type 미션 타입 ('binary' | 'multi' | 'match')
 * @param optionsCount 선택지 개수 (기본값 2)
 * @param episode 회차 (커플 매칭용, 기본값 1)
 */
export const calculatePotentialPoints = (
    type: TMissionType,
    optionsCount: number = 2,
    episode: number = 1
): TPointInfo => {
    // 1. 커플 매칭 (회차별 차등 점수)
    // 1회차: 100, 2회차: 90, ... 8회차: 30
    if (type === 'match') {
        const basePoint = 110;
        let point = basePoint - (episode * 10);

        // 최소 점수 보정 (8회차 이후는 30점 고정)
        if (point < 30) point = 30;

        // 최대 점수 보정 (1회차는 100점)
        if (point > 100) point = 100;

        return {
            win: point,
            lose: -point,
            label: `±${point}P`
        };
    }

    // 2. 다중 선택 (선택지 개수별 차등)
    // 3지: 30, 4지: 40, 5지: 50
    if (type === 'multi') {
        let point = 30; // 기본 3지선다
        if (optionsCount >= 4) point = 40;
        if (optionsCount >= 5) point = 50;

        return {
            win: point,
            lose: 0,
            label: `+${point}P`
        };
    }

    // 3. 기본 (이진 투표)
    // 정답 시 10점
    return {
        win: 10,
        lose: 0,
        label: "+10P"
    };
};
