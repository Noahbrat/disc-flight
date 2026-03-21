# disc-flight

Disc golf flight path visualization engine. Takes flight numbers (speed/glide/turn/fade) and outputs flight path SVGs.

## Project Context

- **Repo:** https://github.com/Noahbrat/disc-flight (public, MIT license)
- **Full planning doc:** `~/Library/Mobile Documents/com~apple~CloudDocs/clawd/discpile-flight-engine-plan.md`
- **Purpose:** Standalone open-source package that also powers discpile.com and blog content generation
- **Architecture:** Standalone package — discpile imports it as a dependency, blog tooling uses it via CLI or direct import

## Tech Stack

- TypeScript, zero runtime dependencies (except @types/node for CLI)
- tsup for dual ESM + CJS builds + CLI entry point
- Vitest for testing

## Commands

- `npm run build` — build with tsup (library + CLI)
- `npm run test` — vitest watch mode
- `npm run test:run` — vitest single run
- `npm run lint` — typecheck with tsc --noEmit

## Flight Model Details

Velocity-integrated model tuned against DG Puttheads reference charts (Destroyer, Buzzz, Firebird, Leopard, Berg). Lateral velocity is one continuous function integrated to get position — no phase boundaries, smooth everywhere. Turn uses cubic rise + quadratic decay; fade uses quadratic ease-in over a compressed window. Non-linear scaling (`abs(value)^1.5`) so subtle numbers stay subtle and dramatic numbers are dramatic.
