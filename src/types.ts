export interface FlightNumbers {
  speed: number
  glide: number
  turn: number
  fade: number
}

export type Hand = 'rhbh' | 'lhbh' | 'rhfh' | 'lhfh'
export type ArmSpeed = 'slow' | 'normal' | 'fast'

export interface FlightInput extends FlightNumbers {
  armSpeed?: ArmSpeed
  hand?: Hand
  color?: string
  label?: string
  lineWidth?: number
}

export interface Point {
  x: number
  y: number
}

export interface FlightPath {
  points: Point[]
  distance: number
  landingPoint: Point
}

export interface RenderOptions {
  width?: number
  height?: number
  padding?: number
  showFairway?: boolean
  showLabels?: boolean
  showLandingZone?: boolean
  showGrid?: boolean
}
