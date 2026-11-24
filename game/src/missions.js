// The story: five chained missions for Dana "Daze" Cole, from stealing a first car
// to the big score at Bayfront Trust. The mission machine watches where the player
// is and what they have done, moves its marker, pays out, and hands the next job
// to the player. It never draws anything — the HUD reads its objective.
import { MISSIONS, PLACES } from './config.js';
import { distance } from './random.js';
import { makeRival } from './combat.js';

export function createMissions() {
  return {
    index: 0, // 0..4 active, 5 = story done
    stage: 0,
    target: null,
    message: '',
    messageTimer: 0,
    done: false,
  };
}

export function currentMission(missions) {
  return missions.index < MISSIONS.length ? MISSIONS[missions.index] : null;
}

export function objectiveText(missions) {
  const mission = currentMission(missions);
  if (!mission) return { title: 'Free roam', brief: 'The city is yours. Cause trouble, lose the heat, come back for more.' };
  return { title: `${missions.index + 1}. ${mission.title}`, brief: mission.brief };
}

// The marker the HUD and minimap point at, or null when the job has no place.
export function missionTarget(missions) {
  const m = missions;
  if (m.index === 0) return m.stage === 0 ? null : { ...PLACES.chopShop };
  if (m.index === 1) return m.stage === 0 ? { ...PLACES.tern } : { ...PLACES.marlin };
  if (m.index === 2) return null;
  if (m.index === 3) return { ...PLACES.docks };
  if (m.index === 4) {
    if (m.stage === 0) return { ...PLACES.bank };
    if (m.stage === 1) return { ...PLACES.bank };
    return { ...PLACES.motel };
  }
  return null;
}

function completeMission(g, missions) {
  const mission = currentMission(missions);
  g.player.cash += mission.reward;
  missions.message = `${mission.title} complete — $${mission.reward} in the pocket.`;
  missions.messageTimer = 5;
  missions.index += 1;
  missions.stage = 0;
  missions.target = null;
  if (missions.index >= MISSIONS.length) {
    missions.done = true;
    g.events.push('story-done');
  } else {
    g.events.push('mission-complete');
  }
}

// Advance the mission machine one step. `g` is the whole game state.
export function updateMissions(g, dt) {
  const m = g.missions;
  const p = g.player;
  if (m.messageTimer > 0) m.messageTimer -= dt;
  if (m.index >= MISSIONS.length) return;

  const px = p.car ? p.car.x : p.x;
  const py = p.car ? p.car.y : p.y;

  if (m.index === 0) {
    // Hot Wheels: first get in a car, then bring it to Gull & Gear.
    if (m.stage === 0 && p.car) {
      m.stage = 1;
      m.message = 'Nice wheels. Now bring it to Gull & Gear.';
      m.messageTimer = 4;
    } else if (m.stage === 1 && distance(px, py, PLACES.chopShop.x, PLACES.chopShop.y) < 110) {
      completeMission(g, m);
    }
  } else if (m.index === 1) {
    // The Pickup: reach Rico at the Neon Tern (in a car), then drive him to the Marlin Club.
    if (m.stage === 0) {
      if (distance(px, py, PLACES.tern.x, PLACES.tern.y) < 90) {
        if (p.car) {
          m.stage = 1;
          m.message = 'Rico hops in. "Marlin Club, and step on it."';
          m.messageTimer = 4;
        } else {
          m.message = 'Rico needs a ride — get a car first.';
          m.messageTimer = 2;
        }
      }
    } else if (distance(px, py, PLACES.marlin.x, PLACES.marlin.y) < 110) {
      p.hasPistol = true;
      p.ammo += 24;
      m.message = 'Rico slips you a pistol. "You will need it."';
      m.messageTimer = 4;
      completeMission(g, m);
    }
  } else if (m.index === 2) {
    // Heat Run: the wanted level was set when the mission started; done when it hits 0.
    if (p.wanted === 0) completeMission(g, m);
  } else if (m.index === 3) {
    // Dockside Dispute: walk into the docks and the Breakers come out.
    if (m.stage === 0 && distance(px, py, PLACES.docks.x, PLACES.docks.y) < 320) {
      m.stage = 1;
      for (let i = 0; i < 3; i += 1) {
        g.rivals.push(makeRival(PLACES.docks.x + (i - 1) * 90, PLACES.docks.y + (i % 2 === 0 ? -60 : 70)));
      }
      m.message = 'Three Breakers — deal with them all.';
      m.messageTimer = 4;
    } else if (m.stage === 1 && g.rivals.length === 0) {
      completeMission(g, m);
    }
  } else if (m.index === 4) {
    // The Big Score: reach the bank, grab the cash on foot, then reach the motel.
    if (m.stage === 0 && distance(px, py, PLACES.bank.x, PLACES.bank.y) < 110) {
      m.stage = 1;
      m.message = 'At the door. Press E to hit Bayfront Trust.';
      m.messageTimer = 4;
    } else if (m.stage === 2 && distance(px, py, PLACES.motel.x, PLACES.motel.y) < 110) {
      completeMission(g, m);
    }
  }
}

// Called when the player presses E while the Big Score waits at the bank door.
export function tryBankGrab(g) {
  const m = g.missions;
  const p = g.player;
  if (m.index !== 4 || m.stage !== 1 || p.car) return false;
  if (distance(p.x, p.y, PLACES.bank.x, PLACES.bank.y) > 110) return false;
  m.stage = 2;
  p.cash += 0; // the take is paid on completion, at the motel
  p.wanted = Math.max(p.wanted, 3);
  p.wantedHeat = 0;
  m.message = 'Grabbed! Three stars — lose the heat and get to the Pelican Motel.';
  m.messageTimer = 5;
  g.events.push('alarm');
  return true;
}

// Called when a mission starts that needs the world set up (Heat Run's two stars).
export function onMissionStart(g) {
  if (g.missions.index === 2 && g.missions.stage === 0) {
    g.player.wanted = Math.max(g.player.wanted, 2);
    g.player.wantedHeat = 0;
    g.missions.message = 'Two stars! Lose the cops — stay out of sight.';
    g.missions.messageTimer = 5;
  }
}
