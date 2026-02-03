import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { submitVote1, submitVote2 } from "@/lib/firebase/votes";
import type { TShowCategory } from "@/lib/constants/shows";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryVotes, delay = 0 } = body;

    if (!categoryVotes) {
      return NextResponse.json({ 
        success: false, 
        error: "categoryVotes가 필요합니다. 예: { LOVE: 10, VICTORY: 10, STAR: 10 }" 
      }, { status: 400 });
    }

    // 1. 모든 봇 유저 가져오기
    const botsQuery = query(
      collection(db, "users"),
      where("isBot", "==", true)
    );
    const botsSnapshot = await getDocs(botsQuery);
    const allBots = botsSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    if (allBots.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "봇 유저가 없습니다. 먼저 가짜 유저를 생성해주세요." 
      });
    }

    console.log(`[Bot Vote] 총 ${allBots.length}명의 봇 발견`);

    const voteDetails: any[] = [];
    let totalVotes = 0;

    // 2. 카테고리별로 투표 진행
    for (const [category, voterCount] of Object.entries(categoryVotes)) {
      if (voterCount <= 0) continue;

      console.log(`[Bot Vote] ${category} 카테고리 처리 시작 (목표: ${voterCount}명)`);

      // 2-1. 해당 카테고리의 진행중인 미션 조회 (인덱스 없이 작동하도록 단순화)
      const missions1Query = query(
        collection(db, "missions1"),
        where("status", "==", "open"),
        limit(500)
      );
      const missions2Query = query(
        collection(db, "missions2"),
        where("status", "==", "open"),
        limit(500)
      );

      const [missions1Snap, missions2Snap] = await Promise.all([
        getDocs(missions1Query),
        getDocs(missions2Query)
      ]);

      // 클라이언트 측에서 카테고리 필터링
      const missions1 = missions1Snap.docs
        .map(doc => ({ id: doc.id, ...doc.data(), type: "missions1" }))
        .filter((m: any) => {
          const missionCategory = m.category || "";
          return missionCategory.toUpperCase() === category.toUpperCase();
        });
      
      const missions2 = missions2Snap.docs
        .map(doc => ({ id: doc.id, ...doc.data(), type: "missions2" }))
        .filter((m: any) => {
          const missionCategory = m.category || "";
          return missionCategory.toUpperCase() === category.toUpperCase();
        });
      
      const allMissions = [...missions1, ...missions2];

      console.log(`[Bot Vote] ${category} 미션 조회 결과: missions1=${missions1.length}, missions2=${missions2.length}, 총=${allMissions.length}개`);

      if (allMissions.length === 0) {
        console.log(`[Bot Vote] ${category} 카테고리에 진행중인 미션이 없습니다.`);
        console.log(`[Bot Vote] 전체 미션 수: missions1=${missions1Snap.size}, missions2=${missions2Snap.size}`);
        continue;
      }

      console.log(`[Bot Vote] ${category}: ${allMissions.length}개 미션 발견, ${voterCount}명 투표 예정`);

      // 2-2. 랜덤으로 봇 선택하여 투표
      const shuffledBots = [...allBots].sort(() => Math.random() - 0.5);
      const selectedBots = shuffledBots.slice(0, voterCount);

      for (const bot of selectedBots) {
        // 랜덤으로 미션 선택
        const mission = allMissions[Math.floor(Math.random() * allMissions.length)] as any;
        
        console.log(`[Bot Vote] ${bot.nickname}이(가) "${mission.title}" 미션에 투표 시도 (타입: ${mission.type})`);
        
        try {
          let voteResult;

          if (mission.type === "missions1") {
            // 일반 미션 (binary, multi, tournament)
            const options = mission.options || [];
            console.log(`[Bot Vote] 미션 옵션 수: ${options.length}개`);
            if (options.length === 0) {
              console.log(`[Bot Vote] 옵션이 없어서 건너뜀`);
              continue;
            }

            const randomOption = options[Math.floor(Math.random() * options.length)];

            console.log(`[Bot Vote] submitVote1 호출 - missionId: ${mission.id}, userId: ${bot.uid}, choice: ${randomOption}`);
            
            voteResult = await submitVote1({
              missionId: mission.id,
              userId: bot.uid,
              choice: randomOption,
              submittedAt: new Date().toISOString()
            });

            console.log(`[Bot Vote] submitVote1 결과: ${voteResult}`);

            if (voteResult === true) {
              totalVotes++;
              voteDetails.push({
                bot: bot.nickname,
                mission: mission.title,
                option: randomOption,
                category
              });
              console.log(`[Bot Vote] ✅ 투표 성공! 현재 총 ${totalVotes}개`);
            } else {
              console.log(`[Bot Vote] ❌ 투표 실패`);
            }

          } else {
            // 커플매칭 미션
            const matchPairs = mission.matchPairs;
            console.log(`[Bot Vote] 커플매칭 미션 - matchPairs: ${JSON.stringify(matchPairs)}`);
            if (!matchPairs || !matchPairs.left || !matchPairs.right) {
              console.log(`[Bot Vote] matchPairs가 없어서 건너뜀`);
              continue;
            }

            const startEpisode = mission.startEpisode || 1;
            const totalEpisodes = mission.episodes || 8;
            
            // episodeStatuses 확인 - open 상태인 회차만 선택
            const episodeStatuses = mission.episodeStatuses || {};
            const openEpisodes = [];
            for (let ep = startEpisode; ep <= totalEpisodes; ep++) {
              if (episodeStatuses[ep] === "open") {
                openEpisodes.push(ep);
              }
            }

            if (openEpisodes.length === 0) continue;

            const randomEpisode = openEpisodes[Math.floor(Math.random() * openEpisodes.length)];
            
            // 랜덤 커플 생성
            const numCouples = Math.min(
              Math.floor(Math.random() * 3) + 1, // 1~3개 커플
              Math.min(matchPairs.left.length, matchPairs.right.length)
            );

            const shuffledLeft = [...matchPairs.left].sort(() => Math.random() - 0.5);
            const shuffledRight = [...matchPairs.right].sort(() => Math.random() - 0.5);
            
            const couples = [];
            for (let i = 0; i < numCouples; i++) {
              couples.push({
                left: shuffledLeft[i],
                right: shuffledRight[i]
              });
            }

            voteResult = await submitVote2({
              missionId: mission.id,
              userId: bot.uid,
              episodeNo: randomEpisode,
              pairs: couples,
              submittedAt: new Date().toISOString()
            });

            if (voteResult === true) {
              totalVotes++;
              voteDetails.push({
                bot: bot.nickname,
                mission: mission.title,
                option: `${randomEpisode}회 (${couples.length}개 커플)`,
                category
              });
              console.log(`[Bot Vote] ✅ 투표 성공! 현재 총 ${totalVotes}개`);
            } else {
              console.log(`[Bot Vote] ❌ 투표 실패`);
            }
          }

          // 딜레이 (서버 부하 방지)
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
          }

        } catch (error: any) {
          console.error(`[Bot Vote] ❌ ${bot.nickname} 투표 중 에러 발생:`, error);
          console.error(`[Bot Vote] 에러 상세:`, error.message, error.stack);
        }
      }
    }

    console.log(`[Bot Vote] ===== 투표 완료 =====`);
    console.log(`[Bot Vote] 총 투표 수: ${totalVotes}`);
    console.log(`[Bot Vote] 상세 내역: ${JSON.stringify(voteDetails, null, 2)}`);

    return NextResponse.json({
      success: true,
      count: totalVotes,
      details: voteDetails
    });

  } catch (error: any) {
    console.error("[Bot Vote] 전체 오류:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
