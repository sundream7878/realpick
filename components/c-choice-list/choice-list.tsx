"use client"

import { RadioGroup, RadioGroupItem } from "@/components/c-ui/radio-group"
import { Label } from "@/components/c-ui/label"
import type { TMissionData } from "@/types/t-mission/mission.types"

interface ChoiceListProps {
  mission: TMissionData
  selectedChoice: string
  onChoiceChange: (value: string) => void
  disabled?: boolean
}

export function ChoiceList({ mission, selectedChoice, onChoiceChange, disabled }: ChoiceListProps) {
  const showPercentage = mission.status === "live" || mission.status === "done"
  const isUserChoice = (choiceId: string) => mission.userChoice === choiceId

  return (
    <div className="space-y-4">
      {mission.status === "done" ? (
        // Show results without radio buttons
        <div className="space-y-3">
          {mission.choices.map((choice) => (
            <div
              key={choice.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                isUserChoice(choice.id) ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${isUserChoice(choice.id) ? "text-blue-700" : "text-gray-700"}`}>
                  {choice.text}
                </span>
                {showPercentage && (
                  <span className={`font-bold ${isUserChoice(choice.id) ? "text-blue-700" : "text-gray-700"}`}>
                    {choice.percentage}%
                  </span>
                )}
              </div>
              {isUserChoice(choice.id) && <div className="text-xs text-blue-600 mt-1">내 선택</div>}
            </div>
          ))}
        </div>
      ) : (
        // Show interactive radio buttons
        <RadioGroup value={selectedChoice} onValueChange={onChoiceChange} disabled={disabled}>
          <div className="space-y-3">
            {mission.choices.map((choice) => (
              <div key={choice.id} className="flex items-center space-x-3">
                <RadioGroupItem value={choice.id} id={choice.id} />
                <Label
                  htmlFor={choice.id}
                  className="flex-1 cursor-pointer p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{choice.text}</span>
                    {showPercentage ? (
                      <span className="font-bold text-gray-700">{choice.percentage}%</span>
                    ) : mission.status === "onclose" ? (
                      <span className="text-2xl text-gray-400">?</span>
                    ) : null}
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      )}
    </div>
  )
}

