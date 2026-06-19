'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Presence({ me }: { me: { id: string; username: string } }) {
  const [online, setOnline] = useState<string[]>([])

  useEffect(() => {
    const ch = supabase.channel('presence', { config: { presence: { key: me.id } } })
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, any[]>
      setOnline(Object.values(state).map((s) => s[0].username))
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await ch.track({ username: me.username })
    })
    return () => {
      supabase.removeChannel(ch)
    }
  }, [me.id, me.username])

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {online.map((u) => (
        <span
          key={u}
          className="px-2.5 py-1 glass-soft text-green-300 rounded-full flex items-center gap-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
          {u}
        </span>
      ))}
    </div>
  )
}
