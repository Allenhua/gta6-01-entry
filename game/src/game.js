// The game itself: state, the fixed-step simulation, saving. No drawing, no input
// devices — main.js feeds it input and the renderer reads it back. Every system
// (driving, traffic, pedestrians, police, missions, combat) meets here.
import { CAR, PLAYER, SAVE_KEY, STEP } from './config.js';
import { makeRandom, distance } from './random.js';
import { buildCity } from './city.js';
import { seedCars, driveCar, updateTraffic, collideCars, collideBuildings } from './cars.js';
import { makePlayer, walkPlayer, nearestEnterableCar, enterCar, exitCar, addWanted, hurtPlayer, recoverPlayer } from './player.js';
import { seedPedestrians, updatePedestrian, carHitsPed } from './pedestrians.js';
import { spawnPolice, updatePolice, bustMeter, decayWanted, wantedCarCount } from './police.js';
import { createMissions, updateMissions, onMissionStart, tryBankGrab } from './missions.js';
import { playerShoot, playerMelee, updateBullets, updateRivals, updateParticles } from './combat.js';
import { ACTION_INTERACT, ACTION_MELEE } from './input.js';

export function createGame(seed) {
  const random = makeRandom(seed);
  const city = buildCity(random);
  const player = makePlayer(1020, 1980);
  const game = {
    seed,
    random,
    city,
    player,
    cars: seedCars(random, 16),
    peds: seedPedestrians(random, 20),
    police: [],
    rivals: [],
    bullets: [],
    particles: [],
    missions: createMissions(),
    events: [],
    bustMeter: 0,
    hurtFlash: 0,
    elapsed: 0,
    policeTimer: 0,
    crimeCooldown: 0,
    saveExists: false,
    saveTimer: 0,
    lastMissionIndex: 0,
  };
  return game;
}

// One fixed step of the whole simulation. `input` carries the frame's movement,
// actions and mouse; the renderer and audio drain `game.events` afterwards.
export function stepGame(g, input, dt) {
  const p = g.player;
  g.elapsed += dt;
  if (g.crimeCooldown > 0) g.crimeCooldown -= dt;
  if (g.hurtFlash > 0) g.hurtFlash -= dt;

  // --- Player: on foot or driving.
  if (p.car) {
    const move = input.move;
    const throttle = move.y < 0 ? 1 : move.y > 0 ? -1 : 0;
    const steer = move.x;
    driveCar(p.car, throttle, steer, dt);
    collideBuildings(g.city, p.car);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
  } else {
    walkPlayer(p, g.city, input.move.x, input.move.y, dt);
  }

  // --- One-shot actions.
  if (input.actions & ACTION_INTERACT) {
    if (p.car) {
      exitCar(p, g.city);
    } else if (tryBankGrab(g)) {
      g.events.push('pickup');
    } else {
      const car = nearestEnterableCar(p, g.cars);
      if (car) {
        const stolen = enterCar(p, car);
        if (stolen && g.crimeCooldown <= 0) {
          addWanted(p, 1);
          g.crimeCooldown = 2;
          g.events.push('alarm');
        }
        g.events.push('pickup');
      }
    }
  }
  if (input.actions & ACTION_MELEE) playerMelee(g);
  if (input.click) {
    if (playerShoot(g, input.mouseWorld.x, input.mouseWorld.y)) {
      g.threat = { x: p.x, y: p.y, radius: 520 };
    }
  }

  // --- Traffic and parked cars. (Police cars are steered in the police section.)
  for (const car of g.cars) {
    if (car.kind === 'traffic' || car.kind === 'taxi') {
      updateTraffic(car, g.cars, g.random, dt);
      collideBuildings(g.city, car);
    }
  }
  // Keep the streets full.
  if (g.cars.filter((c) => c.kind === 'traffic' || c.kind === 'taxi').length < 12) {
    const fresh = seedCars(g.random, 1);
    g.cars.push(fresh[0]);
  }
  // Car-on-car bumps. Parked cars hold their ground; the moving car bounces off.
  for (let i = 0; i < g.cars.length; i += 1) {
    for (let j = i + 1; j < g.cars.length; j += 1) {
      const a = g.cars[i];
      const b = g.cars[j];
      if (a.kind === 'parked' && b.kind === 'parked') continue;
      // A police convoy does not ram itself: cops chasing the same player pass
      // through each other's bumpers instead of trading speed away.
      if (a.kind === 'police' && b.kind === 'police') continue;
      if (collideCars(a, b)) {
        if ((a === p.car || b === p.car) && Math.abs((a === p.car ? a.speed : b.speed)) > 200) {
          if (hurtPlayer(p, 4) === 'wasted') g.events.push('wasted');
          g.hurtFlash = 0.6;
          g.events.push('crash');
        } else if (a === p.car || b === p.car) {
          g.events.push('crash');
        }
      }
    }
  }

  // --- Pedestrians: stroll, flee, and the occasional accident.
  const threat = g.threat || (p.car && Math.abs(p.car.speed) > 200 ? { x: p.car.x, y: p.car.y, radius: 220 } : null);
  for (const ped of g.peds) updatePedestrian(ped, g.random, threat, dt);
  if (g.threat) g.threat = null;
  for (const car of g.cars) {
    if (car.kind === 'parked') continue;
    for (const ped of g.peds) {
      if (carHitsPed(car, ped) === 'hit' && car === p.car && g.crimeCooldown <= 0) {
        addWanted(p, 1);
        g.crimeCooldown = 2;
        g.events.push('alarm');
      }
    }
  }

  // --- Police: spawn to match the wanted level, chase, ram, bust.
  const wantedCount = wantedCarCount(p.wanted);
  g.policeTimer -= dt;
  if (g.police.length < wantedCount && g.policeTimer <= 0) {
    const cop = spawnPolice(g.random, p, null);
    if (cop) {
      g.police.push(cop);
      g.cars.push(cop);
    }
    g.policeTimer = 1.2;
  }
  if (p.wanted === 0 && g.police.length > 0) {
    // The heat is off: the cops peel away and despawn at a distance.
    g.police = g.police.filter((cop) => {
      const d = distance(cop.x, cop.y, p.car ? p.car.x : p.x, p.car ? p.car.y : p.y);
      if (d > 900) {
        const at = g.cars.indexOf(cop);
        if (at >= 0) g.cars.splice(at, 1);
        return false;
      }
      return true;
    });
  }
  for (const cop of g.police) {
    collideBuildings(g.city, cop);
    if (updatePolice(cop, p, dt) === 'ram') {
      if (p.car) {
        if (hurtPlayer(p, 6) === 'wasted') g.events.push('wasted');
        g.hurtFlash = 0.7;
        g.events.push('crash');
      }
    }
  }
  g.bustMeter = bustMeter(p, g.police, dt, g.bustMeter);
  if (g.bustMeter >= 1 && !p.busted) {
    p.busted = true;
    g.events.push('busted');
  }
  if (decayWanted(p, g.police, dt)) g.events.push('heat-down');

  // --- Missions, combat, particles.
  if (g.missions.index !== g.lastMissionIndex) {
    g.lastMissionIndex = g.missions.index;
    onMissionStart(g);
  }
  updateMissions(g, dt);
  if (g.events.includes('mission-complete')) g.events.push('save');
  updateBullets(g, dt);
  if (updateRivals(g, dt)) {
    if (hurtPlayer(p, 12) === 'wasted') g.events.push('wasted');
    g.hurtFlash = 0.6;
  }
  updateParticles(g, dt);
  recoverPlayer(p, dt, p.wanted > 0 || g.rivals.length > 0);

  // --- Autosave every few seconds while playing.
  g.saveTimer += dt;
  if (g.saveTimer > 5) {
    g.saveTimer = 0;
    saveGame(g);
  }
}

// The contextual prompt the HUD shows ("Press E to steal the car", ...).
export function promptFor(g) {
  const p = g.player;
  if (p.car) return 'E — get out   •   WASD drive';
  const m = g.missions;
  if (m.index === 4 && m.stage === 1 && distance(p.x, p.y, 1620, 360) < 110) return 'E — grab the cash';
  const car = nearestEnterableCar(p, g.cars);
  if (car) {
    if (car.kind === 'parked') return 'E — take this car';
    if (car.kind === 'police') return 'E — steal the police car (!)';
    return 'E — jack this car';
  }
  if (p.hasPistol) return 'Click — shoot   •   F — punch';
  return 'WASD — walk   •   Find a car and press E';
}

export function saveGame(g) {
  try {
    const p = g.player;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: p.cash,
      mission: g.missions.index,
      stage: g.missions.stage,
      hasPistol: p.hasPistol,
      ammo: p.ammo,
    }));
    g.saveExists = true;
  } catch {
    // Private windows: the save lasts this visit only.
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function applySave(g, save) {
  if (!save) return;
  g.player.cash = save.cash || 0;
  g.missions.index = save.mission || 0;
  g.missions.stage = save.stage || 0;
  g.player.hasPistol = !!save.hasPistol;
  g.player.ammo = save.ammo || 0;
  g.lastMissionIndex = g.missions.index;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
