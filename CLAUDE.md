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
- **`src/flight.ts`** — `calculateFlightPath()` — three-phase model (straight → turn → fade) that converts flight numbers to coordinate arrays. Supports arm speed modifier and handedness (RHBH/LHBH/RHFH/LHFH)
- **`src/render.ts`** — `renderSvg()` — takes one or more FlightInput objects, renders a top-down fairway SVG with flight paths, landing zone X marks, labels, and a tee pad marker
- **`src/__tests__/flight.test.ts`** — 5 invariant tests all passing: turn-0 stays straight, speed=distance, fade direction, turn magnitude, LHBH mirrors RHBH

## What's Next (Phase 1 completion)

The core math and basic SVG rendering work but need tuning and polish:

1. **Tune flight math against benchmark discs** — Destroyer (12/5/-1/3), Buzzz (5/4/-1/1), Firebird (9/3/0/4), Leopard (6/5/-2/1), Berg (1/1/0/2). Visually compare output against DG Puttheads and DiscGolfFlightCharts.com
2. **CLI tool** — `disc-flight render --discs "Destroyer:12/5/-1/3:red,Buzzz:5/4/-1/1:green" --output comparison.svg` for quick blog image generation
3. **SVG styling polish** — better fairway backgrounds, distance markers, flight number labels
4. **PNG export** — Sharp for Node.js side
5. **Side-profile view** — altitude arc showing disc height through the flight (differentiator vs competitors)

## Longer Term

- Phase 2: Blog integration (auto-generate images from markdown tags)
- Phase 3: Discpile.com Vue component integration
- Phase 4: Animated paths, user-adjusted flight numbers with sliders
- Phase 5: NPM publish, open-source community play
