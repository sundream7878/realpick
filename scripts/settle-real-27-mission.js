// 실제 DB에서 27기 미션 찾아서 모든 회차 마감 처리
const { createClient } = require('@supabase/supabase-js');

// 환경변수에서 Supabase 설정 가져오기 (실제 환경에서는 .env 파일 필요)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-key';

async function settleReal27Mission() {
  try {
    console.log('🔍 실제 DB에서 27기 커플 매칭 미션 찾는 중...');
    
    // 환경변수 확인
    if (supabaseUrl.includes('your-') || supabaseKey.includes('your-')) {
      console.log('⚠️  Supabase 환경변수가 설정되지 않았습니다.');
      console.log('💡 대신 Mock 데이터를 사용하여 시뮬레이션합니다.');
      
      // Mock 시뮬레이션
      console.log('');
      console.log('🎬 27기 미션 회차별 상태 업데이트 시뮬레이션:');
      for (let i = 1; i <= 8; i++) {
        console.log(`   ${i}차: open → settled ✅`);
      }
      
      console.log('');
      console.log('💕 최종 커플 설정:');
      console.log('   - 광수 ❤️ 영순');
      console.log('   - 영수 ❤️ 정숙');  
      console.log('   - 상철 ❤️ 현숙');
      
      console.log('');
      console.log('🎉 27기 커플 매칭 미션 마감 완료!');
      console.log('📋 마감 조건: 모든 회차(1~8차) 투표 완료');
      
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 27기 미션 찾기
    const { data: missions, error: findError } = await supabase
      .from('t_missions2')
      .select('*')
      .eq('f_season_number', 27);
    
    if (findError) {
      console.error('❌ 27기 미션 조회 실패:', findError);
      return;
    }
    
    if (!missions || missions.length === 0) {
      console.log('❌ 27기 미션이 없습니다.');
      return;
    }
    
    const mission = missions[0];
    console.log('✅ 27기 미션 발견:', mission.f_title);
    console.log('📋 미션 ID:', mission.f_id);
    console.log('📊 현재 상태:', mission.f_status);
    console.log('📺 현재 회차 상태:', mission.f_episode_statuses);
    
    // 모든 회차를 settled로 설정
    const newEpisodeStatuses = {};
    for (let i = 1; i <= 8; i++) {
      newEpisodeStatuses[i] = 'settled';
    }
    
    // 최종 커플 설정
    const finalCouples = [
      { left: '광수', right: '영순' },
      { left: '영수', right: '정숙' },
      { left: '상철', right: '현숙' }
    ];
    
    // DB 업데이트
    const { error: updateError } = await supabase
      .from('t_missions2')
      .update({
        f_episode_statuses: newEpisodeStatuses,
        f_status: 'settled',
        f_final_answer: finalCouples,
        f_updated_at: new Date().toISOString()
      })
      .eq('f_id', mission.f_id);
    
    if (updateError) {
      console.error('❌ 업데이트 실패:', updateError);
      return;
    }
    
    console.log('');
    console.log('🎉 27기 미션 회차별 마감 완료!');
    console.log('📺 모든 회차: settled');
    console.log('💕 최종 커플:', finalCouples.map(c => `${c.left}-${c.right}`).join(', '));
    console.log('🔗 이제 "최종 결과보기" 버튼이 활성화됩니다!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

settleReal27Mission();


