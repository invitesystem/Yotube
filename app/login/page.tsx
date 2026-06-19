'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendCode() {
    if (!email.trim()) return
    setErr('')
    setLoading(true)
    // shouldCreateUser: true -> посторонние тоже смогут войти/зарегистрироваться
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) setErr(error.message)
    else setStep('code')
  }

  async function verify() {
    if (!code.trim()) return
    setErr('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setLoading(false)
    if (error) setErr('Неверный или просроченный код. Запроси новый.')
    else window.location.href = '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass rounded-3xl p-8 space-y-4 text-center bloom fade-up">
        <h1 className="text-2xl font-bold text-glow">🎬 Вечная комната</h1>
        <p className="text-xs text-white/50">Закрытый кинозал только для своих</p>

        {step === 'email' ? (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()}
              placeholder="твоя почта"
              type="email"
              className="w-full glass rounded-xl px-3 py-2.5 text-sm outline-none focus:bloom transition"
            />
            <button
              onClick={sendCode}
              disabled={loading}
              className="w-full btn-violet rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Отправляем…' : 'Получить код'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-white/60">Мы отправили код на {email}. Впиши его:</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              placeholder="6-значный код"
              inputMode="numeric"
              className="w-full glass rounded-xl px-3 py-2.5 text-center text-lg tracking-[6px] outline-none focus:bloom transition"
            />
            <button
              onClick={verify}
              disabled={loading}
              className="w-full btn-violet rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Проверяем…' : 'Войти'}
            </button>
            <button
              onClick={() => {
                setStep('email')
                setCode('')
                setErr('')
              }}
              className="text-xs text-white/40 hover:text-white/70"
            >
              ← Изменить почту / запросить новый код
            </button>
          </>
        )}

        {err && <p className="text-xs text-red-400">{err}</p>}
      </div>
    </div>
  )
}
