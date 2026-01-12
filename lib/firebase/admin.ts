import * as admin from "firebase-admin";

const getAdminConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error("❌ Firebase Admin 환경 변수가 누락되었습니다. .env.local 파일을 확인해주세요.");
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

