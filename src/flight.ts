import type { FlightInput, FlightPath, Point } from './types'

const SAMPLES = 100

export function calculateFlightPath(input: FlightInput): FlightPath {
  const { speed, glide, turn, fade, hand = 'rhbh', armSpeed = 'normal' } = input

  // Mirror for left-hand or forehand throws
  const mirror = hand === 'lhbh' || hand === 'rhfh' ? -1 : 1

  // Arm speed affects how much turn is expressed
  const armTurnMult = armSpeed === 'slow' ? 0.5 : armSpeed === 'fast' ? 1.4 : 1.0
  const armFadeMult = armSpeed === 'slow' ? 1.3 : armSpeed === 'fast' ? 0.8 : 1.0

  // --- Distance model ---
  const baseDistance = 150 + speed * 18 + Math.sqrt(speed) * 12
  const glideBonus = glide * 10 * (0.5 + speed * 0.04)
  const distance = baseDistance + glideBonus

  // --- Lateral movement scaling ---
  const lateralBase = distance * 0.028

  const absTurn = Math.abs(turn)
  const turnMag = Math.pow(absTurn, 1.5) * Math.sign(-turn) * armTurnMult * mirror * lateralBase
  const fadeMag = Math.pow(fade, 1.5) * armFadeMult * mirror * lateralBase * 1.8

  // --- Velocity-based model ---
  // Instead of modeling position with separate phases that can create
  // bumps at boundaries, model the lateral VELOCITY as one continuous
  // function and integrate it to get position.
  //
  // Lateral velocity over time:
  //   - Starts at 0 (straight off the tee)
  //   - Builds slowly, accelerates (turn is gradual then stronger)
  //   - Peaks around 60-70% of flight (max turn rate)
  //   - Decays smoothly toward zero (disc slowing, turn fading out)
  //   - Goes negative (fade kicks in, accelerating)
  //   - Ends at max negative velocity (disc dumping left at landing)
  //
  // This is one smooth curve — no phases, no boundaries, no bumps.
  // Turn velocity: bell-curve-like shape, skewed to peak later
  // Fade velocity: ramps up from zero, accelerating to the end

  const turnPeak = 0.55 + speed * 0.012   // where turn velocity peaks
  const fadeOnset = 0.72 + speed * 0.008   // where fade velocity starts

  // Precompute by integrating velocity to get position
  const points: Point[] = []
  let lateralPos = 0
  const dt = 1 / SAMPLES

  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES
    const along = t * distance

    // --- Turn velocity ---
    // Skewed bell curve: slow buildup, accelerates to peak, then decays.
    // Using a skewed Gaussian-like shape via asymmetric exponents.
    // Before peak: cubic rise (very gradual start, accelerates)
    // After peak: quadratic decay (faster falloff as disc slows)
    let turnVel = 0
    if (t <= turnPeak) {
      const p = t / turnPeak
      turnVel = p * p * p  // cubic: very slow start, accelerates toward peak
    } else {
      const p = (t - turnPeak) / (1 - turnPeak)
      turnVel = Math.pow(1 - p, 2) // quadratic decay
    }

    // --- Fade velocity ---
    // Starts at zero, always increasing. The disc is decelerating so
    // fade force grows continuously — never reaches a constant rate.
    let fadeVel = 0
    if (t > fadeOnset) {
      const p = (t - fadeOnset) / (1 - fadeOnset)
      fadeVel = p * p  // quadratic: smoothly accelerating
    }

    // Net lateral velocity and integrate to position
    const netVel = turnMag * turnVel - fadeMag * fadeVel
    if (i > 0) {
      lateralPos += netVel * dt * 5.8 // scale factor for magnitude
    }

    points.push({ x: lateralPos, y: along })
  }

  const landingPoint = points[points.length - 1]

  return { points, distance, landingPoint }
}
