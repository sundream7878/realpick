"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface LiveTimerProps {
    deadline: string
    onEnd?: () => void
}

export function LiveTimer({ deadline, onEnd }: LiveTimerProps) {
    const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null)
    const [isEnded, setIsEnded] = useState(false)

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime()
            const target = new Date(deadline).getTime()
            const diff = target - now

            if (diff <= 0) {
                setIsEnded(true)
                setTimeLeft(null)
                if (onEnd) onEnd()
                return
            }

            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeLeft({ minutes, seconds })
        }

        calculateTimeLeft()
        const timer = setInterval(calculateTimeLeft, 1000)

        return () => clearInterval(timer)
    }, [deadline, onEnd])

    if (isEnded) {
        return <span className="text-gray-500 font-bold text-xs">종료됨</span>
    }

    if (!timeLeft) return null

    return (
        <div className="flex items-center gap-1 text-red-600 font-bold animate-pulse">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono">
                {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
            </span>
        </div>
    )
}
