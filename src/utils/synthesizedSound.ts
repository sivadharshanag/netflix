// Original, synthesized-on-the-fly sound effects for the intro sequence.
// No recorded or licensed audio is used — everything here is generated with
// the Web Audio API so there is no question of reproducing anyone else's
// copyrighted sound.

let sharedContext: AudioContext | undefined;

function getContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

/** Call this from a real user gesture (click/tap) to satisfy autoplay policies. */
export async function unlockAudio(): Promise<void> {
  const ctx = getContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

/** A dramatic low-frequency impact with a short rising tonal tail — the "stage A" boom. */
export function playCinematicBoom(volume = 0.5): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const impact = ctx.createOscillator();
  impact.type = "sine";
  impact.frequency.setValueAtTime(90, now);
  impact.frequency.exponentialRampToValueAtTime(38, now + 1.4);

  const impactGain = ctx.createGain();
  impactGain.gain.setValueAtTime(0.0001, now);
  impactGain.gain.exponentialRampToValueAtTime(volume, now + 0.08);
  impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

  const rise = ctx.createOscillator();
  rise.type = "triangle";
  rise.frequency.setValueAtTime(220, now + 0.3);
  rise.frequency.exponentialRampToValueAtTime(880, now + 1.3);

  const riseGain = ctx.createGain();
  riseGain.gain.setValueAtTime(0.0001, now + 0.3);
  riseGain.gain.exponentialRampToValueAtTime(volume * 0.35, now + 0.9);
  riseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

  impact.connect(impactGain).connect(ctx.destination);
  rise.connect(riseGain).connect(ctx.destination);

  impact.start(now);
  impact.stop(now + 1.7);
  rise.start(now + 0.3);
  rise.stop(now + 1.6);
}

/** A short, glowing accent chime for the brand-reveal stage. */
export function playBrandAccent(volume = 0.3): void {
  const ctx = getContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(660, now + 0.5);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1);
}

export function isAudioUnlockNeeded(): boolean {
  return !sharedContext || sharedContext.state === "suspended";
}
