import type { FlightInput, FlightPath, RenderOptions } from './types'
import { calculateFlightPath } from './flight'

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

  const rangeX = maxX - minX || 1
  const scaleX = drawWidth / rangeX
  const scaleY = drawHeight / maxY

  function toSvgX(x: number): number {
    return opts.padding + (x - minX) * scaleX
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

    const d = path.points
      .map((p, i) => {
        const cmd = i === 0 ? 'M' : 'L'
        return `${cmd}${toSvgX(p.x).toFixed(1)},${toSvgY(p.y).toFixed(1)}`
      })
      .join(' ')

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
