// types/t-video/video.types.ts

export interface VideoScenario {
  duration: number
  fps: number
  scenes: VideoScene[]
  bgm?: {
    url: string
    volume: number
  }
}

export interface VideoScene {
  startTime: number
  endTime: number
  background: {
    type: 'gradient' | 'solid' | 'blur-thumbnail'
    colors?: string[]
    thumbnailUrl?: string
  }
  elements: VideoElement[]
}

export interface VideoElement {
  type: 'text' | 'image' | 'shape'
  content: string
  position: {
    x: number
    y: number
    width?: number
    height?: number
  }
  style: {
    fontSize?: number
    fontWeight?: string
    color?: string
    textAlign?: 'left' | 'center' | 'right'
    backgroundColor?: string
    borderRadius?: number
    padding?: number
  }
  animation?: {
    type: 'fade-in' | 'slide-in' | 'scale' | 'pulse'
    duration: number
    delay?: number
  }
}

export interface RenderingJob {
  id: string
  missionId: string
  track: 'auto' | 'dealer' | 'main' | 'result'
  status: 'queued' | 'rendering' | 'completed' | 'failed'
  videoPath?: string
  scenario?: VideoScenario
  snsContent?: Record<string, SnsContent>
  errorMessage?: string
  createdAt: Date
  completedAt?: Date
}

export interface SnsContent {
  caption: string
  hashtags: string
  cta: string
}

export interface SnsPost {
  id: string
  missionId: string
  track: 'auto' | 'dealer' | 'main' | 'result'
  platform: 'instagram' | 'youtube' | 'tiktok'
  postUrl?: string
  videoUrl: string
  status: 'pending' | 'uploading' | 'success' | 'failed'
  errorMessage?: string
  metadata: {
    mentions: string[]
    hashtags: string[]
    views?: number
    likes?: number
    comments?: number
  }
  createdAt: Date
  uploadedAt?: Date
}
