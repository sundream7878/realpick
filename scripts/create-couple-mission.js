// 실제 커플 매칭 미션을 Supabase에 생성하는 스크립트
const { createClient } = require('@supabase/supabase-js');

async function createCoupleMission() {
  try {
    console.log('🚀 27기 커플 매칭 미션 생성 중...');
    
    // 환경변수 대신 직접 값 사용 (개발용)
    const supabaseUrl = 'https://yqfvlgwfqclsutjtluja.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZnZsZ3dmcWNsc3V0anRsdWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5OTI0NjMsImV4cCI6MjA0NzU2ODQ2M30.VBmJoJZBNcJhHdJKMD7Ew4Nh2vCJcfGGdZGgvJhkwQI';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 기존 27기 미션이 있는지 확인
    const { data: existingMissions, error: checkError } = await supabase
      .from('t_missions2')
      .select('f_id, f_title')
      .eq('f_season_number', 27);
    
    if (checkError) {
      console.error('❌ 기존 미션 확인 실패:', checkError);
      return;
    }
    
    if (existingMissions && existingMissions.length > 0) {
      console.log('✅ 이미 27기 미션이 존재합니다:');
      existingMissions.forEach(mission => {
        console.log(`   - ${mission.f_title} (${mission.f_id})`);
      });
      return;
    }
    
    // 새 미션 데이터
    const missionData = {
      f_id: '5e31ffbd-e2f2-4625-acc8-d7a76661fca4', // Mock에서 사용하던 ID
      f_title: '[27기] 최종 커플은?',
      f_kind: 'prediction',
      f_form: 'match',
      f_season_type: '나는솔로',
      f_season_number: 27,
      f_match_pairs: {
        left: ['광수', '영수', '상철'],
        right: ['영순', '정숙', '현숙']
      },
      f_total_episodes: 8,
      f_episode_statuses: {
        1: 'settled', 2: 'settled', 3: 'settled', 4: 'settled',
        5: 'settled', 6: 'settled', 7: 'settled', 8: 'settled'
      },
      f_deadline: new Date('2024-12-31').toISOString(),
      f_reveal_policy: 'after_deadline',
      f_status: 'settled',
      f_final_answer: [
        { left: '광수', right: '영순' },
        { left: '영수', right: '정숙' },
        { left: '상철', right: '현숙' }
      ],
      f_stats_participants: 0,
      f_created_at: new Date().toISOString(),
      f_updated_at: new Date().toISOString()
    };
    
    console.log('📋 생성할 미션 데이터:');
    console.log(`   제목: ${missionData.f_title}`);
    console.log(`   시즌: ${missionData.f_season_number}기`);
    console.log(`   상태: ${missionData.f_status}`);
    console.log(`   총 회차: ${missionData.f_total_episodes}`);
    
    // 미션 생성
    const { data, error } = await supabase
      .from('t_missions2')
      .insert([missionData])
      .select();
    
    if (error) {
      console.error('❌ 미션 생성 실패:', error);
      return;
    }
    
    console.log('');
    console.log('🎉 27기 커플 매칭 미션 생성 완료!');
    console.log('📋 생성된 미션 ID:', data[0].f_id);
    console.log('💕 최종 커플:', data[0].f_final_answer.map(c => `${c.left}-${c.right}`).join(', '));
    console.log('🔗 이제 "최종 결과보기" 버튼이 활성화됩니다!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

createCoupleMission();

