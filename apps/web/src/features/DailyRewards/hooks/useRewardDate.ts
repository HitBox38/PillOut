import { useEffect, useState } from 'react'
import { localDate } from '../helpers'

export function useRewardDate() {
  const [today, setToday] = useState(localDate)
  useEffect(() => {
    const refresh = () => setToday(localDate())
    const timer = setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}
