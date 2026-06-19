'use client'
import { useState } from 'react'

type Item = { id: string; title: string; channel: string; thumb: string }

export default function Search({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  async function run() {
    if (!q.trim()) return
    setLoading(true)
    const r = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`)
    const d = await r.json()
    setItems(d.items || [])
    setLoading(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Поиск на YouTube…"
          className="flex-1 glass rounded-xl px-4 py-2.5 text-sm outline-none focus:bloom transition"
        />
        <button onClick={run} className="btn-violet px-5 rounded-xl text-sm font-medium">
          Найти
        </button>
      </div>
      {loading && <div className="text-xs text-white/40 animate-pulse">Ищем…</div>}
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {items.map((i) => {
          const titleHtml = { __html: i.title }
          return (
            <button
              key={i.id}
              onClick={() => {
                onPick(i.id)
                setItems([])
                setQ('')
              }}
              className="flex gap-3 w-full text-left p-2 rounded-xl glass-soft hover:bloom bloom-hover fade-up"
            >
              <img src={i.thumb} alt="" className="w-24 rounded-lg" />
              <div className="text-xs">
                <div className="line-clamp-2 font-medium" dangerouslySetInnerHTML={titleHtml} />
                <div className="text-white/40 mt-1">{i.channel}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
