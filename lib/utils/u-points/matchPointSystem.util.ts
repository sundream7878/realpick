
export type TFinalMatchResult = {
    [maleId: string]: string;
};

export type TUserPicks = {
    [episode: number]: {
        [maleId: string]: string;
    };
};

export type TPointTableItem = {
    round: number;
    correct: number;
    penalty: number;
};

export const POINT_TABLE: TPointTableItem[] = [
    { round: 1, correct: 1000, penalty: -500 },
    { round: 2, correct: 900, penalty: -450 },
    { round: 3, correct: 800, penalty: -400 },
    { round: 4, correct: 700, penalty: -350 },
    { round: 5, correct: 600, penalty: -300 },
    { round: 6, correct: 500, penalty: -250 },
    { round: 7, correct: 400, penalty: -200 },
    { round: 8, correct: 300, penalty: -150 },
];

export function calculateMatchVotePoints(
    finalResult: TFinalMatchResult,
    userPicks: TUserPicks,
    maxRounds: number = 8
): number {
    let totalPoints = 0;

    const processedMaleIds = new Set<string>();

    // Iterate over each pair in TFinalMatchResult
    Object.entries(finalResult).forEach(([maleId, finalFemaleId]) => {
        processedMaleIds.add(maleId);

        // Check the status of the pick in the last round (maxRounds)
        const finalRoundPicks = userPicks[maxRounds] || {};
        const finalPickFemaleId = finalRoundPicks[maleId];

        const isFinalCorrect = finalPickFemaleId === finalFemaleId;
        let rScore = maxRounds; // Default to maxRounds

        if (isFinalCorrect) {
            // Case A: Final Correct Pick
            for (let r = maxRounds; r >= 1; r--) {
                const roundPick = userPicks[r]?.[maleId];
                if (roundPick !== finalFemaleId) {
                    break;
                }
                rScore = r;
            }

            // Add Correct Point
            const pointItem = POINT_TABLE.find(p => p.round === rScore);
            if (pointItem) {
                totalPoints += pointItem.correct;
            }

        } else {
            // Case B: Final Incorrect Pick
            for (let r = maxRounds; r >= 1; r--) {
                const roundPick = userPicks[r]?.[maleId];
                if (roundPick === finalFemaleId) {
                    break;
                }
                rScore = r;
            }

            // Add Penalty Point
            const pointItem = POINT_TABLE.find(p => p.round === rScore);
            if (pointItem) {
                totalPoints += pointItem.penalty;
            }
        }
    });

    // Handle "Ghost Picks" (User picked a couple, but the male is actually single/not in final result)
    const finalRoundPicks = userPicks[maxRounds] || {};
    Object.keys(finalRoundPicks).forEach((maleId) => {
        if (!processedMaleIds.has(maleId)) {
            // User picked this male, but he is not in the final result (Single)
            // This is automatically an Incorrect Pick
            let rScore = maxRounds;

            for (let r = maxRounds; r >= 1; r--) {
                const roundPick = userPicks[r]?.[maleId];
                // If user didn't pick anyone for this male in round r, they were "correct" (or at least not wrong)
                // So the streak of "wrongly picking someone" stops.
                if (!roundPick) {
                    break;
                }
                rScore = r;
            }

            // Add Penalty Point
            const pointItem = POINT_TABLE.find(p => p.round === rScore);
            if (pointItem) {
                totalPoints += pointItem.penalty;
            }
        }
    });

    return totalPoints;
}
