'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Ytc = { id: string; author: string; text: string; likes: number }
type Profile = { id: string; username: string }

function reasonText(e: string) {
  if (e === 'commentsDisabled') return 'У этого видео отключены комментарии 🤷'
  if (e === 'quotaExceeded') return 'Исчерпана дневная квота YouTube API. Попробуй завтра.'
  if (e === 'no_api_key') return 'Не задан ключ YOUTUBE_API_KEY в Vercel.'
  if (e === 'keyInvalid' || e === 'badRequest' || e === 'forbidden')
    return 'Ключ YouTube API недействителен или ограничен (проверь разрешён ли YouTube Data API v3).'
  return 'Не удалось загрузить комментарии: ' + e
}

export default function YouTubeComments({
  youtubeId,
  me,
  profiles,
  focusId,
}: {
  youtubeId: string
  me: Profile
  profiles: Profile[]
  focusId?: string | null
}) {
  const [items, setItems] = useState<Ytc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/youtube/comments?videoId=${youtubeId}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || [])
        setError(d.error || null)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [youtubeId])

  // приходим по уведомлению -> скроллим и подсвечиваем нужный коммент
  useEffect(() => {
    if (!focusId) return
    const el = document.getElementById('ytc-' + focusId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.classList.add('highlight-pulse')
  }, [focusId, items])

  async function share(c: Ytc, friendId: string) {
    const { data: s } = await supabase
      .from('yt_shares')
      .upsert(
        {
          youtube_id: youtubeId,
          yt_comment_id: c.id,
          yt_text: c.text,
          yt_author: c.author,
          shared_by: me.id,
        },
        { onConflict: 'youtube_id,yt_comment_id' }
      )
      .select('id')
      .single()
    if (s)
      await supabase.from('notifications').insert({
        recipient: friendId,
        actor: me.id,
        kind: 2,
        youtube_id: youtubeId,
        share_id: s.id,
      })
  }

  if (loading)
    return <div className="p-4 text-sm text-white/40 animate-pulse">Загрузка комментариев…</div>

  if (error)
    return (
      <div className="p-4 text-sm text-yellow-300/80 leading-relaxed">
        {reasonText(error)}
      </div>
    )

  if (!items.length)
    return <div className="p-4 text-sm text-white/40">Комментариев пока нет.</div>

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {items.map((c) => {
        const textHtml = { __html: c.text }
        return (
          <div
            key={c.id}
            id={'ytc-' + c.id}
            className="rounded-xl glass-soft p-3 text-sm transition fade-up"
          >
            <div className="font-semibold text-white/80">
              {c.author} · 👍 {c.likes}
            </div>
            <div className="text-white/70 my-1" dangerouslySetInnerHTML={textHtml} />
            <details>
              <summary className="text-xs text-purple-300 cursor-pointer hover:text-purple-200">
                Поделиться с другом →
              </summary>
              <div className="flex flex-wrap gap-2 mt-2">
                {profiles
                  .filter((p) => p.id !== me.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => share(c, p.id)}
                      className="text-xs px-2.5 py-1 glass text-purple-200 rounded-lg bloom-hover"
                    >
                      {p.username}
                    </button>
                  ))}
              </div>
            </details>
            <ShareThread youtubeId={youtubeId} ytCommentId={c.id} me={me} profiles={profiles} />
          </div>
        )
      })}
    </div>
  )
}

// мини-тред: обсуждаем конкретный YT-коммент
function ShareThread({
  youtubeId,
  ytCommentId,
  me,
  profiles,
}: {
  youtubeId: string
  ytCommentId: string
  me: Profile
  profiles: Profile[]
}) {
  const [shareId, setShareId] = useState<number | null>(null)
  const [msgs, setMsgs] = useState<{ id: number; user_id: string; body: string }[]>([])
  const [text, setText] = useState('')

  useEffect(() => {
    supabase
      .from('yt_shares')
      .select('id')
      .eq('youtube_id', youtubeId)
      .eq('yt_comment_id', ytCommentId)
      .maybeSingle()
      .then(({ data }) => setShareId(data?.id ?? null))
  }, [youtubeId, ytCommentId])

  useEffect(() => {
    if (!shareId) return
    supabase
      .from('yt_share_messages')
      .select('id,user_id,body')
      .eq('share_id', shareId)
      .order('created_at')
      .then(({ data }) => setMsgs(data || []))
    const ch = supabase
      .channel('thread-' + shareId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'yt_share_messages', filter: `share_id=eq.${shareId}` },
        (p) => setMsgs((m) => [...m, p.new as any])
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [shareId])

  async function send() {
    if (!text.trim()) return
    let id = shareId
    if (!id) {
      const { data } = await supabase
        .from('yt_shares')
        .insert({ youtube_id: youtubeId, yt_comment_id: ytCommentId, yt_text: '', shared_by: me.id })
        .select('id')
        .single()
      id = data?.id ?? null
      setShareId(id)
    }
    if (id) {
      await supabase.from('yt_share_messages').insert({ share_id: id, user_id: me.id, body: text })
      setText('')
    }
  }

  const name = (uid: string) => profiles.find((p) => p.id === uid)?.username || '???'

  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      {msgs.map((m) => (
        <div key={m.id} className="text-xs">
          <b className="text-purple-300">{name(m.user_id)}:</b> {m.body}
        </div>
      ))}
      <div className="flex gap-1 mt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Обсудить этот момент…"
          className="flex-1 glass rounded-lg px-2 py-1 text-xs outline-none"
        />
        <button onClick={send} className="btn-violet text-xs px-2 rounded-lg">
          →
        </button>
      </div>
    </div>
  )
}
