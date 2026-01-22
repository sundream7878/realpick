import { TShowCategory } from "@/lib/constants/shows"

export interface ThemeColors {
    border: string
    bgGradient: string
    text: string
    button: string
    buttonHover: string
    badge: string
    badgeBorder: string
    badgeText: string
    subBadge: string
    subBadgeHover: string
    subBadgeBorder: string
    subBadgeText: string
    iconBg: string
    iconBorder: string
    iconText: string
    progressBar: string[]
    mysteryBox: {
        bg: string
        border: string
        iconBg: string
        text: string
        subText: string
    }
}

export const THEME_PALETTES: Record<string, ThemeColors> = {
    LOVE: {
        border: "border-pink-200",
        bgGradient: "from-pink-50 to-pink-100",
        text: "text-pink-700",
        button: "bg-pink-600",
        buttonHover: "hover:bg-pink-700",
        badge: "bg-pink-500",
        badgeBorder: "border-pink-600",
        badgeText: "text-white",
        subBadge: "bg-pink-100/60",
        subBadgeHover: "hover:bg-pink-100/90",
        subBadgeBorder: "border-pink-200",
        subBadgeText: "text-pink-700",
        iconBg: "bg-pink-100",
        iconBorder: "border-pink-200",
        iconText: "text-pink-600",
        progressBar: ["from-pink-400 to-pink-500", "from-purple-400 to-purple-500", "from-pink-300 to-purple-300"],
        mysteryBox: {
            bg: "from-purple-100 to-pink-100",
            border: "border-pink-300",
            iconBg: "from-purple-400 to-pink-400",
            text: "text-pink-700",
            subText: "text-pink-600"
        }
    },
    VICTORY: {
        border: "border-indigo-200",
        bgGradient: "from-indigo-50 to-blue-50",
        text: "text-indigo-700",
        button: "bg-indigo-600",
        buttonHover: "hover:bg-indigo-700",
        badge: "bg-indigo-500",
        badgeBorder: "border-indigo-600",
        badgeText: "text-white",
        subBadge: "bg-indigo-100/60",
        subBadgeHover: "hover:bg-indigo-100/90",
        subBadgeBorder: "border-indigo-200",
        subBadgeText: "text-indigo-700",
        iconBg: "bg-indigo-100",
        iconBorder: "border-indigo-200",
        iconText: "text-indigo-600",
        progressBar: ["from-indigo-400 to-blue-500", "from-blue-400 to-cyan-500", "from-indigo-300 to-blue-300"],
        mysteryBox: {
            bg: "from-indigo-100 to-blue-100",
            border: "border-indigo-300",
            iconBg: "from-indigo-400 to-blue-400",
            text: "text-indigo-700",
            subText: "text-indigo-600"
        }
    },
    STAR: {
        border: "border-yellow-200",
        bgGradient: "from-yellow-50 to-orange-50",
        text: "text-yellow-800",
        button: "bg-yellow-500",
        buttonHover: "hover:bg-yellow-600",
        badge: "bg-yellow-500",
        badgeBorder: "border-yellow-600",
        badgeText: "text-white",
        subBadge: "bg-yellow-100/60",
        subBadgeHover: "hover:bg-yellow-100/90",
        subBadgeBorder: "border-yellow-200",
        subBadgeText: "text-yellow-800",
        iconBg: "bg-yellow-100",
        iconBorder: "border-yellow-200",
        iconText: "text-yellow-700",
        progressBar: ["from-yellow-400 to-orange-500", "from-orange-400 to-red-500", "from-yellow-300 to-orange-300"],
        mysteryBox: {
            bg: "from-yellow-100 to-orange-100",
            border: "border-yellow-300",
            iconBg: "from-yellow-400 to-orange-400",
            text: "text-yellow-800",
            subText: "text-yellow-700"
        }
    },
    UNIFIED: {
        border: "border-indigo-400/30",
        bgGradient: "from-[var(--brand-navy)] to-slate-900",
        text: "text-white",
        button: "bg-gradient-to-r from-[var(--brand-pink)] to-[var(--brand-gold)]",
        buttonHover: "hover:opacity-90",
        badge: "bg-gradient-to-r from-[var(--brand-pink)] to-[var(--brand-gold)]",
        badgeBorder: "border-transparent",
        badgeText: "text-white font-bold",
        subBadge: "bg-white/20 backdrop-blur-sm",
        subBadgeHover: "hover:bg-white/30",
        subBadgeBorder: "border-white/10",
        subBadgeText: "text-white",
        iconBg: "bg-white/10",
        iconBorder: "border-white/20",
        iconText: "text-[var(--brand-gold)]",
        progressBar: ["from-[var(--brand-pink)] to-[var(--brand-gold)]", "from-indigo-400 to-blue-500", "from-pink-400 to-purple-500"],
        mysteryBox: {
            bg: "from-indigo-900/50 to-slate-900/50",
            border: "border-indigo-500/30",
            iconBg: "from-[var(--brand-pink)] to-[var(--brand-gold)]",
            text: "text-white",
            subText: "text-gray-300"
        }
    },
    PROFILE: {
        border: "border-[#3E757B]/30",
        bgGradient: "from-[#2C2745] to-[#3E757B]", // Darker custom gradient
        text: "text-white",
        button: "bg-white/20 backdrop-blur-sm",
        buttonHover: "hover:bg-white/30",
        badge: "bg-[#3E757B]",
        badgeBorder: "border-[#3E757B]",
        badgeText: "text-white",
        subBadge: "bg-white/20 backdrop-blur-sm",
        subBadgeBorder: "border-white/20",
        subBadgeText: "text-white",
        iconBg: "bg-white/10",
        iconBorder: "border-white/20",
        iconText: "text-[#3E757B]",
        progressBar: ["from-[#2C2745] to-[#3E757B]", "from-[#3E757B] to-emerald-500", "from-purple-400 to-[#2C2745]"],
        mysteryBox: {
            bg: "from-[#2C2745]/50 to-[#3E757B]/50",
            border: "border-[#3E757B]/30",
            iconBg: "from-[#2C2745] to-[#3E757B]",
            text: "text-white",
            subText: "text-[#3E757B]/80"
        }
    }
}

export function getThemeColors(category: TShowCategory | undefined): ThemeColors {
    // 카테고리가 없으면 통합(UNIFIED) 테마 반환
    if (!category) {
        return THEME_PALETTES.UNIFIED as ThemeColors
    }
    return THEME_PALETTES[category] || THEME_PALETTES.LOVE
}
