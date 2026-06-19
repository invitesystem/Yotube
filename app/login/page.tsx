'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function go() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) alert('Ты не в списке друзей 🙃')
    else setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-3xl p-8 space-y-4 text-center bloom fade-up">
        <h1 className="text-2xl font-bold text-glow">🎬 Вечная комната</h1>
        <p className="text-xs text-white/50">Закрытый кинозал только для своих</p>
        {sent ? (
          <p className="text-sm text-white/60">Проверь почту — там ссылка для входа.</p>
        ) : (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="твоя почта"
              className="w-full glass rounded-xl px-3 py-2.5 text-sm outline-none focus:bloom transition"
            />
            <button onClick={go} className="w-full btn-violet rounded-xl py-2.5 text-sm font-medium">
              Войти по ссылке
            </button>
          </>
        )}
      </div>
    </div>
  )
}
