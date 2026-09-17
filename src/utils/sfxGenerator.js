/**
 * Procedural SFX & Music Asset Generator for Fylmy
 * Generates genuine WAV audio files in-memory using Web Audio API buffer rendering.
 * 100% offline, zero external downloads required.
 */

// Helper to encode AudioBuffer to standard 16-bit PCM WAV Blob
function audioBufferToWavBlob(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave and write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Pre-defined SFX items with instant procedural generators
 */
export const BUILTIN_SFX_PRESETS = [
  {
    id: 'sfx_whoosh_fast',
    name: 'Cinematic Whoosh Transition',
    category: 'Transitions',
    duration: 1.2,
    generate: (ctx) => {
      const duration = 1.2;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.sin((t / duration) * Math.PI) ** 2;
        const noise = (Math.random() * 2 - 1) * env;
        const sweep = Math.sin(2 * Math.PI * (120 + 800 * (t / duration) ** 2) * t) * env * 0.5;
        data[i] = (noise * 0.7 + sweep * 0.3) * 0.85;
      }
      return buffer;
    },
  },
  {
    id: 'sfx_camera_shutter',
    name: 'Camera Shutter Click',
    category: 'Clicks & UI',
    duration: 0.6,
    generate: (ctx) => {
      const duration = 0.6;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        let sample = 0;
        // Click 1
        if (t < 0.15) {
          sample += Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 80);
          sample += (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.4;
        }
        // Click 2 (shutter close)
        if (t >= 0.18 && t < 0.35) {
          const t2 = t - 0.18;
          sample += Math.sin(2 * Math.PI * 1200 * t2) * Math.exp(-t2 * 90);
          sample += (Math.random() * 2 - 1) * Math.exp(-t2 * 60) * 0.35;
        }
        data[i] = sample * 0.9;
      }
      return buffer;
    },
  },
  {
    id: 'sfx_sub_boom',
    name: '808 Sub Bass Drop Impact',
    category: 'Impacts',
    duration: 2.5,
    generate: (ctx) => {
      const duration = 2.5;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const freq = 140 * Math.exp(-t * 3.5) + 35;
        const env = Math.exp(-t * 1.8);
        const sine = Math.sin(2 * Math.PI * freq * t);
        const sub = Math.sin(2 * Math.PI * (freq * 0.5) * t);
        data[i] = (sine * 0.6 + sub * 0.4) * env * 0.95;
      }
      return buffer;
    },
  },
  {
    id: 'sfx_pop_bubble',
    name: 'Clean Bubble Pop',
    category: 'Clicks & UI',
    duration: 0.4,
    generate: (ctx) => {
      const duration = 0.4;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const freq = 400 + 800 * (t / duration);
        const env = Math.exp(-t * 35);
        data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.85;
      }
      return buffer;
    },
  },
  {
    id: 'sfx_riser_glitch',
    name: 'Tension Glitch Riser',
    category: 'Transitions',
    duration: 3.0,
    generate: (ctx) => {
      const duration = 3.0;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const prog = t / duration;
        const freq = 150 + 1200 * (prog ** 2.2);
        const env = prog ** 1.5;
        const mod = Math.sin(2 * Math.PI * (8 + prog * 40) * t);
        const sine = Math.sin(2 * Math.PI * freq * t + mod * 2);
        data[i] = sine * env * 0.85;
      }
      return buffer;
    },
  },
  {
    id: 'mus_lofi_beat',
    name: 'Lo-Fi Chill Hop Background (Loop)',
    category: 'Music Loops',
    duration: 8.0,
    generate: (ctx) => {
      const duration = 8.0;
      const buffer = ctx.createBuffer(2, ctx.sampleRate * duration, ctx.sampleRate);
      const lData = buffer.getChannelData(0);
      const rData = buffer.getChannelData(1);
      const chords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 349.23], // G7
      ];

      for (let i = 0; i < lData.length; i++) {
        const t = i / ctx.sampleRate;
        const chordIdx = Math.floor((t / 2) % 4);
        const curChord = chords[chordIdx];
        const chordT = t % 2;
        const chordEnv = Math.exp(-chordT * 1.2) * 0.28;

        let left = 0;
        let right = 0;

        // Rhodes-like Electric Piano Chords
        for (let c = 0; c < curChord.length; c++) {
          const f = curChord[c];
          const tone = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
          left += tone * chordEnv;
          right += tone * chordEnv * (c % 2 === 0 ? 1.1 : 0.9);
        }

        // Lo-Fi Vinyl Crackle & Sub Kick
        const beatT = t % 0.5;
        if (beatT < 0.12 && (Math.floor(t / 0.5) % 2 === 0)) {
          const kickEnv = Math.exp(-beatT * 30);
          const kick = Math.sin(2 * Math.PI * (110 * Math.exp(-beatT * 40) + 45) * beatT) * kickEnv * 0.45;
          left += kick;
          right += kick;
        }

        lData[i] = Math.max(-1, Math.min(1, left * 0.8));
        rData[i] = Math.max(-1, Math.min(1, right * 0.8));
      }
      return buffer;
    },
  },
];

/**
 * Creates a playable Fylmy media asset object from an SFX preset
 */
export async function createAssetFromSfxPreset(preset) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const audioBuffer = preset.generate(ctx);
  const wavBlob = audioBufferToWavBlob(audioBuffer);
  const url = URL.createObjectURL(wavBlob);
  ctx.close().catch(() => {});

  // Generate waveform peaks
  const sampleCount = 100;
  const channelData = audioBuffer.getChannelData(0);
  const step = Math.max(1, Math.floor(channelData.length / sampleCount));
  const waveform = [];
  for (let i = 0; i < sampleCount; i++) {
    let max = 0;
    const start = i * step;
    const end = Math.min(channelData.length, start + step);
    for (let j = start; j < end; j += 4) {
      const v = Math.abs(channelData[j]);
      if (v > max) max = v;
    }
    waveform.push(Math.min(1, Math.max(0.08, Number(max.toFixed(3)))));
  }

  return {
    id: `sfx-${Math.random().toString(36).substring(2, 9)}`,
    name: preset.name,
    type: 'audio',
    url,
    duration: preset.duration,
    waveform,
    category: preset.category,
  };
}
