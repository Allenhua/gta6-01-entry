// Sound, all synthesized with WebAudio — no audio files, no network. A low engine
// hum that follows the car's speed, a two-tone siren while wanted, one-shot effects
// for shots, hits, pickups and mission jingles, and a lazy bassline that loops.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let musicStep = 0;
  let enabled = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      enabled = true;
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1800;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  // A lazy 8-step bassline over a soft hat tick, scheduled ahead a bar at a time.
  const BASS = [55, 0, 55, 65.4, 55, 0, 82.4, 73.4];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (!ctx || ctx.state === 'suspended') return;
      const step = musicStep % 8;
      musicStep += 1;
      const freq = BASS[step];
      if (freq) blip(freq, 0.32, 'triangle', 0.12);
      noise(0.03, 0.03, 6000);
    }, 240);
  }

  return {
    // Call from the first key press or click; browsers need a gesture.
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    get on() {
      return enabled;
    },
    engine(speed, driving) {
      if (!ctx) return;
      const target = driving ? 0.05 + Math.min(0.1, Math.abs(speed) / 520 * 0.1) : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(48 + Math.abs(speed) * 0.12, ctx.currentTime, 0.1);
    },
    siren(wanted) {
      if (!ctx) return;
      if (wanted > 0) {
        sirenGain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.2);
        const now = ctx.currentTime;
        sirenOsc.frequency.setValueAtTime(660, now);
        sirenOsc.frequency.linearRampToValueAtTime(880, now + 0.45);
        sirenOsc.frequency.linearRampToValueAtTime(660, now + 0.9);
      } else {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      }
    },
    play(name) {
      if (!ctx) return;
      if (name === 'shoot') noise(0.14, 0.4, 2400);
      else if (name === 'melee') noise(0.08, 0.2, 900);
      else if (name === 'melee-hit') { noise(0.1, 0.3, 700); blip(140, 0.12, 'square', 0.12, 70); }
      else if (name === 'crash') { noise(0.25, 0.45, 500); blip(90, 0.25, 'sine', 0.25, 45); }
      else if (name === 'pickup') { blip(660, 0.1, 'sine', 0.2); window.setTimeout(() => blip(990, 0.14, 'sine', 0.2), 90); }
      else if (name === 'mission-complete') {
        [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'triangle', 0.22), i * 110));
      } else if (name === 'alarm') { blip(880, 0.18, 'square', 0.14, 620); window.setTimeout(() => blip(880, 0.18, 'square', 0.14, 620), 220); }
      else if (name === 'rival-down') blip(220, 0.2, 'sawtooth', 0.14, 55);
      else if (name === 'busted') { blip(392, 0.3, 'sine', 0.2, 196); window.setTimeout(() => blip(262, 0.5, 'sine', 0.2), 300); }
    },
  };
}
