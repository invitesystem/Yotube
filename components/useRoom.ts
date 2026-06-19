'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type RoomState = {
  youtube_id: string | null
  position_sec: number
  is_playing: boolean
  updated_at: string
}

export function useRoom() {
  const [room, setRoom] = useState<RoomState | null>(null)

  useEffect(() => {
    let active = true
    supabase
      .from('room_state')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (active && data) setRoom(data as RoomState)
      })

    const ch = supabase
      .channel('room')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'room_state', filter: 'id=eq.1' },
        (payload) => setRoom(payload.new as RoomState)
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(ch)
    }
  }, [])

  // только хост сможет реально записать (защищено RLS)
  const pushState = useCallback(async (patch: Partial<RoomState>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase
      .from('room_state')
      .update({
        ...patch,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
  }, [])

  return { room, pushState }
}
