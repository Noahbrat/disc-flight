# disc-flight

Disc golf flight path visualization engine. Takes flight numbers (speed/glide/turn/fade) and outputs flight path graphics as SVG strings, coordinate arrays, or (eventually) PNG.

## Project Context

- **Repo:** https://github.com/Noahbrat/disc-flight (public, MIT license)
- **Full planning doc:** `~/Library/Mobile Documents/com~apple~CloudDocs/clawd/discpile-flight-engine-plan.md`
- **Purpose:** Standalone open-source package that also powers discpile.com and blog content generation
- **Architecture decision:** Standalone package (Option C from planning doc) — discpile imports it as a dependency, blog tooling uses it via CLI or direct import

## Tech Stack

- TypeScript, zero runtime dependencies
- tsup for dual ESM + CJS builds
- Vitest for testing

## Commands

- `npm run build` — build with tsup
- `npm run test` — vitest watch mode
- `npm run test:run` — vitest single run
- `npm run lint` — typecheck with tsc --noEmit

## What Exists

- **`src/types.ts`** — Core interfaces: FlightInput, FlightPath, RenderOptions, Point, Hand, ArmSpeed
- **`src/flight.ts`** — `calculateFlightPath()` — velocity-integrated flight model. Models lateral velocity as a continuous function (cubic turn rise + quadratic decay, quadratic fade rise) and integrates to get position. No phase boundaries, mathematically smooth everywhere. Supports arm speed modifier and handedness (RHBH/LHBH/RHFH/LHFH)
- **`src/render.ts`** — `renderSvg()` — takes one or more FlightInput objects, renders a top-down fairway SVG with Catmull-Rom smooth curves, landing zone X marks, labels, and a tee pad marker. Uses uniform X/Y scaling so proportions are honest.
- **`src/__tests__/flight.test.ts`** — 5 invariant tests all passing: turn-0 stays straight, speed=distance, fade direction, turn magnitude, LHBH mirrors RHBH

## Flight Model Details

The model was tuned against DG Puttheads reference charts for benchmark discs (Destroyer, Buzzz, Firebird, Leopard, Berg). Key design decisions:

- **Velocity-based, not position-based** — lateral velocity is modeled as one continuous function and integrated to get position. This guarantees smooth curves with no kinks or bumps at phase boundaries.
- **Turn velocity:** cubic rise (`p³`) to peak, then quadratic decay. Very gradual start (looks straight), accelerates mid-flight, naturally decelerates. Peak around 55-67% of flight depending on speed.
- **Fade velocity:** quadratic ease-in (`p²`) over a compressed window (last ~18-22%). Always accelerating — the curve gets steeper as the disc slows to a stop.
- **Coast emerges naturally** from the velocity decay between turn and fade — no explicit coast phase needed.
- **Non-linear turn/fade scaling:** `abs(value)^1.5` so turn -1 is subtle, turn -4 is dramatic. Fade has a 1.8x multiplier since it's compressed into a shorter window.
- **Distance model:** feet-based. Berg ~185ft, Buzzz ~295ft, Leopard ~324ft, Firebird ~374ft, Destroyer ~457ft.

## What's Next (Phase 1 completion)

1. **CLI tool** — `disc-flight render --discs "Destroyer:12/5/-1/3:red,Buzzz:5/4/-1/1:green" --output comparison.svg` for quick blog image generation
2. **SVG styling polish** — better fairway backgrounds, distance markers, flight number labels
3. **PNG export** — Sharp for Node.js side
4. **Side-profile view** — altitude arc showing disc height through the flight (differentiator vs competitors)
5. **More benchmark validation** — test against more disc molds, edge cases (very understable, very overstable)

## Longer Term

- Phase 2: Blog integration (auto-generate images from markdown tags)
- Phase 3: Discpile.com Vue component integration
- Phase 4: Animated paths, user-adjusted flight numbers with sliders
- Phase 5: NPM publish, open-source community play
