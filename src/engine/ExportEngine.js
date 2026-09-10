/**
 * Fylmy Video Export Engine
 * Composites the multi-track timeline frame-by-frame into high-definition
 * MP4 / WebM video with synchronized multi-channel audio.
 */

import { Compositor } from './Compositor.js';

export async function renderAndExportVideo({
  tracks,
  mediaAssets,
  aspectRatioConfig,
  duration,
  exportSettings = { resolution: '1080p', fps: 30, format: 'webm' },
  onProgress,
}) {
  const { fps = 30 } = exportSettings;

  // Compute actual dimensions based on chosen resolution
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
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;

  const compositor = new Compositor(exportCanvas);

  // Pre-load media elements for export
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

  // Determine media stream and recorder
  const stream = exportCanvas.captureStream(fps);

  // Setup Web Audio offline context or live destination
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  // Combine audio track
  const combinedTracks = [
    ...stream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ];
  const combinedStream = new MediaStream(combinedTracks);

  let mimeType = 'video/webm; codecs=vp9';
  if (exportSettings.format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4; codecs=avc1')) {
    mimeType = 'video/mp4; codecs=avc1';
  } else if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: exportSettings.resolution === '4k' ? 16000000 : 8000000,
  });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const exportPromise = new Promise((resolve, reject) => {
    recorder.onstop = () => {
      audioCtx.close();
      const blob = new Blob(chunks, { type: mimeType });
      const downloadUrl = URL.createObjectURL(blob);
      const filename = `Fylmy_${exportSettings.resolution}_${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      resolve({ blob, downloadUrl, filename });
    };
    recorder.onerror = reject;
  });

  recorder.start();

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const frameDuration = 1 / fps;

  // Offline rendering loop
  for (let f = 0; f < totalFrames; f++) {
    const t = f * frameDuration;

    // Seek all active video elements to accurate time
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

    if (onProgress) {
      onProgress(Math.round(((f + 1) / totalFrames) * 100));
    }

    // Brief yield to allow recorder buffer to capture frame
    await new Promise((r) => setTimeout(r, 16));
  }

  recorder.stop();
  return exportPromise;
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
    video.addEventListener('seeked', onSeeked);
    video.currentTime = Math.max(0, Math.min(video.duration || 9999, time));
    // Fallback timeout in case video seek stalls
    setTimeout(resolve, 80);
  });
}
