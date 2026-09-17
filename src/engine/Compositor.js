/**
 * Fylmy Video Compositor Engine
 * Handles multi-track video blending, aspect-ratio scaling, frosted backgrounds,
 * text overlays, color grading, and dynamic keyframed moving blur/censor tracking.
 */

export class Compositor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Offscreen helper canvases for blurs and filters
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d');
  }

  setSize(width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
  }

  /**
   * Interpolate keyframe values for a given time
   */
  getInterpolatedKeyframe(keyframes, relativeTime) {
    if (!keyframes || keyframes.length === 0) {
      return { x: 40, y: 40, width: 20, height: 20, intensity: 20, style: 'gaussian' };
    }

    // Sort by time
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);

    if (relativeTime <= sorted[0].time) {
      return sorted[0];
    }
    if (relativeTime >= sorted[sorted.length - 1].time) {
      return sorted[sorted.length - 1];
    }

    // Find the bounding keyframes
    let prev = sorted[0];
    let next = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (relativeTime >= sorted[i].time && relativeTime <= sorted[i + 1].time) {
        prev = sorted[i];
        next = sorted[i + 1];
        break;
      }
    }

    const duration = next.time - prev.time;
    if (duration <= 0.0001) return prev;

    const t = (relativeTime - prev.time) / duration;
    // Smooth cosine easing
    const smoothT = 0.5 - 0.5 * Math.cos(t * Math.PI);

    return {
      x: prev.x + (next.x - prev.x) * smoothT,
      y: prev.y + (next.y - prev.y) * smoothT,
      width: prev.width + (next.width - prev.width) * smoothT,
      height: prev.height + (next.height - prev.height) * smoothT,
      intensity: prev.intensity + (next.intensity - prev.intensity) * smoothT,
      style: prev.style || 'gaussian',
    };
  }

  /**
   * Master Render Loop for a single frame at currentTime
   */
  renderFrame({
    currentTime,
    tracks,
    mediaElements,
    aspectRatioConfig,
    activeClipId,
    previewMode = true,
  }) {
    const { width, height } = aspectRatioConfig;
    this.setSize(width, height);
    const ctx = this.ctx;

    // 1. Clear Canvas Background (Dark Studio Base)
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, width, height);

    // Collect all active video and image clips sorted by track order (Base V1 first, then V2)
    const videoTracks = tracks.filter((t) => t.type === 'video' && !t.muted);
    // Reverse so bottom track (V1) is rendered first, top track (V2) on top
    const orderedTracks = [...videoTracks].reverse();

    // 2. Render Video/Image layers
    for (let i = 0; i < orderedTracks.length; i++) {
      const track = orderedTracks[i];
      const isBaseTrack = (i === 0);
      for (const clip of track.clips) {
        if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
          const mediaEl = mediaElements.get(clip.id) || mediaElements.get(clip.assetId);
          if (!mediaEl) continue;

          this.renderClipMedia(ctx, clip, mediaEl, width, height, isBaseTrack, previewMode, currentTime);
        }
      }
    }

    // 3. Render Blur / Censor Track with Keyframing
    const blurTracks = tracks.filter((t) => t.type === 'blur' && !t.muted);
    for (const track of blurTracks) {
      for (const clip of track.clips) {
        if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
          const relTime = currentTime - clip.start;
          const kf = this.getInterpolatedKeyframe(clip.keyframes, relTime);
          this.applyBlurBox(ctx, kf, width, height);
        }
      }
    }

    // 4. Render Text & Titles Track
    const textTracks = tracks.filter((t) => t.type === 'text' && !t.muted);
    for (const track of textTracks) {
      for (const clip of track.clips) {
        if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
          this.renderTextClip(ctx, clip, width, height, currentTime);
        }
      }
    }
  }

  /**
   * Render individual video/image clip with transform, fit mode, and filters
   */
  renderClipMedia(ctx, clip, mediaEl, canvasWidth, canvasHeight, isBaseTrack = false, previewMode = true, currentTime = 0) {
    const isVideo = mediaEl instanceof HTMLVideoElement;
    const isImg = mediaEl instanceof HTMLImageElement;
    if (!isVideo && !isImg) return;

    const naturalWidth = isVideo ? mediaEl.videoWidth : mediaEl.naturalWidth;
    const naturalHeight = isVideo ? mediaEl.videoHeight : mediaEl.naturalHeight;
    if (!naturalWidth || !naturalHeight) return;

    const transform = clip.transform || {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      fitMode: 'contain',
      mirrorBlurBg: isBaseTrack,
    };

    const filters = clip.filters || {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      temperature: 0,
      vignette: 0,
    };

    const isDefaultFilters =
      (!filters.brightness || filters.brightness === 100) &&
      (!filters.contrast || filters.contrast === 100) &&
      (!filters.saturation || filters.saturation === 100) &&
      (!filters.temperature || filters.temperature === 0);

    // Calculate dynamic Transitions & Fade In / Fade Out curve
    let fadeMultiplier = 1;
    let transitionProgressIn = null;
    let transitionProgressOut = null;

    const transIn = clip.transitionIn || (clip.fadeIn ? { type: 'crossfade', duration: clip.fadeIn } : null);
    const transOut = clip.transitionOut || (clip.fadeOut ? { type: 'crossfade', duration: clip.fadeOut } : null);

    if (transIn && transIn.type !== 'none') {
      const dur = transIn.duration || 1.0;
      const elapsed = currentTime - clip.start;
      if (elapsed < dur) {
        transitionProgressIn = Math.max(0, Math.min(1, elapsed / dur));
      }
    }

    if (transOut && transOut.type !== 'none') {
      const dur = transOut.duration || 1.0;
      const remaining = (clip.start + clip.duration) - currentTime;
      if (remaining < dur) {
        transitionProgressOut = Math.max(0, Math.min(1, remaining / dur));
      }
    }

    // Standard Alpha Fade for Crossfade
    if (transitionProgressIn !== null) {
      if (transIn.type === 'crossfade' || transIn.type === 'fadeBlack') {
        fadeMultiplier *= transitionProgressIn;
      }
    }
    if (transitionProgressOut !== null) {
      if (transOut.type === 'crossfade' || transOut.type === 'fadeBlack') {
        fadeMultiplier *= transitionProgressOut;
      }
    }

    ctx.save();
    ctx.globalAlpha = (transform.opacity ?? 1) * fadeMultiplier;

    if (isDefaultFilters) {
      ctx.filter = 'none';
    } else {
      // Build CSS filter string only when custom color grading is applied
      const filterParts = [];
      if (filters.brightness !== 100) filterParts.push(`brightness(${filters.brightness}%)`);
      if (filters.contrast !== 100) filterParts.push(`contrast(${filters.contrast}%)`);
      if (filters.saturation !== 100) filterParts.push(`saturate(${filters.saturation}%)`);
      if (filters.temperature && filters.temperature !== 0) {
        if (filters.temperature > 0) {
          filterParts.push(`sepia(${filters.temperature * 0.4}%)`);
        } else {
          filterParts.push(`hue-rotate(${filters.temperature * 0.8}deg)`);
        }
      }
      ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';
    }

    // Apply Transition Wipe Clipping if active
    if (transitionProgressIn !== null) {
      if (transIn.type === 'wipeLeft') {
        ctx.beginPath();
        ctx.rect(0, 0, canvasWidth * transitionProgressIn, canvasHeight);
        ctx.clip();
      } else if (transIn.type === 'wipeRight') {
        ctx.beginPath();
        ctx.rect(canvasWidth * (1 - transitionProgressIn), 0, canvasWidth * transitionProgressIn, canvasHeight);
        ctx.clip();
      }
    }
    if (transitionProgressOut !== null) {
      if (transOut.type === 'wipeLeft') {
        ctx.beginPath();
        ctx.rect(0, 0, canvasWidth * transitionProgressOut, canvasHeight);
        ctx.clip();
      } else if (transOut.type === 'wipeRight') {
        ctx.beginPath();
        ctx.rect(canvasWidth * (1 - transitionProgressOut), 0, canvasWidth * transitionProgressOut, canvasHeight);
        ctx.clip();
      }
    }

    const mediaAspect = naturalWidth / naturalHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    // Only apply Frosted Mirror Background on base track if aspect ratios differ
    if (isBaseTrack && transform.mirrorBlurBg && Math.abs(mediaAspect - canvasAspect) > 0.05 && transform.fitMode === 'contain') {
      ctx.save();
      ctx.filter = previewMode ? 'blur(6px) brightness(50%)' : 'blur(24px) brightness(50%)';
      let bgW = canvasWidth;
      let bgH = canvasWidth / mediaAspect;
      if (bgH < canvasHeight) {
        bgH = canvasHeight;
        bgW = canvasHeight * mediaAspect;
      }
      ctx.drawImage(mediaEl, (canvasWidth - bgW) / 2, (canvasHeight - bgH) / 2, bgW, bgH);
      ctx.restore();
    }

    // Determine main placement
    let drawW = canvasWidth;
    let drawH = canvasHeight;
    let drawX = 0;
    let drawY = 0;

    if (transform.fitMode === 'contain') {
      if (mediaAspect > canvasAspect) {
        drawW = canvasWidth;
        drawH = canvasWidth / mediaAspect;
        drawY = (canvasHeight - drawH) / 2;
      } else {
        drawH = canvasHeight;
        drawW = canvasHeight * mediaAspect;
        drawX = (canvasWidth - drawW) / 2;
      }
    } else if (transform.fitMode === 'cover') {
      if (mediaAspect > canvasAspect) {
        drawH = canvasHeight;
        drawW = canvasHeight * mediaAspect;
        drawX = (canvasWidth - drawW) / 2;
      } else {
        drawW = canvasWidth;
        drawH = canvasWidth / mediaAspect;
        drawY = (canvasHeight - drawH) / 2;
      }
    }

    // Slide and Zoom in/out transition offsets
    let slideOffsetX = 0;
    let zoomScaleBonus = 0;

    if (transitionProgressIn !== null) {
      if (transIn.type === 'slideLeft') {
        slideOffsetX += (1 - transitionProgressIn) * -canvasWidth;
      } else if (transIn.type === 'slideRight') {
        slideOffsetX += (1 - transitionProgressIn) * canvasWidth;
      } else if (transIn.type === 'zoomBlur') {
        zoomScaleBonus += (1 - transitionProgressIn) * 0.4;
      }
    }
    if (transitionProgressOut !== null) {
      if (transOut.type === 'slideLeft') {
        slideOffsetX += (1 - transitionProgressOut) * canvasWidth;
      } else if (transOut.type === 'slideRight') {
        slideOffsetX += (1 - transitionProgressOut) * -canvasWidth;
      } else if (transOut.type === 'zoomBlur') {
        zoomScaleBonus += (1 - transitionProgressOut) * 0.4;
      }
    }

    // Apply custom transforms (pan, scale, rotation)
    const centerX = drawX + drawW / 2 + (transform.x || 0) + slideOffsetX;
    const centerY = drawY + drawH / 2 + (transform.y || 0);

    ctx.translate(centerX, centerY);
    if (transform.rotation) {
      ctx.rotate((transform.rotation * Math.PI) / 180);
    }
    const scale = (transform.scale || 1) + zoomScaleBonus;
    ctx.scale(scale, scale);

    // Chroma Key (Green / Blue Screen) processing if enabled
    if (clip.chromaKey?.enabled) {
      this.renderChromaKeyed(ctx, mediaEl, drawW, drawH, clip.chromaKey);
    } else {
      ctx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);
    }

    ctx.restore();

    // White Flash / Dip to White overlay
    if ((transitionProgressIn !== null && transIn.type === 'dipWhite') || (transitionProgressOut !== null && transOut.type === 'dipWhite')) {
      const p = transitionProgressIn !== null ? transitionProgressIn : transitionProgressOut;
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${(1 - p) * 0.9})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }

    // Apply Vignette if configured
    if (filters.vignette > 0) {
      this.drawVignette(ctx, canvasWidth, canvasHeight, filters.vignette);
    }
  }

  /**
   * Apply Gaussian Blur or Mosaic/Pixelate to a specific keyframed bounding box
   */
  applyBlurBox(ctx, keyframe, canvasWidth, canvasHeight) {
    const { x, y, width, height, intensity = 20, style = 'gaussian' } = keyframe;

    // Convert percentage to pixel coordinates
    const px = Math.round((x / 100) * canvasWidth);
    const py = Math.round((y / 100) * canvasHeight);
    const pw = Math.max(10, Math.round((width / 100) * canvasWidth));
    const ph = Math.max(10, Math.round((height / 100) * canvasHeight));

    // Clamp coordinates within canvas
    const startX = Math.max(0, px);
    const startY = Math.max(0, py);
    const endX = Math.min(canvasWidth, px + pw);
    const endY = Math.min(canvasHeight, py + ph);
    const actualW = endX - startX;
    const actualH = endY - startY;

    if (actualW <= 0 || actualH <= 0) return;

    if (style === 'pixelate') {
      // Mosaic / Pixelate Effect
      const blockSize = Math.max(4, Math.round(intensity * 0.8));
      const smallW = Math.max(2, Math.floor(actualW / blockSize));
      const smallH = Math.max(2, Math.floor(actualH / blockSize));

      this.tempCanvas.width = smallW;
      this.tempCanvas.height = smallH;
      this.tempCtx.imageSmoothingEnabled = false;

      // Draw downscaled patch
      this.tempCtx.drawImage(
        this.canvas,
        startX, startY, actualW, actualH,
        0, 0, smallW, smallH
      );

      // Blit back scaled up with pixelated edges
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.tempCanvas,
        0, 0, smallW, smallH,
        startX, startY, actualW, actualH
      );
      ctx.restore();

    } else {
      // Gaussian Blur Effect
      const blurRadius = Math.max(4, Math.round(intensity * 0.9));

      this.tempCanvas.width = actualW;
      this.tempCanvas.height = actualH;

      // Extract raw patch
      this.tempCtx.filter = 'none';
      this.tempCtx.drawImage(
        this.canvas,
        startX, startY, actualW, actualH,
        0, 0, actualW, actualH
      );

      // Re-draw with strong blur
      ctx.save();
      ctx.beginPath();
      ctx.rect(startX, startY, actualW, actualH);
      ctx.clip();

      ctx.filter = `blur(${blurRadius}px)`;
      // Draw multiple passes for rich optical blur depth
      ctx.drawImage(this.tempCanvas, startX, startY, actualW, actualH);
      ctx.drawImage(this.tempCanvas, startX, startY, actualW, actualH);
      ctx.restore();
    }
  }

  /**
   * Render Styled Text Overlay
   */
  renderTextClip(ctx, clip, canvasWidth, canvasHeight, currentTime = 0) {
    const config = clip.textConfig || {
      text: 'Title Text',
      fontSize: 48,
      fontFamily: 'Outfit, sans-serif',
      color: '#ffffff',
      bgColor: 'rgba(0,0,0,0.6)',
      align: 'center',
      yPos: 80, // percentage from top
    };

    let fadeMultiplier = 1;
    if (clip.fadeIn && clip.fadeIn > 0) {
      const elapsed = currentTime - clip.start;
      if (elapsed < clip.fadeIn) {
        fadeMultiplier *= Math.max(0, Math.min(1, elapsed / clip.fadeIn));
      }
    }
    if (clip.fadeOut && clip.fadeOut > 0) {
      const remaining = (clip.start + clip.duration) - currentTime;
      if (remaining < clip.fadeOut) {
        fadeMultiplier *= Math.max(0, Math.min(1, remaining / clip.fadeOut));
      }
    }

    ctx.save();
    ctx.globalAlpha = fadeMultiplier;

    // Animation progress calculations
    const elapsed = currentTime - clip.start;
    let animScale = 1;
    let animOffsetY = 0;

    if (config.animation === 'popIn' && elapsed < 0.4) {
      const p = elapsed / 0.4;
      // Spring overshoot easing
      animScale = 0.4 + 0.6 * (1 + Math.sin(p * Math.PI * 0.5) * 0.15);
    } else if (config.animation === 'slideUp' && elapsed < 0.4) {
      const p = elapsed / 0.4;
      animOffsetY = (1 - p) * (fontSize * 0.8);
    }

    const fontSize = Math.round((config.fontSize / 1080) * canvasHeight * animScale);
    ctx.font = `700 ${fontSize}px ${config.fontFamily || 'Outfit, sans-serif'}`;
    ctx.textAlign = config.align || 'center';
    ctx.textBaseline = 'middle';

    const x = config.align === 'center' ? canvasWidth / 2 : config.align === 'left' ? 80 : canvasWidth - 80;
    const y = (config.yPos / 100) * canvasHeight + animOffsetY;

    let fullText = config.text || '';
    if (config.animation === 'typewriter') {
      const typingSpeed = config.typingSpeed || 14; // chars per second
      const visibleChars = Math.floor(elapsed * typingSpeed);
      fullText = fullText.slice(0, Math.max(1, Math.min(fullText.length, visibleChars)));
    }

    const lines = fullText.split('\n');
    const lineHeight = fontSize * 1.3;

    lines.forEach((line, index) => {
      const lineY = y + (index - (lines.length - 1) / 2) * lineHeight;
      const textMetrics = ctx.measureText(line);
      const paddingX = fontSize * 0.4;
      const paddingY = fontSize * 0.2;

      // Background badge if enabled
      if (config.bgColor && config.bgColor !== 'transparent') {
        ctx.fillStyle = config.bgColor;
        let bgLeft = x - textMetrics.width / 2 - paddingX;
        if (config.align === 'left') bgLeft = x - paddingX;
        if (config.align === 'right') bgLeft = x - textMetrics.width - paddingX;

        ctx.beginPath();
        ctx.roundRect(bgLeft, lineY - fontSize / 2 - paddingY, textMetrics.width + paddingX * 2, fontSize + paddingY * 2, 8);
        ctx.fill();
      }

      // Text Shadow / Neon Glow
      if (config.animation === 'glow') {
        ctx.shadowColor = config.glowColor || '#38bdf8';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      // Text Outline / Stroke (Viral Captions & High Legibility)
      if (config.strokeWidth && config.strokeWidth > 0) {
        ctx.strokeStyle = config.strokeColor || '#000000';
        ctx.lineWidth = Math.round((config.strokeWidth / 1080) * canvasHeight) || 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, x, lineY);
      }

      // Text Fill
      ctx.fillStyle = config.color || '#ffffff';
      ctx.fillText(line, x, lineY);
    });

    ctx.restore();
  }

  /**
   * Real-time Chroma Keying (Green / Blue Screen removal)
   */
  renderChromaKeyed(ctx, mediaEl, drawW, drawH, chromaConfig) {
    const keyColor = chromaConfig.color || '#00ff00';
    const tolerance = (chromaConfig.tolerance || 45) * 2.55; // 0-255 range
    const softness = (chromaConfig.softness || 15) * 2.55;

    // Parse target hex color to RGB
    let tr = 0, tg = 255, tb = 0;
    if (keyColor.startsWith('#')) {
      const hex = keyColor.slice(1);
      if (hex.length === 6) {
        tr = parseInt(hex.substring(0, 2), 16);
        tg = parseInt(hex.substring(2, 4), 16);
        tb = parseInt(hex.substring(4, 6), 16);
      }
    }

    const w = Math.round(drawW);
    const h = Math.round(drawH);
    if (this.tempCanvas.width !== w || this.tempCanvas.height !== h) {
      this.tempCanvas.width = w;
      this.tempCanvas.height = h;
    }

    this.tempCtx.clearRect(0, 0, w, h);
    this.tempCtx.drawImage(mediaEl, 0, 0, w, h);

    try {
      const imgData = this.tempCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Euclidean color distance in RGB space
        const dr = r - tr;
        const dg = g - tg;
        const db = b - tb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist < tolerance) {
          data[i + 3] = 0; // Transparent
        } else if (dist < tolerance + softness && softness > 0) {
          const alpha = (dist - tolerance) / softness;
          data[i + 3] = Math.round(data[i + 3] * alpha);
        }
      }

      this.tempCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(this.tempCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    } catch (_) {
      ctx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);
    }
  }
}
