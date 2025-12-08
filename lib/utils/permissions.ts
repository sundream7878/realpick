import type { TUser } from "@/types/t-vote/vote.types"

/**
 * 사용자 역할 타입
 */
export type TUserRole = "PICKER" | "DEALER" | "MAIN_DEALER" | "ADMIN"

/**
 * 권한 타입 정의
 */
export interface Permission {
    canVote: boolean
    canComment: boolean
    canCreateBinaryMission: boolean
    canCreateMultiMission: boolean
    canCreateMatchMission: boolean
    canCreateTournamentMission: boolean
    canManageOwnMissions: boolean
    canManageAllMissions: boolean
    canManageUsers: boolean
    canSetMainMission: boolean
}

/**
 * 역할별 권한 매핑
 */
export const ROLE_PERMISSIONS: Record<TUserRole, Permission> = {
    PICKER: {
        canVote: true,
        canComment: true,
        canCreateBinaryMission: false,
        canCreateMultiMission: false,
        canCreateMatchMission: false,
        canCreateTournamentMission: false,
        canManageOwnMissions: false,
        canManageAllMissions: false,
        canManageUsers: false,
        canSetMainMission: false,
    },
    DEALER: {
        canVote: true,
        canComment: true,
        canCreateBinaryMission: true,
        canCreateMultiMission: true,
        canCreateMatchMission: false,
        canCreateTournamentMission: false,
        canManageOwnMissions: true,
        canManageAllMissions: false,
        canManageUsers: false,
        canSetMainMission: false,
    },
    MAIN_DEALER: {
        canVote: true,
        canComment: true,
        canCreateBinaryMission: true,
        canCreateMultiMission: true,
        canCreateMatchMission: true,
        canCreateTournamentMission: true,
        canManageOwnMissions: true,
        canManageAllMissions: false,
        canManageUsers: false,
        canSetMainMission: false,
    },
    ADMIN: {
        canVote: true,
        canComment: true,
        canCreateBinaryMission: true,
        canCreateMultiMission: true,
        canCreateMatchMission: true,
        canCreateTournamentMission: true,
        canManageOwnMissions: true,
        canManageAllMissions: true,
        canManageUsers: true,
        canSetMainMission: true,
    },
}

/**
 * 특정 권한을 가지고 있는지 확인
 */
export function hasPermission(
    role: TUserRole,
    permission: keyof Permission
): boolean {
    return ROLE_PERMISSIONS[role]?.[permission] ?? false
}

/**
 * 미션 생성 권한 확인
 */
export function canCreateMission(
    role: TUserRole,
    missionFormat: "binary" | "multi" | "match" | "tournament"
): boolean {
    switch (missionFormat) {
        case "binary":
            return hasPermission(role, "canCreateBinaryMission")
        case "multi":
            return hasPermission(role, "canCreateMultiMission")
        case "match":
            return hasPermission(role, "canCreateMatchMission")
        case "tournament":
            return hasPermission(role, "canCreateTournamentMission")
        default:
            return false
    }
}

/**
 * 미션 관리 권한 확인
 */
export function canManageMission(
    role: TUserRole,
    missionCreatorId: string,
    userId: string
): boolean {
    // 관리자는 모든 미션 관리 가능
    if (hasPermission(role, "canManageAllMissions")) {
        return true
    }

    // 딜러/메인딜러는 자신이 만든 미션만 관리 가능
    if (hasPermission(role, "canManageOwnMissions")) {
        return missionCreatorId === userId
    }

    return false
}

/**
 * 역할 체크 헬퍼 함수들
 */
export function isAdmin(role: TUserRole): boolean {
    return role === "ADMIN"
}

export function isMainDealer(role: TUserRole): boolean {
    return role === "MAIN_DEALER"
}

export function isDealer(role: TUserRole): boolean {
    return role === "DEALER"
}

export function isPicker(role: TUserRole): boolean {
    return role === "PICKER"
}

/**
 * 최소 역할 요구사항 확인
 */
export function hasMinimumRole(
    userRole: TUserRole,
    requiredRole: TUserRole
): boolean {
    const roleHierarchy: TUserRole[] = ["PICKER", "DEALER", "MAIN_DEALER", "ADMIN"]
    const userRoleIndex = roleHierarchy.indexOf(userRole)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

    return userRoleIndex >= requiredRoleIndex
}

/**
 * 역할 표시 이름 가져오기
 */
export function getRoleDisplayName(role: TUserRole): string {
    const roleNames: Record<TUserRole, string> = {
        PICKER: "일반 유저",
        DEALER: "딜러",
        MAIN_DEALER: "메인 딜러",
        ADMIN: "관리자",
    }

    return roleNames[role] || "알 수 없음"
}

/**
 * 역할 배지 색상 가져오기
 */
export function getRoleBadgeColor(role: TUserRole): string {
    const roleColors: Record<TUserRole, string> = {
        PICKER: "bg-gray-100 text-gray-800",
        DEALER: "bg-blue-100 text-blue-800",
        MAIN_DEALER: "bg-purple-100 text-purple-800",
        ADMIN: "bg-red-100 text-red-800",
    }

    return roleColors[role] || "bg-gray-100 text-gray-800"
}
