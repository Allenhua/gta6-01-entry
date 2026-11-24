// Screenshot scenes behind ?shot=start|play|chase|mission. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// scripted driver (hold the throttle, steer back onto the road), so the frame is
// what a short game really looks like — and the same seed always gives the same frame.
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createGame, stepGame } from './game.js';
import { makeCar } from './cars.js';
import { makeRival } from './combat.js';
import { PLACES } from './config.js';

const SAMPLE = 1 / 60;
const IDLE = { move: { x: 0, y: 0 }, actions: 0, click: false, mouseWorld: { x: 0, y: 0 } };
const DRIVE = { move: { x: 0, y: -1 }, actions: 0, click: false, mouseWorld: { x: 0, y: 0 } };

function putPlayerInCar(g, x, y, angle, color) {
  const car = makeCar('player', x, y, angle, color);
  car.speed = 180;
  g.cars.push(car);
  g.player.car = car;
  g.player.x = x;
  g.player.y = y;
  g.player.angle = angle;
  return car;
}

function runSteps(g, seconds, input) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) stepGame(g, input, SAMPLE);
}

// Clear the traffic out of a corridor so the staged drive is not a traffic jam:
// the shot should show the player moving, not queueing.
function clearCorridor(g, roadX, yTop, yBottom) {
  g.cars = g.cars.filter((car) => {
    if (car === g.player.car) return true;
    if (car.kind === 'police') return true;
    return !(Math.abs(car.x - roadX) < 170 && car.y > yTop && car.y < yBottom);
  });
}

// Steer the player's car back toward its road while holding the throttle.
function driveSteps(g, seconds, roadX) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const car = g.player.car;
    const steer = car ? Math.max(-1, Math.min(1, (roadX - car.x) * 0.02)) : 0;
    stepGame(g, { move: { x: steer, y: -1 }, actions: 0, click: false, mouseWorld: { x: car.x, y: car.y - 400 } }, SAMPLE);
  }
}

/**
 * Set `game` to the named scene (start, play, chase or mission; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, game) {
  if (name === 'play') {
    putPlayerInCar(game, 1620, 1500, -Math.PI / 2, '#e74c3c');
    game.missions.index = 0;
    game.missions.stage = 1;
    game.lastMissionIndex = 0;
    clearCorridor(game, 1620, 200, 1700);
    driveSteps(game, 1.5, 1620);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    const car = putPlayerInCar(game, 2220, 1500, -Math.PI / 2, '#f1c40f');
    car.speed = 430;
    game.player.wanted = 2;
    game.missions.index = 2;
    game.lastMissionIndex = 2;
    clearCorridor(game, 2220, 300, 2000);
    for (let i = 0; i < 3; i += 1) {
      // Single file down the road, 90 px apart — close enough to read as a pack,
      // far enough apart to read as three cars.
      const cop = makeCar('police', 2220, 1500 + 110 + i * 90, -Math.PI / 2, '#e8e8e8');
      cop.speed = 380;
      game.police.push(cop);
      game.cars.push(cop);
    }
    driveSteps(game, 1.2, 2220);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    game.player.x = PLACES.docks.x - 160;
    game.player.y = PLACES.docks.y - 40;
    game.player.angle = 0;
    game.player.hasPistol = true;
    game.player.ammo = 24;
    game.missions.index = 3;
    game.missions.stage = 1;
    game.lastMissionIndex = 3;
    for (let i = 0; i < 3; i += 1) {
      // Spread around the docks so the three read as three, not one pile.
      const spots = [
        [PLACES.docks.x - 80, PLACES.docks.y - 90],
        [PLACES.docks.x + 60, PLACES.docks.y + 80],
        [PLACES.docks.x + 150, PLACES.docks.y - 40],
      ];
      game.rivals.push(makeRival(spots[i][0], spots[i][1]));
    }
    runSteps(game, 1.2, IDLE);
    return { screen: SCREEN_PLAY };
  }
  // Start: the city idles behind the title.
  runSteps(game, 5, IDLE);
  return { screen: SCREEN_TITLE };
}

// A fresh game for a shot, so staging never depends on an earlier play session.
export function createShotGame(seed) {
  return createGame(seed);
}
