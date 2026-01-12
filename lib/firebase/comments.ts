import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  Timestamp,
  increment,
  setDoc,
  deleteField
} from "firebase/firestore";
import { db } from "./config";
import { TComment } from "@/types/t-vote/vote.types";

/**
 * Firestore를 사용한 댓글 관리
 */

// Firestore 데이터를 TComment로 변환
const mapFirestoreToComment = (id: string, data: any, replies: TComment[] = []): TComment => ({
  id: id,
  missionId: data.missionId,
  missionType: data.missionType,
  userId: data.userId,
  userNickname: data.userNickname || "알 수 없음",
  userTier: data.userTier || "루키",
  content: data.isDeleted ? "삭제된 댓글입니다." : data.content,
  parentId: data.parentId || null,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
  likesCount: data.likesCount || 0,
  repliesCount: data.repliesCount || 0,
  isLiked: false, // 별도 처리 필요
  isDeleted: data.isDeleted || false,
  replies: replies
});

// 댓글 목록 조회
export async function getComments(missionId: string, userId?: string): Promise<{ success: boolean; comments?: TComment[]; error?: string }> {
  try {
    // 1. 최상위 댓글 조회
    const q = query(
      collection(db, "comments"),
      where("missionId", "==", missionId),
      orderBy("createdAt", "asc")
    );
    const querySnapshot = await getDocs(q);
    
    // 2. 대댓글 조회 (모든 댓글에 대해 한꺼번에 조회하거나 루프 - 여기선 간단하게)
    const comments: TComment[] = [];
    
    // 좋아요 정보 가져오기 (로그인한 경우)
    const likedCommentIds = new Set<string>();
    if (userId) {
      const likesQ = query(collection(db, "comment_likes"), where("userId", "==", userId));
      const likesSnap = await getDocs(likesQ);
      likesSnap.forEach(doc => likedCommentIds.add(doc.data().commentId));
    }

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      const commentId = doc.id;
      
      // 대댓글 조회
      const repliesQ = query(
        collection(db, "replies"),
        where("commentId", "==", commentId),
        orderBy("createdAt", "asc")
      );
      const repliesSnap = await getDocs(repliesQ);
      const replies = repliesSnap.docs.map(rDoc => {
        const rData = rDoc.data();
        return mapFirestoreToComment(rDoc.id, rData);
      });

      const comment = mapFirestoreToComment(commentId, data, replies);
      comment.isLiked = likedCommentIds.has(commentId);
      comments.push(comment);
    }

    return { success: true, comments };
  } catch (error: any) {
    console.error("Firebase 댓글 조회 실패:", error);
    return { success: false, error: error.message };
  }
}

// 댓글 작성
export async function createComment(
  missionId: string,
  missionType: string,
  userId: string,
  userNickname: string,
  userTier: string,
  content: string
): Promise<{ success: boolean; comment?: TComment; error?: string }> {
  try {
    const payload = {
      missionId,
      missionType,
      userId,
      userNickname,
      userTier,
      content,
      likesCount: 0,
      repliesCount: 0,
      isDeleted: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "comments"), payload);
    const newDoc = await getDoc(docRef);
    
    return { 
      success: true, 
      comment: mapFirestoreToComment(docRef.id, newDoc.data()) 
    };
  } catch (error: any) {
    console.error("Firebase 댓글 작성 실패:", error);
    return { success: false, error: error.message };
  }
}

// 대댓글 작성
export async function createReply(
  commentId: string,
  userId: string,
  userNickname: string,
  userTier: string,
  content: string
): Promise<{ success: boolean; reply?: TComment; error?: string }> {
  try {
    const payload = {
      commentId,
      userId,
      userNickname,
      userTier,
      content,
      likesCount: 0,
      isDeleted: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "replies"), payload);
    
    // 부모 댓글의 repliesCount 증가
    await updateDoc(doc(db, "comments", commentId), {
      repliesCount: increment(1)
    });

    const newDoc = await getDoc(docRef);
    return { 
      success: true, 
      reply: mapFirestoreToComment(docRef.id, newDoc.data()) 
    };
  } catch (error: any) {
    console.error("Firebase 대댓글 작성 실패:", error);
    return { success: false, error: error.message };
  }
}

// 댓글 삭제 (Soft Delete)
export async function deleteComment(commentId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const commentRef = doc(db, "comments", commentId);
    const snap = await getDoc(commentRef);
    if (!snap.exists() || snap.data().userId !== userId) {
      return { success: false, error: "권한이 없거나 댓글이 존재하지 않습니다." };
    }

    await updateDoc(commentRef, { isDeleted: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 좋아요 토글
export async function toggleCommentLike(commentId: string, userId: string): Promise<{ success: boolean; isLiked?: boolean; likesCount?: number; error?: string }> {
  try {
    const likeId = `${userId}_${commentId}`;
    const likeRef = doc(db, "comment_likes", likeId);
    const likeSnap = await getDoc(likeRef);

    let isLiked = false;
    let diff = 0;

    if (likeSnap.exists()) {
      await deleteDoc(likeRef);
      isLiked = false;
      diff = -1;
    } else {
      await setDoc(likeRef, { userId, commentId, createdAt: serverTimestamp() });
      isLiked = true;
      diff = 1;
    }

    await updateDoc(doc(db, "comments", commentId), {
      likesCount: increment(diff)
    });

    const commentSnap = await getDoc(doc(db, "comments", commentId));
    return { success: true, isLiked, likesCount: commentSnap.data()?.likesCount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

