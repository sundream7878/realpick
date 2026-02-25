import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getUser, getUserByEmail, createUser, linkUserToFirebaseUid } from '@/lib/firebase/users';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: '이메일과 인증 코드를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { success: false, error: '서버 설정 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // Firestore에서 OTP 확인
    const otpDoc = await adminDb.collection('otp_codes').doc(email).get();
    
    if (!otpDoc.exists) {
      return NextResponse.json(
        { success: false, error: '인증 정보가 없습니다. 다시 요청해주세요.' },
        { status: 400 }
      );
    }

    const otpData = otpDoc.data();
    const now = new Date();
    const expiresAt = otpData?.expiresAt.toDate();

    if (otpData?.code !== code) {
      return NextResponse.json(
        { success: false, error: '인증 코드가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: '인증 코드가 만료되었습니다. 다시 요청해주세요.' },
        { status: 400 }
      );
    }

    // 인증 성공 - OTP 삭제
    await adminDb.collection('otp_codes').doc(email).delete();

    // 사용자 조회 또는 생성
    // Firebase Auth에서 이메일로 사용자 조회
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // 사용자가 없으면 생성
        firebaseUser = await adminAuth.createUser({
          email: email,
          emailVerified: true,
        });
      } else {
        throw error;
      }
    }

    const userId = firebaseUser.uid;
    
    // Firestore user data 확인 (lib/auth-api.ts의 handleMagicLinkCallback 로직 참고)
    // 1. 새로운 Firebase UID로 먼저 조회
    // 주의: adminDb를 직접 사용하거나 lib/firebase/users의 함수를 사용해야 하는데, 
    // lib/firebase/users는 클라이언트 SDK용이므로 서버에서는 adminDb를 사용해야 함.
    // 여기서는 간단히 adminDb로 직접 조회
    const userDoc = await adminDb.collection('users').doc(userId).get();
    let userData = userDoc.exists ? userDoc.data() : null;

    if (!userData) {
      // 2. 이메일로 기존 사용자 조회
      const usersRef = adminDb.collection('users');
      const q = await usersRef.where('email', '==', email).limit(1).get();
      
      if (!q.empty) {
        const existingUserDoc = q.docs[0];
        const existingUserId = existingUserDoc.id;
        console.log(`기존 유저 데이터 발견(${email}), 새로운 UID(${userId})와 연결합니다.`);
        
        // 데이터 복사
        userData = existingUserDoc.data();
        await adminDb.collection('users').doc(userId).set({
          ...userData,
          updatedAt: new Date(),
        });
      }
    }

    const isNewUser = !userData;

    if (isNewUser) {
      // 새 사용자 기본 데이터 생성
      userData = {
        id: userId,
        email: email,
        nickname: email.split('@')[0] || '사용자',
        points: 0,
        tier: '루키',
        role: 'PICKER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await adminDb.collection('users').doc(userId).set(userData);
    }

    const needsSetup = !userData?.ageRange || !userData?.gender;

    // Firebase Custom Token 생성
    const customToken = await adminAuth.createCustomToken(userId);

    return NextResponse.json({
      success: true,
      customToken,
      userId,
      isNewUser,
      needsSetup,
      email: userData?.email,
      nickname: userData?.nickname
    });

  } catch (error: any) {
    console.error('[OTP Verify] 오류 발생:', error);
    return NextResponse.json(
      { success: false, error: error.message || '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
