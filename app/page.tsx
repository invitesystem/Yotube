'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useRoom, RoomState } from '@/components/useRoom'
import Player from '@/components/Player'
import Search from '@/components/Search'
import Chat from '@/components/Chat'
import YouTubeComments from '@/components/YouTubeComments'
import Notifications, { Notif } from '@/components/Notifications'
import Presence from '@/components/Presence'

type Profile = { id: string; username: string; is_host: boolean }

export default function Home() {
  const router = useRouter()
  const { room, pushState } = useRoom()
  const [me, setMe] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [tab, setTab] = useState<'chat' | 'yt'>('chat')
  const [focusId, setFocusId] = useState<string | null>(null)
  // локальный просмотр старого видео по уведомлению (вне синхронизации)
  const [soloVideo, setSoloVideo] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profs } = await supabase.from('profiles').select('id,username,is_host')
      setProfiles((profs as Profile[]) || [])
      setMe((profs as Profile[]).find((p) => p.id === user.id) || null)
    })
  }, [router])

  if (!me) return <div className="p-8 text-center text-white/40">Загрузка…</div>

  const activeVideo = soloVideo || room?.youtube_id || null
  const isHost = me.is_host && !soloVideo

  const liveRoom: RoomState = {
    youtube_id: activeVideo,
    position_sec: room?.position_sec ?? 0,
    is_playing: room?.is_playing ?? false,
    updated_at: room?.updated_at ?? '',
  }

  // хост выбрал новое видео -> транслируем всем
  function pickVideo(id: string) {
    setSoloVideo(null)
    if (me!.is_host) pushState({ youtube_id: id, position_sec: 0, is_playing: true })
  }

  // клик по уведомлению
  async function openNotif(n: Notif) {
    setSoloVideo(n.youtube_id !== room?.youtube_id ? n.youtube_id : null)
    if (n.kind === 1) {
      setTab('chat')
      setTimeout(
        () =>
          document
            .getElementById('msg-' + n.message_id)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
        600
      )
    } else if (n.share_id) {
      const { data } = await supabase
        .from('yt_shares')
        .select('yt_comment_id')
        .eq('id', n.share_id)
        .single()
      setTab('yt')
      setFocusId(data?.yt_comment_id || null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6 grid md:grid-cols-[1fr_380px] gap-4">
      {/* левая колонка: плеер */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Presence me={me} />
          <Notifications me={me} onOpen={openNotif} />
        </div>

        {soloVideo && (
          <button
            onClick={() => setSoloVideo(null)}
            className="w-full text-xs glass text-yellow-300 rounded-xl py-2 bloom-hover"
          >
            👀 Ты смотришь отдельно. Вернуться к хосту →
          </button>
        )}

        {activeVideo ? (
          <Player room={liveRoom} isHost={isHost} onHostAction={pushState} />
        ) : (
          <div className="aspect-video glass rounded-2xl grid place-items-center text-white/40">
            Хост ещё не выбрал видео
          </div>
        )}

        {me.is_host && <Search onPick={pickVideo} />}
      </div>

      {/* правая колонка: чат / комменты */}
      <div className="h-[70vh] md:h-[80vh] glass rounded-2xl flex flex-col overflow-hidden">
        <div className="flex border-b border-white/10 text-sm">
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 py-2.5 transition ${tab === 'chat' ? 'btn-violet' : 'hover:bg-white/5'}`}
          >
            Наш чат
          </button>
          <button
            onClick={() => setTab('yt')}
            className={`flex-1 py-2.5 transition ${tab === 'yt' ? 'btn-violet' : 'hover:bg-white/5'}`}
          >
            Комментарии YouTube
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {!activeVideo ? (
            <div className="p-4 text-sm text-white/40">Сначала выбери видео.</div>
          ) : tab === 'chat' ? (
            <Chat youtubeId={activeVideo} me={me} profiles={profiles} />
          ) : (
            <YouTubeComments youtubeId={activeVideo} me={me} profiles={profiles} focusId={focusId} />
          )}
        </div>
      </div>
    </div>
  )
}
