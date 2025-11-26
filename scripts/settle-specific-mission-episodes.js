// 특정 미션의 회차들을 마감 처리하는 스크립트
const { settleSpecificEpisodes } = require('../lib/supabase/missions');

async function settleSpecificMissionEpisodes() {
  try {
    console.log('🎯 특정 미션의 회차 마감 처리 시작...');
    
    const missionId = '4c476d01-47b6-417a-983e-140ac979e6e1';
    const episodesToSettle = [1, 2, 3, 4, 5, 6, 7]; // 1~7회차
    
    const result = await settleSpecificEpisodes(missionId, episodesToSettle);
    
    if (result.success) {
      console.log('');
      console.log('🎉 회차 마감 처리 완료!');
      console.log('🔗 이제 해당 회차들은 "마감됨" 상태로 표시됩니다!');
      console.log('');
      console.log('💡 브라우저를 새로고침하여 변경사항을 확인하세요.');
    } else {
      console.error('❌ 처리 실패:', result.error);
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

settleSpecificMissionEpisodes();
