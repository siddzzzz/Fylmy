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

    // Calculate dynamic 1-click Fade In / Fade Out transition curve
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

    const mediaAspect = naturalWidth / naturalHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    // Only apply Frosted Mirror Background on base track if aspect ratios differ
    if (isBaseTrack && transform.mirrorBlurBg && Math.abs(mediaAspect - canvasAspect) > 0.05 && transform.fitMode === 'contain') {
      ctx.save();
      ctx.filter = previewMode ? 'blur(12px) brightness(50%)' : 'blur(24px) brightness(50%)';
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

    // Apply custom transforms (pan, scale, rotation)
    const centerX = drawX + drawW / 2 + (transform.x || 0);
    const centerY = drawY + drawH / 2 + (transform.y || 0);

    ctx.translate(centerX, centerY);
    if (transform.rotation) {
      ctx.rotate((transform.rotation * Math.PI) / 180);
    }
    const scale = transform.scale || 1;
    ctx.scale(scale, scale);

    ctx.drawImage(mediaEl, -drawW / 2, -drawH / 2, drawW, drawH);

    ctx.restore();

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
    const fontSize = Math.round((config.fontSize / 1080) * canvasHeight);
    ctx.font = `700 ${fontSize}px ${config.fontFamily || 'Outfit, sans-serif'}`;
    ctx.textAlign = config.align || 'center';
    ctx.textBaseline = 'middle';

    const x = config.align === 'center' ? canvasWidth / 2 : config.align === 'left' ? 80 : canvasWidth - 80;
    const y = (config.yPos / 100) * canvasHeight;

    const lines = (config.text || '').split('\n');
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

      // Text Shadow for contrast
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Text Fill
      ctx.fillStyle = config.color || '#ffffff';
      ctx.fillText(line, x, lineY);
    });

    ctx.restore();
  }

  /**
   * Cinematic Vignette Effect
   */
  drawVignette(ctx, width, height, strength) {
    ctx.save();
    const radius = Math.max(width, height) * 0.7;
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, radius * 0.4,
      width / 2, height / 2, radius
    );
    const alpha = (strength / 100) * 0.8;
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${alpha})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
