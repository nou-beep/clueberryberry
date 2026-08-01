/** Tiny WebAudio cues — no assets, gated by the sound setting at call sites. */

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(freq: number, start: number, duration: number, gainPeak = 0.08) {
  const ac = audioContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ac.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak, ac.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

export function playCompletion() {
  tone(523.25, 0, 0.18);
  tone(659.25, 0.12, 0.18);
  tone(783.99, 0.24, 0.3);
}

export function playError() {
  tone(196, 0, 0.12, 0.05);
}

export function playCheckOk() {
  tone(660, 0, 0.1, 0.05);
}

/** The on-screen keyboard: a very short, very quiet typewriter tick. */
export function playKeyClick() {
  tone(1180, 0, 0.03, 0.025);
}
