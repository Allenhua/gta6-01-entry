// Dana "Daze" Cole on foot: WASD walking with building collision, getting in and
// out of cars, taking damage, and the little "busted / wasted" endings. The player
// is either on foot (x, y, angle) or inside exactly one car.
import { CAR, PLAYER } from './config.js';
import { clamp, distance } from './random.js';
import { isBlocked, unblock } from './city.js';

export function makePlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    cash: 0,
    ammo: 0,
    hasPistol: false,
    car: null, // the car object when driving, else null
    wanted: 0,
    wantedHeat: 0, // seconds since last seen committing a crime
    invulnerable: 0,
    meleeTimer: 0,
    shootCooldown: 0,
    busted: false,
    wasted: false,
    speed: 0,
  };
}

// Walk with WASD: `mx`/`my` are -1..1. Walls and water stop the player.
export function walkPlayer(player, city, mx, my, dt) {
  const len = Math.hypot(mx, my);
  if (len < 0.05) {
    player.speed = 0;
    return;
  }
  const nx = mx / len;
  const ny = my / len;
  player.angle = Math.atan2(ny, nx);
  player.speed = PLAYER.walkSpeed;
  const stepX = nx * PLAYER.walkSpeed * dt;
  const stepY = ny * PLAYER.walkSpeed * dt;
  if (!isBlocked(city, player.x + stepX, player.y)) player.x += stepX;
  if (!isBlocked(city, player.x, player.y + stepY)) player.y += stepY;
  player.x = clamp(player.x, 16, 3600 - 16);
  player.y = clamp(player.y, 16, 2600 - 16);
}

// The nearest car the player could get into (parked, traffic or police).
export function nearestEnterableCar(player, cars) {
  let best = null;
  let bestD = 110;
  for (const car of cars) {
    if (car === player.car) continue;
    const d = distance(player.x, player.y, car.x, car.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

// Get in: the driver (if any) bails out and flees on foot, which is a crime.
export function enterCar(player, car) {
  const stolen = car.kind === 'traffic' || car.kind === 'taxi' || car.kind === 'police';
  player.car = car;
  car.kind = 'player';
  car.driver = 'player';
  car.speed = 0;
  player.x = car.x;
  player.y = car.y;
  return stolen;
}

// Get out: step to the side of the car, on the road, never inside a wall.
export function exitCar(player, city) {
  const car = player.car;
  if (!car) return;
  car.kind = 'traffic';
  car.driver = 'traffic';
  car.speed = 0;
  const side = { x: car.x - Math.sin(car.angle) * 46, y: car.y + Math.cos(car.angle) * 46 };
  const spot = unblock(city, side.x, side.y);
  player.x = spot.x;
  player.y = spot.y;
  player.angle = car.angle;
  player.car = null;
}

// Damage the player; returns 'wasted' when health hits zero.
export function hurtPlayer(player, amount) {
  if (player.invulnerable > 0) return null;
  player.health -= amount;
  player.invulnerable = 0.5;
  if (player.health <= 0) {
    player.health = 0;
    player.wasted = true;
    return 'wasted';
  }
  return null;
}

// Raise the wanted level, at most 5 stars, and restart the heat timer.
export function addWanted(player, stars) {
  player.wanted = Math.min(5, player.wanted + stars);
  player.wantedHeat = 0;
}

// Heal a little when standing still and out of trouble — the city is forgiving.
export function recoverPlayer(player, dt, inDanger) {
  if (player.invulnerable > 0) player.invulnerable -= dt;
  if (player.meleeTimer > 0) player.meleeTimer -= dt;
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (!inDanger && player.health > 0 && player.health < PLAYER.maxHealth) {
    player.health = Math.min(PLAYER.maxHealth, player.health + 2 * dt);
  }
}
