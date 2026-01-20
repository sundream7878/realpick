"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/c-ui/dialog"
import { getUserPointLogs } from "@/lib/firebase/points"
import { getUserId } from "@/lib/auth-utils"
import type { TPointLog } from "@/types/t-vote/vote.types"
import { formatPoints } from "@/lib/utils/u-format-points/formatPoints.util"
import { Coins, History, ArrowUpRight, ArrowDownLeft, ExternalLink } from "lucide-react"

interface PointHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  totalPoints: number
}

export function PointHistoryModal({ isOpen, onClose, totalPoints }: PointHistoryModalProps) {
  const router = useRouter()
  const [logs, setLogs] = useState<TPointLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadLogs()
    }
  }, [isOpen])

  const handleLogClick = (log: TPointLog) => {
    if (log.missionId) {
      onClose()
      router.push(`/p-mission/${log.missionId}/results`)
    }
  }

  async function loadLogs() {
    const userId = getUserId()
    console.log('[PointHistoryModal] 포인트 내역 로드 시작 - userId:', userId)
    
    if (!userId) {
      console.warn('[PointHistoryModal] userId가 없습니다')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const pointLogs = await getUserPointLogs(userId)
      console.log('[PointHistoryModal] 포인트 내역 로드 완료:', pointLogs.length, '건')
      console.log('[PointHistoryModal] 첫 번째 로그:', pointLogs[0])
      setLogs(pointLogs)
    } catch (error) {
      console.error('[PointHistoryModal] 포인트 내역 로딩 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md h-[550px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Coins className="w-6 h-6 text-amber-500" />
            포인트 내역
          </DialogTitle>
          <DialogDescription className="sr-only">
            포인트 적립 및 차감 내역을 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {/* 요약 영역 */}
        <div className="px-6 py-4 bg-amber-50/50 border-y border-amber-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-amber-700 font-medium">현재 보유 포인트</span>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-gray-900">{formatPoints(totalPoints)}</span>
              <span className="text-lg font-bold text-amber-500">P</span>
            </div>
          </div>
          <div className="p-2 bg-white rounded-full shadow-sm">
            <History className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        {/* 내역 리스트 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="py-10 text-center text-gray-500">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              내역을 불러오는 중...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-gray-500 text-sm">
              포인트 적립 내역이 없습니다.
            </div>
          ) : (
            logs.map((log) => {
              const hasMission = !!log.missionId
              return (
                <div
                  key={log.id}
                  onClick={() => hasMission && handleLogClick(log)}
                  className={`flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white transition-colors ${
                    hasMission 
                      ? "hover:bg-amber-50 hover:border-amber-200 cursor-pointer active:scale-[0.98]" 
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${log.diff > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {log.diff > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 line-clamp-1">{log.reason}</span>
                        {hasMission && (
                          <ExternalLink className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(log.createdAt).toLocaleString("ko-KR", {
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ml-2 ${log.diff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {log.diff > 0 ? "+" : ""}{formatPoints(log.diff)}P
                  </div>
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

