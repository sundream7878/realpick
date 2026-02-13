/**
 * Remotion 루트 - 쇼츠 컴포지션 등록
 */
import React from 'react'
import { Composition, staticFile } from 'remotion'
import { ShortsVideo } from './ShortsVideo'

export type ShortsProps = {
  hookMessage: string
  question: string
  optionA: string
  optionB: string
  /** 배경 이미지 URL (thumbnail, scene_1, scene_2, ...) */
  sceneUrls: string[]
  /** TTS 나레이션 오디오 URL */
  ttsUrl: string
  /** BGM URL (선택) */
  bgmUrl?: string
}

const FPS = 30
const WIDTH = 1080
const HEIGHT = 1920
const DEFAULT_DURATION_FRAMES = 10 * FPS

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Shorts"
        component={ShortsVideo}
        durationInFrames={DEFAULT_DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          hookMessage: '지금 난리난 한마디',
          question: '사이다인가? 무례인가?',
          optionA: '완전 사이다',
          optionB: '선 넘은 무례함',
          sceneUrls: [],
          ttsUrl: '',
          bgmUrl: staticFile('assets/realpick_theme_suno.mp3'),
        }}
      />
    </>
  )
}
