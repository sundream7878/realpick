import * as admin from "firebase-admin";

const getAdminConfig = () => {
  // 1. 모든 환경 변수에 대해 강력한 공백 및 특수 문자 제거
  const cleanValue = (val: string | undefined) => val?.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  
  const projectId = cleanValue(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = cleanValue(process.env.FIREBASE_CLIENT_EMAIL);
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  console.log('[Firebase Admin] 환경 변수 체크:', {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
    projectId: projectId,
    clientEmail: clientEmail
  });

  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ Firebase Admin 환경 변수가 누락되었습니다.");
    return null;
  }

  // 2. 이메일 내부의 프로젝트 ID와 설정된 ID가 일치하는지 확인 (디버깅용)
  const emailProjectId = clientEmail.split('@')[1]?.split('.')[0];
  if (emailProjectId && projectId !== emailProjectId) {
    console.warn(`⚠️ 경고: FIREBASE_PROJECT_ID(${projectId})와 이메일 도메인(${emailProjectId})이 일치하지 않을 수 있습니다.`);
  }

  // 3. 프라이빗 키 정밀 처리
  if (privateKey) {
    privateKey = privateKey.trim();

    // 앞뒤 따옴표 제거 (여러 겹일 경우 포함)
    while (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1).trim();
    }
    
    // 역슬래시+n 문자열을 실제 줄바꿈 문자로 변환
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // 만약 \r\n이 섞여 있다면 \n으로 통일
    privateKey = privateKey.replace(/\r\n/g, '\n');

    // 이스케이프된 따옴표 처리
    privateKey = privateKey.replace(/\\"/g, '"').replace(/\\'/g, "'");
  }

  console.log('[Firebase Admin] 프라이빗 키 처리 결과:', {
    length: privateKey?.length,
    startsWith: privateKey?.substring(0, 30),
    isProperFormat: privateKey?.includes('BEGIN PRIVATE KEY') && privateKey?.includes('END PRIVATE KEY')
  });

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;
let adminStorage: admin.storage.Storage | null = null;

if (!admin.apps.length) {
  const config = getAdminConfig();
  if (config) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
        projectId: config.projectId, // 명시적으로 한 번 더 지정
      });
      console.log("✅ Firebase Admin SDK 초기화 성공");
      
      adminDb = admin.firestore();
      adminAuth = admin.auth();
      adminStorage = admin.storage();
    } catch (error) {
      console.error("❌ Firebase Admin SDK 초기화 실패:", error);
    }
  }
} else {
  adminDb = admin.firestore();
  adminAuth = admin.auth();
  adminStorage = admin.storage();
  console.log("✅ Firebase Admin SDK 이미 초기화됨");
}

export { adminDb, adminAuth, adminStorage };

