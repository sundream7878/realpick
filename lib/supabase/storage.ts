
import { createClient } from "./client"

export async function uploadMissionImage(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const supabase = createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `mission-images/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('mission-images')
            .upload(filePath, file)

        if (uploadError) {
            console.error("이미지 업로드 실패:", uploadError)
            return { success: false, error: "이미지 업로드에 실패했습니다." }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('mission-images')
            .getPublicUrl(filePath)

        return { success: true, url: publicUrl }
    } catch (error) {
        console.error("이미지 업로드 중 오류:", error)
        return { success: false, error: "이미지 업로드 중 오류가 발생했습니다." }
    }
}
