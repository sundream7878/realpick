// 27기 미션 마감 처리 스크립트
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function settle27Mission() {
  try {
    console.log('🔍 27기 미션 찾는 중...');
    
    // 27기 미션 찾기
    const { data: mission, error: findError } = await supabase
      .from('t_missions2')
      .select('*')
      .eq('f_season_number', 27)
      .single();
    
    if (findError) {
      if (findError.code === 'PGRST116') {
        console.error('❌ 27기 미션을 찾을 수 없습니다.');
        return;
      }
      console.error('❌ 27기 미션 조회 실패:', findError);
      return;
    }
    
    console.log('✅ 27기 미션 발견:', mission.f_title);
    console.log('📋 미션 ID:', mission.f_id);
    console.log('📊 현재 상태:', mission.f_status);
    
    // 최종 커플 설정
    const finalCouples = [
      { left: '광수', right: '영순' },
      { left: '영수', right: '정숙' },
      { left: '상철', right: '현숙' }
    ];
    
    console.log('💕 최종 커플 설정:', finalCouples);
    
    // 미션 마감 처리
    const { error: updateError } = await supabase
      .from('t_missions2')
      .update({
        f_status: 'settled',
        f_final_answer: finalCouples,
        f_updated_at: new Date().toISOString()
      })
      .eq('f_id', mission.f_id);
    
    if (updateError) {
      console.error('❌ 마감 처리 실패:', updateError);
      return;
    }
    
    console.log('🎉 27기 미션 마감 완료!');
    console.log('📝 최종 커플:', finalCouples.map(c => `${c.left}-${c.right}`).join(', '));
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

settle27Mission();

