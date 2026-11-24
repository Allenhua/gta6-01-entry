// Cars: one physics model for the player's car, traffic and police, plus the
// traffic AI that keeps the city moving — cars cruise their road, slow for the
// car ahead, and turn at intersections. Parked cars wait by the kerb to be stolen.
import { CAR, H_ROADS, PALETTE, V_ROADS, WORLD } from './config.js';
import { angleDelta, clamp, distance } from './random.js';
import { isBlocked, isOnRoad, nearestRoadPoint, randomRoadSpot } from './city.js';

let nextId = 1;

export function makeCar(kind, x, y, angle, color) {
  return {
    id: nextId,
    kind, // 'player' | 'traffic' | 'police' | 'parked' | 'taxi'
    x, y, angle,
    speed: 0,
    color,
    driver: kind === 'parked' ? null : kind,
    // Traffic AI state:
    axis: Math.abs(Math.sin(angle)) > 0.7 ? 'v' : 'h',
    road: 0,
    dir: 1,
    stuck: 0,
    honk: 0,
  };
}

// Spawn a spread of traffic and parked cars across the grid.
export function seedCars(random, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const spot = randomRoadSpot(random);
    const taxi = random.chance(0.12);
    const car = makeCar(taxi ? 'taxi' : 'traffic', spot.x, spot.y, spot.angle, taxi ? PALETTE.taxi : random.pick(PALETTE.carColors));
    car.speed = random.range(120, 220);
    car.road = nearestRoadIndex(car);
    cars.push(car);
  }
  // Parked cars at the kerb, clear of the driving lane — never blocking an
  // intersection. They sit 64 px off the road centre, on the sidewalk's edge.
  for (let i = 0; i < 14; i += 1) {
    const spot = randomRoadSpot(random);
    const vertical = Math.abs(Math.sin(spot.angle)) > 0.7;
    // Park at a fixed kerb offset from the road centre, not from the lane the
    // spot happened to land in, so the car is always clear of the driving lane.
    const roadX = vertical ? V_ROADS.reduce((best, rx) => (Math.abs(rx - spot.x) < Math.abs(best - spot.x) ? rx : best), V_ROADS[0]) : spot.x;
    const roadY = vertical ? spot.y : H_ROADS.reduce((best, ry) => (Math.abs(ry - spot.y) < Math.abs(best - spot.y) ? ry : best), H_ROADS[0]);
    let px = vertical ? roadX + 64 : spot.x;
    let py = vertical ? spot.y : roadY + 64;
    if (vertical && H_ROADS.some((ry) => Math.abs(py - ry) < 80)) py += 170;
    if (!vertical && V_ROADS.some((rx) => Math.abs(px - rx) < 80)) px += 170;
    // The nudge must never push a car into the water or off the map's edge.
    px = Math.max(60, Math.min(WORLD.w - 60, px));
    py = Math.max(60, Math.min(2390, py));
    const parked = makeCar('parked', px, py, spot.angle, random.pick(PALETTE.carColors));
    cars.push(parked);
  }
  return cars;
}

function nearestRoadIndex(car) {
  if (car.axis === 'v') {
    let best = 0;
    for (let i = 0; i < V_ROADS.length; i += 1) if (Math.abs(V_ROADS[i] - car.x) < Math.abs(V_ROADS[best] - car.x)) best = i;
    return best;
  }
  let best = 0;
  for (let i = 0; i < H_ROADS.length; i += 1) if (Math.abs(H_ROADS[i] - car.y) < Math.abs(H_ROADS[best] - car.y)) best = i;
  return best;
}

// Arcade driving: throttle accelerates along the heading, steering turns more the
// faster you go, and the car slides a little. Returns nothing; mutates the car.
export function driveCar(car, throttle, steer, dt) {
  const maxF = CAR.maxSpeed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 260 * dt);
  }
  car.speed = clamp(car.speed, -CAR.maxReverse, maxF);
  const turn = steer * CAR.turnRate * clamp(Math.abs(car.speed) / 220, 0, 1) * Math.sign(car.speed || 1);
  car.angle += turn * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = clamp(car.x, 30, WORLD.w - 30);
  car.y = clamp(car.y, 30, WORLD.h - 30);
}

// Keep a car out of buildings: if it drove into one, push it back along its path.
export function collideBuildings(city, car) {
  if (isBlocked(city, car.x, car.y)) {
    car.x -= Math.cos(car.angle) * car.speed * (1 / 60) * 2;
    car.y -= Math.sin(car.angle) * car.speed * (1 / 60) * 2;
    car.speed *= 0.4;
  }
}

// The car directly ahead of `car` within `range`, if any.
function carAhead(cars, car, range) {
  let best = null;
  let bestD = range;
  for (const other of cars) {
    if (other === car || other.kind === 'parked') continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (along > 0 && along < bestD && side < 40) {
      bestD = along;
      best = other;
    }
  }
  return best;
}

// One traffic step: cruise the road, brake for traffic, turn at intersections.
// A car that has wandered off the road steers back to the nearest road point.
export function updateTraffic(car, cars, random, dt) {
  const target = car.axis === 'v' ? V_ROADS[car.road] : H_ROADS[car.road];
  const ahead = carAhead(cars, car, 110);
  const want = ahead ? 0 : 190;
  car.speed += clamp(want - car.speed, -300 * dt, 180 * dt);
  const offRoad = !isOnRoad(car.x, car.y);
  if (offRoad) {
    // Lost: head for the nearest road and slow down while doing it.
    const rp = nearestRoadPoint(car.x, car.y);
    const wantAngle = Math.atan2(rp.y - car.y, rp.x - car.x);
    car.angle += clamp(angleDelta(car.angle, wantAngle), -2.4 * dt, 2.4 * dt);
    car.speed = Math.min(car.speed, 120);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    return;
  }
  // Steer back onto the lane centre.
  const lane = car.axis === 'v'
    ? target + (car.dir > 0 ? 22 : -22)
    : target + (car.dir > 0 ? 22 : -22);
  const pos = car.axis === 'v' ? car.x : car.y;
  const heading = car.axis === 'v' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  const steer = clamp(angleDelta(car.angle, heading) * 2 + clamp((lane - pos) * 0.06, -0.8, 0.8), -1, 1);
  car.angle += steer * 2.2 * dt * clamp(Math.abs(car.speed) / 120, 0.3, 1);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // At an intersection, sometimes turn onto the crossing road.
  const nearCross = car.axis === 'v'
    ? H_ROADS.some((ry) => Math.abs(car.y - ry) < 26)
    : V_ROADS.some((rx) => Math.abs(car.x - rx) < 26);
  if (nearCross && random.chance(dt * 0.35)) {
    if (car.axis === 'v') {
      car.axis = 'h';
      car.road = nearestRoadIndex({ axis: 'h', x: car.x, y: car.y });
      car.dir = random.chance(0.5) ? 1 : -1;
    } else {
      car.axis = 'v';
      car.road = nearestRoadIndex({ axis: 'v', x: car.x, y: car.y });
      car.dir = random.chance(0.5) ? 1 : -1;
    }
  }
  // Wrap around the far edge so traffic never runs dry.
  if (car.x < 40 || car.x > WORLD.w - 40 || car.y < 40 || car.y > WORLD.h - 40) {
    const spot = randomRoadSpot(random);
    car.x = spot.x;
    car.y = spot.y;
    car.angle = spot.angle;
    car.axis = Math.abs(Math.sin(spot.angle)) > 0.7 ? 'v' : 'h';
    car.road = nearestRoadIndex(car);
    car.dir = car.axis === 'v' ? (spot.angle > 0 ? 1 : -1) : (spot.angle === 0 ? 1 : -1);
  }
}

// Two cars bumping: push apart and trade a little speed. A parked car never
// moves and never steals speed — a car brushing one is pushed clear and slowed,
// and a car merely passing in the next lane (42 px across) is left alone, which
// a plain centre-distance check could not tell apart. Returns true on a hit.
export function collideCars(a, b) {
  const d = distance(a.x, a.y, b.x, b.y);
  const min = 62;
  if (d === 0) return false;
  if (a.kind === 'parked' || b.kind === 'parked') {
    // Oriented check against the parked car's frame: along its length and across it.
    const parked = a.kind === 'parked' ? a : b;
    const mover = a.kind === 'parked' ? b : a;
    const dx = mover.x - parked.x;
    const dy = mover.y - parked.y;
    const along = Math.abs(dx * Math.cos(parked.angle) + dy * Math.sin(parked.angle));
    const across = Math.abs(-dx * Math.sin(parked.angle) + dy * Math.cos(parked.angle));
    if (along >= 66 || across >= 38) return false;
    const push = 66 - along;
    const dir = Math.sign(dx * Math.cos(parked.angle) + dy * Math.sin(parked.angle)) || 1;
    mover.x += Math.cos(parked.angle) * push * dir;
    mover.y += Math.sin(parked.angle) * push * dir;
    mover.speed *= 0.5;
    return true;
  }
  if (d >= min) return false;
  const nx = (a.x - b.x) / d;
  const ny = (a.y - b.y) / d;
  const push = (min - d) / 2;
  a.x += nx * push;
  a.y += ny * push;
  b.x -= nx * push;
  b.y -= ny * push;
  const swap = a.speed;
  a.speed = b.speed * 0.6;
  b.speed = swap * 0.6;
  return true;
}
