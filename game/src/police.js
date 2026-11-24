// The Solmar Bay police: wanted stars, patrol cars that spawn off-screen and chase,
// ram the player's car, and bust the player on foot if they get close enough for
// long enough. Heat cools off only while no cop can see the player.
import { PALETTE } from './config.js';
import { angleDelta, clamp, distance } from './random.js';
import { makeCar } from './cars.js';
import { nearestRoadPoint, randomRoadSpot } from './city.js';

export function wantedCarCount(wanted) {
  return wanted <= 0 ? 0 : Math.min(1 + wanted, 6);
}

// Spawn a police car on a road near the player, but off the current screen.
export function spawnPolice(random, player, camera) {
  for (let tries = 0; tries < 12; tries += 1) {
    const spot = randomRoadSpot(random);
    const px = player.car ? player.car.x : player.x;
    const py = player.car ? player.car.y : player.y;
    const d = distance(spot.x, spot.y, px, py);
    const onScreen = camera && Math.abs(spot.x - camera.x) < 760 && Math.abs(spot.y - camera.y) < 480;
    if (d > 500 && d < 1400 && !onScreen) {
      const car = makeCar('police', spot.x, spot.y, Math.atan2(py - spot.y, px - spot.x), PALETTE.cop);
      car.speed = 240;
      return car;
    }
  }
  return null;
}

// Steer a police car at the player and ram. Returns 'ram' on a hard hit.
export function updatePolice(car, player, dt) {
  const tx = player.car ? player.car.x : player.x;
  const ty = player.car ? player.car.y : player.y;
  const want = Math.atan2(ty - car.y, tx - car.x);
  const turn = clamp(angleDelta(car.angle, want), -1, 1);
  car.angle += turn * 3.1 * dt;
  const d = distance(car.x, car.y, tx, ty);
  const targetSpeed = d > 700 ? 540 : d > 260 ? 500 : 460;
  car.speed += clamp(targetSpeed - car.speed, -420 * dt, 380 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (d < 66 && Math.abs(car.speed) > 120) {
    // A ram: shove the player's car and slow the cop down.
    if (player.car) {
      player.car.x += Math.cos(car.angle) * 26;
      player.car.y += Math.sin(car.angle) * 26;
      player.car.speed *= 0.55;
    }
    car.speed *= 0.35;
    return 'ram';
  }
  return null;
}

// A cop on foot range: if a police car sits on the player while on foot, the bust
// meter fills; full meter means busted. Returns the meter 0..1.
export function bustMeter(player, policeCars, dt, meter) {
  if (player.car) return Math.max(0, meter - dt * 0.4);
  let near = false;
  for (const cop of policeCars) {
    if (distance(cop.x, cop.y, player.x, player.y) < 90) {
      near = true;
      break;
    }
  }
  if (near) return Math.min(1, meter + dt * 0.5);
  return Math.max(0, meter - dt * 0.5);
}

// Heat decay: with no cop within sight range for a while, lose one star.
export function decayWanted(player, policeCars, dt) {
  if (player.wanted <= 0) return false;
  const px = player.car ? player.car.x : player.x;
  const py = player.car ? player.car.y : player.y;
  const seen = policeCars.some((cop) => distance(cop.x, cop.y, px, py) < 620);
  if (seen) {
    player.wantedHeat = 0;
    return false;
  }
  player.wantedHeat += dt;
  if (player.wantedHeat > 9) {
    player.wanted -= 1;
    player.wantedHeat = 0;
    return true;
  }
  return false;
}

// Where the player should run to: the nearest road point is where cops spawn, so
// the minimap can show the heat as a red ring around the player instead.
export function heatRadius(wanted) {
  return 260 + wanted * 120;
}
