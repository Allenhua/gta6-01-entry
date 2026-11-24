// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between five
// screens: title, play, paused, game over and the story's end.
//
// ?seed=N fixes the city. ?shot=start|play|chase|mission (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { STEP } from './config.js';
import { createGame, stepGame, promptFor, saveGame, loadSave, applySave, clearSave } from './game.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot, createShotGame } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function announce(message) {
  status.textContent = message;
}

// Drain the simulation's events into sound (and the occasional save).
function drainEvents(game) {
  for (const event of game.events) {
    if (event === 'save') saveGame(game);
    else if (event === 'story-done') audio.play('mission-complete');
    else if (event === 'mission-complete') audio.play('mission-complete');
    else if (event === 'shoot' || event === 'melee' || event === 'melee-hit' || event === 'crash'
      || event === 'alarm' || event === 'rival-down' || event === 'busted' || event === 'pickup') audio.play(event);
  }
  game.events.length = 0;
}

function runShot(name) {
  const game = createShotGame(seed);
  game.saveExists = loadSave() !== null;
  const scene = stageShot(name, game);
  window.__shotGame = game;
  // The camera lerps toward the player; snap it there before painting, so the
  // shot is framed on the action instead of on the camera's starting point.
  for (let i = 0; i < 80; i += 1) renderer.updateCamera(game);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen, promptFor(game));
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let game = createGame(seed);
  let screen = SCREEN_TITLE;
  const saved = loadSave();
  game.saveExists = saved !== null;
  // A handle for play-testing and debugging; the game never reads it.
  window.__game = game;

  function startGame(fresh) {
    game = createGame(seed);
    window.__game = game;
    if (fresh) clearSave();
    else if (saved) applySave(game, saved);
    game.saveExists = loadSave() !== null;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Solmar Bay. Steal a car and bring it to Gull & Gear.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    saveGame(game);
    audio.play(game.player.busted ? 'busted' : 'wasted');
    announce(game.player.busted ? 'Busted. Press Enter to try again.' : 'Wasted. Press Enter to try again.');
  }

  let accumulator = 0;
  let last = performance.now();

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE) startGame(false);
      else if (screen === SCREEN_OVER) startGame(false);
      else if (screen === SCREEN_WIN) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    return actions;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    let actions = handleActions();
    const mouse = input.mouse();
    const mouseWorld = renderer.screenToWorld(mouse.x, mouse.y);
    let clicked = input.takeClick();

    if (screen === SCREEN_TITLE) {
      // The title paints a slow pan over the city; the world itself stays still
      // so idling here can never overwrite a saved game.
      accumulator = 0;
    } else if (screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP) {
        stepGame(game, { move: input.move(), actions, click: firstStep && clicked, mouseWorld }, STEP);
        accumulator -= STEP;
        actions = 0;
        firstStep = false;
      }
      clicked = false;
      if (game.player.wasted || game.player.busted) endGame();
      else if (game.missions.done && screen === SCREEN_PLAY) {
        screen = SCREEN_WIN;
        saveGame(game);
        announce('The Big Score is done. Solmar Bay is yours.');
      }
      const p = game.player;
      audio.engine(p.car ? p.car.speed : 0, !!p.car);
      audio.siren(p.wanted);
      drainEvents(game);
    } else {
      accumulator = 0;
      drainEvents(game);
    }
    renderer.draw(game, screen, screen === SCREEN_PLAY ? promptFor(game) : null);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // 'N' on the title screen starts a brand-new game instead of continuing.
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyN' && screen === SCREEN_TITLE) startGame(true);
  });

  announce('Solmar Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
