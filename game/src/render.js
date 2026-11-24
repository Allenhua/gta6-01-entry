// Drawing only: the world, the people and cars in it, and the screens. The camera
// follows the player (or their car) and the sun-soaked city is painted in flat,
// warm shapes — sand, teal water, coral roofs, palm shade. No game rules live here.
import { BEACH_TOP, H_ROADS, PALETTE, V_ROADS, WATER_TOP, WORLD } from './config.js';
import { distance } from './random.js';
import { missionTarget } from './missions.js';
import { drawHud, roundRect } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 720, zoom: 1, camX: 1800, camY: 1300 };
  let dpr = 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * dpr);
    canvas.height = Math.round(view.h * dpr);
    canvas.style.width = `${view.w}px`;
    canvas.style.height = `${view.h}px`;
    view.zoom = Math.min(view.w / 1150, view.h / 720);
  }

  function worldToScreen(x, y) {
    return { x: (x - view.camX) * view.zoom + view.w / 2, y: (y - view.camY) * view.zoom + view.h / 2 };
  }

  function screenToWorld(x, y) {
    return { x: (x - view.w / 2) / view.zoom + view.camX, y: (y - view.h / 2) / view.zoom + view.camY };
  }

  function updateCamera(g) {
    const p = g.player;
    const tx = p.car ? p.car.x : p.x;
    const ty = p.car ? p.car.y : p.y;
    view.camX += (tx - view.camX) * 0.12;
    view.camY += (ty - view.camY) * 0.12;
    const halfW = view.w / 2 / view.zoom;
    const halfH = view.h / 2 / view.zoom;
    view.camX = Math.max(halfW - 200, Math.min(WORLD.w - halfW + 200, view.camX));
    view.camY = Math.max(halfH - 200, Math.min(WORLD.h - halfH + 200, view.camY));
  }

  function visible(x, y, margin) {
    const s = worldToScreen(x, y);
    return s.x > -margin && s.x < view.w + margin && s.y > -margin && s.y < view.h + margin;
  }

  function drawGround(city) {
    const tl = screenToWorld(0, 0);
    const br = screenToWorld(view.w, view.h);
    // Grass base.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, view.w, view.h);
    // Dry patches for variety.
    ctx.fillStyle = PALETTE.grassDry;
    for (let i = 0; i < 24; i += 1) {
      const gx = ((i * 733) % WORLD.w);
      const gy = ((i * 541) % 2300);
      if (gx < tl.x - 100 || gx > br.x + 100 || gy < tl.y - 100 || gy > br.y + 100) continue;
      const s = worldToScreen(gx, gy);
      ctx.fillRect(s.x, s.y, 180 * view.zoom, 120 * view.zoom);
    }
    // Beach and water along the south edge.
    const beach = worldToScreen(0, BEACH_TOP);
    const water = worldToScreen(0, WATER_TOP);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, beach.y, view.w, water.y - beach.y);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, water.y, view.w, view.h - water.y);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let i = 0; i < 8; i += 1) {
      const wx = ((i * 461 + 120) % WORLD.w);
      const s = worldToScreen(wx, WATER_TOP + 40 + (i % 3) * 26);
      if (s.y > 0 && s.y < view.h) ctx.fillRect(s.x, s.y, 120 * view.zoom, 5 * view.zoom);
    }
    // Pelican Park.
    const park = worldToScreen(1620, 900);
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(park.x, park.y, 600 * view.zoom, 540 * view.zoom);
    const pond = worldToScreen(1920, 1170);
    ctx.fillStyle = PALETTE.pond;
    ctx.beginPath();
    ctx.ellipse(pond.x, pond.y, 120 * view.zoom, 70 * view.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    // Roads with sidewalks and lane dashes.
    for (const rx of V_ROADS) {
      const s = worldToScreen(rx, 0);
      const w = 86 * view.zoom;
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(s.x - w / 2 - 10 * view.zoom, 0, w + 20 * view.zoom, view.h);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(s.x - w / 2, 0, w, view.h);
      ctx.fillStyle = PALETTE.lane;
      for (let y = 0; y < view.h; y += 56) ctx.fillRect(s.x - 2, y, 4, 26);
    }
    for (const ry of H_ROADS) {
      const s = worldToScreen(0, ry);
      const w = 86 * view.zoom;
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(0, s.y - w / 2 - 10 * view.zoom, view.w, w + 20 * view.zoom);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(0, s.y - w / 2, view.w, w);
      ctx.fillStyle = PALETTE.lane;
      for (let x = 0; x < view.w; x += 56) ctx.fillRect(x, s.y - 2, 26, 4);
    }
    // Buildings: shadow, roof, inner court, the odd shop sign.
    for (const b of city.buildings) {
      if (!visible(b.x + b.w / 2, b.y + b.h / 2, 200)) continue;
      const s = worldToScreen(b.x, b.y);
      const bw = b.w * view.zoom;
      const bh = b.h * view.zoom;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(s.x + 6, s.y + 8, bw, bh);
      ctx.fillStyle = b.roof;
      ctx.fillRect(s.x, s.y, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(s.x + 8, s.y + 8, bw - 16, bh - 16);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(s.x + bw * 0.2, s.y + bh * 0.2, bw * 0.6, bh * 0.6);
      if (b.sign) {
        ctx.fillStyle = '#ffd94d';
        ctx.font = `bold ${Math.max(11, 13 * view.zoom)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('SHOP', s.x + bw / 2, s.y + 18 * view.zoom);
      }
    }
    // Palms: trunk plus a star of fronds, swaying a touch.
    const now = performance.now() / 900;
    for (const palm of city.palms) {
      if (!visible(palm.x, palm.y, 60)) continue;
      const s = worldToScreen(palm.x, palm.y);
      const sway = Math.sin(now + palm.sway) * 3;
      ctx.strokeStyle = PALETTE.trunk;
      ctx.lineWidth = 4 * view.zoom;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + sway, s.y - 22 * view.zoom);
      ctx.stroke();
      ctx.fillStyle = PALETTE.palm;
      for (let f = 0; f < 6; f += 1) {
        const a = (f / 6) * Math.PI * 2 + palm.sway;
        ctx.beginPath();
        ctx.ellipse(s.x + sway + Math.cos(a) * 13 * view.zoom, s.y - 22 * view.zoom + Math.sin(a) * 9 * view.zoom, 13 * view.zoom, 5 * view.zoom, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawMarker(g) {
    const target = missionTarget(g.missions);
    if (!target) return;
    const p = g.player;
    const px = p.car ? p.car.x : p.x;
    const py = p.car ? p.car.y : p.y;
    const d = distance(px, py, target.x, target.y);
    const pulse = 1 + Math.sin(performance.now() / 300) * 0.12;
    if (visible(target.x, target.y, 40)) {
      const s = worldToScreen(target.x, target.y);
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 46 * view.zoom * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8 * view.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `bold ${14 * view.zoom}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(target.name, s.x, s.y - 56 * view.zoom);
    }
    // Edge arrow pointing at the target, with the distance.
    const s = worldToScreen(target.x, target.y);
    const cx = Math.max(40, Math.min(view.w - 40, s.x));
    const cy = Math.max(90, Math.min(view.h - 190, s.y));
    if (cx !== s.x || cy !== s.y) {
      const a = Math.atan2(s.y - cy, s.x - cx);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-10, -10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${target.name}  ${Math.round(d)}m`, cx, cy + 26);
    }
  }

  function drawCarShape(car, isPlayerCar) {
    const s = worldToScreen(car.x, car.y);
    const len = 80 * view.zoom;
    const wid = 44 * view.zoom;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 8);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#1c1c22';
    ctx.fillRect(-len * 0.32, -wid / 2 - 3, 16 * view.zoom, 7);
    ctx.fillRect(len * 0.14, -wid / 2 - 3, 16 * view.zoom, 7);
    ctx.fillRect(-len * 0.32, wid / 2 - 4, 16 * view.zoom, 7);
    ctx.fillRect(len * 0.14, wid / 2 - 4, 16 * view.zoom, 7);
    // Body.
    ctx.fillStyle = car.color;
    roundRect(ctx, -len / 2, -wid / 2, len, wid, 9);
    ctx.fill();
    // Windshield and roof.
    ctx.fillStyle = 'rgba(20, 30, 50, 0.75)';
    ctx.fillRect(len * 0.08, -wid / 2 + 5, 14 * view.zoom, wid - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-len * 0.28, -wid / 2 + 6, 18 * view.zoom, wid - 12);
    // Headlights.
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(len / 2 - 3, -wid / 2 + 6, 4, 6);
    ctx.fillRect(len / 2 - 3, wid / 2 - 12, 4, 6);
    if (car.kind === 'police') {
      ctx.fillStyle = PALETTE.copStripe;
      ctx.fillRect(-len / 2, -4, len, 8);
      const flash = Math.floor(performance.now() / 240) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#2f7bff';
      ctx.fillRect(-8 * view.zoom, -wid / 2 + 4, 16 * view.zoom, 8);
      ctx.fillStyle = flash ? '#2f7bff' : '#ff3b30';
      ctx.fillRect(-8 * view.zoom, wid / 2 - 12, 16 * view.zoom, 8);
    }
    if (car.kind === 'taxi') {
      ctx.fillStyle = '#222';
      ctx.font = `bold ${11 * view.zoom}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, 4);
    }
    if (isPlayerCar) {
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 2.5;
      roundRect(ctx, -len / 2 - 3, -wid / 2 - 3, len + 6, wid + 6, 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, shirt, radius, down) {
    const s = worldToScreen(x, y);
    const r = radius * view.zoom;
    ctx.save();
    ctx.translate(s.x, s.y);
    if (down) {
      ctx.fillStyle = shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.5, r * 0.8, angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.rotate(angle);
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath();
    ctx.arc(r * 0.55, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(r * 0.9, -2, r * 0.5, 4);
    ctx.restore();
  }

  function drawWorld(g) {
    updateCamera(g);
    drawGround(g.city);
    drawMarker(g);
    // Bullets as bright tracers.
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 3;
    for (const b of g.bullets) {
      const s1 = worldToScreen(b.x, b.y);
      const s2 = worldToScreen(b.x - Math.cos(b.angle) * 22, b.y - Math.sin(b.angle) * 22);
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
    }
    // Particles.
    for (const pt of g.particles) {
      const s = worldToScreen(pt.x, pt.y);
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4 * view.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pedestrians, rivals, cars, then the player.
    for (const ped of g.peds) {
      if (visible(ped.x, ped.y, 40)) drawPerson(ped.x, ped.y, ped.angle, ped.shirt, 11, ped.state === 'down');
    }
    for (const rival of g.rivals) {
      if (!visible(rival.x, rival.y, 50)) continue;
      drawPerson(rival.x, rival.y, rival.angle, '#c0392b', 14, false);
      const s = worldToScreen(rival.x, rival.y);
      ctx.fillStyle = '#222';
      ctx.fillRect(s.x - 18, s.y - 30 * view.zoom, 36, 5);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(s.x - 18, s.y - 30 * view.zoom, 36 * Math.max(0, rival.health / 60), 5);
      if (rival.swingTimer > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 26 * view.zoom, rival.angle - 1, rival.angle + 1);
        ctx.stroke();
      }
    }
    for (const car of g.cars) {
      if (visible(car.x, car.y, 80)) drawCarShape(car, car === g.player.car);
    }
    const p = g.player;
    if (!p.car) {
      const blink = p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0;
      if (!blink) drawPerson(p.x, p.y, p.angle, '#19b5a6', 13, false);
      if (p.meleeTimer > 0) {
        const s = worldToScreen(p.x, p.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 34 * view.zoom, p.angle - 1.1, p.angle + 1.1);
        ctx.stroke();
      }
    }
    // Hurt flash: a red edge when the player just took damage.
    if (g.hurtFlash > 0) {
      ctx.fillStyle = `rgba(229, 83, 75, ${Math.min(0.35, g.hurtFlash * 0.5)})`;
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const w = Math.min(620, view.w - 40);
    const h = 150 + lines.length * 30;
    const x = (view.w - w) / 2;
    const y = (view.h - h) / 2;
    ctx.fillStyle = 'rgba(10, 14, 22, 0.88)';
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = accent || '#ffd94d';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 16);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, view.w / 2, y + 66);
    ctx.fillStyle = '#eef1f5';
    ctx.font = '16px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, view.w / 2, y + 108 + i * 30));
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(prompt, view.w / 2, y + h - 26);
  }

  function drawTitle(g) {
    // The city keeps moving behind the title: a slow pan over the bay.
    view.camX = 1800 + Math.sin(performance.now() / 9000) * 500;
    view.camY = 1500 + Math.cos(performance.now() / 12000) * 300;
    drawGround(g.city);
    ctx.fillStyle = 'rgba(10, 20, 34, 0.45)';
    ctx.fillRect(0, 0, view.w, view.h);
    const lines = [
      'Solmar Bay, 2026. Dana "Daze" Cole owes Sal Marano one last favour,',
      'and the whole sun-soaked city is the getaway.',
      '',
      'WASD move / drive  •  E get in & out of cars, grab the cash  •  F punch',
      'Mouse aim, click to shoot  •  P pause  •  Progress saves itself',
    ];
    if (g.saveExists) lines.push('A saved game is waiting — press Enter to continue it.');
    drawPanel('SOLMAR BAY', lines, g.saveExists ? 'Press Enter to continue  •  N for a new game' : 'Press Enter to start', '#ffd94d');
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('An original open-world crime game in the spirit of GTA 6 — no Rockstar names, art or music.', view.w / 2, view.h - 22);
  }

  function draw(g, screen, prompt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, view.w, view.h);
    if (screen === SCREEN_TITLE) {
      drawTitle(g);
      return;
    }
    drawWorld(g);
    drawHud(ctx, g, view, prompt);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(10, 14, 22, 0.55)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawPanel('PAUSED', ['The city waits. Your save is already on disk.'], 'Press P to keep playing');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(10, 14, 22, 0.6)';
      ctx.fillRect(0, 0, view.w, view.h);
      const busted = g.player.busted;
      drawPanel(
        busted ? 'BUSTED' : 'WASTED',
        busted
          ? ['The Solmar Bay police finally caught up with Daze.', `Cash kept: $${g.player.cash}`]
          : ['Daze went down in the streets of Solmar Bay.', `Cash kept: $${g.player.cash}`],
        'Press Enter to try again',
        '#e5534b',
      );
    } else if (screen === SCREEN_WIN) {
      ctx.fillStyle = 'rgba(10, 14, 22, 0.55)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawPanel(
        'THE BIG SCORE',
        ['Daze pulled it off — the Bayfront Trust job, the heat lost,', 'and a quiet room at the Pelican Motel. Solmar Bay is hers now.', `Final take: $${g.player.cash}`],
        'Press Enter to keep roaming the city',
        '#4fc94f',
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view, screenToWorld, worldToScreen, updateCamera };
}
