// Keyboard and mouse for Solmar Bay. Held keys are read every frame; one-shot
// presses (start, pause, get in/out, swing) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_MELEE = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const INTERACT = new Set(['KeyE']);
const MELEE = new Set(['KeyF']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseClicked = false;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (INTERACT.has(event.code)) actions |= ACTION_INTERACT;
    else if (MELEE.has(event.code)) actions |= ACTION_MELEE;
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)
      || CONFIRM.has(event.code) || PAUSE.has(event.code) || INTERACT.has(event.code) || MELEE.has(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseClicked = true;
    if (event.button === 0) actions |= ACTION_CONFIRM;
  });

  const has = (set) => {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  };

  return {
    // -1..1 on each axis: WASD or arrows.
    move() {
      return {
        x: (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0),
        y: (has(DOWN) ? 1 : 0) - (has(UP) ? 1 : 0),
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const clicked = mouseClicked;
      mouseClicked = false;
      return clicked;
    },
    mouse() {
      return { x: mouseX, y: mouseY };
    },
  };
}
