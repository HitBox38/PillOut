import type { Special } from './engine'

let context: AudioContext | undefined
const voices = new Set<OscillatorNode>()
type GameSound = Special | 'match' | 'earned' | 'shuffle' | 'win'

export function stopGameSounds() {
  for (const voice of voices) {
    voice.stop()
    voice.disconnect()
  }
  voices.clear()
}

export function playGameSound(sound: GameSound, combo = 1) {
  try {
    context ??= new AudioContext()
    void context.resume()
    const audio = context
    const note = (
      frequency: number,
      offset = 0,
      duration = 0.16,
      type: OscillatorType = 'sine',
      end = frequency,
    ) => {
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      const start = audio.currentTime + offset
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, start)
      oscillator.frequency.exponentialRampToValueAtTime(end, start + duration)
      gain.gain.setValueAtTime(0.001, start)
      gain.gain.exponentialRampToValueAtTime(0.025, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      oscillator.connect(gain)
      gain.connect(audio.destination)
      voices.add(oscillator)
      oscillator.onended = () => {
        voices.delete(oscillator)
        oscillator.disconnect()
        gain.disconnect()
      }
      oscillator.start(start)
      oscillator.stop(start + duration + 0.02)
    }
    if (sound === 'shuffle') {
      note(180, 0, 0.2, 'sine', 540)
      for (let i = 0; i < 5; i++) note(440 + i * 55, 0.24 + i * 0.025, 0.07, 'triangle')
    } else if (sound === 'win') {
      ;[523, 659, 784, 1047].forEach((f, i) => note(f, 0.1 + i * 0.11, 0.35, 'triangle'))
      ;[523, 659, 784].forEach((f) => note(f, 0.58, 0.75))
    } else if (sound === 'bomb') note(160, 0, 0.2, 'triangle', 45)
    else if (sound === 'hammer') {
      note(100, 0, 0.14, 'triangle', 45)
      note(880, 0.03, 0.12)
    } else if (sound === 'crown' || sound === 'earned') {
      ;[659, 880, 1047].forEach((f, i) => note(f, i * 0.045, 0.18))
    } else {
      const pitch = 440 * 2 ** (Math.min(combo, 8) / 12)
      note(pitch)
      if (combo >= 3)
        [1.25, 1.5, 2].forEach((ratio, i) => note(pitch * ratio, (i + 1) * 0.065, 0.18))
    }
  } catch {
    /* Sound remains optional when the browser has no audio output. */
  }
}
