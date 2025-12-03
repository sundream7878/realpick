
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
    userPicks: TUserPicks
): number {
    let totalPoints = 0;
    const maxRounds = 8;

    // Iterate over each pair in TFinalMatchResult
    Object.entries(finalResult).forEach(([maleId, finalFemaleId]) => {
        // Check the status of the pick in the last round (Round 8)
        const finalRoundPicks = userPicks[maxRounds] || {};
        const finalPickFemaleId = finalRoundPicks[maleId];

        // If no pick in final round, we treat it as incorrect or skip? 
        // The prompt implies we check TUserPicks[8][maleId]. 
        // If undefined, it's definitely not equal to finalFemaleId, so it falls to Incorrect case.

        const isFinalCorrect = finalPickFemaleId === finalFemaleId;
        let rScore = maxRounds; // Default to 8

        if (isFinalCorrect) {
            // Case A: Final Correct Pick
            // Rationale: R_score holds the earliest round that was part of the final correct streak.
            // We iterate backwards from 8 to 1 to find the start of the streak.

            for (let r = maxRounds; r >= 1; r--) {
                const roundPick = userPicks[r]?.[maleId];
                if (roundPick !== finalFemaleId) {
                    // Streak broke at r. So the streak started at r + 1.
                    break;
                }
                // If correct, update rScore to current r (potentially the new start)
                rScore = r;
            }

            // Add Correct Point
            const pointItem = POINT_TABLE.find(p => p.round === rScore);
            if (pointItem) {
                totalPoints += pointItem.correct;
            }

        } else {
            // Case B: Final Incorrect Pick
            // Rationale: Find the earliest round where their pick failed (Incorrect Streak).
            // We iterate backwards from 8 to 1 to find the start of the incorrect streak.

            for (let r = maxRounds; r >= 1; r--) {
                const roundPick = userPicks[r]?.[maleId];
                if (roundPick === finalFemaleId) {
                    // User was correct at r. So the incorrect streak started at r + 1.
                    break;
                }
                // If incorrect, update rScore to current r (potentially the new start of failure)
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
