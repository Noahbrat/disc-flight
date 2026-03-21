import type { FlightInput, FlightPath, Point } from './types'

const SAMPLES = 100

export function calculateFlightPath(input: FlightInput): FlightPath {
  const { speed, glide, turn, fade, hand = 'rhbh', armSpeed = 'normal' } = input

  // Mirror for left-hand or forehand throws
  const mirror = hand === 'lhbh' || hand === 'rhfh' ? -1 : 1

  // Arm speed affects how much turn is expressed
  // Slower arm = less turn expressed, more effective fade
  const armTurnMult = armSpeed === 'slow' ? 0.5 : armSpeed === 'fast' ? 1.4 : 1.0
  const armFadeMult = armSpeed === 'slow' ? 1.3 : armSpeed === 'fast' ? 0.8 : 1.0

  // --- Distance model ---
  // Real world approximate ranges (feet):
  //   Putter (speed 1-3): 150-200ft
  //   Mid (speed 4-6): 250-300ft
  //   Fairway (speed 7-9): 300-350ft
  //   Distance driver (speed 10-14): 350-450ft
  // We use feet as our unit system for intuitive output
  const baseDistance = 150 + speed * 18 + Math.sqrt(speed) * 12
  const glideBonus = glide * 10 * (0.5 + speed * 0.04)
  const distance = baseDistance + glideBonus

  // --- Phase boundaries ---
  // Key insight from reference charts: discs fly STRAIGHT for a long time.
  // The turn phase doesn't really start until the disc begins to slow.
  // Higher speed discs maintain velocity longer → even later turn onset.
  // A Buzzz (speed 5) should be straight until ~60% of flight.
  // A Destroyer (speed 12) should be straight until ~50% then gradual S.
  const straightEnd = 0.45 + speed * 0.015
  // Turn peaks and fade begins — typically around 75-85% of flight
  const turnEnd = 0.78 + speed * 0.008

  // --- Lateral movement scaling ---
  // Reference charts show VERY small lateral movement relative to distance.
  // Key insight: the relationship is non-linear. Turn -1 is barely visible,
  // turn -2 is noticeable, turn -4 is dramatic. Same with fade.
  // Using power curve so low values stay subtle and high values spread out.
  const lateralBase = distance * 0.022

  // Non-linear: abs(turn)^1.5 preserves sign, compresses low values
  const absTurn = Math.abs(turn)
  const turnMag = Math.pow(absTurn, 1.5) * Math.sign(-turn) * armTurnMult * mirror * lateralBase
  // Non-linear fade: fade 1 is gentle, fade 4 is dramatic
  const fadeMag = Math.pow(fade, 1.5) * armFadeMult * mirror * lateralBase

  // --- Fade onset ---
  // Fade begins partway through the turn phase as disc loses speed.
  // Not as late as turnEnd (too abrupt) but not before straightEnd (kills the turn).
  // Midpoint of straight→turnEnd gives a sweeping arc without eating the turn.
  const fadeStart = straightEnd + (turnEnd - straightEnd) * 0.35

  const points: Point[] = []

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const along = t * distance

    // --- Turn component ---
    // Turn builds during mid-flight as disc is at high speed
    let turnLateral = 0
    if (t <= straightEnd) {
      const p = t / straightEnd
      turnLateral = turnMag * p * p * p * p * 0.08
    } else if (t <= turnEnd) {
      const lateralAtStraightEnd = turnMag * 0.08
      const p = (t - straightEnd) / (turnEnd - straightEnd)
      const eased = p * p * (3 - 2 * p) // smoothstep
      turnLateral = lateralAtStraightEnd + turnMag * eased * 0.92
    } else {
      // Turn contribution holds and slowly decays after peak
      const p = (t - turnEnd) / (1 - turnEnd)
      turnLateral = turnMag * (1 - p * 0.1)
    }

    // --- Fade component ---
    // Fade is a separate, overlapping force that builds gradually from fadeStart.
    // This creates the long sweeping arc visible in reference charts.
    let fadeLateral = 0
    if (t > fadeStart) {
      const p = (t - fadeStart) / (1 - fadeStart)
      // p^2.5: between quadratic (too gradual) and cubic (too sharp)
      fadeLateral = fadeMag * Math.pow(p, 2.5)
    }

    const lateral = turnLateral - fadeLateral

    points.push({ x: lateral, y: along })
  }

  const landingPoint = points[points.length - 1]

  return { points, distance, landingPoint }
}
