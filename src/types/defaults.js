export const ASPECT_RATIOS = {
  '16:9': {
    name: '16:9 Landscape',
    label: '1920 × 1080 (Broadcast / Web)',
    width: 1920,
    height: 1080,
    ratio: 16 / 9,
    icon: 'Monitor',
  },
  '9:16': {
    name: '9:16 Portrait',
    label: '1080 × 1920 (Vertical / Reels / Shorts)',
    width: 1080,
    height: 1920,
    ratio: 9 / 16,
    icon: 'Smartphone',
  },
  '1:1': {
    name: '1:1 Square',
    label: '1080 × 1080 (Square Format)',
    width: 1080,
    height: 1080,
    ratio: 1,
    icon: 'Square',
  },
  '4:5': {
    name: '4:5 Social',
    label: '1080 × 1350 (Social Feed)',
    width: 1080,
    height: 1350,
    ratio: 4 / 5,
    icon: 'Layout',
  },
  '21:9': {
    name: '21:9 Anamorphic',
    label: '2560 × 1080 (Cinematic Scope)',
    width: 2560,
    height: 1080,
    ratio: 21 / 9,
    icon: 'Film',
  },
};

export const DEFAULT_TRACKS = [
  {
    id: 'track-v2',
    name: 'V2 (Overlay)',
    code: 'V2',
    type: 'video',
    height: 44,
    muted: false,
    locked: false,
    volume: 1,
    color: '#12151e',
    accent: '#3b82f6',
    clips: [],
  },
  {
    id: 'track-v1',
    name: 'V1 (Primary)',
    code: 'V1',
    type: 'video',
    height: 44,
    muted: false,
    locked: false,
    volume: 1,
    color: '#12151e',
    accent: '#3b82f6',
    clips: [],
  },
  {
    id: 'track-blur',
    name: 'FX1 (Tracking Mask)',
    code: 'FX1',
    type: 'blur',
    height: 40,
    muted: false,
    locked: false,
    volume: 1,
    color: '#b45309',
    accent: '#f59e0b',
    clips: [],
  },
  {
    id: 'track-text',
    name: 'TXT (Titles & Subtitles)',
    code: 'TXT',
    type: 'text',
    height: 40,
    muted: false,
    locked: false,
    volume: 1,
    color: '#c2410c',
    accent: '#fb923c',
    clips: [],
  },
  {
    id: 'track-a1',
    name: 'A1 (Music Track)',
    code: 'A1',
    type: 'audio',
    height: 40,
    muted: false,
    locked: false,
    volume: 0.8,
    color: '#065f46',
    accent: '#10b981',
    clips: [],
  },
  {
    id: 'track-a2',
    name: 'A2 (Dialogue / SFX)',
    code: 'A2',
    type: 'audio',
    height: 40,
    muted: false,
    locked: false,
    volume: 1,
    color: '#047857',
    accent: '#34d399',
    clips: [],
  },
];

export const FILTER_PRESETS = [
  { id: 'normal', name: 'Rec.709 Standard', filters: { brightness: 100, contrast: 100, saturation: 100, temperature: 0, vignette: 0, blur: 0 } },
  { id: 'cinematic', name: 'Teal & Orange Grade', filters: { brightness: 105, contrast: 120, saturation: 115, temperature: 15, vignette: 25, blur: 0 } },
  { id: 'noir', name: 'Monochrome High Contrast', filters: { brightness: 100, contrast: 145, saturation: 0, temperature: 0, vignette: 40, blur: 0 } },
  { id: 'warm_sunset', name: 'Warm Daylight (5600K)', filters: { brightness: 105, contrast: 105, saturation: 120, temperature: 25, vignette: 15, blur: 0 } },
  { id: 'cyberpunk', name: 'Cold Urban Matrix', filters: { brightness: 105, contrast: 125, saturation: 135, temperature: -20, vignette: 30, blur: 0 } },
  { id: 'vintage90s', name: 'Kodak Portra Emulation', filters: { brightness: 105, contrast: 95, saturation: 90, temperature: 15, vignette: 30, blur: 0 } },
];

export const TRANSITION_TYPES = [
  { id: 'none', name: 'None (Hard Cut)', icon: 'Scissors' },
  { id: 'crossfade', name: 'Cross Dissolve', icon: 'Blend' },
  { id: 'fadeBlack', name: 'Fade to Black', icon: 'Moon' },
  { id: 'dipWhite', name: 'Dip to White', icon: 'Sun' },
  { id: 'wipeLeft', name: 'Wipe Left', icon: 'ArrowLeft' },
  { id: 'wipeRight', name: 'Wipe Right', icon: 'ArrowRight' },
  { id: 'slideLeft', name: 'Slide In Left', icon: 'MoveLeft' },
  { id: 'slideRight', name: 'Slide In Right', icon: 'MoveRight' },
  { id: 'zoomBlur', name: 'Zoom In Pulse', icon: 'Maximize2' },
];

export const PIP_PRESETS = [
  { id: 'fullscreen', name: 'Full Frame', transform: { x: 0, y: 0, scale: 1, rotation: 0, fitMode: 'contain' } },
  { id: 'pip_top_right', name: 'PiP Top-Right', transform: { x: 30, y: -26, scale: 0.36, rotation: 0, fitMode: 'contain' } },
  { id: 'pip_bottom_right', name: 'PiP Bottom-Right', transform: { x: 30, y: 26, scale: 0.36, rotation: 0, fitMode: 'contain' } },
  { id: 'pip_top_left', name: 'PiP Top-Left', transform: { x: -30, y: -26, scale: 0.36, rotation: 0, fitMode: 'contain' } },
  { id: 'pip_bottom_left', name: 'PiP Bottom-Left', transform: { x: -30, y: 26, scale: 0.36, rotation: 0, fitMode: 'contain' } },
  { id: 'split_left', name: 'Split 50% Left', transform: { x: -25, y: 0, scale: 0.5, rotation: 0, fitMode: 'cover' } },
  { id: 'split_right', name: 'Split 50% Right', transform: { x: 25, y: 0, scale: 0.5, rotation: 0, fitMode: 'cover' } },
];

export const SPEED_PRESETS = [
  { value: 0.25, label: '0.25x (Super Slow)' },
  { value: 0.5, label: '0.5x (Slow Motion)' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1.0x (Normal)' },
  { value: 1.5, label: '1.5x' },
  { value: 2.0, label: '2.0x (Fast Forward)' },
  { value: 4.0, label: '4.0x (Timelapse)' },
];

export function formatTimecode(seconds, fps = 30) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * fps);

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

export function formatSecondsOnly(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${ms}`;
}

/**
 * Calculates dynamic interpolated volume for a clip at a given relative time,
 * taking into account base volume, volume keyframes (Filmora / Premiere automation curve),
 * and audio fade-in / fade-out ramps.
 */
export function calculateEffectiveVolume(clip, relativeTime) {
  if (!clip) return 1;
  let baseVol = clip.volume !== undefined ? clip.volume : 1;

  // 1. Volume Keyframes Interpolation
  const keyframes = clip.volumeKeyframes;
  if (keyframes && keyframes.length > 0) {
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (relativeTime <= sorted[0].time) {
      baseVol = sorted[0].volume;
    } else if (relativeTime >= sorted[sorted.length - 1].time) {
      baseVol = sorted[sorted.length - 1].volume;
    } else {
      for (let i = 0; i < sorted.length - 1; i++) {
        if (relativeTime >= sorted[i].time && relativeTime <= sorted[i + 1].time) {
          const t1 = sorted[i].time;
          const t2 = sorted[i + 1].time;
          const v1 = sorted[i].volume;
          const v2 = sorted[i + 1].volume;
          const frac = (relativeTime - t1) / (t2 - t1 || 1);
          // Smooth Hermite / Cosine curve for studio audio ramp
          const smoothFrac = 0.5 - 0.5 * Math.cos(frac * Math.PI);
          baseVol = v1 + (v2 - v1) * smoothFrac;
          break;
        }
      }
    }
  }

  // 2. Fade In Ramp
  let fadeMultiplier = 1;
  const fadeIn = clip.fadeIn || 0;
  if (fadeIn > 0 && relativeTime < fadeIn) {
    fadeMultiplier *= Math.max(0, Math.min(1, relativeTime / fadeIn));
  }

  // 3. Fade Out Ramp
  const fadeOut = clip.fadeOut || 0;
  const remainingTime = clip.duration - relativeTime;
  if (fadeOut > 0 && remainingTime < fadeOut) {
    fadeMultiplier *= Math.max(0, Math.min(1, remainingTime / fadeOut));
  }

  return Math.max(0, Math.min(1.5, baseVol * fadeMultiplier));
}

export const AUDIO_EQ_PRESETS = [
  {
    id: 'flat',
    name: 'Flat / Studio Direct',
    desc: 'Transparent reference curve',
    bass: 0,
    mid: 0,
    treble: 0,
    lowCut: false,
  },
  {
    id: 'podcast_vocal',
    name: '🎙️ Podcast Vocal Enhancer',
    desc: 'Crisp voice presence + 80Hz rumble cut',
    bass: 1.5,
    mid: 3.5,
    treble: 4.5,
    lowCut: true,
  },
  {
    id: 'bass_boost',
    name: '🔊 Bass Boost / 808 Warmth',
    desc: 'Punchy low-end for beats & cinematic hits',
    bass: 6.0,
    mid: -1.0,
    treble: 2.0,
    lowCut: false,
  },
  {
    id: 'lofi_radio',
    name: '📻 Lo-Fi Vintage Radio',
    desc: 'Classic bandpass telephone & radio filter',
    bass: -8.0,
    mid: 6.0,
    treble: -10.0,
    lowCut: true,
  },
  {
    id: 'de_hum',
    name: '🧹 De-Hum / AC Rumble Filter',
    desc: 'Aggressive low-end cut to remove background room noise',
    bass: -4.0,
    mid: 0,
    treble: 1.0,
    lowCut: true,
  },
  {
    id: 'cinematic_clarity',
    name: '🎬 Cinematic Trailer Clarity',
    desc: 'Rich low thump with ultra-crisp highs',
    bass: 4.0,
    mid: -2.0,
    treble: 5.0,
    lowCut: false,
  },
];
