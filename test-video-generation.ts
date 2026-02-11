// test-video-generation.ts
// 영상 생성 테스트 스크립트
// 실행: npx tsx test-video-generation.ts

import { generateVideoScenario } from './lib/video/scenario-generator'
import { renderVideoFromScenario } from './lib/video/canvas-renderer'
import { generateMultiPlatformContent } from './lib/viral/content-generator'

const testMission = {
  id: 'test-001',
  title: '나는 솔로 영호 vs 광수, 누가 더 인기 많을까?',
  showId: 'nasolo',
  optionA: '영호 (진중한 매력)',
  optionB: '광수 (유머러스한 매력)',
  thumbnailUrl: undefined
}

async function test() {
  console.log('🎬 영상 생성 테스트 시작\n')
  
  try {
    // 1. Gemini: 시나리오 생성
    console.log('1️⃣ Gemini 시나리오 생성 중...')
    const scenario = await generateVideoScenario({
      mission: testMission,
      track: 'auto'
    })
    console.log(`✅ 시나리오 생성 완료: ${scenario.scenes.length}개 장면\n`)
    
    // 2. Gemini: SNS 콘텐츠 생성
    console.log('2️⃣ SNS 콘텐츠 생성 중...')
    const snsContent = await generateMultiPlatformContent({
      mission: testMission,
      track: 'auto',
      platforms: ['instagram', 'youtube']
    })
    console.log('✅ SNS 콘텐츠 생성 완료')
    console.log('\n📱 Instagram 캡션:')
    console.log(snsContent.instagram?.caption || '(없음)')
    console.log('\n🏷️ 해시태그:')
    console.log(snsContent.instagram?.hashtags || '(없음)')
    console.log('')
    
    // 3. Canvas: 영상 렌더링
    console.log('3️⃣ Canvas 영상 렌더링 시작... (2~3분 소요)')
    console.log('   ⏰ 잠시 기다려주세요...\n')
    
    const videoPath = await renderVideoFromScenario({
      missionId: testMission.id,
      scenario,
      thumbnailUrl: testMission.thumbnailUrl
    })
    
    console.log('\n✅ 모든 작업 완료!')
    console.log(`\n📹 영상 경로: ${videoPath}`)
    console.log('\n💡 영상을 확인하세요!')
    
  } catch (error: any) {
    console.error('\n❌ 오류 발생:', error.message)
    console.error('\n📋 상세:', error)
    
    console.log('\n💡 문제 해결:')
    console.log('  1. FFmpeg 설치 확인: ffmpeg -version')
    console.log('  2. Gemini API 키 확인: .env.local')
    console.log('  3. 폰트 파일 확인: assets/fonts/Pretendard-Bold.ttf')
    console.log('\n📚 자세한 가이드: SETUP_GUIDE.md')
  }
}

// 실행
test()
