'use client'
import { useEffect, useRef } from 'react'
import { RoomState } from './useRoom'
import { playerBus } from '@/lib/playerBus'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
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

  // 1. подгружаем YouTube IFrame API один раз
  useEffect(() => {
    if (window.YT) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(tag)
  }, [])

  // 2. создаём плеер, когда есть видео
  useEffect(() => {
    function init() {
      if (!room?.youtube_id || playerRef.current) return
      playerRef.current = new window.YT.Player('yt-player', {
        videoId: room.youtube_id,
        playerVars: { controls: isHost ? 1 : 0, disablekb: isHost ? 0 : 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            ready.current = true
            playerBus.register((sec) => {
              playerRef.current.seekTo(sec, true)
              if (isHost) onHostAction({ position_sec: sec, is_playing: true })
            })
          },
          onStateChange: (e: any) => {
            if (!isHost) return
            const t = Math.floor(playerRef.current.getCurrentTime())
            if (e.data === window.YT.PlayerState.PLAYING)
              onHostAction({ is_playing: true, position_sec: t })
            if (e.data === window.YT.PlayerState.PAUSED)
              onHostAction({ is_playing: false, position_sec: t })
          },
        },
      })
    }
    if (window.YT && window.YT.Player) init()
    else window.onYouTubeIframeAPIReady = init
  }, [room?.youtube_id, isHost, onHostAction])

  // 3. друзья следуют за хостом
  useEffect(() => {
    if (isHost || !room || !ready.current || !playerRef.current) return
    if (lastSync.current === room.updated_at) return
    lastSync.current = room.updated_at
    const p = playerRef.current
    if (p.getVideoData().video_id !== room.youtube_id && room.youtube_id)
      p.loadVideoById(room.youtube_id)
    if (Math.abs(p.getCurrentTime() - room.position_sec) > 1.5)
      p.seekTo(room.position_sec, true)
    if (room.is_playing) p.playVideo()
    else p.pauseVideo()
  }, [room, isHost])

  // 4. хост раз в 5 сек шлёт позицию (чтобы опоздавшие догнали)
  useEffect(() => {
    if (!isHost) return
    const t = setInterval(() => {
      const p = playerRef.current
      if (p && ready.current && p.getPlayerState() === 1)
        onHostAction({ position_sec: Math.floor(p.getCurrentTime()), is_playing: true })
    }, 5000)
    return () => clearInterval(t)
  }, [isHost, onHostAction])

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden bloom">
      <div id="yt-player" className="w-full h-full" />
      {!isHost && (
        <div
          className="absolute inset-0 cursor-not-allowed"
          title="Управляет только хост"
        />
      )}
    </div>
  )
}
