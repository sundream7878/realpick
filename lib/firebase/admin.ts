import * as admin from "firebase-admin";

const getAdminConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  console.log('[Firebase Admin] 환경 변수 체크:', {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
    projectId: projectId,
    clientEmail: clientEmail
  });

  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ Firebase Admin 환경 변수가 누락되었습니다:");
    console.error("  - FIREBASE_PROJECT_ID:", !!projectId);
    console.error("  - FIREBASE_CLIENT_EMAIL:", !!clientEmail);
    console.error("  - FIREBASE_PRIVATE_KEY:", !!privateKey);
    console.error("배포 환경(Vercel 등)의 환경 변수 설정을 확인해주세요.");
    return null;
  }

  // 프라이빗 키의 줄바꿈 처리 및 따옴표 제거
  if (privateKey) {
    // 1. 역슬래시+n 문자열을 실제 줄바꿈 문자로 변환
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // 2. 앞뒤의 모든 종류의 따옴표(쌍따옴표, 홑따옴표) 제거
    // 여러 번 감싸져 있을 경우를 대비해 반복적으로 제거
    while (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    
    // 3. 앞뒤 공백 제거
    privateKey = privateKey.trim();

    // 4. 만약 여전히 따옴표가 포함되어 있다면 (예: \"... \") 추가 처리
    privateKey = privateKey.replace(/\\"/g, '"').replace(/\\'/g, "'");
  }

  console.log('[Firebase Admin] 프라이빗 키 처리 완료:', {
    length: privateKey?.length,
    startsWith: privateKey?.substring(0, 20),
    endsWith: privateKey?.substring(privateKey.length - 20)
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
        credential: admin.credential.cert(config),
      });
      console.log("✅ Firebase Admin SDK 초기화 성공");
      
      adminDb = admin.firestore();
      adminAuth = admin.auth();
      adminStorage = admin.storage();
    } catch (error) {
      console.error("❌ Firebase Admin SDK 초기화 실패:", error);
      adminDb = null;
      adminAuth = null;
      adminStorage = null;
    }
  } else {
    console.error("❌ Firebase Admin 설정을 가져올 수 없습니다. 환경 변수를 확인하세요.");
    adminDb = null;
    adminAuth = null;
    adminStorage = null;
  }
} else {
  // 이미 초기화된 경우
  adminDb = admin.firestore();
  adminAuth = admin.auth();
  adminStorage = admin.storage();
  console.log("✅ Firebase Admin SDK 이미 초기화됨");
}

export { adminDb, adminAuth, adminStorage };

