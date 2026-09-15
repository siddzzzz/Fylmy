/**
 * Media processing and frame thumbnail extraction for imported video, audio, and images.
 */

export async function extractAudioPeaks(file, sampleCount = 120) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return generateDeterministicWaveform(sampleCount);
    const ctx = new AudioContextClass();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(channelData.length / sampleCount));
    const peaks = [];
    for (let i = 0; i < sampleCount; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(channelData.length, start + step);
      for (let j = start; j < end; j += 8) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(Math.min(1, Math.max(0.08, Number(max.toFixed(3)))));
    }
    ctx.close().catch(() => {});
    return peaks;
  } catch (e) {
    return generateDeterministicWaveform(sampleCount);
  }
}

export function generateDeterministicWaveform(count = 120, seed = 42) {
  const peaks = [];
  for (let i = 0; i < count; i++) {
    const s1 = Math.sin((i * 0.15) + seed);
    const s2 = Math.cos((i * 0.35) + seed * 2);
    const s3 = Math.sin((i * 0.05));
    const val = 0.2 + 0.35 * Math.abs(s1) + 0.25 * Math.abs(s2) + 0.2 * Math.abs(s3);
    peaks.push(Math.min(0.95, Math.max(0.1, Number(val.toFixed(2)))));
  }
  return peaks;
}

export async function processImportedFile(file) {
  const url = URL.createObjectURL(file);
  const type = file.type.startsWith('video/')
    ? 'video'
    : file.type.startsWith('audio/')
    ? 'audio'
    : 'image';

  return new Promise((resolve) => {
    if (type === 'video') {
      const vid = document.createElement('video');
      vid.src = url;
      vid.preload = 'auto';
      vid.crossOrigin = 'anonymous';

      vid.onloadedmetadata = async () => {
        const videoDuration = vid.duration || 10;
        const width = vid.videoWidth || 1920;
        const height = vid.videoHeight || 1080;

        // Extract a primary poster thumbnail + a filmstrip of frame slices across video duration
        const frames = [];
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 120;
        thumbCanvas.height = 68;
        const ctx = thumbCanvas.getContext('2d');

        // Extract up to 24 frames depending on video duration (at least 1 frame every ~1.5s)
        const frameSampleCount = Math.min(24, Math.max(5, Math.floor(videoDuration * 0.8)));
        const step = videoDuration / (frameSampleCount + 1);

        for (let i = 1; i <= frameSampleCount; i++) {
          try {
            const targetT = i * step;
            vid.currentTime = targetT;
            await new Promise((res) => {
              const onSeeked = () => {
                vid.removeEventListener('seeked', onSeeked);
                res();
              };
              vid.addEventListener('seeked', onSeeked);
              setTimeout(res, 200); // safety fallback timeout
            });
            ctx.drawImage(vid, 0, 0, 120, 68);
            frames.push({
              time: targetT,
              dataUrl: thumbCanvas.toDataURL('image/jpeg', 0.7),
            });
          } catch (e) {
            console.warn('Frame strip extraction warning:', e);
          }
        }

        const primaryThumb = frames.length > 0 ? frames[0].dataUrl : null;
        const waveform = await extractAudioPeaks(file, 100);

        resolve({
          id: 'asset-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: 'video',
          url,
          blob: file,
          duration: videoDuration,
          width,
          height,
          thumbnailUrl: primaryThumb,
          frames,
          waveform,
        });
      };
      vid.onerror = () => {
        resolve({
          id: 'asset-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: 'video',
          url,
          blob: file,
          duration: 10,
          width: 1920,
          height: 1080,
          thumbnailUrl: null,
          frames: [],
          waveform: generateDeterministicWaveform(80),
        });
      };
    } else if (type === 'audio') {
      const aud = document.createElement('audio');
      aud.src = url;
      aud.preload = 'metadata';
      aud.onloadedmetadata = async () => {
        const waveform = await extractAudioPeaks(file, 150);
        resolve({
          id: 'asset-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: 'audio',
          url,
          blob: file,
          duration: aud.duration || 10,
          thumbnailUrl: null,
          waveform,
        });
      };
      aud.onerror = () => {
        resolve({
          id: 'asset-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: 'audio',
          url,
          blob: file,
          duration: 10,
          thumbnailUrl: null,
          waveform: generateDeterministicWaveform(100),
        });
      };
    } else {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        resolve({
          id: 'asset-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: 'image',
          url,
          blob: file,
          duration: 5,
          width: img.naturalWidth,
          height: img.naturalHeight,
          thumbnailUrl: url,
        });
      };
    }
  });
}
