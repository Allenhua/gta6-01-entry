// Solmar Bay — shared constants: world size, road grid, palette, tuning, story.
// Every number here is the game's own; nothing is borrowed from any other game.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay-save-v1';

export const WORLD = { w: 3600, h: 2600 };
export const ROAD_W = 86;
export const V_ROADS = [420, 1020, 1620, 2220, 2820, 3300];
export const H_ROADS = [360, 900, 1440, 1980, 2340];
export const BEACH_TOP = 2400;
export const WATER_TOP = 2470;

// Sun-soaked palette: warm sand, teal water, coral roofs, palm green.
export const PALETTE = {
  grass: '#8fc97a',
  grassDry: '#b5d67e',
  sand: '#f2d9a0',
  water: '#2fa8b8',
  waterDeep: '#1d7f9e',
  road: '#4a4650',
  roadEdge: '#6b6673',
  lane: '#f7e9a0',
  sidewalk: '#cfc4ae',
  roofA: '#e2725b',
  roofB: '#e8a04c',
  roofC: '#5b8dd9',
  roofD: '#9b7ec2',
  roofE: '#d95f7e',
  park: '#6db36a',
  pond: '#57b8c9',
  trunk: '#8a6a4a',
  palm: '#3f9e4d',
  carColors: ['#e74c3c', '#f1c40f', '#3498db', '#ecf0f1', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c'],
  taxi: '#f7c948',
  cop: '#e8e8e8',
  copStripe: '#1f6fb2',
};

export const PLAYER = {
  walkSpeed: 230,
  radius: 14,
  maxHealth: 100,
  meleeRange: 48,
  meleeDamage: 30,
  pistolDamage: 34,
  pistolRange: 430,
  pistolAmmoStart: 24,
};

export const CAR = {
  length: 80,
  width: 44,
  accel: 430,
  brake: 720,
  reverseAccel: 260,
  maxSpeed: 520,
  maxReverse: 160,
  turnRate: 2.7,
  grip: 0.92,
};

// Five chained missions: steal, pickup, lose the heat, fight, the big score.
export const MISSIONS = [
  {
    id: 'hot-wheels',
    title: 'Hot Wheels',
    brief: 'Sal needs a car, fast. Steal any car (walk up and press E) and bring it to Gull & Gear.',
    reward: 200,
  },
  {
    id: 'the-pickup',
    title: 'The Pickup',
    brief: 'Rico is waiting by the Neon Tern. Pick him up, then drive him to the Marlin Club.',
    reward: 350,
  },
  {
    id: 'heat-run',
    title: 'Heat Run',
    brief: 'The cops are on you — two stars. Lose them: stay out of sight until the heat dies down.',
    reward: 400,
  },
  {
    id: 'dockside',
    title: 'Dockside Dispute',
    brief: 'The Breakers are muscling in at the docks. Deal with all three — fists (F) or pistol (click).',
    reward: 600,
  },
  {
    id: 'big-score',
    title: 'The Big Score',
    brief: 'Hit Bayfront Trust (press E at the door), grab the cash, then lose three stars and reach the Pelican Motel.',
    reward: 1500,
  },
];

export const STORY_INTRO =
  'Solmar Bay, 2026. Dana "Daze" Cole owes Sal Marano one last favour, and the whole sun-soaked city is the getaway.';
export const PLACES = {
  chopShop: { name: 'Gull & Gear', x: 1020, y: 1980 },
  tern: { name: 'Neon Tern', x: 2220, y: 900 },
  marlin: { name: 'Marlin Club', x: 2820, y: 360 },
  docks: { name: 'The Docks', x: 3300, y: 1980 },
  bank: { name: 'Bayfront Trust', x: 1620, y: 360 },
  motel: { name: 'Pelican Motel', x: 420, y: 2340 },
  park: { name: 'Pelican Park', x: 1920, y: 1170 },
};
