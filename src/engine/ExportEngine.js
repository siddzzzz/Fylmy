/**
 * Fylmy Video Export Engine
 * Generates genuine, high-quality MP4 (H.264) and WebM videos frame-by-frame
 * with proper container headers, exact duration metadata, and clean filenames.
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { Compositor } from './Compositor.js';

/**
 * Fixes WebM duration header by injecting the EBML Duration tag into Segment Info.
 * This fixes the Chromium bug where MediaRecorder outputs WebM files with missing duration.
 */
function fixWebmDuration(blob, durationMs) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      const view = new DataView(buffer);
      const uint8 = new Uint8Array(buffer);

      // Search for EBML Segment Info (0x15, 0x49, 0xA9, 0x66)
      let infoPos = -1;
      for (let i = 0; i < uint8.length - 4; i++) {
        if (
          uint8[i] === 0x15 &&
          uint8[i + 1] === 0x49 &&
          uint8[i + 2] === 0xa9 &&
          uint8[i + 3] === 0x66
        ) {
          infoPos = i;
          break;
        }
      }

      if (infoPos === -1) {
        // Return original if Info not found
        return resolve(blob);
      }

      // Look for TimecodeScale (0x2A, 0xD7, 0xB1) or Duration (0x44, 0x89)
      for (let i = infoPos; i < Math.min(infoPos + 200, uint8.length - 10); i++) {
        if (uint8[i] === 0x44 && uint8[i + 1] === 0x89) {
          // Duration tag found: write float64 value
          const size = uint8[i + 2];
          if (size === 0x88 || size === 8) {
            view.setFloat64(i + 3, durationMs, false);
            return resolve(new Blob([buffer], { type: 'video/webm' }));
          } else if (size === 0x84 || size === 4) {
            view.setFloat32(i + 3, durationMs, false);
            return resolve(new Blob([buffer], { type: 'video/webm' }));
          }
        }
      }

      resolve(blob);
    };
    reader.onerror = () => resolve(blob);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Renders video frame-by-frame using WebCodecs (VideoEncoder) + mp4-muxer
 */
async function renderWithWebCodecsMP4({
  tracks,
  mediaAssets,
  aspectRatioConfig,
  duration,
  exportWidth,
  exportHeight,
  fps,
  exportSettings,
  projectName,
  onProgress,
}) {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const compositor = new Compositor(exportCanvas);

  // Preload video and image assets
  const mediaElements = new Map();
  for (const asset of mediaAssets) {
    if (asset.type === 'video') {
      const vid = document.createElement('video');
      vid.src = asset.url;
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.playsInline = true;
      await new Promise((resolve) => {
        vid.onloadeddata = resolve;
        vid.onerror = resolve;
        vid.load();
      });
      mediaElements.set(asset.id, vid);
    } else if (asset.type === 'image') {
      const img = new Image();
      img.src = asset.url;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      mediaElements.set(asset.id, img);
    }
  }

  // Setup MP4 Muxer
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: exportWidth,
      height: exportHeight,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  // Calculate bitrate based on resolution
  const bitrate =
    exportSettings.resolution === '4k'
      ? 24_000_000
      : exportSettings.resolution === '720p'
      ? 5_000_000
      : 10_000_000;

  // Determine supported AVC profile (Main 4.2 or High or Baseline)
  const candidateCodecs = [
    'avc1.4d002a', // Main Profile Level 4.2
    'avc1.640028', // High Profile Level 4.0
    'avc1.42001f', // Baseline Profile Level 3.1
    'avc1.42e01f', // Constrained Baseline
  ];

  let selectedCodec = candidateCodecs[0];
  for (const codec of candidateCodecs) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width: exportWidth,
        height: exportHeight,
        bitrate,
        framerate: fps,
      });
      if (support && support.supported) {
        selectedCodec = codec;
        break;
      }
    } catch {
      // Continue to next candidate
    }
  }

  let encodeError = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e) => {
      console.error('VideoEncoder error:', e);
      encodeError = e;
    },
  });

  videoEncoder.configure({
    codec: selectedCodec,
    width: exportWidth,
    height: exportHeight,
    bitrate,
    framerate: fps,
    avc: { format: 'avc' },
  });

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDuration = 1 / fps;

  for (let f = 0; f < totalFrames; f++) {
    if (encodeError) throw encodeError;

    const t = f * frameDuration;

    // Seek active video clips
    const seekPromises = [];
    for (const track of tracks) {
      if (track.type !== 'video' || track.muted) continue;
      for (const clip of track.clips) {
        if (t >= clip.start && t < clip.start + clip.duration) {
          const mediaEl = mediaElements.get(clip.assetId);
          if (mediaEl && mediaEl instanceof HTMLVideoElement) {
            const clipOffset = (t - clip.start) * (clip.speed || 1) + (clip.offset || 0);
            seekPromises.push(seekVideo(mediaEl, clipOffset));
          }
        }
      }
    }

    if (seekPromises.length > 0) {
      await Promise.all(seekPromises);
    }

    // Render frame via Compositor
    compositor.renderFrame({
      currentTime: t,
      tracks,
      mediaElements,
      aspectRatioConfig: { width: exportWidth, height: exportHeight },
      activeClipId: null,
      previewMode: false,
    });

    // Create VideoFrame for encoder with timestamp in microseconds
    const timestampUs = Math.round(f * (1_000_000 / fps));
    const videoFrame = new VideoFrame(exportCanvas, {
      timestamp: timestampUs,
      duration: Math.round(1_000_000 / fps),
    });

    const isKeyframe = f % (fps * 2) === 0;
    videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
    videoFrame.close();

    // Prevent encoder queue overflow
    if (videoEncoder.encodeQueueSize > 5) {
      await new Promise((r) => setTimeout(r, 10));
    }

    if (onProgress) {
      onProgress(Math.round(((f + 1) / totalFrames) * 95));
    }
  }

  await videoEncoder.flush();
  muxer.finalize();

  if (onProgress) onProgress(100);

  const buffer = muxer.target.buffer;
  // Clean, human-readable filename based on project name (strictly one dot for extension)
  const cleanName = (projectName || 'Untitled_Sequence')
    .trim()
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_') || 'Untitled_Sequence';
  const res = exportSettings?.resolution || '1080p';
  const filename = `${cleanName}_${res}.mp4`;

  return { blob, downloadUrl, filename, size: blob.size };
}

/**
 * Fallback MediaRecorder Exporter with WebM EBML Duration Injection
 */
async function renderWithMediaRecorder({
  tracks,
  mediaAssets,
  aspectRatioConfig,
  duration,
  exportWidth,
  exportHeight,
  fps,
  exportSettings,
  projectName,
  onProgress,
}) {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const compositor = new Compositor(exportCanvas);

  // Preload assets
  const mediaElements = new Map();
  for (const asset of mediaAssets) {
    if (asset.type === 'video') {
      const vid = document.createElement('video');
      vid.src = asset.url;
      vid.crossOrigin = 'anonymous';
      vid.muted = true;
      vid.playsInline = true;
      await new Promise((resolve) => {
        vid.onloadeddata = resolve;
        vid.onerror = resolve;
        vid.load();
      });
      mediaElements.set(asset.id, vid);
    } else if (asset.type === 'image') {
      const img = new Image();
      img.src = asset.url;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      mediaElements.set(asset.id, img);
    }
  }

  // Setup stream and recorder
  const stream = exportCanvas.captureStream(fps);

  let mimeType = 'video/webm; codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';
  }

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond:
      exportSettings.resolution === '4k'
        ? 20_000_000
        : exportSettings.resolution === '720p'
        ? 5_000_000
        : 10_000_000,
  });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const exportPromise = new Promise((resolve, reject) => {
    recorder.onstop = async () => {
      let rawBlob = new Blob(chunks, { type: mimeType });

      // Inject EBML duration into WebM
      if (mimeType.includes('webm')) {
        try {
          rawBlob = await fixWebmDuration(rawBlob, duration * 1000);
        } catch (e) {
          console.warn('EBML fix warning:', e);
        }
      }

      const downloadUrl = URL.createObjectURL(rawBlob);
      const cleanName = (projectName || 'Untitled_Sequence')
        .trim()
        .replace(/\./g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '_') || 'Untitled_Sequence';
      const res = exportSettings?.resolution || '1080p';
      const ext = (exportSettings?.format === 'mp4' || mimeType.includes('mp4')) ? 'mp4' : 'webm';
      const filename = `${cleanName}_${res}.${ext}`;

      resolve({ blob: rawBlob, downloadUrl, filename, size: rawBlob.size });
    };
    recorder.onerror = reject;
  });

  recorder.start(250); // Slice every 250ms

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDuration = 1 / fps;

  for (let f = 0; f < totalFrames; f++) {
    const t = f * frameDuration;

    // Seek all active video elements
    const seekPromises = [];
    for (const track of tracks) {
      if (track.type !== 'video' || track.muted) continue;
      for (const clip of track.clips) {
        if (t >= clip.start && t < clip.start + clip.duration) {
          const mediaEl = mediaElements.get(clip.assetId);
          if (mediaEl && mediaEl instanceof HTMLVideoElement) {
            const clipOffset = (t - clip.start) * (clip.speed || 1) + (clip.offset || 0);
            seekPromises.push(seekVideo(mediaEl, clipOffset));
          }
        }
      }
    }

    if (seekPromises.length > 0) {
      await Promise.all(seekPromises);
    }

    compositor.renderFrame({
      currentTime: t,
      tracks,
      mediaElements,
      aspectRatioConfig: { width: exportWidth, height: exportHeight },
      activeClipId: null,
      previewMode: false,
    });

    if (onProgress) {
      onProgress(Math.round(((f + 1) / totalFrames) * 95));
    }

    await new Promise((r) => setTimeout(r, 16));
  }

  recorder.stop();
  return exportPromise;
}

/**
 * Main Export Dispatcher
 */
export async function renderAndExportVideo({
  tracks,
  mediaAssets,
  aspectRatioConfig,
  duration,
  projectName = 'Untitled_Sequence',
  exportSettings = { resolution: '1080p', fps: 30, format: 'mp4' },
  onProgress,
}) {
  const { fps = 30 } = exportSettings;

  // Compute dimensions (ensuring even numbers for H.264 codecs)
  let exportWidth = aspectRatioConfig.width;
  let exportHeight = aspectRatioConfig.height;

  if (exportSettings.resolution === '720p') {
    const scale = 720 / Math.min(aspectRatioConfig.width, aspectRatioConfig.height);
    exportWidth = Math.round((aspectRatioConfig.width * scale) / 2) * 2;
    exportHeight = Math.round((aspectRatioConfig.height * scale) / 2) * 2;
  } else if (exportSettings.resolution === '4k') {
    const scale = 2160 / Math.min(aspectRatioConfig.width, aspectRatioConfig.height);
    exportWidth = Math.round((aspectRatioConfig.width * scale) / 2) * 2;
    exportHeight = Math.round((aspectRatioConfig.height * scale) / 2) * 2;
  } else {
    exportWidth = Math.round(exportWidth / 2) * 2;
    exportHeight = Math.round(exportHeight / 2) * 2;
  }

  // If format is MP4 and WebCodecs is available, use genuine MP4 muxer
  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window;

  if (exportSettings.format === 'mp4' && hasWebCodecs) {
    try {
      return await renderWithWebCodecsMP4({
        tracks,
        mediaAssets,
        aspectRatioConfig,
        duration,
        exportWidth,
        exportHeight,
        fps,
        exportSettings,
        projectName,
        onProgress,
      });
    } catch (err) {
      console.warn('WebCodecs MP4 export failed, falling back to MediaRecorder:', err);
    }
  }

  // Fallback to MediaRecorder with WebM EBML duration repair
  return await renderWithMediaRecorder({
    tracks,
    mediaAssets,
    aspectRatioConfig,
    duration,
    exportWidth,
    exportHeight,
    fps,
    exportSettings,
    projectName,
    onProgress,
  });
}

function seekVideo(video, time) {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.03) {
      return resolve();
    }
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = Math.max(0, Math.min(video.duration || 9999, time));
    setTimeout(resolve, 80);
  });
}
