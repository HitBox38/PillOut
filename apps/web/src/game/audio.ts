let context: AudioContext | undefined

export function playTone(combo: number) {
  try {
    context ??= new AudioContext()
    void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440 * 2 ** (Math.min(combo, 8) / 12), context.currentTime)
    gain.gain.setValueAtTime(0.045, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.18)
  } catch {
    /* Sound is optional when the browser has no audio output. */
  }
}
