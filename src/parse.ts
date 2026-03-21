import type { FlightInput, Hand, ArmSpeed } from './types'

const FLIGHT_NUMBER_RE = /^-?\d+\/\d+\/-?\d+\/\d+$/

/**
 * Parse a disc spec string into FlightInput objects.
 *
 * Format: "Label:Speed/Glide/Turn/Fade:Color" (comma-separated for multiple)
 * Label and color are optional. Examples:
 *   "12/5/-1/3"
 *   "12/5/-1/3:red"
 *   "Destroyer:12/5/-1/3"
 *   "Destroyer:12/5/-1/3:#ff0000"
 *   "Destroyer:12/5/-1/3:red,Buzzz:5/4/-1/1:green"
 */
export function parseDiscSpec(spec: string): FlightInput[] {
  const discs = spec.split(',').map((s) => s.trim()).filter(Boolean)

  if (discs.length === 0) {
    throw new Error('No disc specs provided')
  }

  return discs.map((discStr) => {
    const parts = discStr.split(':')

    // Find the part that matches flight number format
    const flightIdx = parts.findIndex((p) => FLIGHT_NUMBER_RE.test(p))
    if (flightIdx === -1) {
      throw new Error(`Invalid disc spec "${discStr}" — no flight numbers found (expected Speed/Glide/Turn/Fade)`)
    }

    const [speedStr, glideStr, turnStr, fadeStr] = parts[flightIdx].split('/')
    const label = flightIdx > 0 ? parts.slice(0, flightIdx).join(':') : undefined
    const color = flightIdx < parts.length - 1 ? parts[flightIdx + 1] : undefined

    const input: FlightInput = {
      speed: Number(speedStr),
      glide: Number(glideStr),
      turn: Number(turnStr),
      fade: Number(fadeStr),
    }

    if (label) input.label = label
    if (color) input.color = color

    return input
  })
}

export function isValidHand(value: string): value is Hand {
  return ['rhbh', 'lhbh', 'rhfh', 'lhfh'].includes(value)
}

export function isValidArmSpeed(value: string): value is ArmSpeed {
  return ['slow', 'normal', 'fast'].includes(value)
}
