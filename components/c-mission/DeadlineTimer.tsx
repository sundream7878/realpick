"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface DeadlineTimerProps {
    deadline: string
    onEnd?: () => void
}

export function DeadlineTimer({ deadline, onEnd }: DeadlineTimerProps) {
    const calculateTimeLeft = (targetDate: string) => {
        const now = new Date().getTime()
        const target = new Date(targetDate).getTime()
        const diff = target - now

        if (diff <= 0) return null

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        return { days, hours, minutes }
    }

    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(() => calculateTimeLeft(deadline))
    const [isEnded, setIsEnded] = useState(false)

    useEffect(() => {
        const timer = setInterval(() => {
            const left = calculateTimeLeft(deadline)
            if (!left) {
                setIsEnded(true)
                setTimeLeft(null)
                if (onEnd) onEnd()
            } else {
                setTimeLeft(left)
            }
        }, 60000)

        return () => clearInterval(timer)
    }, [deadline, onEnd])

    if (isEnded) {
        return <span className="text-gray-500 font-bold text-xs">마감됨</span>
    }

    if (!timeLeft) return null
    // if (!timeLeft) return <span className="text-xs text-red-500">CALC...</span>

    return (
        <div className="flex items-center gap-1 text-purple-600 font-bold">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono">
                {timeLeft.days > 0 ? `D-${timeLeft.days} ` : ""}
                {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}
            </span>
        </div>
    )
}
