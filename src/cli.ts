import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderSvg } from './render'
import { parseDiscSpec, isValidHand, isValidArmSpeed } from './parse'
import type { FlightInput, RenderOptions, Hand, ArmSpeed } from './types'

interface ParsedArgs {
  command: string | undefined
  discs: string | undefined
  output: string | undefined
  width: number
  height: number
  grid: boolean
  labels: boolean
  landing: boolean
  fairway: boolean
  hand: Hand
  armSpeed: ArmSpeed
  help: boolean
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2)
  const result: ParsedArgs = {
    command: undefined,
    discs: undefined,
    output: undefined,
    width: 400,
    height: 600,
    grid: false,
    labels: true,
    landing: true,
    fairway: true,
    hand: 'rhbh',
    armSpeed: 'normal',
    help: false,
  }

  let i = 0

  // First non-flag arg is the command
  if (args.length > 0 && !args[0].startsWith('-')) {
    result.command = args[0]
    i = 1
  }

  while (i < args.length) {
    const arg = args[i]

    switch (arg) {
      case '--help':
        result.help = true
        break
      case '--discs':
      case '-d':
        result.discs = args[++i]
        break
      case '--output':
      case '-o':
        result.output = args[++i]
        break
      case '--width':
      case '-w':
        result.width = Number(args[++i])
        break
      case '--height':
      case '-h':
        result.height = Number(args[++i])
        break
      case '--grid':
        result.grid = true
        break
      case '--no-labels':
        result.labels = false
        break
      case '--no-landing':
        result.landing = false
        break
      case '--no-fairway':
        result.fairway = false
        break
      case '--hand': {
        const val = args[++i]
        if (val && isValidHand(val)) {
          result.hand = val
        } else {
          process.stderr.write(`Warning: invalid hand "${val}", using rhbh\n`)
        }
        break
      }
      case '--arm-speed': {
        const val = args[++i]
        if (val && isValidArmSpeed(val)) {
          result.armSpeed = val
        } else {
          process.stderr.write(`Warning: invalid arm-speed "${val}", using normal\n`)
        }
        break
      }
      default:
        process.stderr.write(`Warning: unknown flag "${arg}"\n`)
        break
    }

    i++
  }

  return result
}

function printHelp(): void {
  process.stderr.write(`disc-flight — Disc golf flight path visualization engine

Usage:
  disc-flight render --discs <spec> [options]

Disc spec format:
  Label:Speed/Glide/Turn/Fade:Color (comma-separated for multiple)

  Examples:
    "12/5/-1/3"
    "Destroyer:12/5/-1/3:red"
    "Destroyer:12/5/-1/3:red,Buzzz:5/4/-1/1:green"

Options:
  -d, --discs <spec>     Disc specification string (required)
  -o, --output <file>    Output file path (default: stdout)
  -w, --width <px>       SVG width in pixels (default: 400)
  -h, --height <px>      SVG height in pixels (default: 600)
      --grid             Show distance grid
      --no-labels        Hide disc labels
      --no-landing       Hide landing zone markers
      --no-fairway       Hide fairway background
      --hand <type>      Throw type: rhbh, lhbh, rhfh, lhfh (default: rhbh)
      --arm-speed <s>    Arm speed: slow, normal, fast (default: normal)
      --help             Show this help message
`)
}

function main(): void {
  const parsed = parseArgs(process.argv)

  if (parsed.help || !parsed.command) {
    printHelp()
    process.exit(parsed.help ? 0 : 1)
  }

  if (parsed.command !== 'render') {
    process.stderr.write(`Unknown command "${parsed.command}". Only "render" is supported.\n`)
    printHelp()
    process.exit(1)
  }

  if (!parsed.discs) {
    process.stderr.write('Error: --discs is required\n\n')
    printHelp()
    process.exit(1)
  }

  let inputs: FlightInput[]
  try {
    inputs = parseDiscSpec(parsed.discs!)
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`)
    process.exit(1)
    return // unreachable but satisfies TS
  }

  // Apply global hand and arm speed to all discs
  for (const input of inputs) {
    if (!input.hand) input.hand = parsed.hand
    if (!input.armSpeed) input.armSpeed = parsed.armSpeed
  }

  const options: RenderOptions = {
    width: parsed.width,
    height: parsed.height,
    showGrid: parsed.grid,
    showLabels: parsed.labels,
    showLandingZone: parsed.landing,
    showFairway: parsed.fairway,
  }

  const svg = renderSvg(inputs, options)

  if (parsed.output) {
    const outPath = resolve(parsed.output)
    try {
      writeFileSync(outPath, svg)
      process.stderr.write(`Wrote ${outPath} (${inputs.length} disc${inputs.length > 1 ? 's' : ''}, ${parsed.width}x${parsed.height})\n`)
    } catch (err) {
      process.stderr.write(`Error writing file: ${(err as Error).message}\n`)
      process.exit(1)
    }
  } else {
    process.stdout.write(svg)
  }
}

// Only run when executed directly
const isDirectRun = process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('cli.ts')
if (isDirectRun) {
  main()
}
