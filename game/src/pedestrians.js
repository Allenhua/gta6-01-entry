// Pedestrians: the city's foot traffic. They stroll the sidewalks, change direction
// at intersections, flee from speeding cars and gunfire, and go down (not up) when
// a car hits them hard — which the police notice.
import { randomSidewalkSpot } from './city.js';
import { angleDelta, clamp, distance } from './random.js';

const SHIRTS = ['#f5d76e', '#e67e22', '#9b59b6', '#1abc9c', '#e74c3c', '#3498db', '#ecf0f1', '#f39c12'];

export function makePedestrian(random, x, y) {
  return {
    x, y,
    angle: random.range(0, Math.PI * 2),
    speed: random.range(38, 70),
    shirt: random.pick(SHIRTS),
    state: 'walk', // 'walk' | 'flee' | 'down'
    targetX: x,
    targetY: y,
    downTimer: 0,
    fleeTimer: 0,
  };
}

export function seedPedestrians(random, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const spot = randomSidewalkSpot(random);
    peds.push(makePedestrian(random, spot.x, spot.y));
  }
  return peds;
}

// One pedestrian step. `threat` is {x, y, radius} when something scary is near.
export function updatePedestrian(ped, random, threat, dt) {
  if (ped.state === 'down') {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) {
      ped.state = 'walk';
      ped.speed = 50;
    }
    return;
  }
  if (threat && distance(ped.x, ped.y, threat.x, threat.y) < threat.radius) {
    ped.state = 'flee';
    ped.fleeTimer = 2.5;
    ped.angle = Math.atan2(ped.y - threat.y, ped.x - threat.x);
  }
  if (ped.state === 'flee') {
    ped.fleeTimer -= dt;
    ped.speed = 190;
    if (ped.fleeTimer <= 0) ped.state = 'walk';
  } else {
    ped.speed = 55;
    // Pick a new stroll target when the old one is reached.
    if (distance(ped.x, ped.y, ped.targetX, ped.targetY) < 24) {
      const spot = randomSidewalkSpot(random);
      ped.targetX = spot.x;
      ped.targetY = spot.y;
    }
    const want = Math.atan2(ped.targetY - ped.y, ped.targetX - ped.x);
    ped.angle += clamp(angleDelta(ped.angle, want), -2.4 * dt, 2.4 * dt);
  }
  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  ped.x = clamp(ped.x, 20, 3580);
  ped.y = clamp(ped.y, 20, 2440);
}

// A car hitting a pedestrian. Returns 'hit' when the ped goes down.
export function carHitsPed(car, ped) {
  if (ped.state === 'down') return null;
  if (distance(car.x, car.y, ped.x, ped.y) < 34 && Math.abs(car.speed) > 130) {
    ped.state = 'down';
    ped.downTimer = 14;
    // Knock them clear of the road.
    ped.x += Math.cos(car.angle) * 26;
    ped.y += Math.sin(car.angle) * 26;
    return 'hit';
  }
  return null;
}
