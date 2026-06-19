'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { playerBus } from '@/lib/playerBus'

type Profile = { id: string; username: string }
type Msg = { id: number; user_id: string; body: string; ts_sec: number | null }

const EMOJIS = ['👍', '😂', '🔥', '❤️', '😮']
const tsToSec = (t: string) => {
  const [m, s] = t.split(':').map(Number)
  return m * 60 + s
}
const firstTs = (text: string) => {
  const m = text.match(/(\d{1,2}:\d{2})/)
  return m ? tsToSec(m[1]) : null
}

export default function Chat({
  youtubeId,
  me,
  profiles,
}: {
  youtubeId: string
  me: Profile
  profiles: Profile[]
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('messages')
      .select('id,user_id,body,ts_sec')
      .eq('youtube_id', youtubeId)
      .order('created_at')
      .limit(200)
      .then(({ data }) => setMsgs((data as Msg[]) || []))

    const ch = supabase
      .channel('chat-' + youtubeId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `youtube_id=eq.${youtubeId}` },
        (p) => setMsgs((m) => [...m, p.new as Msg])
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [youtubeId])

  useEffect(() => {
    boxRef.current?.scrollTo(0, boxRef.current.scrollHeight)
  }, [msgs])

  async function send() {
    const text = input.trim()
    if (!text) return
    setInput('')
    const { data: msg } = await supabase
      .from('messages')
      .insert({ user_id: me.id, youtube_id: youtubeId, body: text, ts_sec: firstTs(text) })
      .select('id')
      .single()
    const tagged = profiles.filter((p) => p.id !== me.id && text.includes('@' + p.username))
    if (tagged.length && msg) {
      await supabase.from('notifications').insert(
        tagged.map((p) => ({
          recipient: p.id,
          actor: me.id,
          kind: 1,
          youtube_id: youtubeId,
          message_id: msg.id,
        }))
      )
    }
  }

  async function react(id: number, emoji: string) {
    await supabase.from('reactions').upsert({ message_id: id, user_id: me.id, emoji })
  }

  const name = (id: string) => profiles.find((p) => p.id === id)?.username || '???'

  return (
    <div className="flex flex-col h-full">
      <div ref={boxRef} className="flex-1 overflow-y-auto space-y-2 p-3">
        {msgs.map((m) => (
          <div key={m.id} id={`msg-${m.id}`} className="group fade-up">
            <span className="text-xs font-semibold text-purple-300">{name(m.user_id)}</span>{' '}
            <span className="text-sm text-white/90">{renderBody(m.body)}</span>
            <span className="opacity-0 group-hover:opacity-100 ml-2 text-xs transition">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => react(m.id, e)} className="mx-0.5 hover:scale-125 transition">
                  {e}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-3 border-t border-white/10">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Сообщение… (@друг, время 01:05)"
          className="flex-1 glass rounded-xl px-3 py-2 text-sm outline-none focus:bloom transition"
        />
        <button onClick={send} className="btn-violet px-4 rounded-xl text-sm">
          →
        </button>
      </div>
    </div>
  )
}

// делает mm:ss кликабельными -> перемотка
function renderBody(text: string) {
  return text.split(/(\d{1,2}:\d{2})/g).map((part, i) =>
    /^\d{1,2}:\d{2}$/.test(part) ? (
      <button
        key={i}
        className="text-blue-300 underline hover:text-blue-200"
        onClick={() => playerBus.seek(tsToSec(part))}
      >
        {part}
      </button>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}
