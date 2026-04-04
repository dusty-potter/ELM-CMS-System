// Pure hex color manipulation — no external dependencies.

function parseHex(hex: string): [number, number, number] {
  let h = hex.replace(/^#/, '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ]
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

const FALLBACK = '#2563eb'

function normalize(hex: string): string {
  if (!hex || !/^#?[0-9A-Fa-f]{3,6}$/.test(hex)) return FALLBACK
  return hex.startsWith('#') ? hex : '#' + hex
}

export function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(normalize(hex))
  const [h, s, l] = rgbToHsl(r, g, b)
  const [nr, ng, nb] = hslToRgb(h, s, Math.max(0, l - amount))
  return toHex(nr, ng, nb)
}

export function isWarmTone(hex: string): boolean {
  const [r, g, b] = parseHex(normalize(hex))
  const [h] = rgbToHsl(r, g, b)
  return (h >= 0 && h <= 60) || h >= 300
}

export function warmAccent(hex: string): string {
  const [r, g, b] = parseHex(normalize(hex))
  const [h, , l] = rgbToHsl(r, g, b)
  // If already warm, shift slightly; otherwise use default warm accent
  if ((h >= 0 && h <= 60) || h >= 300) {
    const [nr, ng, nb] = hslToRgb(25, 0.65, Math.min(0.45, l))
    return toHex(nr, ng, nb)
  }
  return '#b34700'
}

export function deriveBrandColors(primaryHex: string) {
  const primary = normalize(primaryHex)
  return {
    primary,
    secondary: darken(primary, 0.15),
    accent: warmAccent(primary),
    cream: isWarmTone(primary) ? '#f5f0e8' : '#f9f7f2',
  }
}
