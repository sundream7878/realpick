import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 환경 변수 로드
const envPath = path.resolve(__dirname, '..', '..', '..', '.env.local');
dotenv.config({ path: envPath });

console.log('🔧 Firebase Admin 초기화 중...');

// Firebase Admin 초기화
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
  
  console.log('✅ Firebase Admin 초기화 완료');
}

const db = admin.firestore();

/**
 * 컬렉션 데이터 마이그레이션
 */
async function migrateCollection(oldName: string, newName: string): Promise<void> {
  console.log(`\n📦 [${oldName}] → [${newName}] 마이그레이션 시작...`);
  
  try {
    // 1. 기존 컬렉션 데이터 조회
    const snapshot = await db.collection(oldName).get();
    
    if (snapshot.empty) {
      console.log(`   ⚠️  [${oldName}] 컬렉션이 비어있습니다. 스킵합니다.`);
      return;
    }
    
    console.log(`   📊 총 ${snapshot.size}개 문서 발견`);
    
    // 2. 새 컬렉션에 복사 (배치 처리)
    const batchSize = 500; // Firestore 배치 제한
    let processedCount = 0;
    let batch = db.batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
      const newRef = db.collection(newName).doc(doc.id);
      const data = doc.data();
      
      batch.set(newRef, {
        ...data,
        _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        _originalCollection: oldName,
      });
      
      batchCount++;
      
      // 배치 크기 도달 시 커밋
      if (batchCount >= batchSize) {
        await batch.commit();
        processedCount += batchCount;
        console.log(`   ⏳ ${processedCount}/${snapshot.size} 처리 중...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    // 남은 문서 커밋
    if (batchCount > 0) {
      await batch.commit();
      processedCount += batchCount;
    }
    
    console.log(`   ✅ [${newName}] ${processedCount}개 문서 마이그레이션 완료`);
    
    // 3. 원본 컬렉션 백업 안내
    console.log(`   ⚠️  원본 [${oldName}] 컬렉션은 수동으로 백업 후 삭제하세요.`);
    
  } catch (error) {
    console.error(`   ❌ [${oldName}] 마이그레이션 실패:`, error);
    throw error;
  }
}

/**
 * 메인 마이그레이션 함수
 */
async function main() {
  console.log('\n🚀 리얼픽 마케팅 봇 데이터 마이그레이션');
  console.log('='.repeat(60));
  
  const migrations = [
    { old: 'viral_posts', new: 't_marketing_viral_posts' },
    { old: 'crawl_progress', new: 't_marketing_crawl_progress' },
    { old: 'videos', new: 't_marketing_videos' },
    { old: 'ai_missions', new: 't_marketing_ai_missions' },
  ];
  
  try {
    for (const { old: oldName, new: newName } of migrations) {
      await migrateCollection(oldName, newName);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 모든 마이그레이션 완료!');
    console.log('\n📋 다음 단계:');
    console.log('1. Firebase Console에서 새 컬렉션 확인');
    console.log('2. 기존 컬렉션 백업 (Firestore Export 권장)');
    console.log('3. 코드 테스트 후 기존 컬렉션 삭제');
    console.log('\n⚠️  주의: dealers 컬렉션은 변경하지 않았습니다 (메인 서비스와 공유)');
    
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// 실행
main().catch(console.error);
