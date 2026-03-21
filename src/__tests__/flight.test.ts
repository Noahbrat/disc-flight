import { describe, it, expect } from 'vitest'
import { calculateFlightPath } from '../flight'

describe('calculateFlightPath', () => {
  it('turn 0 disc should never cross right of origin (RHBH)', () => {
    const path = calculateFlightPath({ speed: 9, glide: 3, turn: 0, fade: 4 })
    // For RHBH, turn 0 means no rightward drift — all x values should be <= 0
    for (const point of path.points) {
      expect(point.x).toBeLessThanOrEqual(0.001)
    }
  })

  it('higher speed should produce longer distance', () => {
    const slow = calculateFlightPath({ speed: 5, glide: 4, turn: -1, fade: 1 })
    const fast = calculateFlightPath({ speed: 12, glide: 4, turn: -1, fade: 1 })
    expect(fast.distance).toBeGreaterThan(slow.distance)
  })

  it('higher fade should produce more leftward finish (RHBH)', () => {
    const lowFade = calculateFlightPath({ speed: 9, glide: 3, turn: 0, fade: 1 })
    const highFade = calculateFlightPath({ speed: 9, glide: 3, turn: 0, fade: 4 })
    // More fade = more negative x at landing for RHBH
    expect(highFade.landingPoint.x).toBeLessThan(lowFade.landingPoint.x)
  })

  it('more turn should produce more rightward drift (RHBH)', () => {
    const lessTurn = calculateFlightPath({ speed: 9, glide: 5, turn: -2, fade: 1 })
    const moreTurn = calculateFlightPath({ speed: 9, glide: 5, turn: -4, fade: 1 })
    // More negative turn = more rightward (positive x) drift
    const lessTurnMaxX = Math.max(...lessTurn.points.map((p) => p.x))
    const moreTurnMaxX = Math.max(...moreTurn.points.map((p) => p.x))
    expect(moreTurnMaxX).toBeGreaterThan(lessTurnMaxX)
  })

  it('LHBH should mirror RHBH', () => {
    const rhbh = calculateFlightPath({ speed: 9, glide: 3, turn: -1, fade: 3, hand: 'rhbh' })
    const lhbh = calculateFlightPath({ speed: 9, glide: 3, turn: -1, fade: 3, hand: 'lhbh' })

    for (let i = 0; i < rhbh.points.length; i++) {
      expect(lhbh.points[i].x).toBeCloseTo(-rhbh.points[i].x, 5)
      expect(lhbh.points[i].y).toBeCloseTo(rhbh.points[i].y, 5)
    }
  })
})
