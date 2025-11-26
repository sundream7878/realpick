// 브라우저 콘솔에서 실행할 코드
// F12 > Console 탭에서 아래 코드를 복사해서 실행하세요

async function checkRealMissions() {
  try {
    console.log('🔍 실제 Supabase에 존재하는 미션들 확인 중...');
    
    // Supabase 클라이언트 생성 (브라우저에서 실행 시 사용 가능한 방법)
    const response = await fetch('https://yqfvlgwfqclsutjtluja.supabase.co/rest/v1/t_missions2?select=f_id,f_title,f_season_number,f_status,f_episode_statuses', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZnZsZ3dmcWNsc3V0anRsdWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5OTI0NjMsImV4cCI6MjA0NzU2ODQ2M30.VBmJoJZBNcJhHdJKMD7Ew4Nh2vCJcfGGdZGgvJhkwQI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZnZsZ3dmcWNsc3V0anRsdWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE7MzE5OTI0NjMsImV4cCI6MjA0NzU2ODQ2M30.VBmJoJZBNcJhHdJKMD7Ew4Nh2vCJcfGGdZGgvJhkwQI',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const missions = await response.json();
      console.log('✅ 실제 존재하는 커플 매칭 미션들:');
      console.table(missions);
      
      if (missions.length === 0) {
        console.log('❌ t_missions2 테이블에 데이터가 없습니다!');
        console.log('💡 실제 커플 매칭 미션을 생성해야 합니다.');
      } else {
        console.log(`📋 총 ${missions.length}개의 커플 매칭 미션 발견`);
        missions.forEach(mission => {
          console.log(`🎯 미션: ${mission.f_title} (ID: ${mission.f_id})`);
          console.log(`   상태: ${mission.f_status}`);
          console.log(`   회차 상태:`, mission.f_episode_statuses);
        });
      }
    } else {
      console.error('❌ API 요청 실패:', response.status, response.statusText);
      
      if (response.status === 406) {
        console.log('💡 406 에러는 보통 다음 원인들 때문입니다:');
        console.log('   1. 테이블이 존재하지 않음');
        console.log('   2. RLS(Row Level Security) 정책 문제');
        console.log('   3. API 키 권한 부족');
      }
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 함수 실행
checkRealMissions();


