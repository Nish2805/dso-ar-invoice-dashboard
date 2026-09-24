import { useEffect, useRef, useState } from 'react'

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    let frame: number

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs)
      setValue(from + (target - from) * easeOutExpo(t))
      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}
