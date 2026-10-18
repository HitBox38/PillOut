export const EFFECT_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'
export const CONFETTI = Array.from({ length: 48 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  delay: `${350 + (index % 9) * 35}ms`,
  duration: `${1100 + (index % 7) * 100}ms`,
  color: ['#ffe14b', '#84f7ff', '#ff95dc', '#aff778'][index % 4],
  drift: `${((index * 43) % 140) - 70}px`,
  rotation: `${180 + (index % 5) * 90}deg`,
}))
