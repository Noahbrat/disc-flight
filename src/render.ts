import type { FlightInput, RenderOptions } from './types'
import { calculateFlightPath } from './flight'

interface SvgPoint {
  x: number
  y: number
}

/** Convert an array of points to a smooth SVG path using Catmull-Rom spline conversion */
function pointsToSmoothPath(pts: SvgPoint[]): string {
  if (pts.length < 2) return ''
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`
  }

  // Sample every Nth point to reduce path complexity while keeping smoothness
  const step = Math.max(1, Math.floor(pts.length / 50))
  const sampled: SvgPoint[] = []
  for (let i = 0; i < pts.length; i += step) {
    sampled.push(pts[i])
  }
  // Always include the last point
  if (sampled[sampled.length - 1] !== pts[pts.length - 1]) {
    sampled.push(pts[pts.length - 1])
  }

  let d = `M${sampled[0].x.toFixed(1)},${sampled[0].y.toFixed(1)}`

  for (let i = 0; i < sampled.length - 1; i++) {
    const p0 = sampled[Math.max(0, i - 1)]
    const p1 = sampled[i]
    const p2 = sampled[i + 1]
    const p3 = sampled[Math.min(sampled.length - 1, i + 2)]

    // Catmull-Rom to cubic bezier control points (alpha = 0.5)
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }

  return d
}

const DEFAULTS: Required<RenderOptions> = {
  width: 400,
  height: 600,
  padding: 40,
  showFairway: true,
  showLabels: true,
  showLandingZone: true,
}

export function renderSvg(
  discs: FlightInput | FlightInput[],
  options: RenderOptions = {},
): string {
  const opts = { ...DEFAULTS, ...options }
  const inputs = Array.isArray(discs) ? discs : [discs]

  const paths = inputs.map((input) => ({
    input,
    path: calculateFlightPath(input),
  }))

  // Find bounds across all paths
  const allPoints = paths.flatMap((p) => p.path.points)
  const minX = Math.min(...allPoints.map((p) => p.x))
  const maxX = Math.max(...allPoints.map((p) => p.x))
  const maxY = Math.max(...allPoints.map((p) => p.y))

  const drawWidth = opts.width - opts.padding * 2
  const drawHeight = opts.height - opts.padding * 2

  // Use uniform scaling so lateral proportions are honest.
  // Scale based on the vertical (distance) axis, then use the same
  // scale for horizontal. This means a straight disc looks straight
  // instead of having tiny drift exaggerated to fill the width.
  const scaleY = drawHeight / maxY
  const scaleX = scaleY // uniform: 1ft lateral = 1ft vertical on screen

  // Center the content horizontally
  const contentMinX = minX * scaleX
  const contentMaxX = maxX * scaleX
  const contentWidth = contentMaxX - contentMinX
  const offsetX = opts.padding + (drawWidth - contentWidth) / 2 - contentMinX

  function toSvgX(x: number): number {
    return offsetX + x * scaleX
  }

  function toSvgY(y: number): number {
    // Flip Y so 0 is at the bottom (tee pad)
    return opts.height - opts.padding - y * scaleY
  }

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.width} ${opts.height}" width="${opts.width}" height="${opts.height}">\n`

  // Background
  if (opts.showFairway) {
    svg += `  <rect width="${opts.width}" height="${opts.height}" fill="#1a472a" rx="8" />\n`
  }

  // Tee pad marker
  const teeX = toSvgX(0)
  const teeY = toSvgY(0)
  svg += `  <rect x="${teeX - 8}" y="${teeY - 3}" width="16" height="6" fill="#888" rx="1" />\n`

  // Flight paths
  for (const { input, path } of paths) {
    const color = input.color ?? '#ffffff'
    const lineWidth = input.lineWidth ?? 2.5

    // Build smooth SVG path using Catmull-Rom → cubic bezier conversion
    const svgPts = path.points.map((p) => ({ x: toSvgX(p.x), y: toSvgY(p.y) }))
    const d = pointsToSmoothPath(svgPts)

    svg += `  <path d="${d}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" />\n`

    // Landing zone
    if (opts.showLandingZone) {
      const lx = toSvgX(path.landingPoint.x)
      const ly = toSvgY(path.landingPoint.y)
      svg += `  <line x1="${lx - 4}" y1="${ly - 4}" x2="${lx + 4}" y2="${ly + 4}" stroke="${color}" stroke-width="2" />\n`
      svg += `  <line x1="${lx + 4}" y1="${ly - 4}" x2="${lx - 4}" y2="${ly + 4}" stroke="${color}" stroke-width="2" />\n`
    }

    // Label
    if (opts.showLabels && input.label) {
      const lx = toSvgX(path.landingPoint.x)
      const ly = toSvgY(path.landingPoint.y) - 10
      svg += `  <text x="${lx}" y="${ly}" fill="${color}" font-family="sans-serif" font-size="12" text-anchor="middle">${input.label}</text>\n`
    }
  }

  svg += `</svg>`
  return svg
}
