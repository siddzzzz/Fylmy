import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Target,
  Key,
  Crosshair,
} from 'lucide-react';
import { formatTimecode } from '../types/defaults';

export function PreviewPlayer({
  canvasRef,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  onStepFrame,
  aspectRatioConfig,
  selectedClip,
  onUpdateBlurKeyframe,
  onAddKeyframeAtPlayhead,
  onUpdateClip,
  zoomLevel,
  setZoomLevel,
}) {
  const containerRef = useRef(null);
  const [isDraggingBlur, setIsDraggingBlur] = useState(false);
  const [dragMode, setDragMode] = useState(null);
  const dragStartRef = useRef({ startX: 0, startY: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 });

  // Transform Gizmo for Video & Overlay Clips
  const [isDraggingTransform, setIsDraggingTransform] = useState(false);
  const [transformDragMode, setTransformDragMode] = useState(null);
  const transformDragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, initialScale: 1 });

  const isBlurClipSelected = selectedClip && selectedClip.trackType === 'blur';
  const isVideoClipSelected = selectedClip && selectedClip.trackType === 'video';
  const isClipActiveAtPlayhead = selectedClip && currentTime >= selectedClip.start && currentTime <= selectedClip.start + selectedClip.duration;

  // Find active keyframe values for selected blur clip
  let activeKf = null;
  if (isBlurClipSelected && isClipActiveAtPlayhead && selectedClip.keyframes) {
    const relTime = currentTime - selectedClip.start;
    const sorted = [...selectedClip.keyframes].sort((a, b) => a.time - b.time);
    if (sorted.length > 0) {
      if (relTime <= sorted[0].time) activeKf = sorted[0];
      else if (relTime >= sorted[sorted.length - 1].time) activeKf = sorted[sorted.length - 1];
      else {
        for (let i = 0; i < sorted.length - 1; i++) {
          if (relTime >= sorted[i].time && relTime <= sorted[i + 1].time) {
            const p1 = sorted[i];
            const p2 = sorted[i + 1];
            const t = (relTime - p1.time) / (p2.time - p1.time || 1);
            const st = 0.5 - 0.5 * Math.cos(t * Math.PI);
            activeKf = {
              x: p1.x + (p2.x - p1.x) * st,
              y: p1.y + (p2.y - p1.y) * st,
              width: p1.width + (p2.width - p1.width) * st,
              height: p1.height + (p2.height - p1.height) * st,
              intensity: p1.intensity + (p2.intensity - p1.intensity) * st,
            };
            break;
          }
        }
      }
    }
  }

  // Handle Dragging / Resizing Blur Box on Canvas
  const handleMouseDown = (e, mode) => {
    e.stopPropagation();
    if (!activeKf || !isBlurClipSelected) return;

    setIsDraggingBlur(true);
    setDragMode(mode);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      boxX: activeKf.x,
      boxY: activeKf.y,
      boxW: activeKf.width,
      boxH: activeKf.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingBlur || !dragMode || !activeKf || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;

      let newX = dragStartRef.current.boxX;
      let newY = dragStartRef.current.boxY;
      let newW = dragStartRef.current.boxW;
      let newH = dragStartRef.current.boxH;

      if (dragMode === 'move') {
        newX = Math.max(0, Math.min(100 - newW, dragStartRef.current.boxX + deltaXPercent));
        newY = Math.max(0, Math.min(100 - newH, dragStartRef.current.boxY + deltaYPercent));
      } else if (dragMode === 'se') {
        newW = Math.max(5, Math.min(100 - newX, dragStartRef.current.boxW + deltaXPercent));
        newH = Math.max(5, Math.min(100 - newY, dragStartRef.current.boxH + deltaYPercent));
      } else if (dragMode === 'sw') {
        const potentialW = dragStartRef.current.boxW - deltaXPercent;
        if (potentialW >= 5 && dragStartRef.current.boxX + deltaXPercent >= 0) {
          newX = dragStartRef.current.boxX + deltaXPercent;
          newW = potentialW;
        }
        newH = Math.max(5, Math.min(100 - newY, dragStartRef.current.boxH + deltaYPercent));
      } else if (dragMode === 'ne') {
        newW = Math.max(5, Math.min(100 - newX, dragStartRef.current.boxW + deltaXPercent));
        const potentialH = dragStartRef.current.boxH - deltaYPercent;
        if (potentialH >= 5 && dragStartRef.current.boxY + deltaYPercent >= 0) {
          newY = dragStartRef.current.boxY + deltaYPercent;
          newH = potentialH;
        }
      } else if (dragMode === 'nw') {
        const potentialW = dragStartRef.current.boxW - deltaXPercent;
        if (potentialW >= 5 && dragStartRef.current.boxX + deltaXPercent >= 0) {
          newX = dragStartRef.current.boxX + deltaXPercent;
          newW = potentialW;
        }
        const potentialH = dragStartRef.current.boxH - deltaYPercent;
        if (potentialH >= 5 && dragStartRef.current.boxY + deltaYPercent >= 0) {
          newY = dragStartRef.current.boxY + deltaYPercent;
          newH = potentialH;
        }
      }

      onUpdateBlurKeyframe(selectedClip.id, currentTime - selectedClip.start, {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
        width: Math.round(newW * 10) / 10,
        height: Math.round(newH * 10) / 10,
      });
    };

    const handleMouseUp = () => {
      setIsDraggingBlur(false);
      setDragMode(null);
    };

    if (isDraggingBlur) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingBlur, dragMode, activeKf, selectedClip, currentTime, onUpdateBlurKeyframe]);

  // Video Clip Transform Gizmo Handlers
  const handleTransformMouseDown = (e, mode) => {
    e.stopPropagation();
    if (!isVideoClipSelected || !selectedClip || !onUpdateClip) return;

    const currentTransform = selectedClip.transform || { x: 0, y: 0, scale: 1 };
    setIsDraggingTransform(true);
    setTransformDragMode(mode);
    transformDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentTransform.x || 0,
      initialY: currentTransform.y || 0,
      initialScale: currentTransform.scale || 1,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingTransform || !transformDragMode || !selectedClip || !onUpdateClip || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaScreenX = e.clientX - transformDragRef.current.startX;
      const deltaScreenY = e.clientY - transformDragRef.current.startY;
      const currentTransform = selectedClip.transform || { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, fitMode: 'contain' };

      if (transformDragMode === 'move') {
        // Map container pixel movement to canvas percentage offset (internal canvas coordinate scaling)
        const scaleFactorX = 1920 / rect.width;
        const scaleFactorY = 1080 / rect.height;
        const newX = Math.round((transformDragRef.current.initialX + deltaScreenX * scaleFactorX) * 10) / 10;
        const newY = Math.round((transformDragRef.current.initialY + deltaScreenY * scaleFactorY) * 10) / 10;

        onUpdateClip(selectedClip.id, {
          transform: {
            ...currentTransform,
            x: newX,
            y: newY,
          },
        });
      } else if (transformDragMode === 'scale') {
        const distDelta = Math.sqrt(deltaScreenX * deltaScreenX + deltaScreenY * deltaScreenY);
        const sign = deltaScreenX + deltaScreenY > 0 ? 1 : -1;
        const scaleDelta = (distDelta * sign) / (rect.width * 0.5);
        const newScale = Math.max(0.1, Math.min(3.0, Math.round((transformDragRef.current.initialScale + scaleDelta) * 100) / 100));

        onUpdateClip(selectedClip.id, {
          transform: {
            ...currentTransform,
            scale: newScale,
          },
        });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTransform(false);
      setTransformDragMode(null);
    };

    if (isDraggingTransform) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTransform, transformDragMode, selectedClip, onUpdateClip]);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: '#0d0d10',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Program Monitor Viewport */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        overflow: 'hidden',
        background: '#08080a',
        position: 'relative',
      }}>
        {/* Aspect Ratio Box Container */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            aspectRatio: `${aspectRatioConfig.width} / ${aspectRatioConfig.height}`,
            maxHeight: '100%',
            maxWidth: '100%',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.9)',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #202026',
            transform: zoomLevel === 'fit' ? 'none' : `scale(${parseFloat(zoomLevel)})`,
            transition: 'transform 0.12s ease-out',
          }}
        >
          {/* Main Video Canvas */}
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'contain',
              background: '#000',
            }}
          />

          {/* Technical Motion-Tracking Mask Gizmo (DaVinci/Premiere Tracker Style, No Purple Glow) */}
          {isBlurClipSelected && isClipActiveAtPlayhead && activeKf && (
            <div
              style={{
                position: 'absolute',
                top: `${activeKf.y}%`,
                left: `${activeKf.x}%`,
                width: `${activeKf.width}%`,
                height: `${activeKf.height}%`,
                border: '1.5px solid #f59e0b',
                boxSizing: 'border-box',
                cursor: 'move',
                zIndex: 30,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
              {/* Center Crosshair Target */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#f59e0b',
                opacity: 0.8,
                pointerEvents: 'none',
              }}>
                <Crosshair size={14} />
              </div>

              {/* Technical Top Coordinate Badge */}
              <div style={{
                position: 'absolute',
                top: -20,
                left: 0,
                background: '#18181c',
                border: '1px solid #d97706',
                color: '#fbbf24',
                fontSize: 9,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                padding: '1px 5px',
                borderRadius: 2,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 2px 4px rgba(0,0,0,0.7)',
              }}>
                <Target size={10} />
                <span>MASK [X: {Math.round(activeKf.x)}% Y: {Math.round(activeKf.y)}%]</span>
              </div>

              {/* Square Technical Corner Handles */}
              {[
                { mode: 'nw', top: -4, left: -4, cursor: 'nwse-resize' },
                { mode: 'ne', top: -4, right: -4, cursor: 'nesw-resize' },
                { mode: 'se', bottom: -4, right: -4, cursor: 'nwse-resize' },
                { mode: 'sw', bottom: -4, left: -4, cursor: 'nesw-resize' },
              ].map((h, i) => (
                <div
                  key={i}
                  onMouseDown={(e) => handleMouseDown(e, h.mode)}
                  style={{
                    position: 'absolute',
                    top: h.top,
                    bottom: h.bottom,
                    left: h.left,
                    right: h.right,
                    width: 7,
                    height: 7,
                    background: '#ffffff',
                    border: '1px solid #18181b',
                    cursor: h.cursor,
                  }}
                />
              ))}
            </div>
          )}

          {/* Interactive Transform Bounding Box for Video & Overlay Clips */}
          {isVideoClipSelected && isClipActiveAtPlayhead && !isBlurClipSelected && (
            (() => {
              const currentTransform = selectedClip.transform || { x: 0, y: 0, scale: 1 };
              const currentScale = currentTransform.scale || 1;
              const leftPercent = 50 + (currentTransform.x || 0) / 19.2;
              const topPercent = 50 + (currentTransform.y || 0) / 10.8;
              const boxWPercent = Math.min(100, 70 * currentScale);
              const boxHPercent = Math.min(100, 70 * currentScale);

              return (
                <div
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${boxWPercent}%`,
                    height: `${boxHPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    border: '1.5px dashed rgba(59, 130, 246, 0.85)',
                    boxSizing: 'border-box',
                    cursor: isDraggingTransform ? 'grabbing' : 'grab',
                    zIndex: 28,
                    pointerEvents: 'auto',
                  }}
                  onMouseDown={(e) => handleTransformMouseDown(e, 'move')}
                >
                  {/* Center Drag Crosshair */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#60a5fa',
                    opacity: 0.9,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Crosshair size={16} />
                  </div>

                  {/* Transform Info Badge */}
                  <div style={{
                    position: 'absolute',
                    top: -22,
                    left: 0,
                    background: '#111827',
                    border: '1px solid #2563eb',
                    color: '#93c5fd',
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    padding: '1px 6px',
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.7)',
                    pointerEvents: 'none',
                  }}>
                    <Target size={10} />
                    <span>{selectedClip.name.slice(0, 14)} [Scale: {Math.round(currentScale * 100)}%]</span>
                  </div>

                  {/* 4 Corner Scaling Handles */}
                  {[
                    { mode: 'scale', top: -5, left: -5, cursor: 'nwse-resize' },
                    { mode: 'scale', top: -5, right: -5, cursor: 'nesw-resize' },
                    { mode: 'scale', bottom: -5, right: -5, cursor: 'nwse-resize' },
                    { mode: 'scale', bottom: -5, left: -5, cursor: 'nesw-resize' },
                  ].map((h, i) => (
                    <div
                      key={i}
                      onMouseDown={(e) => handleTransformMouseDown(e, h.mode)}
                      style={{
                        position: 'absolute',
                        top: h.top,
                        bottom: h.bottom,
                        left: h.left,
                        right: h.right,
                        width: 8,
                        height: 8,
                        background: '#3b82f6',
                        border: '1.5px solid #ffffff',
                        cursor: h.cursor,
                        zIndex: 29,
                        borderRadius: 1,
                      }}
                    />
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Transport Controls Bar (Matte Studio Dark) */}
      <div style={{
        height: 46,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 20,
      }}>
        {/* Left: Timecode Readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            background: '#101013',
            border: '1px solid #282832',
            padding: '4px 8px',
            borderRadius: 3,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.8px',
            color: '#e2e8f0',
          }}>
            <span style={{ color: '#38bdf8' }}>{formatTimecode(currentTime)}</span>
            <span style={{ color: '#475569', margin: '0 5px' }}>|</span>
            <span style={{ color: '#94a3b8' }}>{formatTimecode(duration)}</span>
          </div>

          {/* Quick Keyframe button if blur selected */}
          {isBlurClipSelected && (
            <button
              onClick={onAddKeyframeAtPlayhead}
              style={{
                background: '#241a0e',
                border: '1px solid #b45309',
                color: '#fbbf24',
                padding: '4px 7px',
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              title="Add Tracking Keyframe at Current Time"
            >
              <Key size={11} />
              <span>+ Keyframe</span>
            </button>
          )}
        </div>

        {/* Center: Playback Transport Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => onSeek(0)}
            title="Jump to Start (Home)"
            style={{
              padding: '6px 7px',
              borderRadius: 3,
              background: '#1e1e24',
              border: '1px solid #2e2e38',
              color: '#94a3b8',
            }}
          >
            <SkipBack size={13} />
          </button>

          <button
            onClick={() => onStepFrame(-1)}
            title="Step Back 1 Frame (←)"
            style={{
              padding: '6px 7px',
              borderRadius: 3,
              background: '#1e1e24',
              border: '1px solid #2e2e38',
              color: '#94a3b8',
            }}
          >
            <ChevronLeft size={14} />
          </button>

          {/* Play / Pause - Solid Workstation Button */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              background: '#2563eb',
              border: '1px solid #3b82f6',
              color: '#ffffff',
            }}
          >
            {isPlaying ? <Pause size={15} fill="#ffffff" /> : <Play size={15} fill="#ffffff" style={{ marginLeft: 2 }} />}
          </button>

          <button
            onClick={() => onStepFrame(1)}
            title="Step Forward 1 Frame (→)"
            style={{
              padding: '6px 7px',
              borderRadius: 3,
              background: '#1e1e24',
              border: '1px solid #2e2e38',
              color: '#94a3b8',
            }}
          >
            <ChevronRight size={14} />
          </button>

          <button
            onClick={() => onSeek(duration)}
            title="Jump to End (End)"
            style={{
              padding: '6px 7px',
              borderRadius: 3,
              background: '#1e1e24',
              border: '1px solid #2e2e38',
              color: '#94a3b8',
            }}
          >
            <SkipForward size={13} />
          </button>
        </div>

        {/* Right: Viewport Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(e.target.value)}
            style={{
              background: '#18181e',
              border: '1px solid #282832',
              color: '#94a3b8',
              padding: '3px 6px',
              borderRadius: 3,
              fontSize: 11,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="fit">Fit (Auto)</option>
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.5">150%</option>
          </select>
        </div>
      </div>
    </div>
  );
}
