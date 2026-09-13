/**
 * Media processing and frame thumbnail extraction for imported video, audio, and images.
 */

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
        thumbCanvas.width = 96;
        thumbCanvas.height = 54;
        const ctx = thumbCanvas.getContext('2d');

        const frameSampleCount = Math.min(10, Math.max(3, Math.floor(videoDuration / 2)));
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
              setTimeout(res, 250); // safety fallback timeout
            });
            ctx.drawImage(vid, 0, 0, 96, 54);
            frames.push({
              time: targetT,
              dataUrl: thumbCanvas.toDataURL('image/jpeg', 0.65),
            });
          } catch (e) {
            console.warn('Frame strip extraction warning:', e);
          }
        }

        const primaryThumb = frames.length > 0 ? frames[0].dataUrl : null;

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
        });
      };
    } else if (type === 'audio') {
      const aud = document.createElement('audio');
      aud.src = url;
      aud.preload = 'metadata';
      aud.onloadedmetadata = () => {
        resolve({
          id: 'asset-' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: 'audio',
          url,
          blob: file,
          duration: aud.duration,
          thumbnailUrl: null,
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
