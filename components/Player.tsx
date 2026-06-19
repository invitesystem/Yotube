'use client'
import { useEffect, useRef, useState } from 'react'
import { RoomState } from './useRoom'
import { playerBus } from '@/lib/playerBus'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

// расшифровка кодов ошибок YouTube IFrame
function errText(code: number) {
  if (code === 101 || code === 150)
    return 'Владелец запретил встраивание этого видео (или оно 18+). На сайте его показать нельзя — выбери другое.'
  if (code === 100) return 'Видео удалено или сделано приватным.'
  if (code === 2) return 'Неверный ID видео.'
  if (code === 5) return 'Ошибка плеера. Попробуй обновить страницу.'
  return 'Не удалось воспроизвести видео (код ' + code + ').'
}

export default function Player({
  room,
  isHost,
  onHostAction,
}: {
  room: RoomState | null
  isHost: boolean
  onHostAction: (patch: Partial<RoomState>) => void
}) {
  const playerRef = useRef<any>(null)
  const ready = useRef(false)
  const lastSync = useRef('')
  const currentVideo = useRef<string | null>(null)
  const isHostRef = useRef(isHost)
  const actionRef = useRef(onHostAction)
  isHostRef.current = isHost
  actionRef.current = onHostAction
  const [error, setError] = useState<number | null>(null)

  // 1. подгружаем YouTube IFrame API один раз
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
    }
  }, [])

  // 2. создаём плеер ОДИН раз (с автоплеем)
  useEffect(() => {
    function init() {
      if (playerRef.current) return
      playerRef.current = new window.YT.Player('yt-player', {
        videoId: room?.youtube_id || undefined,
        playerVars: {
          controls: isHostRef.current ? 1 : 0,
          disablekb: isHostRef.current ? 0 : 1,
          rel: 0,
          modestbranding: 1,
          autoplay: 1,
          playsinline: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: () => {
            ready.current = true
            currentVideo.current = room?.youtube_id || null
            playerBus.register((sec: number) => {
              playerRef.current.seekTo(sec, true)
              if (isHostRef.current)
                actionRef.current({ position_sec: sec, is_playing: true })
            })
            if (room?.youtube_id) {
              try {
                playerRef.current.playVideo()
              } catch (e) {}
            }
          },
          onError: (e: any) => setError(e.data),
          onStateChange: (e: any) => {
            if (!isHostRef.current) return
            const t = Math.floor(playerRef.current.getCurrentTime())
            if (e.data === window.YT.PlayerState.PLAYING)
              actionRef.current({ is_playing: true, position_sec: t })
            if (e.data === window.YT.PlayerState.PAUSED)
              actionRef.current({ is_playing: false, position_sec: t })
          },
        },
      })
    }
    if (window.YT && window.YT.Player) init()
    else window.onYouTubeIframeAPIReady = init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 3. когда меняется видео -> грузим у ВСЕХ, автоплей
  useEffect(() => {
    const p = playerRef.current
    if (!p || !ready.current || !room?.youtube_id) return
    if (currentVideo.current !== room.youtube_id) {
      currentVideo.current = room.youtube_id
      setError(null)
      p.loadVideoById(room.youtube_id)
    }
  }, [room?.youtube_id])

  // 4. друзья следуют за позицией/паузой хоста
  useEffect(() => {
    if (isHost || !room || !ready.current || !playerRef.current) return
    if (lastSync.current === room.updated_at) return
    lastSync.current = room.updated_at
    const p = playerRef.current
    if (Math.abs(p.getCurrentTime() - room.position_sec) > 1.5)
      p.seekTo(room.position_sec, true)
    if (room.is_playing) p.playVideo()
    else p.pauseVideo()
  }, [room, isHost])

  // 5. хост раз в 5 сек шлёт позицию
  useEffect(() => {
    if (!isHost) return
    const t = setInterval(() => {
      const p = playerRef.current
      if (p && ready.current && p.getPlayerState && p.getPlayerState() === 1)
        actionRef.current({
          position_sec: Math.floor(p.getCurrentTime()),
          is_playing: true,
        })
    }, 5000)
    return () => clearInterval(t)
  }, [isHost])

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden bloom">
      <div id="yt-player" className="w-full h-full" />
      {!isHost && (
        <div
          className="absolute inset-0 cursor-not-allowed"
          title="Управляет только хост"
        />
      )}
      {error !== null && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm grid place-items-center text-center p-6">
          <div className="space-y-3">
            <div className="text-2xl">⚠️</div>
            <p className="text-sm text-white/80 max-w-xs">{errText(error)}</p>
            {room?.youtube_id && (
              <a
                href={'https://www.youtube.com/watch?v=' + room.youtube_id}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs btn-violet px-4 py-2 rounded-xl"
              >
                Открыть на YouTube →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
