"use client"

import { useState, useEffect } from "react"
import { MockMissionRepo } from "@/lib/mock-mission-repo"
import type { TMissionData } from "@/types/t-mission/mission.types"

export function useMission(id: string) {
  const [mission, setMission] = useState<TMissionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMission = async () => {
      try {
        setLoading(true)
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500))
        const data = MockMissionRepo.getMission(id)
        if (!data) {
          setError("Mission not found")
        } else {
          setMission(data)
        }
      } catch (err) {
        setError("Failed to fetch mission")
      } finally {
        setLoading(false)
      }
    }

    fetchMission()
  }, [id])

  const submitVote = async (choiceId: string) => {
    if (!mission) return false

    try {
      const success = await MockMissionRepo.submitVote(mission.id, choiceId)
      if (success) {
        setMission((prev) => {
          if (!prev) return null

          const updatedMission = { ...prev, userChoice: choiceId }

          // If it was onclose, change to live and add percentages
          if (prev.status === "onclose") {
            updatedMission.status = "live"
            updatedMission.choices = prev.choices.map((choice) => ({
              ...choice,
              percentage: choice.id === choiceId ? 65 : 35,
            }))
          }

          return updatedMission
        })
      }
      return success
    } catch {
      return false
    }
  }

  return { mission, loading, error, submitVote }
}

