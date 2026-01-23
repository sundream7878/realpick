import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp,
  addDoc,
  getDoc
} from "firebase/firestore";
import { db } from "./config";
import { TRecruit } from "../constants/recruits";

const COLLECTION_NAME = "recruits";

export async function getAllRecruits() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("endDate", "desc"));
    const querySnapshot = await getDocs(q);
    const recruits = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];
    return { success: true, recruits };
  } catch (error: any) {
    console.error("Error getting recruits:", error);
    return { success: false, error: error.message };
  }
}

export async function addRecruit(recruitData: Omit<TRecruit, "id">) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...recruitData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "open"
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error("Error adding recruit:", error);
    return { success: false, error: error.message };
  }
}

export async function updateRecruit(id: string, recruitData: Partial<TRecruit>) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...recruitData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating recruit:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRecruit(id: string) {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting recruit:", error);
    return { success: false, error: error.message };
  }
}
