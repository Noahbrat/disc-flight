import type { FlightInput, FlightPath, Point } from './types'

const SAMPLES = 100

export function calculateFlightPath(input: FlightInput): FlightPath {
  const { speed, glide, turn, fade, hand = 'rhbh', armSpeed = 'normal' } = input

  // Mirror for left-hand or forehand throws
  const mirror = hand === 'lhbh' || hand === 'rhfh' ? -1 : 1

  // Arm speed affects how much turn is expressed
  const armSpeedMultiplier = armSpeed === 'slow' ? 0.6 : armSpeed === 'fast' ? 1.3 : 1.0

  // Total flight distance (arbitrary units, scaled by speed and glide)
  const distance = speed * 20 + glide * 12

  // Phase boundaries (as fractions of total flight)
  const straightEnd = Math.min(0.2 + speed * 0.03, 0.55)
  const turnEnd = 0.75

  const points: Point[] = []

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const along = t * distance

    // Turn effect: negative turn values mean understable (right for RHBH)
    // so we negate turn to get positive x for negative turn numbers
    const turnEffect = -turn * armSpeedMultiplier * mirror

    let lateral = 0

    if (t <= straightEnd) {
      // Phase 1: Mostly straight, slight turn influence
      const phase = t / straightEnd
      lateral = turnEffect * phase * phase * 2
    } else if (t <= turnEnd) {
      // Phase 2: High-speed turn fully expressed
      const turnAtStraightEnd = turnEffect * 2
      const phase = (t - straightEnd) / (turnEnd - straightEnd)
      lateral = turnAtStraightEnd + turnEffect * phase * 4
    } else {
      // Phase 3: Fade takes over
      const lateralAtTurnEnd = turnEffect * 2 + turnEffect * 4
      const phase = (t - turnEnd) / (1 - turnEnd)
      // Fade pulls left (negative x for RHBH)
      lateral = lateralAtTurnEnd - fade * phase * phase * 6 * mirror
    }

    points.push({ x: lateral, y: along })
  }

  const landingPoint = points[points.length - 1]

  return { points, distance, landingPoint }
}
