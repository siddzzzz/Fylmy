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
    color: '#1e3a8a',
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
    color: '#1d4ed8',
    accent: '#60a5fa',
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
