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

  const points: Point[] = []

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const along = t * distance

    let lateral = 0

    if (t <= straightEnd) {
      // Phase 1: Straight flight — almost no lateral movement
      // Tiny hint of turn begins near the end of this phase
      const p = t / straightEnd
      // Quartic ease-in: stays near zero for most of the phase, then barely starts
      lateral = turnMag * p * p * p * p * 0.08
    } else if (t <= turnEnd) {
      // Phase 2: Turn develops as disc slows from high speed
      // This is where understable discs drift right (RHBH)
      const lateralAtStraightEnd = turnMag * 0.08
      const p = (t - straightEnd) / (turnEnd - straightEnd)
      // Smooth acceleration of turn — starts gentle, builds
      const eased = p * p * (3 - 2 * p) // smoothstep
      lateral = lateralAtStraightEnd + turnMag * eased * 0.92
    } else {
      // Phase 3: Fade — disc is slow, gyroscopic precession takes over
      // All discs fade left (RHBH), intensity based on fade number
      const lateralAtTurnEnd = turnMag
      const p = (t - turnEnd) / (1 - turnEnd)
      // Fade is aggressive at the end — cubic ease-in for that hook shape
      const fadeEffect = fadeMag * p * p * p
      // Tiny continued turn momentum that quickly dies
      const turnDecay = turnMag * 0.08 * (1 - p)
      lateral = lateralAtTurnEnd + turnDecay - fadeEffect
    }

    points.push({ x: lateral, y: along })
  }

  const landingPoint = points[points.length - 1]

  return { points, distance, landingPoint }
}
