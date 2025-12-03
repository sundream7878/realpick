
import { calculateMatchVotePoints, TFinalMatchResult, TUserPicks } from "../lib/utils/u-points/matchPointSystem.util";

// Test Case 1: Perfect Match (All Correct)
// User picked correctly from Round 1 to 8.
// Expected: Earliest Correct Streak starts at R1.
// Points: +1000 (for R1).
const testPerfectMatch = () => {
    console.log("--- Test Case 1: Perfect Match ---");

    const finalResult: TFinalMatchResult = {
        "m1": "f1"
    };

    const userPicks: TUserPicks = {};
    for (let i = 1; i <= 8; i++) {
        userPicks[i] = { "m1": "f1" };
    }

    const points = calculateMatchVotePoints(finalResult, userPicks);
    console.log(`Expected: 1000, Actual: ${points}`);
    console.log(points === 1000 ? "✅ PASS" : "❌ FAIL");
};

// Test Case 2: Late Success (Correct from Round 5)
// User was wrong R1-R4, Correct R5-R8.
// Expected: Earliest Correct Streak starts at R5.
// Points: +600 (for R5).
const testLateSuccess = () => {
    console.log("\n--- Test Case 2: Late Success (from R5) ---");

    const finalResult: TFinalMatchResult = {
        "m1": "f1"
    };

    const userPicks: TUserPicks = {};
    for (let i = 1; i <= 4; i++) {
        userPicks[i] = { "m1": "f99" }; // Wrong
    }
    for (let i = 5; i <= 8; i++) {
        userPicks[i] = { "m1": "f1" }; // Correct
    }

    const points = calculateMatchVotePoints(finalResult, userPicks);
    console.log(`Expected: 600, Actual: ${points}`);
    console.log(points === 600 ? "✅ PASS" : "❌ FAIL");
};

// Test Case 3: Incorrect Streak (Wrong at R8, deviation at R6)
// User was Correct R1-R5, Wrong R6-R8.
// Expected: Earliest Incorrect Streak starts at R6.
// Points: -250 (for R6).
const testIncorrectStreak = () => {
    console.log("\n--- Test Case 3: Incorrect Streak (Deviation at R6) ---");

    const finalResult: TFinalMatchResult = {
        "m1": "f1"
    };

    const userPicks: TUserPicks = {};
    for (let i = 1; i <= 5; i++) {
        userPicks[i] = { "m1": "f1" }; // Correct
    }
    for (let i = 6; i <= 8; i++) {
        userPicks[i] = { "m1": "f99" }; // Wrong
    }

    const points = calculateMatchVotePoints(finalResult, userPicks);
    console.log(`Expected: -250, Actual: ${points}`);
    console.log(points === -250 ? "✅ PASS" : "❌ FAIL");
};

// Test Case 4: Always Wrong
// User was Wrong R1-R8.
// Expected: Earliest Incorrect Streak starts at R1.
// Points: -500 (for R1).
const testAlwaysWrong = () => {
    console.log("\n--- Test Case 4: Always Wrong ---");

    const finalResult: TFinalMatchResult = {
        "m1": "f1"
    };

    const userPicks: TUserPicks = {};
    for (let i = 1; i <= 8; i++) {
        userPicks[i] = { "m1": "f99" }; // Wrong
    }

    const points = calculateMatchVotePoints(finalResult, userPicks);
    console.log(`Expected: -500, Actual: ${points}`);
    console.log(points === -500 ? "✅ PASS" : "❌ FAIL");
};

// Run Tests
console.log("Running Match Vote Point Logic Verification (Refined)...\n");
testPerfectMatch();
testLateSuccess();
testIncorrectStreak();
testAlwaysWrong();
console.log("\nVerification Complete.");
