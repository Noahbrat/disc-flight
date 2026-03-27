interface FlightNumbers {
    speed: number;
    glide: number;
    turn: number;
    fade: number;
}
type Hand = 'rhbh' | 'lhbh' | 'rhfh' | 'lhfh';
type ArmSpeed = 'slow' | 'normal' | 'fast';
interface FlightInput extends FlightNumbers {
    armSpeed?: ArmSpeed;
    hand?: Hand;
    color?: string;
    label?: string;
    lineWidth?: number;
}
interface Point {
    x: number;
    y: number;
}
interface FlightPath {
    points: Point[];
    distance: number;
    landingPoint: Point;
}
interface RenderOptions {
    width?: number;
    height?: number;
    padding?: number;
    showFairway?: boolean;
    showLabels?: boolean;
    showLandingZone?: boolean;
    showGrid?: boolean;
}

declare function calculateFlightPath(input: FlightInput): FlightPath;

declare function renderSvg(discs: FlightInput | FlightInput[], options?: RenderOptions): string;

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
declare function parseDiscSpec(spec: string): FlightInput[];

export { type ArmSpeed, type FlightInput, type FlightNumbers, type FlightPath, type Hand, type Point, type RenderOptions, calculateFlightPath, parseDiscSpec, renderSvg };
