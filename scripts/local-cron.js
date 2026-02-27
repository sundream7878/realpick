/**
 * 로컬 개발용 크론 스크립트
 * 15분마다 match-episode-open API를 호출하여 자동 회차 열기를 시뮬레이션
 */

const CRON_INTERVAL = 15 * 60 * 1000; // 15분 = 900초 = 900,000ms
const API_URL = 'http://localhost:3000/api/cron/match-episode-open?dev=1';

async function callMatchEpisodeOpen() {
  try {
    console.log(`[로컬 크론] ${new Date().toLocaleString('ko-KR')} - 회차 오픈 체크 시작...`);
    
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`[로컬 크론] 성공:`, data);
      if (data.opened > 0) {
        console.log(`🎉 ${data.opened}개 미션의 다음 회차가 열렸습니다!`);
      }
    } else {
      console.error(`[로컬 크론] 실패:`, data);
    }
  } catch (error) {
    console.error(`[로컬 크론] 에러:`, error.message);
  }
}

// 즉시 한 번 실행
callMatchEpisodeOpen();

// 15분마다 반복 실행
setInterval(callMatchEpisodeOpen, CRON_INTERVAL);

console.log(`🕐 로컬 크론 시작됨 - ${CRON_INTERVAL/1000/60}분마다 회차 오픈 체크`);
console.log(`📍 대상 API: ${API_URL}`);
console.log(`⏹️  중지하려면 Ctrl+C를 누르세요.\n`);