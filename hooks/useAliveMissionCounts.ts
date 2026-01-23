import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { normalizeShowId, getShowById, normalizeCategory, SHOWS } from "@/lib/constants/shows"

export interface AliveCountData {
    categoryCounts: Record<string, number>
    showCounts: Record<string, number>
}

export function useAliveMissionCounts() {
    const [counts, setCounts] = useState<AliveCountData>({
        categoryCounts: {},
        showCounts: {}
    })

    useEffect(() => {
        const collections = ["missions1", "missions2"]
        // 각 컬렉션별 살아있는 미션 데이터를 관리
        const collectionMissions: Record<string, Record<string, { category: string, showId: string }>> = {
            "missions1": {},
            "missions2": {}
        }

        const updateAggregatedCounts = () => {
            const newCategoryCounts: Record<string, number> = {}
            const newShowCounts: Record<string, number> = {}

            // 1. 모든 컬렉션의 미션을 하나의 ID 기반 맵으로 통합 (중복 제거)
            const allUniqueMissions: Record<string, { category: string, showId: string }> = {}
            
            Object.values(collectionMissions).forEach(collectionMap => {
                Object.entries(collectionMap).forEach(([id, mission]) => {
                    allUniqueMissions[id] = mission;
                });
            });

            // 2. 통합된 유니크 미션들로 개수 산출
            Object.values(allUniqueMissions).forEach(m => {
                // 프로그램별 개수 산출
                if (m.showId && m.showId !== "unknown") {
                    newShowCounts[m.showId] = (newShowCounts[m.showId] || 0) + 1
                }
                
                // 카테고리별 개수 산출 (표준화된 카테고리 기준)
                if (m.category && m.category !== "unknown") {
                    newCategoryCounts[m.category] = (newCategoryCounts[m.category] || 0) + 1
                }
            });

            // 3. ⚠️ 핵심 수정: 카테고리 합계가 드롭다운 합계와 일치하도록 보정
            // 특정 카테고리에 속한 '등록된 프로그램'들의 미션 개수만 합산합니다.
            for (const catId of ["LOVE", "VICTORY", "STAR"] as const) {
                const showsInCat = SHOWS[catId] || [];
                let sum = 0;
                showsInCat.forEach(show => {
                    sum += (newShowCounts[show.id] || 0);
                });
                newCategoryCounts[catId] = sum;
            }

            console.log("[useAliveMissionCounts] Final Aggregated Counts:", {
                category: newCategoryCounts,
                show: newShowCounts
            });

            setCounts({
                categoryCounts: newCategoryCounts,
                showCounts: newShowCounts
            })
        }

        const unsubscribes = collections.map(colName => {
            const q = query(
                collection(db, colName),
                where("status", "==", "open")
            )

            return onSnapshot(q, (snapshot) => {
                const currentCollectionMap: Record<string, { category: string, showId: string }> = {}
                
                snapshot.docs.forEach(doc => {
                    const data = doc.data()
                    
                    // 1. 마감 시간 체크
                    let isExpired = false
                    if (data.deadline) {
                        const deadlineTime = data.deadline instanceof Timestamp 
                            ? data.deadline.toMillis() 
                            : new Date(data.deadline).getTime()
                        if (deadlineTime <= Date.now()) {
                            isExpired = true
                        }
                    }

                    // 2. 커플 매칭(missions2)인 경우 모든 회차 완료 여부 체크
                    if (colName === "missions2" && data.episodeStatuses) {
                        const totalEpisodes = data.totalEpisodes || 8
                        let settledCount = 0
                        for (let i = 1; i <= totalEpisodes; i++) {
                            if (data.episodeStatuses[i] === "settled") settledCount++
                        }
                        if (settledCount >= totalEpisodes) {
                            isExpired = true
                        }
                    }

                    if (!isExpired) {
                        const showId = normalizeShowId(data.showId) || data.showId || "unknown"
                        
                        // 1. 카테고리 결정 및 표준화
                        let category = normalizeCategory(data.category)
                        
                        // 2. 카테고리가 없으면 showId를 통해 역추적
                        if (!category && showId !== "unknown") {
                            const showInfo = getShowById(showId)
                            category = normalizeCategory(showInfo?.category)
                        }

                        currentCollectionMap[doc.id] = {
                            category: category || "unknown",
                            showId: showId
                        }
                    }
                })

                console.log(`[useAliveMissionCounts] ${colName} updated:`, Object.keys(currentCollectionMap).length, "alive missions");
                collectionMissions[colName] = currentCollectionMap
                updateAggregatedCounts()
            })
        })

        // 주기적으로 마감 시간을 체크하여 갱신 (1분마다)
        const timer = setInterval(() => {
            updateAggregatedCounts()
        }, 60000)

        return () => {
            unsubscribes.forEach(unsub => unsub())
            clearInterval(timer)
        }
    }, [])

    return counts
}
