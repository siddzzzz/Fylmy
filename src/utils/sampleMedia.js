/**
 * Procedural sample media generation for testing editing & keyframed blur tracking.
 */

export async function generateDynamicDemoVideo(name = 'Action Clip (Moving Target)', durationSeconds = 12) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(30);

  // Synthesize gentle background hum/music to pair with video
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(dest);
  osc.start();

  // Combine audio track into stream
  const combinedStream = new MediaStream([
    ...stream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
    ? 'video/webm; codecs=vp9'
    : 'video/webm';

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 4000000,
  });

  const chunks = [];
  const capturedFrames = [];
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 96;
  thumbCanvas.height = 54;
  const thumbCtx = thumbCanvas.getContext('2d');

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const recordingPromise = new Promise((resolve) => {
    recorder.onstop = () => {
      osc.stop();
      audioCtx.close();
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      resolve({
        id: 'asset-' + Math.random().toString(36).substring(2, 9),
        name,
        type: 'video',
        url,
        blob,
        duration: durationSeconds,
        width: 1280,
        height: 720,
        thumbnailUrl: capturedFrames.length > 0 ? capturedFrames[0].dataUrl : createVideoThumbnailFromCanvas(canvas),
        frames: capturedFrames,
      });
    };
  });

  recorder.start();

  const startTime = performance.now();
  const totalFrames = durationSeconds * 30;
  let frame = 0;

  function renderNextFrame() {
    const elapsed = frame / 30;
    const tNorm = elapsed / durationSeconds;

    // Background Gradient (Cyberpunk City / Horizon)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 720);
    bgGrad.addColorStop(0, '#0b0f19');
    bgGrad.addColorStop(0.6, '#1e1b4b');
    bgGrad.addColorStop(1, '#311042');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Glowing grid ground
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 480);
      ctx.lineTo((x - 640) * 2.5 + 640, 720);
      ctx.stroke();
    }
    for (let y = 480; y < 720; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }

    // Distant Neon Sun
    const sunGrad = ctx.createRadialGradient(640, 420, 20, 640, 420, 180);
    sunGrad.addColorStop(0, '#f43f5e');
    sunGrad.addColorStop(0.7, '#fb7185');
    sunGrad.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(640, 420, 160, 0, Math.PI * 2);
    ctx.fill();

    // Moving Car / Subject (Moves across the screen from left to right)
    // This provides a clear target to test keyframed moving blur!
    const subjectX = (tNorm * 1100 + 90) % 1200;
    const subjectY = 490 + Math.sin(tNorm * Math.PI * 8) * 12;

    // Vehicle body
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(subjectX - 80, subjectY - 30, 160, 45, 10);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(subjectX - 40, subjectY - 55, 90, 30, [10, 10, 0, 0]);
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(subjectX - 45, subjectY + 16, 16, 0, Math.PI * 2);
    ctx.arc(subjectX + 45, subjectY + 16, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(subjectX - 45, subjectY + 16, 6, 0, Math.PI * 2);
    ctx.arc(subjectX + 45, subjectY + 16, 6, 0, Math.PI * 2);
    ctx.fill();

    // License Plate (Ideal moving target to blur!)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(subjectX - 25, subjectY + 2, 50, 16);
    ctx.fillStyle = '#1e1b4b';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('FYL-809', subjectX - 22, subjectY + 14);

    // Target Head / Driver badge
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(subjectX, subjectY - 38, 12, 0, Math.PI * 2);
    ctx.fill();

    // Overlay info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 24px system-ui';
    ctx.fillText('FYLMY DEMO FOOTAGE', 40, 60);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`TIME: ${elapsed.toFixed(2)}s / ${durationSeconds}s | FRAME: ${frame}`, 40, 95);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`TARGET AT: X: ${Math.round(subjectX)}, Y: ${Math.round(subjectY)} [TRY BLUR TRACKING]`, 40, 125);

    // Periodic filmstrip snapshot (every 1.5s)
    if (frame % 45 === 0 && capturedFrames.length < 8) {
      thumbCtx.drawImage(canvas, 0, 0, 96, 54);
      capturedFrames.push({
        time: elapsed,
        dataUrl: thumbCanvas.toDataURL('image/jpeg', 0.65),
      });
    }

    frame++;
    if (frame < totalFrames) {
      requestAnimationFrame(renderNextFrame);
    } else {
      recorder.stop();
    }
  }

  renderNextFrame();
  return recordingPromise;
}

export async function generateBgmAudio(name = 'Chill Lofi Beat', durationSeconds = 15) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = audioCtx.sampleRate;
  const numSamples = sampleRate * durationSeconds;
  const buffer = audioCtx.createBuffer(2, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Generate warm chord progression + gentle lofi kick
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const beat = t % 1.0;
    
    // Kick drum thump
    const kick = beat < 0.15 ? Math.sin(2 * Math.PI * (120 - beat * 600) * beat) * Math.exp(-beat * 20) : 0;
    
    // Warm chords (Am - F - C - G)
    const chordIdx = Math.floor((t % 8) / 2);
    const chords = [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [261.63, 329.63, 392], // C
      [196, 246.94, 293.66], // G
    ];
    const currentChord = chords[chordIdx];
    let chordSignal = 0;
    for (const freq of currentChord) {
      chordSignal += Math.sin(2 * Math.PI * freq * t) * 0.08;
    }

    const val = (kick * 0.4 + chordSignal * 0.2);
    left[i] = val;
    right[i] = val;
  }

  // Convert AudioBuffer to WAV Blob
  const wavBlob = audioBufferToWavBlob(buffer);
  const url = URL.createObjectURL(wavBlob);
  audioCtx.close();

  return {
    id: 'asset-' + Math.random().toString(36).substring(2, 9),
    name,
    type: 'audio',
    url,
    blob: wavBlob,
    duration: durationSeconds,
    thumbnailUrl: null,
  };
}

function audioBufferToWavBlob(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  }

  writeString('RIFF');
  out.setUint32(pos, length - 8, true); pos += 4;
  writeString('WAVE');
  writeString('fmt ');
  out.setUint32(pos, 16, true); pos += 4;
  out.setUint16(pos, 1, true); pos += 2;
  out.setUint16(pos, numOfChan, true); pos += 2;
  out.setUint32(pos, buffer.sampleRate, true); pos += 4;
  out.setUint32(pos, buffer.sampleRate * 2 * numOfChan, true); pos += 4;
  out.setUint16(pos, numOfChan * 2, true); pos += 2;
  out.setUint16(pos, 16, true); pos += 2;
  writeString('data');
  out.setUint32(pos, length - pos - 4, true); pos += 4;

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}

function createVideoThumbnailFromCanvas(canvas) {
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 160;
  thumbCanvas.height = 90;
  const tctx = thumbCanvas.getContext('2d');
  tctx.drawImage(canvas, 0, 0, 160, 90);
  return thumbCanvas.toDataURL('image/jpeg', 0.8);
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
