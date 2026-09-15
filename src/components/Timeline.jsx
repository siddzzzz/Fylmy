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
  Upload,
  FileVideo,
  FolderOpen,
  Maximize2,
  Minimize2,
  GripHorizontal,
  Bookmark,
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
  onAddClipToTimeline,
  onImportAndAddClip,
  onImportFiles,
  pxPerSecond = 55,
  setPxPerSecond,
  timelineHeight = 290,
  setTimelineHeight,
  mediaAssets = [],
  markers = [],
  onAddMarker,
  onDeleteMarker,
}) {
  const rulerScrollRef = useRef(null);
  const lanesScrollRef = useRef(null);
  const headersScrollRef = useRef(null);
  const trackLaneRefs = useRef(new Map());

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const [dragInfo, setDragInfo] = useState(null); // { mode, clipId, sourceTrackId, targetTrackId, startX, startY, initStart, initDuration, initOffset, clipType }
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [activeSnapGuideTime, setActiveSnapGuideTime] = useState(null);
  const [durationPopoverOpen, setDurationPopoverOpen] = useState(false);
  const [dropTargetTrackId, setDropTargetTrackId] = useState(null);
  const [dropTargetTime, setDropTargetTime] = useState(0);

  // Start vertical height resize dragging
  const startVerticalResize = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsResizingHeight(true);
    const startY = e.clientY;
    const startH = timelineHeight;

    const onMove = (moveEv) => {
      const deltaY = startY - moveEv.clientY; // dragging up increases height
      const newHeight = Math.max(180, Math.min(window.innerHeight * 0.75, startH + deltaY));
      if (setTimelineHeight) {
        setTimelineHeight(Math.round(newHeight));
      }
    };

    const onUp = () => {
      setIsResizingHeight(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Collect all cut points, playhead, markers, and boundaries for magnetic snapping
  const snapTargets = useMemo(() => {
    const points = [0, duration, currentTime];
    for (const t of tracks) {
      for (const c of t.clips) {
        points.push(c.start);
        points.push(c.start + c.duration);
      }
    }
    for (const m of markers) {
      points.push(m.time);
    }
    return Array.from(new Set(points.map((p) => Math.round(p * 100) / 100)));
  }, [tracks, duration, currentTime, markers]);

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
          let snappedPoint = null;

          // Magnetic snap (checks start edge, end edge, and playhead)
          if (snapEnabled) {
            const snapThreshold = 10 / pxPerSecond;
            // 1. Check clip start edge
            for (const pt of snapTargets) {
              if (Math.abs(newStart - pt) < snapThreshold) {
                newStart = pt;
                snappedPoint = pt;
                break;
              }
            }
            // 2. Check clip end edge if start didn't snap
            if (snappedPoint === null) {
              const currentEnd = newStart + dragInfo.initDuration;
              for (const pt of snapTargets) {
                if (Math.abs(currentEnd - pt) < snapThreshold) {
                  newStart = Math.max(0, pt - dragInfo.initDuration);
                  snappedPoint = pt;
                  break;
                }
              }
            }
          }

          setActiveSnapGuideTime(snappedPoint);

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
          let boundedDelta = Math.min(maxDelta, deltaTime);
          let newStart = Math.max(0, dragInfo.initStart + boundedDelta);
          let snappedPoint = null;

          if (snapEnabled) {
            const snapThreshold = 10 / pxPerSecond;
            for (const pt of snapTargets) {
              if (Math.abs(newStart - pt) < snapThreshold) {
                newStart = pt;
                boundedDelta = newStart - dragInfo.initStart;
                snappedPoint = pt;
                break;
              }
            }
          }
          setActiveSnapGuideTime(snappedPoint);

          let newDuration = dragInfo.initDuration - boundedDelta;
          let newOffset = (dragInfo.initOffset || 0) + boundedDelta;

          onUpdateClip(dragInfo.clipId, {
            start: Math.round(newStart * 100) / 100,
            duration: Math.round(newDuration * 100) / 100,
            offset: Math.max(0, Math.round(newOffset * 100) / 100),
          });

        } else if (dragInfo.mode === 'trim-right') {
          let newEnd = dragInfo.initStart + dragInfo.initDuration + deltaTime;
          let snappedPoint = null;

          if (snapEnabled) {
            const snapThreshold = 10 / pxPerSecond;
            for (const pt of snapTargets) {
              if (Math.abs(newEnd - pt) < snapThreshold) {
                newEnd = pt;
                snappedPoint = pt;
                break;
              }
            }
          }
          setActiveSnapGuideTime(snappedPoint);

          let newDuration = Math.max(0.2, newEnd - dragInfo.initStart);
          onUpdateClip(dragInfo.clipId, {
            duration: Math.round(newDuration * 100) / 100,
          });
        }
      }
    };

    const handleMouseUp = () => {
      setActiveSnapGuideTime(null);
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

  // Frame-accurate and sub-second ruler ticks based on zoom level
  const rulerTicks = useMemo(() => {
    const ticks = [];
    if (pxPerSecond >= 350) {
      // High frame-level zoom: Show 1/10s (3 frames) sub-second markings
      const step = 0.1;
      for (let s = 0; s <= duration + 4; s += step) {
        const isWhole = Math.abs(Math.round(s) - s) < 0.001;
        const isHalf = Math.abs(Math.round(s * 2) - s * 2) < 0.001;
        ticks.push({
          time: Math.round(s * 100) / 100,
          label: isWhole ? `${Math.round(s)}s` : isHalf ? `${s.toFixed(1)}s` : `${Math.round((s % 1) * 30)}f`,
          isMajor: isWhole,
          isMinor: !isWhole && !isHalf,
        });
      }
    } else if (pxPerSecond >= 140) {
      // 0.5s ticks
      const step = 0.5;
      for (let s = 0; s <= duration + 4; s += step) {
        const isWhole = Math.abs(Math.round(s) - s) < 0.001;
        ticks.push({
          time: Math.round(s * 10) / 10,
          label: isWhole ? `${Math.round(s)}s` : `${s.toFixed(1)}s`,
          isMajor: isWhole,
          isMinor: false,
        });
      }
    } else {
      // Standard seconds step
      const step = pxPerSecond > 65 ? 1 : pxPerSecond > 30 ? 2 : 5;
      for (let s = 0; s <= duration + 8; s += step) {
        ticks.push({
          time: s,
          label: `${s}s`,
          isMajor: true,
          isMinor: false,
        });
      }
    }
    return ticks;
  }, [duration, pxPerSecond]);

  const videoTrackCount = tracks.filter((t) => t.type === 'video').length;
  const audioTrackCount = tracks.filter((t) => t.type === 'audio').length;

  const totalClipCount = useMemo(() => tracks.reduce((sum, t) => sum + t.clips.length, 0), [tracks]);

  // Handle Drag Over Track Lane
  const handleTrackDragOver = (e, trackId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    const time = clientXToTime(e.clientX, snapEnabled);
    setDropTargetTrackId(trackId);
    setDropTargetTime(time);
  };

  const handleTrackDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropTargetTrackId(null);
  };

  const handleTrackDrop = async (e, trackId) => {
    e.preventDefault();
    e.stopPropagation();
    const dropTime = clientXToTime(e.clientX, snapEnabled);
    setDropTargetTrackId(null);

    // 1. Check if files were dragged from OS desktop/explorer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (onImportAndAddClip) {
          onImportAndAddClip(file, trackId, dropTime);
        }
      }
      return;
    }

    // 2. Check if internal asset from MediaBin
    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const payload = JSON.parse(jsonData);
        if (payload.type === 'asset' && payload.asset && onAddClipToTimeline) {
          onAddClipToTimeline(payload.asset, trackId, dropTime);
        }
      } catch (err) {
        console.error('Failed to parse dropped clip payload:', err);
      }
    }
  };

  return (
    <div style={{
      height: timelineHeight,
      minHeight: 180,
      maxHeight: '75vh',
      background: 'var(--bg-timeline)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 20,
      position: 'relative',
      transition: isResizingHeight ? 'none' : 'height 0.15s ease-out',
    }}>
      {/* Interactive Top Splitter / Resize Drag Handle */}
      <div
        onMouseDown={startVerticalResize}
        style={{
          position: 'absolute',
          top: -4,
          left: 0,
          right: 0,
          height: 8,
          cursor: 'row-resize',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isResizingHeight ? 'rgba(59, 130, 246, 0.4)' : 'transparent',
          transition: 'background 0.15s',
        }}
        title="Drag up or down to resize Timeline height"
      >
        <div style={{
          width: 44,
          height: 3,
          borderRadius: 2,
          background: isResizingHeight ? '#60a5fa' : '#3f3f4e',
          transition: 'background 0.15s',
        }} />
      </div>

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

          {/* Timeline Marker Button */}
          <button
            onClick={() => onAddMarker && onAddMarker()}
            title="Add Timeline Marker at Playhead (M)"
            style={{
              padding: '4px 7px',
              borderRadius: 3,
              background: '#18181e',
              border: '1px solid #22222a',
              color: '#38bdf8',
              fontSize: 11,
            }}
          >
            <Bookmark size={12} />
            <span>Marker (M)</span>
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

          {/* Timeline Zoom with Frame-Level Capability */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setPxPerSecond(Math.max(15, pxPerSecond - 25))}
              style={{ color: '#71717a', padding: 3 }}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <input
              type="range"
              min="15"
              max="500"
              value={pxPerSecond}
              onChange={(e) => setPxPerSecond(parseInt(e.target.value))}
              style={{ width: 85 }}
              title={`Zoom: ${pxPerSecond} px/sec ${pxPerSecond >= 300 ? '(Frame-by-Frame Mode)' : ''}`}
            />
            <button
              onClick={() => setPxPerSecond(Math.min(500, pxPerSecond + 25))}
              style={{ color: '#71717a', padding: 3 }}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>

            {/* 1-Click Frame Precision Toggle */}
            <button
              onClick={() => setPxPerSecond(pxPerSecond >= 350 ? 55 : 400)}
              title={pxPerSecond >= 350 ? "Switch to Normal Zoom (55 px/sec)" : "Zoom into Frame-by-Frame Precision (400 px/sec)"}
              style={{
                padding: '3px 6px',
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                background: pxPerSecond >= 350 ? '#3b2010' : '#18181e',
                border: pxPerSecond >= 350 ? '1px solid #f59e0b' : '1px solid #282834',
                color: pxPerSecond >= 350 ? '#fbbf24' : '#94a3b8',
                transition: 'all 0.15s ease',
              }}
            >
              {pxPerSecond >= 350 ? '1 Frame' : 'Frames'}
            </button>
          </div>

          <div style={{ width: 1, height: 16, background: '#25252e' }} />

          {/* 1-Click Expand / Height Toggle Button */}
          {setTimelineHeight && (
            <button
              onClick={() => setTimelineHeight(timelineHeight < 400 ? 480 : 290)}
              title={timelineHeight < 400 ? "Expand Timeline View to see all layers (Click to enlarge)" : "Restore Standard Timeline Height"}
              style={{
                padding: '4px 8px',
                borderRadius: 3,
                background: timelineHeight >= 400 ? '#1e293b' : '#18181e',
                border: timelineHeight >= 400 ? '1px solid #3b82f6' : '1px solid #282834',
                color: timelineHeight >= 400 ? '#93c5fd' : '#94a3b8',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              {timelineHeight >= 400 ? <Minimize2 size={12} color="#60a5fa" /> : <Maximize2 size={12} color="#94a3b8" />}
              <span>{timelineHeight >= 400 ? 'Contract' : 'Expand'}</span>
            </button>
          )}
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
            {rulerTicks.map((tick, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: tick.time * pxPerSecond,
                  top: tick.isMinor ? 14 : 0,
                  bottom: 0,
                  borderLeft: tick.isMajor ? '1px solid #3f3f4e' : tick.isMinor ? '1px solid #202028' : '1px solid #2c2c36',
                  paddingLeft: 3,
                  fontSize: tick.isMinor ? 8 : 9,
                  fontFamily: 'var(--font-mono)',
                  color: tick.isMajor ? '#94a3b8' : tick.isMinor ? '#52525b' : '#64748b',
                  lineHeight: tick.isMinor ? '14px' : '26px',
                  pointerEvents: 'none',
                }}
              >
                {!tick.isMinor ? tick.label : ''}
              </div>
            ))}

            {/* Ruler Markers */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(marker.time);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onDeleteMarker) onDeleteMarker(marker.id);
                }}
                title={`Marker: "${marker.label}" at ${marker.time.toFixed(2)}s (Click to jump, Right-click to delete)`}
                style={{
                  position: 'absolute',
                  left: marker.time * pxPerSecond,
                  top: 0,
                  transform: 'translateX(-50%)',
                  zIndex: 48,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    background: marker.color || '#3b82f6',
                    color: '#ffffff',
                    fontSize: 8,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    padding: '0 3px',
                    borderRadius: '2px 2px 0 0',
                    lineHeight: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {marker.label}
                </div>
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `5px solid ${marker.color || '#3b82f6'}`,
                  }}
                />
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
                const isDropTarget = dropTargetTrackId === track.id;

                return (
                  <div
                    key={track.id}
                    ref={(el) => {
                      if (el) trackLaneRefs.current.set(track.id, el);
                      else trackLaneRefs.current.delete(track.id);
                    }}
                    onDragOver={(e) => handleTrackDragOver(e, track.id)}
                    onDragLeave={handleTrackDragLeave}
                    onDrop={(e) => handleTrackDrop(e, track.id)}
                    style={{
                      height: track.height || 40,
                      borderBottom: '1px solid #1c1c22',
                      position: 'relative',
                      background: track.locked
                        ? 'rgba(0,0,0,0.4)'
                        : isHoverTarget || isDropTarget
                        ? '#1a233a'
                        : '#141418',
                      boxShadow: isHoverTarget || isDropTarget ? 'inset 0 0 0 1.5px #3b82f6' : 'none',
                      transition: 'background 0.1s, box-shadow 0.1s',
                    }}
                  >
                    {/* Live Drag-and-Drop Placement Ghost */}
                    {isDropTarget && (
                      <div
                        style={{
                          position: 'absolute',
                          left: dropTargetTime * pxPerSecond,
                          top: 2,
                          bottom: 2,
                          width: 140,
                          background: 'rgba(59, 130, 246, 0.25)',
                          border: '1.5px dashed #60a5fa',
                          borderRadius: 2,
                          zIndex: 25,
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#93c5fd',
                          fontSize: 10,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                        }}
                      >
                        Drop at {dropTargetTime.toFixed(1)}s
                      </div>
                    )}

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
                            borderRadius: 3,
                            background: track.type === 'video' ? '#0f141c' : (track.color || '#1e3a8a'),
                            border: isSelected ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.18)',
                            borderTop: track.type === 'video' ? (isSelected ? '2px solid #60a5fa' : '2px solid #3b82f6') : (isSelected ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.18)'),
                            boxShadow: isSelected ? '0 0 0 1px #3b82f6, 0 2px 8px rgba(0,0,0,0.6)' : '0 1px 3px rgba(0,0,0,0.5)',
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

                          {/* Video Filmstrip Frame Previews (DaVinci/Premiere style) */}
                          {track.type === 'video' && (() => {
                            const asset = mediaAssets.find((a) => a.id === clip.assetId);
                            const frames = asset?.frames || [];
                            const thumbUrl = asset?.thumbnailUrl;

                            const tileWidth = pxPerSecond >= 350 ? Math.max(72, pxPerSecond * 0.5) : Math.max(52, Math.min(84, pxPerSecond * 0.8));
                            const isFrameZoom = pxPerSecond >= 350;
                            const totalTiles = Math.max(1, Math.ceil(clipWidth / tileWidth));

                            if (frames.length > 0) {
                              return (
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  overflow: 'hidden',
                                  opacity: 0.92,
                                  pointerEvents: 'none',
                                  zIndex: 1,
                                }}>
                                  {Array.from({ length: totalTiles }).map((_, idx) => {
                                    // Map tile idx to video time accounting for clip offset and duration
                                    const tileTime = (clip.offset || 0) + (totalTiles > 1 ? (idx / (totalTiles - 1)) * clip.duration : 0);
                                    let bestFrame = frames[0];
                                    let minDiff = Infinity;
                                    for (const fr of frames) {
                                      if (fr.time !== undefined) {
                                        const diff = Math.abs(fr.time - tileTime);
                                        if (diff < minDiff) {
                                          minDiff = diff;
                                          bestFrame = fr;
                                        }
                                      }
                                    }
                                    if (!bestFrame && frames.length > 0) {
                                      const frameIdx = Math.min(frames.length - 1, Math.floor((idx / totalTiles) * frames.length));
                                      bestFrame = frames[frameIdx];
                                    }

                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          height: '100%',
                                          width: tileWidth,
                                          minWidth: tileWidth,
                                          backgroundImage: `url(${bestFrame.dataUrl})`,
                                          backgroundSize: 'cover',
                                          backgroundPosition: 'center',
                                          borderRight: '1px solid rgba(0,0,0,0.65)',
                                          position: 'relative',
                                        }}
                                      >
                                        {isFrameZoom && (
                                          <span style={{
                                            position: 'absolute',
                                            bottom: 1,
                                            right: 2,
                                            fontSize: 8,
                                            fontFamily: 'var(--font-mono)',
                                            fontWeight: 700,
                                            color: '#f8fafc',
                                            background: 'rgba(0,0,0,0.8)',
                                            padding: '0 3px',
                                            borderRadius: 2,
                                          }}>
                                            {bestFrame.time ? `${bestFrame.time.toFixed(1)}s` : `#${idx + 1}`}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            } else if (thumbUrl) {
                              return (
                                <div style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  overflow: 'hidden',
                                  opacity: 0.9,
                                  pointerEvents: 'none',
                                  zIndex: 1,
                                }}>
                                  {Array.from({ length: totalTiles }).map((_, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        height: '100%',
                                        width: tileWidth,
                                        minWidth: tileWidth,
                                        backgroundImage: `url(${thumbUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        borderRight: '1px solid rgba(0,0,0,0.4)',
                                      }}
                                    />
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Audio Waveform Visualization */}
                          {track.type === 'audio' && (() => {
                            const asset = mediaAssets.find((a) => a.id === clip.assetId);
                            const rawWave = asset?.waveform;
                            const barCount = Math.max(16, Math.min(300, Math.floor(clipWidth / 3.5)));
                            
                            return (
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                padding: '0 6px',
                                overflow: 'hidden',
                                pointerEvents: 'none',
                                opacity: 0.75,
                                zIndex: 1,
                              }}>
                                {Array.from({ length: barCount }).map((_, idx) => {
                                  let peak = 0.35;
                                  if (rawWave && rawWave.length > 0) {
                                    const waveIdx = Math.floor((idx / barCount) * rawWave.length);
                                    peak = rawWave[waveIdx] || 0.35;
                                  } else {
                                    const s = Math.sin(idx * 0.3) * Math.cos(idx * 0.15);
                                    peak = 0.2 + 0.45 * Math.abs(s);
                                  }
                                  const heightPercent = Math.max(12, Math.min(92, peak * 100));
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        flex: 1,
                                        height: `${heightPercent}%`,
                                        background: '#34d399',
                                        borderRadius: 1,
                                        opacity: 0.9,
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Clip Label */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#f8fafc',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            pointerEvents: 'none',
                            position: 'relative',
                            zIndex: 3,
                            background: (track.type === 'video' || track.type === 'audio') ? 'rgba(15, 23, 42, 0.78)' : 'transparent',
                            padding: (track.type === 'video' || track.type === 'audio') ? '2px 6px' : '0',
                            borderRadius: 4,
                            backdropFilter: (track.type === 'video' || track.type === 'audio') ? 'blur(4px)' : 'none',
                            boxShadow: (track.type === 'video' || track.type === 'audio') ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
                            textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)',
                          }}>
                            {track.type === 'blur' ? <Key size={10} color="#f59e0b" /> : null}
                            <span>{clip.name}</span>
                            <span style={{ fontSize: 9, color: track.type === 'audio' ? '#a7f3d0' : '#93c5fd', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
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
                              title={`Jump to Blur Keyframe at ${(clip.start + kf.time).toFixed(2)}s`}
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

                          {/* Volume Keyframe Diamonds (Video & Audio Automation Curves) */}
                          {(track.type === 'video' || track.type === 'audio') && (clip.volumeKeyframes || []).map((vkf) => (
                            <div
                              key={vkf.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSeek(clip.start + vkf.time);
                              }}
                              title={`Volume Keyframe at ${(clip.start + vkf.time).toFixed(2)}s: ${Math.round(vkf.volume * 100)}%`}
                              style={{
                                position: 'absolute',
                                left: `${(vkf.time / clip.duration) * 100}%`,
                                top: `${Math.max(15, Math.min(85, 90 - (vkf.volume / 1.5) * 75))}%`,
                                transform: 'translate(-50%, -50%) rotate(45deg)',
                                width: 7,
                                height: 7,
                                background: '#10b981',
                                border: '1px solid #064e3b',
                                cursor: 'pointer',
                                zIndex: 12,
                                boxShadow: '0 0 4px rgba(16, 185, 129, 0.8)',
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

            {/* Guided Empty State Dropzone when timeline has 0 clips */}
            {totalClipCount === 0 && (
              <div
                onDragOver={(e) => handleTrackDragOver(e, 'track-v1')}
                onDragLeave={handleTrackDragLeave}
                onDrop={(e) => handleTrackDrop(e, 'track-v1')}
                style={{
                  position: 'absolute',
                  top: 25,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '90%',
                  maxWidth: 540,
                  border: '1.5px dashed #2f2f3e',
                  borderRadius: 6,
                  background: 'rgba(18, 18, 23, 0.92)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  zIndex: 15,
                  padding: '16px 20px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
                  pointerEvents: 'auto',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>
                  <Upload size={15} color="#3b82f6" />
                  <span>Drag & Drop Media Directly onto Timeline</span>
                </div>
                <div style={{ fontSize: 11, color: '#71717a', textAlign: 'center', lineHeight: 1.4 }}>
                  Drag footage from the Media Pool or drop files directly from your computer to start editing.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <label
                    style={{
                      padding: '6px 14px',
                      borderRadius: 3,
                      background: '#1e2436',
                      border: '1px solid #3b5284',
                      color: '#93c5fd',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <FolderOpen size={13} color="#60a5fa" />
                    <span>Import Footage / Audio</span>
                    <input
                      type="file"
                      multiple
                      accept="video/*,audio/*,image/*"
                      onChange={onImportFiles}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Magnetic Snapping Cyan Alignment Guide Line */}
            {activeSnapGuideTime !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: activeSnapGuideTime * pxPerSecond,
                  transform: 'translateX(-50%)',
                  width: 2,
                  background: '#06b6d4',
                  boxShadow: '0 0 10px #06b6d4, 0 0 3px #ffffff',
                  zIndex: 38,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    background: 'rgba(6, 182, 212, 0.95)',
                    color: '#082f49',
                    fontSize: 9,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    padding: '1px 5px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  }}
                >
                  🧲 {activeSnapGuideTime.toFixed(2)}s
                </div>
              </div>
            )}

            {/* Vertical Marker Guidelines across all tracks */}
            {markers.map((marker) => (
              <div
                key={marker.id}
                style={{
                  position: 'absolute',
                  left: marker.time * pxPerSecond,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  borderLeft: `1.5px dashed ${marker.color || '#3b82f6'}`,
                  opacity: 0.45,
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              />
            ))}

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
