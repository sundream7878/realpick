/**
 * 리얼픽 쇼츠 템플릿: 배경 슬라이드 + 훅 + 질문 + VS 박스 + TTS/BGM
 */
import React from 'react'
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from 'remotion'
import type { ShortsProps } from './Root'

const SCENE_DURATION_FRAMES = 4 * 30 // 4초당 한 장
const SPRING_CONFIG = { damping: 15, stiffness: 120 }

export const ShortsVideo: React.FC<ShortsProps> = (props) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  const {
    hookMessage,
    question,
    optionA,
    optionB,
    sceneUrls,
    ttsUrl,
    bgmUrl,
  } = props

  // public 폴더 기준 상대 경로는 staticFile로, URL은 그대로
  const getAssetUrl = (u: string) =>
    !u || u.startsWith('http') || u.startsWith('data:') ? u : staticFile(u)
  const sceneSrcs =
    sceneUrls.length > 0
      ? sceneUrls.map(getAssetUrl)
      : ['https://placehold.co/1080x1920/1a1a1a/fff?text=Background']
  const currentSceneIndex = Math.min(
    Math.floor(frame / SCENE_DURATION_FRAMES),
    sceneSrcs.length - 1
  )
  const sceneProgress = (frame % SCENE_DURATION_FRAMES) / SCENE_DURATION_FRAMES
  const kenBurnsScale = interpolate(sceneProgress, [0, 1], [1, 1.1])
  const ttsStartFrame = 0
  const ttsVolume = 1
  const bgmVolume = interpolate(
    frame,
    [0, 15, Math.max(0, durationInFrames - 30), durationInFrames],
    [0.8, 0.3, 0.3, 0.8]
  )

  const hookSpring = spring({ frame, fps, config: SPRING_CONFIG })
  const hookTranslateY = interpolate(hookSpring, [0, 1], [-120, 0])

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* 배경: 다이내믹 슬라이드 + Ken Burns */}
      <AbsoluteFill>
        <Img
          src={sceneSrcs[currentSceneIndex]}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${kenBurnsScale})`,
            filter: 'blur(10px)',
          }}
        />
        <AbsoluteFill
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        />
      </AbsoluteFill>

      {/* 상단 검은 바 + 훅 */}
      <AbsoluteFill
        style={{
          top: 0,
          height: '15%',
          backgroundColor: '#000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            transform: `translateY(${hookTranslateY}px)`,
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 900,
            fontSize: 68,
            color: '#E4FF00',
            textAlign: 'center',
            textShadow: '0 0 8px #000, 2px 2px 0 #000, -2px -2px 0 #000',
            padding: '0 40px',
          }}
        >
          {hookMessage}
        </div>
      </AbsoluteFill>

      {/* 중앙 질문 */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <div
          style={{
            fontFamily: 'GmarketSansBold, sans-serif',
            fontWeight: 700,
            fontSize: 52,
            color: '#fff',
            textAlign: 'center',
            textShadow: '0 4px 24px rgba(0,0,0,0.9)',
            backgroundColor: 'rgba(45,45,45,0.85)',
            padding: '24px 48px',
            borderRadius: 28,
          }}
        >
          {question}
        </div>
      </AbsoluteFill>

      {/* 하단 VS 박스 */}
      <AbsoluteFill
        style={{
          bottom: '10%',
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '0 40px',
        }}
      >
        <div
          style={{
            flex: 1,
            maxWidth: 420,
            height: 280,
            background: 'linear-gradient(135deg, #E63946, #FF5C7A)',
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            padding: 24,
          }}
        >
          <span
            style={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 700,
              fontSize: 36,
              color: '#fff',
              textAlign: 'center',
            }}
          >
            {optionA}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'Pretendard, sans-serif',
            fontWeight: 900,
            fontSize: 56,
            color: '#fff',
            textShadow: '0 0 12px rgba(0,0,0,0.8)',
          }}
        >
          VS
        </div>
        <div
          style={{
            flex: 1,
            maxWidth: 420,
            height: 280,
            background: 'linear-gradient(135deg, #1D3557, #4D8DFF)',
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            padding: 24,
          }}
        >
          <span
            style={{
              fontFamily: 'Pretendard, sans-serif',
              fontWeight: 700,
              fontSize: 36,
              color: '#fff',
              textAlign: 'center',
            }}
          >
            {optionB}
          </span>
        </div>
      </AbsoluteFill>

      {/* TTS */}
      {ttsUrl ? (
        <Sequence from={ttsStartFrame}>
          <Audio src={getAssetUrl(ttsUrl)} volume={ttsVolume} />
        </Sequence>
      ) : null}

      {/* BGM (덕킹) */}
      {bgmUrl ? (
        <Audio src={getAssetUrl(bgmUrl)} volume={bgmVolume} />
      ) : null}
    </AbsoluteFill>
  )
}
