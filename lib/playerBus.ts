// Мостик: клик по таймстампу в чате -> перемотка плеера
type SeekFn = (sec: number) => void
let seekFn: SeekFn | null = null

export const playerBus = {
  register: (fn: SeekFn) => {
    seekFn = fn
  },
  seek: (sec: number) => seekFn?.(sec),
}
