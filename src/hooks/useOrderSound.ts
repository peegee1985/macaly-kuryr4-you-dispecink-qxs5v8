import { useEffect, useRef } from 'react'

/**
 * Plays a two-tone "ding" notification using Web Audio API.
 * No audio files required — fully synthesized.
 */
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Two-note ascending chime: C5 → E5
    const notes = [523.25, 659.25]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.value = freq

      const start = ctx.currentTime + i * 0.18
      const end = start + 0.35

      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.4, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, end)

      osc.start(start)
      osc.stop(end)
    })
  } catch (e) {
    console.log('[sound] Web Audio not available:', e)
  }
}

/**
 * Hook: plays a sound when a new item appears in the watched list.
 * Skips the very first render (no false alarm on page load).
 *
 * Usage:
 *   useOrderSound(availableRides?.length)
 */
export function useOrderSound(count: number | undefined) {
  const prevCount = useRef<number | undefined>(undefined)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (count === undefined) return

    if (isFirstRender.current) {
      // Capture the initial count without playing sound
      prevCount.current = count
      isFirstRender.current = false
      return
    }

    if (prevCount.current !== undefined && count > prevCount.current) {
      console.log('[sound] New order detected, playing sound')
      playNotificationSound()
    }

    prevCount.current = count
  }, [count])
}
