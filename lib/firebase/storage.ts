import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./config";

/**
 * Firebase Storage를 사용한 이미지 업로드
 */

export async function uploadMissionImage(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `mission-images/${fileName}`;
    const storageRef = ref(storage, filePath);

    const snapshot = await uploadBytes(storageRef, file);
    const publicUrl = await getDownloadURL(snapshot.ref);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("이미지 업로드 중 오류:", error);
    return { success: false, error: error.message || "이미지 업로드 중 오류가 발생했습니다." };
  }
}

