// The city of Solmar Bay: a road grid, the buildings that fill its blocks, the beach
// and water along the south edge, Pelican Park, the docks, and the palm trees that
// line the shore. Built once from a seed; everything else reads this, never mutates it.
import { BEACH_TOP, H_ROADS, PALETTE, V_ROADS, WATER_TOP, WORLD } from './config.js';

const ROOFS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD, PALETTE.roofE];

export function buildCity(random) {
  const buildings = [];
  const palms = [];
  const half = 86 / 2;

  // Every block between two neighbouring roads gets one or two buildings.
  for (let vi = 0; vi < V_ROADS.length - 1; vi += 1) {
    for (let hi = 0; hi < H_ROADS.length - 1; hi += 1) {
      const x0 = V_ROADS[vi] + half + 30;
      const x1 = V_ROADS[vi + 1] - half - 30;
      const y0 = H_ROADS[hi] + half + 30;
      const y1 = H_ROADS[hi + 1] - half - 30;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // The block at (1620..2220, 900..1440) is Pelican Park, not buildings.
      if (V_ROADS[vi] === 1620 && H_ROADS[hi] === 900) continue;
      const split = random.chance(0.55);
      if (split && x1 - x0 > 260) {
        const cut = x0 + (x1 - x0) * random.range(0.4, 0.6);
        buildings.push(makeBuilding(random, x0, y0, cut - 8, y1));
        buildings.push(makeBuilding(random, cut + 8, y0, x1, y1));
      } else {
        buildings.push(makeBuilding(random, x0, y0, x1, y1));
      }
    }
  }

  // Edge strips the grid leaves bare — the top, left and right margins get their
  // own buildings so the city reads as a city right up to its borders.
  const halfRoad = 86 / 2;
  for (let vi = 0; vi < V_ROADS.length - 1; vi += 1) {
    buildings.push(makeBuilding(random, V_ROADS[vi] + halfRoad + 30, 70, V_ROADS[vi + 1] - halfRoad - 30, 287));
  }
  for (let hi = 0; hi < H_ROADS.length - 1; hi += 1) {
    buildings.push(makeBuilding(random, 70, H_ROADS[hi] + halfRoad + 30, 347, H_ROADS[hi + 1] - halfRoad - 30));
    buildings.push(makeBuilding(random, 3373, H_ROADS[hi] + halfRoad + 30, 3530, H_ROADS[hi + 1] - halfRoad - 30));
  }

  // Palms along the beach and a few scattered through the park.
  for (let x = 120; x < WORLD.w - 60; x += 130) {
    palms.push({ x: x + random.range(-30, 30), y: BEACH_TOP + random.range(18, 55), sway: random.range(0, Math.PI * 2) });
  }
  for (let i = 0; i < 26; i += 1) {
    palms.push({ x: random.range(1700, 2140), y: random.range(980, 1360), sway: random.range(0, Math.PI * 2) });
  }
  // A row of palms down the main drag.
  for (let y = 420; y < 2300; y += 240) {
    palms.push({ x: 2220 - 62, y, sway: random.range(0, Math.PI * 2) });
    palms.push({ x: 2220 + 62, y: y + 120, sway: random.range(0, Math.PI * 2) });
  }

  return { buildings, palms };
}

function makeBuilding(random, x0, y0, x1, y1) {
  return {
    x: x0,
    y: y0,
    w: x1 - x0,
    h: y1 - y0,
    roof: random.pick(ROOFS),
    height: random.int(1, 3),
    sign: random.chance(0.3),
  };
}

export function isOnRoad(x, y) {
  const half = 86 / 2;
  for (const rx of V_ROADS) if (Math.abs(x - rx) < half) return true;
  for (const ry of H_ROADS) if (Math.abs(y - ry) < half) return true;
  return false;
}

// True when the point is inside a building or in the water (not walkable / drivable).
export function isBlocked(city, x, y) {
  if (y > WATER_TOP) return true;
  for (const b of city.buildings) {
    if (x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4) return true;
  }
  return false;
}

// Slide a point out of buildings: try small nudges until free, else leave it.
export function unblock(city, x, y) {
  if (!isBlocked(city, x, y)) return { x, y };
  for (let r = 8; r <= 120; r += 8) {
    for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r]]) {
      if (!isBlocked(city, x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
  }
  return { x, y };
}

// A random point on a road (lane offset to the right of travel), for traffic spawns.
export function randomRoadSpot(random) {
  if (random.chance(0.5)) {
    const rx = random.pick(V_ROADS);
    return { x: rx + random.pick([-22, 22]), y: random.range(120, WORLD.h - 200), angle: random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2 };
  }
  const ry = random.pick(H_ROADS);
  return { x: random.range(120, WORLD.w - 120), y: ry + random.pick([-22, 22]), angle: random.chance(0.5) ? 0 : Math.PI };
}

// A random sidewalk point near a road, for pedestrians.
export function randomSidewalkSpot(random) {
  if (random.chance(0.5)) {
    const rx = random.pick(V_ROADS);
    return { x: rx + random.pick([-58, 58]), y: random.range(120, WORLD.h - 220) };
  }
  const ry = random.pick(H_ROADS);
  return { x: random.range(120, WORLD.w - 120), y: ry + random.pick([-58, 58]) };
}

// The nearest point on any road centreline to (x, y), for mission markers and AI.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of V_ROADS) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y }; }
  }
  for (const ry of H_ROADS) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry }; }
  }
  return best;
}
