"use client"

import { useState } from "react"
import { Button } from "@/components/c-ui/button"
import { Input } from "@/components/c-ui/input"
import { Label } from "@/components/c-ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/c-ui/dialog"
import { Edit2, LogOut, UserX } from "lucide-react"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  nickname: string
  onNicknameChange?: (newNickname: string) => void
}

export default function ProfileModal({ isOpen, onClose, nickname, onNicknameChange }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedNickname, setEditedNickname] = useState(nickname)

  const handleSaveNickname = () => {
    if (onNicknameChange && editedNickname.trim()) {
      onNicknameChange(editedNickname.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedNickname(nickname)
    setIsEditing(false)
  }

  const handleLogout = () => {
    // TODO: 로그아웃 로직 구현
    console.log("로그아웃")
    onClose()
  }

  const handleDeleteAccount = () => {
    // TODO: 탈퇴 확인 다이얼로그 및 로직 구현
    if (confirm("정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      console.log("계정 탈퇴")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-md bg-gradient-to-br from-[#2C2745]/5 to-[#3E757B]/5 border-[#3E757B]/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">프로필</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 닉네임 섹션 */}
          <div className="bg-white/80 p-4 rounded-lg border border-[#3E757B]/20 space-y-3">
            <Label className="text-sm font-medium text-gray-700">닉네임</Label>
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editedNickname}
                  onChange={(e) => setEditedNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  className="border-[#3E757B]/30 focus:border-[#3E757B] focus:ring-[#3E757B]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent"
                    onClick={handleCancelEdit}
                  >
                    취소
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-[#2C2745] to-[#3E757B] hover:from-[#2C2745]/90 hover:to-[#3E757B]/90 text-white"
                    onClick={handleSaveNickname}
                  >
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">{nickname}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#3E757B]/30 text-[#3E757B] hover:bg-[#3E757B]/10 bg-transparent"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  변경
                </Button>
              </div>
            )}
          </div>

          {/* 계정 관리 섹션 */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start border-gray-300 text-gray-700 hover:bg-gray-50 bg-white/80"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-red-300 text-red-600 hover:bg-red-50 bg-white/80"
              onClick={handleDeleteAccount}
            >
              <UserX className="w-4 h-4 mr-2" />
              탈퇴
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

