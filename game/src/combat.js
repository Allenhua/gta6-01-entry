// Combat: the pistol (mouse aim, click to fire), the melee swing (F), the bullets
// that fly, the rival Breakers who chase and swing back, and the sparks and dust
// that make a hit feel like one. Rivals are simple: run at the player, swing.
import { PLAYER } from './config.js';
import { angleDelta, clamp, distance } from './random.js';

export function makeRival(x, y) {
  return {
    x, y,
    angle: 0,
    health: 60,
    speed: 150,
    swingTimer: 0,
    swingCooldown: 0,
    hurtFlash: 0,
  };
}

export function makeBullet(x, y, angle, fromPlayer) {
  return { x, y, angle, speed: 900, life: 0.55, fromPlayer };
}

export function makeParticle(x, y, color, life) {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 260,
    vy: (Math.random() - 0.5) * 260,
    color,
    life,
    maxLife: life,
  };
}

// The player fires the pistol toward the mouse (world coordinates). Returns true
// when a shot actually left the barrel.
export function playerShoot(g, worldX, worldY) {
  const p = g.player;
  if (!p.hasPistol || p.car || p.shootCooldown > 0 || p.ammo <= 0) return false;
  p.shootCooldown = 0.28;
  p.ammo -= 1;
  const angle = Math.atan2(worldY - p.y, worldX - p.x);
  p.angle = angle;
  g.bullets.push(makeBullet(p.x + Math.cos(angle) * 22, p.y + Math.sin(angle) * 22, angle, true));
  g.particles.push(makeParticle(p.x + Math.cos(angle) * 26, p.y + Math.sin(angle) * 26, '#ffd94d', 0.12));
  g.events.push('shoot');
  return true;
}

// The player swings a fist (or the butt of the pistol). Hits rivals in an arc.
export function playerMelee(g) {
  const p = g.player;
  if (p.car || p.meleeTimer > 0) return false;
  p.meleeTimer = 0.35;
  let hitAny = false;
  for (const rival of g.rivals) {
    const d = distance(p.x, p.y, rival.x, rival.y);
    if (d > PLAYER.meleeRange + 14) continue;
    const aim = Math.atan2(rival.y - p.y, rival.x - p.x);
    if (Math.abs(angleDelta(p.angle, aim)) > 1.2) continue;
    rival.health -= PLAYER.meleeDamage;
    rival.hurtFlash = 0.2;
    rival.x += Math.cos(aim) * 18;
    rival.y += Math.sin(aim) * 18;
    hitAny = true;
    g.particles.push(makeParticle(rival.x, rival.y, '#ff8a5c', 0.25));
  }
  if (hitAny) g.events.push('melee-hit');
  else g.events.push('melee');
  return true;
}

// Move bullets, resolve hits on rivals (player shots) and on the player (none —
// rivals never shoot; they close in and swing).
export function updateBullets(g, dt) {
  for (let i = g.bullets.length - 1; i >= 0; i -= 1) {
    const b = g.bullets[i];
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (b.fromPlayer) {
      for (let j = g.rivals.length - 1; j >= 0; j -= 1) {
        const r = g.rivals[j];
        if (distance(b.x, b.y, r.x, r.y) < 18) {
          r.health -= PLAYER.pistolDamage;
          r.hurtFlash = 0.2;
          g.particles.push(makeParticle(b.x, b.y, '#ff5c5c', 0.3));
          dead = true;
          break;
        }
      }
    }
    if (dead) g.bullets.splice(i, 1);
  }
  // Remove the rivals who ran out of health.
  for (let j = g.rivals.length - 1; j >= 0; j -= 1) {
    if (g.rivals[j].health <= 0) {
      const r = g.rivals[j];
      for (let k = 0; k < 10; k += 1) g.particles.push(makeParticle(r.x, r.y, '#ff5c5c', 0.5));
      g.rivals.splice(j, 1);
      g.events.push('rival-down');
    }
  }
}

// Rivals run at the player and swing when close. Returns 'player-hit' on a landed swing.
export function updateRivals(g, dt) {
  const p = g.player;
  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;
  let hit = false;
  for (const r of g.rivals) {
    if (r.hurtFlash > 0) r.hurtFlash -= dt;
    if (r.swingCooldown > 0) r.swingCooldown -= dt;
    const d = distance(r.x, r.y, px, py);
    const want = Math.atan2(py - r.y, px - r.x);
    r.angle += clamp(angleDelta(r.angle, want), -4 * dt, 4 * dt);
    if (d > 34) {
      r.x += Math.cos(r.angle) * r.speed * dt;
      r.y += Math.sin(r.angle) * r.speed * dt;
    } else if (r.swingCooldown <= 0) {
      r.swingTimer = 0.3;
      r.swingCooldown = 0.9;
      if (!p.car && d < 44) hit = true;
      else if (p.car) {
        // A rival yanking at a car door slows it and rattles the driver.
        p.car.speed *= 0.5;
      }
    }
    if (r.swingTimer > 0) r.swingTimer -= dt;
  }
  return hit;
}

export function updateParticles(g, dt) {
  for (let i = g.particles.length - 1; i >= 0; i -= 1) {
    const pt = g.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.9;
    pt.vy *= 0.9;
    pt.life -= dt;
    if (pt.life <= 0) g.particles.splice(i, 1);
  }
}
