import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Scissors,
  Trash2,
  Copy,
  Magnet,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Key,
  Plus,
  Layers,
  Clock,
} from 'lucide-react';
import { formatSecondsOnly, formatTimecode } from '../types/defaults';

export function Timeline({
  tracks,
  currentTime,
  duration,
  durationMode = 'auto',
  setDurationMode,
  customDuration = 30,
  setCustomDuration,
  maxClipEndTime = 0,
  onSeek,
  selectedClipId,
  onSelectClip,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onUpdateClip,
  onMoveClipToTrack,
  onAddTrack,
  onDeleteTrack,
  onToggleMuteTrack,
  onToggleLockTrack,
  pxPerSecond = 55,
  setPxPerSecond,
}) {
  const rulerScrollRef = useRef(null);
  const lanesScrollRef = useRef(null);
  const headersScrollRef = useRef(null);
  const trackLaneRefs = useRef(new Map());

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragInfo, setDragInfo] = useState(null); // { mode, clipId, sourceTrackId, targetTrackId, startX, startY, initStart, initDuration, initOffset, clipType }
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);

  // Collect all cut points for magnetic snapping
  const snapTargets = useMemo(() => {
    const points = [0, duration];
    for (const t of tracks) {
      for (const c of t.clips) {
        points.push(c.start);
        points.push(c.start + c.duration);
      }
    }
    return Array.from(new Set(points.map((p) => Math.round(p * 100) / 100)));
  }, [tracks, duration]);

  // Time conversion helper from any mouse clientX
  const clientXToTime = useCallback(
    (clientX, applySnap = true) => {
      if (!lanesScrollRef.current) return 0;
      const rect = lanesScrollRef.current.getBoundingClientRect();
      const scrollLeft = lanesScrollRef.current.scrollLeft;
      const x = clientX - rect.left + scrollLeft;
      let time = Math.max(0, Math.min(duration, x / pxPerSecond));

      if (applySnap && snapEnabled) {
        const snapThreshold = 8 / pxPerSecond;
        for (const pt of snapTargets) {
          if (Math.abs(time - pt) < snapThreshold) {
            time = pt;
            break;
          }
        }
      }
      return Math.round(time * 1000) / 1000;
    },
    [duration, pxPerSecond, snapEnabled, snapTargets]
  );

  // Synchronize vertical scroll between left headers and right lanes, and horizontal scroll with ruler
  const handleLanesScroll = (e) => {
    if (headersScrollRef.current) {
      headersScrollRef.current.scrollTop = e.target.scrollTop;
    }
    if (rulerScrollRef.current) {
      rulerScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleHeadersScroll = (e) => {
    if (lanesScrollRef.current) {
      lanesScrollRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleRulerScroll = (e) => {
    if (lanesScrollRef.current) {
      lanesScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Start scrubbing from ruler
  const handleRulerMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsScrubbing(true);
    const newTime = clientXToTime(e.clientX, snapEnabled);
    onSeek(newTime);
  };

  // Start scrubbing from playhead line or handle
  const handlePlayheadMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setIsScrubbing(true);
    const newTime = clientXToTime(e.clientX, snapEnabled);
    onSeek(newTime);
  };

  // Start scrubbing when clicking on empty lanes area / background
  const handleLanesMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.timeline-clip-item')) return;
    setIsScrubbing(true);
    const newTime = clientXToTime(e.clientX, snapEnabled);
    onSeek(newTime);
  };

  // Mouse move handler for timeline scrubbing and horizontal/vertical cross-track dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isScrubbing) {
        onSeek(clientXToTime(e.clientX, snapEnabled));
      } else if (dragInfo) {
        const deltaX = e.clientX - dragInfo.startX;
        const deltaTime = deltaX / pxPerSecond;

        if (dragInfo.mode === 'move') {
          let newStart = Math.max(0, dragInfo.initStart + deltaTime);

          // Magnetic snap
          if (snapEnabled) {
            const snapThreshold = 8 / pxPerSecond;
            for (const pt of snapTargets) {
              if (Math.abs(newStart - pt) < snapThreshold) {
                newStart = pt;
                break;
              }
            }
          }

          // Detect which track is under the cursor (cross-track dragging)
          let hoveredTrackId = dragInfo.sourceTrackId;
          for (const [trackId, el] of trackLaneRefs.current.entries()) {
            if (el) {
              const rect = el.getBoundingClientRect();
              if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const targetTrack = tracks.find((t) => t.id === trackId);
                // Allow moving if track types match (e.g. video to video, audio to audio)
                if (targetTrack && targetTrack.type === dragInfo.clipType && !targetTrack.locked) {
                  hoveredTrackId = trackId;
                }
                break;
              }
            }
          }

          setDragInfo((prev) => (prev ? { ...prev, currentStart: newStart, targetTrackId: hoveredTrackId } : null));

          // Real-time update on same track
          if (hoveredTrackId === dragInfo.sourceTrackId) {
            onUpdateClip(dragInfo.clipId, { start: Math.round(newStart * 100) / 100 });
          }

        } else if (dragInfo.mode === 'trim-left') {
          const maxDelta = dragInfo.initDuration - 0.2;
          const boundedDelta = Math.min(maxDelta, deltaTime);
          let newStart = Math.max(0, dragInfo.initStart + boundedDelta);
          let newDuration = dragInfo.initDuration - boundedDelta;
          let newOffset = (dragInfo.initOffset || 0) + boundedDelta;

          onUpdateClip(dragInfo.clipId, {
            start: Math.round(newStart * 100) / 100,
            duration: Math.round(newDuration * 100) / 100,
            offset: Math.max(0, Math.round(newOffset * 100) / 100),
          });

        } else if (dragInfo.mode === 'trim-right') {
          let newDuration = Math.max(0.2, dragInfo.initDuration + deltaTime);
          onUpdateClip(dragInfo.clipId, {
            duration: Math.round(newDuration * 100) / 100,
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (dragInfo && dragInfo.mode === 'move') {
        const finalStart = dragInfo.currentStart ?? dragInfo.initStart;
        if (dragInfo.targetTrackId && dragInfo.targetTrackId !== dragInfo.sourceTrackId && onMoveClipToTrack) {
          onMoveClipToTrack(dragInfo.clipId, dragInfo.targetTrackId, finalStart);
        } else {
          onUpdateClip(dragInfo.clipId, { start: Math.round(finalStart * 100) / 100 });
        }
      }

      setIsScrubbing(false);
      setDragInfo(null);
    };

    if (isScrubbing || dragInfo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      if (isScrubbing) {
        document.body.style.cursor = 'ew-resize';
      }
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isScrubbing, dragInfo, pxPerSecond, duration, snapEnabled, onSeek, onUpdateClip, onMoveClipToTrack, tracks, snapTargets, clientXToTime]);

  const timelineWidth = Math.max(1400, (duration + 8) * pxPerSecond);

  const rulerTicks = [];
  const stepSeconds = pxPerSecond > 80 ? 1 : pxPerSecond > 35 ? 2 : 5;
  for (let s = 0; s <= duration + 8; s += stepSeconds) {
    rulerTicks.push(s);
  }

  const videoTrackCount = tracks.filter((t) => t.type === 'video').length;
  const audioTrackCount = tracks.filter((t) => t.type === 'audio').length;

  return (
    <div style={{
      height: 290,
      minHeight: 290,
      background: 'var(--bg-timeline)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
    }}>
      {/* 1. Timeline Workstation Toolbar */}
      <div style={{
        height: 36,
        background: '#141418',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        flexShrink: 0,
      }}>
        {/* Left Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Split (Razor) Tool */}
          <button
            onClick={onSplitClip}
            disabled={!selectedClipId}
            title="Razor Split Selected Clip at Playhead (S)"
            style={{
              padding: '4px 8px',
              borderRadius: 3,
              background: selectedClipId ? '#242430' : '#18181e',
              color: selectedClipId ? '#f8fafc' : '#52525b',
              fontSize: 11,
              fontWeight: 600,
              border: selectedClipId ? '1px solid #3d3d50' : '1px solid #22222a',
            }}
          >
            <Scissors size={12} color={selectedClipId ? '#60a5fa' : '#52525b'} />
            <span>Razor (S)</span>
          </button>

          {/* Delete Tool */}
          <button
            onClick={() => onDeleteClip(selectedClipId)}
            disabled={!selectedClipId}
            title="Delete Selected Clip (Del)"
            style={{
              padding: '4px 8px',
              borderRadius: 3,
              background: '#18181e',
              border: '1px solid #22222a',
              color: selectedClipId ? '#f87171' : '#52525b',
              fontSize: 11,
            }}
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>

          {/* Duplicate Tool */}
          <button
            onClick={onDuplicateClip}
            disabled={!selectedClipId}
            title="Duplicate Clip (Ctrl+D)"
            style={{
              padding: '4px 8px',
              borderRadius: 3,
              background: '#18181e',
              border: '1px solid #22222a',
              color: selectedClipId ? '#e2e8f0' : '#52525b',
              fontSize: 11,
            }}
          >
            <Copy size={12} />
            <span>Duplicate</span>
          </button>

          <div style={{ width: 1, height: 16, background: '#25252e', margin: '0 3px' }} />

          {/* Magnetic Snapping */}
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            title="Magnetic Snapping (N)"
            style={{
              padding: '4px 7px',
              borderRadius: 3,
              background: snapEnabled ? '#202028' : '#18181e',
              border: snapEnabled ? '1px solid #383846' : '1px solid #22222a',
              color: snapEnabled ? '#38bdf8' : '#52525b',
              fontSize: 11,
            }}
          >
            <Magnet size={12} />
            <span>Snap</span>
          </button>

          <div style={{ width: 1, height: 16, background: '#25252e', margin: '0 3px' }} />

          {/* Direct + Video Layer Button */}
          <button
            onClick={() => onAddTrack && onAddTrack('video')}
            title="Add a new Video Layer (V...)"
            style={{
              padding: '4px 8px',
              borderRadius: 3,
              background: '#1a233a',
              border: '1px solid #2b4374',
              color: '#93c5fd',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={11} color="#60a5fa" />
            <span>+ Video Layer</span>
          </button>

          {/* Direct + Audio Track Button */}
          <button
            onClick={() => onAddTrack && onAddTrack('audio')}
            title="Add a new Audio Track (A...)"
            style={{
              padding: '4px 8px',
              borderRadius: 3,
              background: '#132820',
              border: '1px solid #1a533f',
              color: '#6ee7b7',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={11} color="#34d399" />
            <span>+ Audio Track</span>
          </button>
        </div>

        {/* Right Tools: Duration Mode & Timeline Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Sequence Duration Badge & Popover */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setDurationPopoverOpen(!durationPopoverOpen)}
              style={{
                background: '#191920',
                border: '1px solid #2e2e3a',
                borderRadius: 3,
                padding: '3px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
              title="Sequence Duration Settings (Auto-fit to video or Custom Length)"
            >
              <Clock size={11} color="#94a3b8" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{duration}s</span>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 2,
                background: durationMode === 'auto' ? '#1e3a8a' : '#78350f',
                color: durationMode === 'auto' ? '#93c5fd' : '#fcd34d',
              }}>
                {durationMode === 'auto' ? 'AUTO' : 'CUSTOM'}
              </span>
            </button>

            {durationPopoverOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: 0,
                  marginBottom: 6,
                  background: '#16161b',
                  border: '1px solid #32323e',
                  borderRadius: 6,
                  padding: 10,
                  minWidth: 260,
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Sequence Duration Mode
                </div>

                {/* Mode Toggle Buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setDurationMode && setDurationMode('auto')}
                    style={{
                      flex: 1,
                      padding: '5px 4px',
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: durationMode === 'auto' ? 700 : 500,
                      background: durationMode === 'auto' ? '#1d4ed8' : '#202028',
                      color: durationMode === 'auto' ? '#ffffff' : '#94a3b8',
                      border: durationMode === 'auto' ? '1px solid #3b82f6' : '1px solid #2e2e38',
                      textAlign: 'center',
                    }}
                  >
                    Auto (Fit Video)
                  </button>
                  <button
                    onClick={() => setDurationMode && setDurationMode('custom')}
                    style={{
                      flex: 1,
                      padding: '5px 4px',
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: durationMode === 'custom' ? 700 : 500,
                      background: durationMode === 'custom' ? '#d97706' : '#202028',
                      color: durationMode === 'custom' ? '#ffffff' : '#94a3b8',
                      border: durationMode === 'custom' ? '1px solid #f59e0b' : '1px solid #2e2e38',
                      textAlign: 'center',
                    }}
                  >
                    Custom Length
                  </button>
                </div>

                {durationMode === 'auto' ? (
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, padding: '2px 0' }}>
                    Length automatically matches video: <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{maxClipEndTime > 0 ? `${maxClipEndTime}s` : '10s (Empty)'}</span>.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="number"
                        min="1"
                        max="3600"
                        step="0.5"
                        value={customDuration}
                        onChange={(e) => setCustomDuration && setCustomDuration(Math.max(1, parseFloat(e.target.value) || 1))}
                        style={{
                          flex: 1,
                          background: '#101014',
                          border: '1px solid #383848',
                          color: '#f8fafc',
                          padding: '4px 8px',
                          borderRadius: 3,
                          fontSize: 12,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>seconds</span>
                    </div>

                    {/* Quick Presets */}
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[5, 10, 15, 30, 60].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => setCustomDuration && setCustomDuration(sec)}
                          style={{
                            flex: 1,
                            padding: '3px 0',
                            borderRadius: 2,
                            background: customDuration === sec ? '#2c2c38' : '#191920',
                            border: customDuration === sec ? '1px solid #4a4a5e' : '1px solid #282832',
                            color: customDuration === sec ? '#f8fafc' : '#71717a',
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 16, background: '#25252e' }} />

          {/* Timeline Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <button
              onClick={() => setPxPerSecond(Math.max(15, pxPerSecond - 10))}
              style={{ color: '#71717a', padding: 3 }}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <input
              type="range"
              min="15"
              max="150"
              value={pxPerSecond}
              onChange={(e) => setPxPerSecond(parseInt(e.target.value))}
              style={{ width: 80 }}
            />
            <button
              onClick={() => setPxPerSecond(Math.min(150, pxPerSecond + 10))}
              style={{ color: '#71717a', padding: 3 }}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sticky Header Top Bar: Spacer (Left) + Time Ruler (Right) */}
      <div style={{
        height: 28,
        background: '#111114',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        {/* Left header spacer */}
        <div style={{
          width: 140,
          minWidth: 140,
          borderRight: '1px solid var(--border-subtle)',
          background: '#111114',
          fontSize: 9,
          fontWeight: 700,
          color: '#52525b',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}>
          Layers ({tracks.length})
        </div>

        {/* Right synchronized time ruler with scrollable content */}
        <div
          ref={rulerScrollRef}
          onMouseDown={handleRulerMouseDown}
          onScroll={handleRulerScroll}
          style={{
            flex: 1,
            overflowX: 'hidden',
            overflowY: 'hidden',
            position: 'relative',
            cursor: 'ew-resize',
            background: '#111114',
          }}
          title="Click or drag anywhere in the time ruler to scrub"
        >
          <div style={{
            width: timelineWidth,
            height: '100%',
            position: 'relative',
          }}>
            {/* Ruler Ticks */}
            {rulerTicks.map((sec) => (
              <div
                key={sec}
                style={{
                  position: 'absolute',
                  left: sec * pxPerSecond,
                  top: 0,
                  bottom: 0,
                  borderLeft: '1px solid #282832',
                  paddingLeft: 3,
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  color: '#64748b',
                  lineHeight: '28px',
                  pointerEvents: 'none',
                }}
              >
                {sec}s
              </div>
            ))}

            {/* Ruler Playhead Marker & Grab Handle */}
            <div
              onMouseDown={handlePlayheadMouseDown}
              style={{
                position: 'absolute',
                top: 0,
                left: currentTime * pxPerSecond,
                transform: 'translateX(-50%)',
                zIndex: 50,
                cursor: 'ew-resize',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'auto',
              }}
              title={`Playhead: ${formatTimecode(currentTime)} (Click or drag to scrub)`}
            >
              {/* Wide Invisible Grab Hitbox */}
              <div style={{
                position: 'absolute',
                top: 0,
                width: 32,
                height: 28,
                cursor: 'ew-resize',
              }} />

              {/* Amber Badge */}
              <div style={{
                background: isScrubbing ? '#fbbf24' : '#f59e0b',
                color: '#18181b',
                fontSize: 9,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                padding: '1px 5px',
                borderRadius: '3px 3px 0 0',
                boxShadow: isScrubbing
                  ? '0 0 10px rgba(245, 158, 11, 0.9), 0 2px 4px rgba(0,0,0,0.8)'
                  : '0 2px 5px rgba(0,0,0,0.8)',
                border: '1px solid #78350f',
                userSelect: 'none',
                lineHeight: 1.3,
                transition: 'background 0.1s, box-shadow 0.1s',
              }}>
                {formatTimecode(currentTime)}
              </div>

              {/* Triangle pointer */}
              <div style={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: isScrubbing ? '6px solid #fbbf24' : '6px solid #f59e0b',
                transition: 'border-top-color 0.1s',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Synchronized Scrollable Tracks View (Headers on Left + Lanes on Right) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Track Headers (Scrollable with lanes) */}
        <div
          ref={headersScrollRef}
          onScroll={handleHeadersScroll}
          onWheel={(e) => {
            if (lanesScrollRef.current) {
              lanesScrollRef.current.scrollTop += e.deltaY;
            }
          }}
          style={{
            width: 140,
            minWidth: 140,
            background: '#131316',
            borderRight: '1px solid var(--border-subtle)',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            flexShrink: 0,
          }}
        >
          {tracks.map((track) => {
            const isHoverTarget = dragInfo?.targetTrackId === track.id && dragInfo?.sourceTrackId !== track.id;
            const canDelete =
              (track.type === 'video' && videoTrackCount > 1 && track.id !== 'track-v1') ||
              (track.type === 'audio' && audioTrackCount > 1 && track.id !== 'track-a1');

            return (
              <div
                key={track.id}
                style={{
                  height: track.height || 40,
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  background: isHoverTarget ? '#1e2438' : '#141418',
                  transition: 'background 0.1s',
                }}
              >
                {/* Track Code & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: '#e2e8f0',
                    background: track.type === 'video' ? '#1e3a8a' : track.type === 'audio' ? '#065f46' : '#22222a',
                    border: '1px solid #32323e',
                    padding: '1px 4px',
                    borderRadius: 2,
                  }}>
                    {track.code || track.name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.name.replace(/^[A-Z0-9]+\s*/, '')}
                  </span>
                </div>

                {/* Controls (Mute, Lock, Delete) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    onClick={() => onToggleMuteTrack(track.id)}
                    title={track.muted ? 'Unmute Track' : 'Mute Track'}
                    style={{ color: track.muted ? '#ef4444' : '#52525b', padding: 2 }}
                  >
                    {track.type === 'video' || track.type === 'blur' || track.type === 'text' ? (
                      track.muted ? <EyeOff size={11} /> : <Eye size={11} />
                    ) : (
                      track.muted ? <VolumeX size={11} /> : <Volume2 size={11} />
                    )}
                  </button>

                  <button
                    onClick={() => onToggleLockTrack(track.id)}
                    title={track.locked ? 'Unlock Track' : 'Lock Track'}
                    style={{ color: track.locked ? '#f59e0b' : '#52525b', padding: 2 }}
                  >
                    {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
                  </button>

                  {canDelete && onDeleteTrack && (
                    <button
                      onClick={() => onDeleteTrack(track.id)}
                      title="Delete this Layer"
                      style={{ color: '#64748b', padding: 2 }}
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Scrollable Timeline Lanes (Both X and Y scroll enabled!) */}
        <div
          ref={lanesScrollRef}
          onScroll={handleLanesScroll}
          onMouseDown={handleLanesMouseDown}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'auto',
            position: 'relative',
            background: 'var(--bg-timeline)',
            cursor: isScrubbing ? 'ew-resize' : 'crosshair',
          }}
          title="Click or drag anywhere in the timeline lanes to position the playhead"
        >
          <div style={{ width: timelineWidth, position: 'relative', minHeight: '100%' }}>
            {/* Track Lanes */}
            <div style={{ position: 'relative' }}>
              {tracks.map((track) => {
                const isHoverTarget = dragInfo?.targetTrackId === track.id && dragInfo?.sourceTrackId !== track.id;

                return (
                  <div
                    key={track.id}
                    ref={(el) => {
                      if (el) trackLaneRefs.current.set(track.id, el);
                      else trackLaneRefs.current.delete(track.id);
                    }}
                    style={{
                      height: track.height || 40,
                      borderBottom: '1px solid #1c1c22',
                      position: 'relative',
                      background: track.locked
                        ? 'rgba(0,0,0,0.4)'
                        : isHoverTarget
                        ? '#1a233a'
                        : '#141418',
                      boxShadow: isHoverTarget ? 'inset 0 0 0 1.5px #3b82f6' : 'none',
                      transition: 'background 0.1s, box-shadow 0.1s',
                    }}
                  >
                    {/* Clips on this track */}
                    {track.clips.map((clip) => {
                      const isSelected = selectedClipId === clip.id;
                      const isBeingDragged = dragInfo?.clipId === clip.id;
                      const displayStart = isBeingDragged && dragInfo.currentStart !== undefined ? dragInfo.currentStart : clip.start;
                      const clipLeft = displayStart * pxPerSecond;
                      const clipWidth = Math.max(10, clip.duration * pxPerSecond);

                      return (
                        <div
                          key={clip.id}
                          className="timeline-clip-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClip(clip.id);
                          }}
                          onMouseDown={(e) => {
                            if (track.locked) return;
                            e.stopPropagation();
                            onSelectClip(clip.id);
                            setDragInfo({
                              mode: 'move',
                              clipId: clip.id,
                              sourceTrackId: track.id,
                              targetTrackId: track.id,
                              clipType: track.type,
                              startX: e.clientX,
                              startY: e.clientY,
                              initStart: clip.start,
                              initDuration: clip.duration,
                              initOffset: clip.offset || 0,
                              currentStart: clip.start,
                            });
                          }}
                          style={{
                            position: 'absolute',
                            left: clipLeft,
                            width: clipWidth,
                            top: 3,
                            bottom: 3,
                            borderRadius: 2,
                            background: track.color || '#1e3a8a',
                            border: isSelected ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                            boxShadow: isSelected ? '0 0 0 1px #3b82f6' : '0 1px 2px rgba(0,0,0,0.5)',
                            cursor: track.locked ? 'not-allowed' : 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 6px',
                            overflow: 'hidden',
                            userSelect: 'none',
                            zIndex: isSelected ? 5 : 2,
                            opacity: isBeingDragged ? 0.9 : 1,
                          }}
                        >
                          {/* Left Trim Handle */}
                          {!track.locked && (
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onSelectClip(clip.id);
                                setDragInfo({
                                  mode: 'trim-left',
                                  clipId: clip.id,
                                  sourceTrackId: track.id,
                                  targetTrackId: track.id,
                                  clipType: track.type,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  initStart: clip.start,
                                  initDuration: clip.duration,
                                  initOffset: clip.offset || 0,
                                });
                              }}
                              style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 6,
                                cursor: 'ew-resize',
                                background: isSelected ? '#ffffff' : 'transparent',
                              }}
                            />
                          )}

                          {/* Clip Label */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#f8fafc',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            pointerEvents: 'none',
                          }}>
                            {track.type === 'blur' ? <Key size={10} color="#f59e0b" /> : null}
                            <span>{clip.name}</span>
                            <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                              [{formatSecondsOnly(clip.duration)}]
                            </span>
                          </div>

                          {/* Keyframe Diamonds for Blur Track */}
                          {track.type === 'blur' && (clip.keyframes || []).map((kf) => (
                            <div
                              key={kf.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSeek(clip.start + kf.time);
                              }}
                              title={`Jump to Keyframe at ${(clip.start + kf.time).toFixed(2)}s`}
                              style={{
                                position: 'absolute',
                                left: `${(kf.time / clip.duration) * 100}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%) rotate(45deg)',
                                width: 7,
                                height: 7,
                                background: '#f59e0b',
                                border: '1px solid #78350f',
                                cursor: 'pointer',
                                zIndex: 10,
                              }}
                            />
                          ))}

                          {/* Right Trim Handle */}
                          {!track.locked && (
                            <div
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onSelectClip(clip.id);
                                setDragInfo({
                                  mode: 'trim-right',
                                  clipId: clip.id,
                                  sourceTrackId: track.id,
                                  targetTrackId: track.id,
                                  clipType: track.type,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  initStart: clip.start,
                                  initDuration: clip.duration,
                                  initOffset: clip.offset || 0,
                                });
                              }}
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 6,
                                cursor: 'ew-resize',
                                background: isSelected ? '#ffffff' : 'transparent',
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Amber Playhead Full-Height Track Line (Draggable & Clickable) */}
            <div
              onMouseDown={handlePlayheadMouseDown}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: currentTime * pxPerSecond,
                transform: 'translateX(-50%)',
                width: 14,
                cursor: 'ew-resize',
                zIndex: 40,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'auto',
              }}
              title={`Playhead: ${formatTimecode(currentTime)} (Click or drag to move)`}
            >
              {/* Visible Amber Line */}
              <div style={{
                width: isScrubbing ? 2.5 : 1.5,
                height: '100%',
                background: isScrubbing ? '#fbbf24' : '#f59e0b',
                boxShadow: isScrubbing
                  ? '0 0 8px rgba(245, 158, 11, 0.9), 0 0 2px #f59e0b'
                  : '0 0 3px rgba(0,0,0,0.8)',
                transition: 'width 0.1s, background 0.1s, box-shadow 0.1s',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
