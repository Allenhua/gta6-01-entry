// The HUD: health bar and cash top-left, wanted stars top-right, the mission
// objective across the top, the minimap bottom-right, and the contextual prompt
// ("Press E to steal the car") at the bottom. Drawn in screen space, after the world.
import { PALETTE, WORLD } from './config.js';
import { missionTarget, objectiveText } from './missions.js';

const MAP_W = 196;
const MAP_H = 142;

export function drawHud(ctx, g, view, prompt) {
  const p = g.player;
  const w = view.w;
  const h = view.h;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Health bar + cash, top-left.
  ctx.fillStyle = 'rgba(12, 16, 24, 0.55)';
  roundRect(ctx, 14, 12, 220, 64, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DAZE', 26, 34);
  ctx.fillStyle = '#222';
  ctx.fillRect(26, 42, 150, 12);
  ctx.fillStyle = p.health > 35 ? '#4fc94f' : '#e5534b';
  ctx.fillRect(26, 42, 150 * Math.max(0, p.health / 100), 12);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`$${p.cash}`, 184, 54);
  ctx.fillStyle = '#ffd94d';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(p.hasPistol ? `Pistol  •  ${p.ammo} rounds` : 'No weapon yet', 26, 70);

  // Wanted stars, top-right.
  ctx.textAlign = 'right';
  ctx.font = '26px system-ui, sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < p.wanted ? '★' : '☆';
  ctx.fillStyle = p.wanted > 0 ? '#ffd94d' : 'rgba(255,255,255,0.45)';
  ctx.fillText(stars, w - 16, 42);
  if (p.wanted > 0) {
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#ff8a5c';
    ctx.fillText(p.wanted >= 3 ? 'HEAT: LOSE THE COPS' : 'WANTED', w - 16, 62);
  }

  // Mission objective, top-centre.
  const obj = objectiveText(g.missions);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(12, 16, 24, 0.55)';
  const objW = Math.min(560, w - 500);
  roundRect(ctx, w / 2 - objW / 2, 12, objW, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(obj.title, w / 2, 33);
  ctx.fillStyle = '#eef1f5';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(truncate(obj.brief, 86), w / 2, 52);

  // Message banner (mission complete, Rico's lines...).
  if (g.missions.messageTimer > 0) {
    ctx.fillStyle = 'rgba(12, 16, 24, 0.7)';
    roundRect(ctx, w / 2 - 300, 76, 600, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(truncate(g.missions.message, 80), w / 2, 96);
  }

  // Speed, bottom-right beside the minimap, while driving.
  if (p.car) {
    ctx.fillStyle = 'rgba(12, 16, 24, 0.55)';
    roundRect(ctx, w - MAP_W - 168, h - 56, 140, 40, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.12)} mph`, w - MAP_W - 98, h - 28);
  }

  // Context prompt, bottom-left.
  if (prompt) {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(12, 16, 24, 0.7)';
    roundRect(ctx, 14, h - 52, 14 + ctx.measureText(prompt).width + 24, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(prompt, 26, h - 28);
  }

  // Busted meter while a cop is on top of the player on foot.
  if (g.bustMeter > 0.02) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12, 16, 24, 0.7)';
    roundRect(ctx, w / 2 - 110, h - 100, 220, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#ff5c5c';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`BUSTED IN ${Math.ceil((1 - g.bustMeter) * 2)}… RUN!`, w / 2, h - 80);
  }

  drawMinimap(ctx, g, w - MAP_W - 14, h - MAP_H - 14);
  ctx.restore();
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMinimap(ctx, g, x, y) {
  const sx = MAP_W / WORLD.w;
  const sy = MAP_H / WORLD.h;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 16, 24, 0.72)';
  roundRect(ctx, x - 4, y - 4, MAP_W + 8, MAP_H + 8, 10);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x, y, MAP_W, MAP_H);
  ctx.clip();
  // Water at the bottom, grass, roads, park.
  ctx.fillStyle = PALETTE.water;
  ctx.fillRect(x, y + 2400 * sy, MAP_W, MAP_H - 2400 * sy);
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(x, y, MAP_W, 2400 * sy);
  ctx.fillStyle = PALETTE.park;
  ctx.fillRect(x + 1620 * sx, y + 900 * sy, 600 * sx, 540 * sy);
  ctx.fillStyle = PALETTE.road;
  for (const rx of [420, 1020, 1620, 2220, 2820, 3300]) ctx.fillRect(x + rx * sx - 2, y, 4, MAP_H);
  for (const ry of [360, 900, 1440, 1980, 2340]) ctx.fillRect(x, y + ry * sy - 2, MAP_W, 4);
  // Mission target: pulsing yellow diamond.
  const target = missionTarget(g.missions);
  if (target) {
    const pulse = 5 + Math.sin(performance.now() / 280) * 2;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(x + target.x * sx, y + target.y * sy - pulse);
    ctx.lineTo(x + target.x * sx + pulse, y + target.y * sy);
    ctx.lineTo(x + target.x * sx, y + target.y * sy + pulse);
    ctx.lineTo(x + target.x * sx - pulse, y + target.y * sy);
    ctx.closePath();
    ctx.fill();
  }
  // Police as blue dots.
  ctx.fillStyle = '#6db3ff';
  for (const cop of g.police) {
    ctx.beginPath();
    ctx.arc(x + cop.x * sx, y + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player: white dot with a dark ring.
  const p = g.player;
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + px * sx, y + py * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
