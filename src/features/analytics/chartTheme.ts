/**
 * Chart colours. Validated with the dataviz palette checker (light surface):
 * lightness band, chroma floor, colour-blind separation, normal-vision floor
 * and contrast all PASS for the adjacent orders below.
 */
export const SERIES = {
  completed: '#3f8a4f',
  created: '#4a68c4',
} as const

/** Status order matters: adjacent pairs were validated in this order. */
export const STATUS_COLORS = {
  completed: '#3f8a4f',
  in_progress: '#4a68c4',
  todo: '#b8860b',
  overdue: '#c2410c',
} as const

/** Single-hue sequential ramp (sage), light → dark, for the activity heatmap. */
export const HEAT_RAMP = ['#efebe0', '#c8d7c4', '#87a37f', '#546e4e', '#2e3b2d'] as const

export const AXIS = {
  tick: { fill: '#566d98', fontSize: 12 },
  grid: '#ece4d2',
}

export function heatColor(count: number, max: number): string {
  if (count === 0 || max === 0) return HEAT_RAMP[0]
  const level = Math.min(4, Math.ceil((count / max) * 4))
  return HEAT_RAMP[level]
}
