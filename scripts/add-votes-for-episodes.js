// 특정 미션의 2~7회차에 투표 데이터를 추가하는 스크립트
const { createClient } = require('@supabase/supabase-js');

async function addVotesForEpisodes() {
  try {
    console.log('🎯 2~7회차 투표 데이터 추가 시작...');
    
    const missionId = '4c476d01-47b6-417a-983e-140ac979e6e1';
    const userId = 'be394897-8f75-483a-b7ab-96a9997bf4a2'; // 현재 사용자 ID
    
    // 환경변수 대신 직접 값 사용 (개발용)
    const supabaseUrl = 'https://yqfvlgwfqclsutjtluja.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZnZsZ3dmcWNsc3V0anRsdWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5OTI0NjMsImV4cCI6MjA0NzU2ODQ2M30.VBmJoJZBNcJhHdJKMD7Ew4Nh2vCJcfGGdZGgvJhkwQI';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 각 회차별로 다른 커플 매칭 데이터 생성
    const episodeVotes = [
      { episode: 2, couples: [{ left: '영호', right: '옥순' }] },
      { episode: 3, couples: [{ left: '영철', right: '정숙' }] },
      { episode: 4, couples: [{ left: '광수', right: '영순' }] },
      { episode: 5, couples: [{ left: '영수', right: '정숙' }] },
      { episode: 6, couples: [{ left: '상철', right: '현숙' }] },
      { episode: 7, couples: [{ left: '영철', right: '정숙' }] }
    ];
    
    console.log('📝 투표 데이터 생성 중...');
    
    for (const vote of episodeVotes) {
      const voteData = {
        f_user_id: userId,
        f_mission_id: missionId,
        f_episode_no: vote.episode,
        f_connections: vote.couples,
        f_submitted: true,
        f_submitted_at: new Date().toISOString()
      };
      
      console.log(`   ${vote.episode}차: ${vote.couples.map(c => `${c.left}-${c.right}`).join(', ')}`);
      
      // 기존 투표가 있는지 확인
      const { data: existing } = await supabase
        .from('t_pickresult2')
        .select('f_id')
        .eq('f_user_id', userId)
        .eq('f_mission_id', missionId)
        .eq('f_episode_no', vote.episode)
        .single();
      
      if (existing) {
        console.log(`   ${vote.episode}차: 기존 투표 존재 - 업데이트`);
        
        const { error: updateError } = await supabase
          .from('t_pickresult2')
          .update({
            f_connections: vote.couples,
            f_submitted: true,
            f_submitted_at: new Date().toISOString()
          })
          .eq('f_id', existing.f_id);
          
        if (updateError) {
          console.error(`   ${vote.episode}차 업데이트 실패:`, updateError);
        }
      } else {
        console.log(`   ${vote.episode}차: 새 투표 생성`);
        
        const { error: insertError } = await supabase
          .from('t_pickresult2')
          .insert([voteData]);
          
        if (insertError) {
          console.error(`   ${vote.episode}차 생성 실패:`, insertError);
        }
      }
    }
    
    console.log('');
    console.log('📺 이제 회차 상태를 settled로 변경합니다...');
    
    // 2~7회차를 settled로 설정
    const { data: mission, error: fetchError } = await supabase
      .from('t_missions2')
      .select('f_episode_statuses')
      .eq('f_id', missionId)
      .single();
    
    if (fetchError) {
      console.error('미션 조회 실패:', fetchError);
      return;
    }
    
    const newStatuses = mission.f_episode_statuses || {};
    for (let i = 2; i <= 7; i++) {
      newStatuses[i] = 'settled';
    }
    
    const { error: updateError } = await supabase
      .from('t_missions2')
      .update({
        f_episode_statuses: newStatuses,
        f_updated_at: new Date().toISOString()
      })
      .eq('f_id', missionId);
    
    if (updateError) {
      console.error('회차 상태 업데이트 실패:', updateError);
      return;
    }
    
    console.log('');
    console.log('🎉 모든 작업 완료!');
    console.log('💕 2~7회차: "마감·참여" 상태로 변경');
    console.log('🔗 이제 최종 결과보기 페이지를 확인할 수 있습니다!');
    console.log('');
    console.log('💡 브라우저를 새로고침하여 변경사항을 확인하세요.');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

addVotesForEpisodes();

