let context, musicBus, effectsBus, timer, beat = 0;
let state = { music: false, sfx: false, playing: false };

function tone(bus, frequency, duration, type = 'square', end = frequency) {
  if (!context || context.state !== 'running') return;
  const oscillator = context.createOscillator(), gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.15, now + .006);
  gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(gain).connect(bus);
  oscillator.start(now);
  oscillator.stop(now + duration + .01);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}

function scheduleMusic() {
  const bass = [110, 110, 146.83, 130.81, 110, 164.81, 146.83, 98];
  const melody = [440, 0, 523.25, 659.25, 587.33, 0, 523.25, 392, 440, 659.25, 783.99, 659.25, 587.33, 523.25, 392, 0];
  if (beat % 2 === 0) tone(musicBus, bass[(beat / 2) % bass.length], .16, 'triangle');
  if (melody[beat % melody.length]) tone(musicBus, melody[beat % melody.length], .11);
  beat++;
}

export function setAudioState(next) {
  state = { ...state, ...next };
  if (!context) return;
  musicBus.gain.setTargetAtTime(state.playing && state.music ? .28 : 0, context.currentTime, .01);
  effectsBus.gain.setTargetAtTime(state.playing && state.sfx ? .45 : 0, context.currentTime, .01);
  const running = state.playing && state.music && context.state === 'running';
  if (running && !timer) { scheduleMusic(); timer = setInterval(scheduleMusic, 180); }
  if (!running && timer) { clearInterval(timer); timer = null; }
}

export async function unlockAudio() {
  if (!state.music && !state.sfx) return true;
  try {
    if (!context) {
      context = new AudioContext();
      musicBus = context.createGain();
      effectsBus = context.createGain();
      musicBus.connect(context.destination);
      effectsBus.connect(context.destination);
    }
    if (context.state !== 'running') await context.resume();
    setAudioState({});
    return context.state === 'running';
  } catch { return false; }
}

export function playSound(name) {
  if (!state.sfx || !state.playing) return;
  if (name === 'shot') tone(effectsBus, 1200, .07, 'square', 240);
  if (name === 'hit') tone(effectsBus, 220, .12, 'triangle', 45);
  if (name === 'damage') tone(effectsBus, 95, .28, 'sawtooth', 25);
  if (name === 'wave') tone(effectsBus, 330, .3, 'triangle', 880);
}
