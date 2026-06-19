'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type Notif = {
  id: number
  kind: number
  youtube_id: string
  message_id: number | null
  share_id: number | null
  is_read: boolean
}

export default function Notifications({
  me,
  onOpen,
}: {
  me: { id: string }
  onOpen: (n: Notif) => void
}) {
  const [list, setList] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase
      .from('notifications')
      .select('id,kind,youtube_id,message_id,share_id,is_read')
      .eq('recipient', me.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setList((data as Notif[]) || []))
    const ch = supabase
      .channel('notif-' + me.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient=eq.${me.id}` },
        (p) => setList((l) => [p.new as Notif, ...l])
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [me.id])

  const unread = list.filter((n) => !n.is_read).length

  async function click(n: Notif) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
    setList((l) => l.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    onOpen(n)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative text-xl">
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full px-1 shadow-[0_0_10px_rgba(239,68,68,0.9)]">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 glass rounded-2xl p-2 z-50 max-h-80 overflow-y-auto bloom fade-up">
          {list.length === 0 && <div className="text-xs text-white/40 p-2">Пока пусто</div>}
          {list.map((n) => (
            <button
              key={n.id}
              onClick={() => click(n)}
              className={`block w-full text-left text-xs p-2 rounded-xl mb-1 transition ${
                n.is_read ? 'opacity-50' : 'glass-soft'
              }`}
            >
              {n.kind === 1 ? '💬 Вас упомянули в чате' : '📎 Поделились комментарием YouTube'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
