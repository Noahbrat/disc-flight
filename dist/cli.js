#!/usr/bin/env node

// src/cli.ts
import { writeFileSync } from "fs";
import { resolve } from "path";

// src/flight.ts
var SAMPLES = 100;
function calculateFlightPath(input) {
  const { speed, glide, turn, fade, hand = "rhbh", armSpeed = "normal" } = input;
  const mirror = hand === "lhbh" || hand === "rhfh" ? -1 : 1;
  const armTurnMult = armSpeed === "slow" ? 0.5 : armSpeed === "fast" ? 1.4 : 1;
  const armFadeMult = armSpeed === "slow" ? 1.3 : armSpeed === "fast" ? 0.8 : 1;
  const armDistMult = armSpeed === "slow" ? 0.82 : armSpeed === "fast" ? 1.1 : 1;
  const baseDistance = 150 + speed * 18 + Math.sqrt(speed) * 12;
  const glideBonus = glide * 10 * (0.5 + speed * 0.04);
  const distance = (baseDistance + glideBonus) * armDistMult;
  const lateralBase = distance * 0.028;
  const absTurn = Math.abs(turn);
  const turnMag = Math.pow(absTurn, 1.5) * Math.sign(-turn) * armTurnMult * mirror * lateralBase;
  const fadeMag = Math.pow(fade, 1.5) * armFadeMult * mirror * lateralBase * 1.8;
  const turnPeak = 0.55 + speed * 0.012;
  const fadeOnset = 0.72 + speed * 8e-3;
  const points = [];
  let lateralPos = 0;
  const dt = 1 / SAMPLES;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const along = t * distance;
    let turnVel = 0;
    if (t <= turnPeak) {
      const p = t / turnPeak;
      turnVel = p * p * p;
    } else {
      const p = (t - turnPeak) / (1 - turnPeak);
      turnVel = Math.pow(1 - p, 2);
    }
    let fadeVel = 0;
    if (t > fadeOnset) {
      const p = (t - fadeOnset) / (1 - fadeOnset);
      fadeVel = p * p;
    }
    const netVel = turnMag * turnVel - fadeMag * fadeVel;
    if (i > 0) {
      lateralPos += netVel * dt * 5.8;
    }
    points.push({ x: lateralPos, y: along });
  }
  const landingPoint = points[points.length - 1];
  return { points, distance, landingPoint };
}

// src/render.ts
function pointsToSmoothPath(pts) {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
  }
  const step = Math.max(1, Math.floor(pts.length / 50));
  const sampled = [];
  for (let i = 0; i < pts.length; i += step) {
    sampled.push(pts[i]);
  }
  if (sampled[sampled.length - 1] !== pts[pts.length - 1]) {
    sampled.push(pts[pts.length - 1]);
  }
  let d = `M${sampled[0].x.toFixed(1)},${sampled[0].y.toFixed(1)}`;
  for (let i = 0; i < sampled.length - 1; i++) {
    const p0 = sampled[Math.max(0, i - 1)];
    const p1 = sampled[i];
    const p2 = sampled[i + 1];
    const p3 = sampled[Math.min(sampled.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}
var DEFAULTS = {
  width: 400,
  height: 600,
  padding: 40,
  showFairway: true,
  showLabels: true,
  showLandingZone: true,
  showGrid: false
};
function renderSvg(discs, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const inputs = Array.isArray(discs) ? discs : [discs];
  const paths = inputs.map((input) => ({
    input,
    path: calculateFlightPath(input)
  }));
  const allPoints = paths.flatMap((p) => p.path.points);
  const minX = Math.min(...allPoints.map((p) => p.x));
  const maxX = Math.max(...allPoints.map((p) => p.x));
  const maxY = Math.max(...allPoints.map((p) => p.y));
  const drawWidth = opts.width - opts.padding * 2;
  const drawHeight = opts.height - opts.padding * 2;
  const scaleY = drawHeight / maxY;
  const scaleX = scaleY;
  const contentMinX = minX * scaleX;
  const contentMaxX = maxX * scaleX;
  const contentWidth = contentMaxX - contentMinX;
  const offsetX = opts.padding + (drawWidth - contentWidth) / 2 - contentMinX;
  function toSvgX(x) {
    return offsetX + x * scaleX;
  }
  function toSvgY(y) {
    return opts.height - opts.padding - y * scaleY;
  }
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.width} ${opts.height}" width="${opts.width}" height="${opts.height}">
`;
  if (opts.showFairway) {
    svg += `  <rect width="${opts.width}" height="${opts.height}" fill="#1a472a" rx="8" />
`;
  }
  if (opts.showGrid) {
    const gridIntervals = [25, 50, 100, 150, 200];
    let gridStep = 50;
    for (const interval of gridIntervals) {
      const lineCount = Math.floor(maxY / interval);
      if (lineCount >= 3 && lineCount <= 10) {
        gridStep = interval;
        break;
      }
    }
    const gridColor = opts.showFairway ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
    const labelColor = opts.showFairway ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)";
    for (let dist = 0; dist <= maxY; dist += gridStep) {
      const y = toSvgY(dist);
      svg += `  <line x1="${opts.padding}" y1="${y}" x2="${opts.width - opts.padding}" y2="${y}" stroke="${gridColor}" stroke-width="0.75" />
`;
      svg += `  <text x="${opts.padding - 4}" y="${y + 4}" fill="${labelColor}" font-family="sans-serif" font-size="10" text-anchor="end">${dist}ft</text>
`;
    }
    const centerX = 0;
    for (let xFt = -gridStep; toSvgX(centerX + xFt) >= opts.padding; xFt -= gridStep) {
      const x = toSvgX(centerX + xFt);
      svg += `  <line x1="${x}" y1="${opts.padding}" x2="${x}" y2="${opts.height - opts.padding}" stroke="${gridColor}" stroke-width="0.75" />
`;
    }
    for (let xFt = gridStep; toSvgX(centerX + xFt) <= opts.width - opts.padding; xFt += gridStep) {
      const x = toSvgX(centerX + xFt);
      svg += `  <line x1="${x}" y1="${opts.padding}" x2="${x}" y2="${opts.height - opts.padding}" stroke="${gridColor}" stroke-width="0.75" />
`;
    }
    const cx = toSvgX(0);
    svg += `  <line x1="${cx}" y1="${opts.padding}" x2="${cx}" y2="${opts.height - opts.padding}" stroke="${gridColor}" stroke-width="0.75" />
`;
  }
  const teeX = toSvgX(0);
  const teeY = toSvgY(0);
  svg += `  <rect x="${teeX - 8}" y="${teeY - 3}" width="16" height="6" fill="#888" rx="1" />
`;
  for (const { input, path } of paths) {
    const color = input.color ?? "#ffffff";
    const lineWidth = input.lineWidth ?? 2.5;
    const svgPts = path.points.map((p) => ({ x: toSvgX(p.x), y: toSvgY(p.y) }));
    const d = pointsToSmoothPath(svgPts);
    svg += `  <path d="${d}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" />
`;
  }
  for (const { input, path } of paths) {
    const color = input.color ?? "#ffffff";
    if (opts.showLandingZone) {
      const lx = toSvgX(path.landingPoint.x);
      const ly = toSvgY(path.landingPoint.y);
      svg += `  <line x1="${lx - 4}" y1="${ly - 4}" x2="${lx + 4}" y2="${ly + 4}" stroke="${color}" stroke-width="2" />
`;
      svg += `  <line x1="${lx + 4}" y1="${ly - 4}" x2="${lx - 4}" y2="${ly + 4}" stroke="${color}" stroke-width="2" />
`;
    }
    if (opts.showLabels && input.label) {
      const lx = toSvgX(path.landingPoint.x);
      const ly = toSvgY(path.landingPoint.y) - 10;
      svg += `  <text x="${lx}" y="${ly}" fill="${color}" font-family="sans-serif" font-size="12" text-anchor="middle">${input.label}</text>
`;
    }
  }
  svg += `</svg>`;
  return svg;
}

// src/parse.ts
var FLIGHT_NUMBER_RE = /^-?\d+\/\d+\/-?\d+\/\d+$/;
function parseDiscSpec(spec) {
  const discs = spec.split(",").map((s) => s.trim()).filter(Boolean);
  if (discs.length === 0) {
    throw new Error("No disc specs provided");
  }
  return discs.map((discStr) => {
    const parts = discStr.split(":");
    const flightIdx = parts.findIndex((p) => FLIGHT_NUMBER_RE.test(p));
    if (flightIdx === -1) {
      throw new Error(`Invalid disc spec "${discStr}" \u2014 no flight numbers found (expected Speed/Glide/Turn/Fade)`);
    }
    const [speedStr, glideStr, turnStr, fadeStr] = parts[flightIdx].split("/");
    const label = flightIdx > 0 ? parts.slice(0, flightIdx).join(":") : void 0;
    const color = flightIdx < parts.length - 1 ? parts[flightIdx + 1] : void 0;
    const input = {
      speed: Number(speedStr),
      glide: Number(glideStr),
      turn: Number(turnStr),
      fade: Number(fadeStr)
    };
    if (label) input.label = label;
    if (color) input.color = color;
    return input;
  });
}
function isValidHand(value) {
  return ["rhbh", "lhbh", "rhfh", "lhfh"].includes(value);
}
function isValidArmSpeed(value) {
  return ["slow", "normal", "fast"].includes(value);
}

// src/cli.ts
function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    command: void 0,
    discs: void 0,
    output: void 0,
    width: 400,
    height: 600,
    grid: false,
    labels: true,
    landing: true,
    fairway: true,
    hand: "rhbh",
    armSpeed: "normal",
    help: false
  };
  let i = 0;
  if (args.length > 0 && !args[0].startsWith("-")) {
    result.command = args[0];
    i = 1;
  }
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--help":
        result.help = true;
        break;
      case "--discs":
      case "-d":
        result.discs = args[++i];
        break;
      case "--output":
      case "-o":
        result.output = args[++i];
        break;
      case "--width":
      case "-w":
        result.width = Number(args[++i]);
        break;
      case "--height":
      case "-h":
        result.height = Number(args[++i]);
        break;
      case "--grid":
        result.grid = true;
        break;
      case "--no-labels":
        result.labels = false;
        break;
      case "--no-landing":
        result.landing = false;
        break;
      case "--no-fairway":
        result.fairway = false;
        break;
      case "--hand": {
        const val = args[++i];
        if (val && isValidHand(val)) {
          result.hand = val;
        } else {
          process.stderr.write(`Warning: invalid hand "${val}", using rhbh
`);
        }
        break;
      }
      case "--arm-speed": {
        const val = args[++i];
        if (val && isValidArmSpeed(val)) {
          result.armSpeed = val;
        } else {
          process.stderr.write(`Warning: invalid arm-speed "${val}", using normal
`);
        }
        break;
      }
      default:
        process.stderr.write(`Warning: unknown flag "${arg}"
`);
        break;
    }
    i++;
  }
  return result;
}
function printHelp() {
  process.stderr.write(`disc-flight \u2014 Disc golf flight path visualization engine

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
`);
}
function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.help || !parsed.command) {
    printHelp();
    process.exit(parsed.help ? 0 : 1);
  }
  if (parsed.command !== "render") {
    process.stderr.write(`Unknown command "${parsed.command}". Only "render" is supported.
`);
    printHelp();
    process.exit(1);
  }
  if (!parsed.discs) {
    process.stderr.write("Error: --discs is required\n\n");
    printHelp();
    process.exit(1);
  }
  let inputs;
  try {
    inputs = parseDiscSpec(parsed.discs);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}
`);
    process.exit(1);
    return;
  }
  for (const input of inputs) {
    if (!input.hand) input.hand = parsed.hand;
    if (!input.armSpeed) input.armSpeed = parsed.armSpeed;
  }
  const options = {
    width: parsed.width,
    height: parsed.height,
    showGrid: parsed.grid,
    showLabels: parsed.labels,
    showLandingZone: parsed.landing,
    showFairway: parsed.fairway
  };
  const svg = renderSvg(inputs, options);
  if (parsed.output) {
    const outPath = resolve(parsed.output);
    try {
      writeFileSync(outPath, svg);
      process.stderr.write(`Wrote ${outPath} (${inputs.length} disc${inputs.length > 1 ? "s" : ""}, ${parsed.width}x${parsed.height})
`);
    } catch (err) {
      process.stderr.write(`Error writing file: ${err.message}
`);
      process.exit(1);
    }
  } else {
    process.stdout.write(svg);
  }
}
var isDirectRun = process.argv[1]?.endsWith("cli.js") || process.argv[1]?.endsWith("cli.ts");
if (isDirectRun) {
  main();
}
export {
  parseArgs
};
