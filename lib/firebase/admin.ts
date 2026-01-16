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
  privateKey = privateKey.replace(/\\n/g, "\n").replace(/^"(.*)"$/, "$1");

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

if (!admin.apps.length) {
  const config = getAdminConfig();
  if (config) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(config),
      });
      console.log("✅ Firebase Admin SDK 초기화 성공");
    } catch (error) {
      console.error("❌ Firebase Admin SDK 초기화 실패:", error);
    }
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();
const adminStorage = admin.storage();

export { adminDb, adminAuth, adminStorage };

