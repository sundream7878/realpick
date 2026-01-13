import { MetadataRoute } from 'next'
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { generateSlug } from "@/lib/utils/u-seo/slug.util";

const BASE_URL = 'https://realpick.me'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 기본 페이지
  const routes = [
    '',
    '/p-missions',
    '/p-ranking',
    '/p-casting',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  try {
    // 미션 상세 페이지 (missions1, missions2)
    const [m1Snap, m2Snap] = await Promise.all([
      getDocs(query(collection(db, "missions1"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(db, "missions2"), orderBy("createdAt", "desc")))
    ]);
    
    const mission1Routes = m1Snap.docs.map((doc) => {
      const data = doc.data();
      const slug = generateSlug(data.title || "");
      return {
        url: `${BASE_URL}/p-mission/${doc.id}/${slug}/vote`,
        lastModified: data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      };
    })

    const mission2Routes = m2Snap.docs.map((doc) => {
      const data = doc.data();
      const slug = generateSlug(data.title || "");
      return {
        url: `${BASE_URL}/p-mission/${doc.id}/${slug}/vote`,
        lastModified: data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      };
    })

    return [...routes, ...mission1Routes, ...mission2Routes]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return routes
  }
}
