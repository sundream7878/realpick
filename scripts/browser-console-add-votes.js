// 브라우저 콘솔에서 실행할 코드
// F12 > Console 탭에서 아래 코드를 복사해서 실행하세요

async function addVotesForAllEpisodes() {
  try {
    console.log('🎯 2~7회차 투표 데이터 추가 시작...');
    
    const missionId = '4c476d01-47b6-417a-983e-140ac979e6e1';
    
    // 현재 사용자 ID 가져오기 (브라우저에서 실행 시 사용 가능)
    const userId = localStorage.getItem('rp_user_id') || 'be394897-8f75-483a-b7ab-96a9997bf4a2';
    console.log('👤 사용자 ID:', userId);
    
    // 각 회차별로 다른 커플 매칭 데이터
    const episodeVotes = [
      { episode: 2, couples: [{ left: '영호', right: '옥순' }] },
      { episode: 3, couples: [{ left: '영철', right: '정숙' }] },
      { episode: 4, couples: [{ left: '광수', right: '영순' }] },
      { episode: 5, couples: [{ left: '영수', right: '정숙' }] },
      { episode: 6, couples: [{ left: '상철', right: '현숙' }] },
      { episode: 7, couples: [{ left: '영철', right: '정숙' }] }
    ];
    
    console.log('📝 투표 데이터를 localStorage에 저장 중...');
    
    // localStorage에 투표 데이터 저장
    episodeVotes.forEach(vote => {
      const key = `rp_matchpick_${missionId}_${vote.episode}`;
      const submittedKey = `rp_matchpick_submitted_${missionId}_${vote.episode}`;
      
      localStorage.setItem(key, JSON.stringify(vote.couples));
      localStorage.setItem(submittedKey, 'true');
      
      console.log(`   ✅ ${vote.episode}차: ${vote.couples.map(c => `${c.left}-${c.right}`).join(', ')}`);
    });
    
    console.log('');
    console.log('🎉 모든 작업 완료!');
    console.log('💕 2~7회차: 투표 데이터 추가됨');
    console.log('🔄 페이지를 새로고침하면 "마감·참여" 상태로 표시됩니다!');
    
    // 자동 새로고침
    setTimeout(() => {
      console.log('🔄 페이지 새로고침...');
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 함수 실행
addVotesForAllEpisodes();


