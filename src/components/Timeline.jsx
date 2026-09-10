import React, { useRef, useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatSecondsOnly } from '../types/defaults';

export function Timeline({
  tracks,
  currentTime,
  duration,
  onSeek,
  selectedClipId,
  onSelectClip,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onUpdateClip,
  onToggleMuteTrack,
  onToggleLockTrack,
  pxPerSecond = 55,
  setPxPerSecond,
}) {
  const timelineRef = useRef(null);
  const rulerRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [dragInfo, setDragInfo] = useState(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const clientXToTime = (clientX) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = clientX - rect.left + scrollLeft;
    const time = Math.max(0, x / pxPerSecond);
    return Math.min(duration, time);
  };

  const handleRulerMouseDown = (e) => {
    setIsScrubbing(true);
    const newTime = clientXToTime(e.clientX);
    onSeek(newTime);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isScrubbing) {
        onSeek(clientXToTime(e.clientX));
      } else if (dragInfo) {
        const deltaX = e.clientX - dragInfo.startX;
        const deltaTime = deltaX / pxPerSecond;

        if (dragInfo.mode === 'move') {
          let newStart = Math.max(0, dragInfo.initStart + deltaTime);

          if (snapEnabled) {
            if (Math.abs(newStart - currentTime) < 0.2) newStart = currentTime;
            if (Math.abs(newStart - 0) < 0.2) newStart = 0;
          }

          onUpdateClip(dragInfo.clipId, { start: Math.round(newStart * 100) / 100 });

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
      setIsScrubbing(false);
      setDragInfo(null);
    };

    if (isScrubbing || dragInfo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, dragInfo, pxPerSecond, duration, snapEnabled, currentTime, onSeek, onUpdateClip]);

  const timelineWidth = Math.max(1200, (duration + 5) * pxPerSecond);

  const rulerTicks = [];
  const stepSeconds = pxPerSecond > 80 ? 1 : pxPerSecond > 35 ? 2 : 5;
  for (let s = 0; s <= duration + 5; s += stepSeconds) {
    rulerTicks.push(s);
  }

  return (
    <div style={{
      height: 260,
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
        </div>

        {/* Right Tools: Timeline Zoom */}
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

      {/* 2. Main Timeline Area (Track Headers + Lanes) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Track Headers (NLE Workstation Style) */}
        <div style={{
          width: 140,
          minWidth: 140,
          background: '#131316',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
        }}>
          {/* Top spacer for ruler */}
          <div style={{ height: 24, borderBottom: '1px solid var(--border-subtle)', background: '#111114' }} />

          {/* Track Headers */}
          <div style={{ flex: 1, overflowY: 'hidden' }}>
            {tracks.map((track) => (
              <div
                key={track.id}
                style={{
                  height: track.height || 40,
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 8px',
                  background: '#141418',
                }}
              >
                {/* Track Code & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: '#e2e8f0',
                    background: '#22222a',
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

                {/* Mute / Lock Toggles */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
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
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Lanes */}
        <div
          ref={timelineRef}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            position: 'relative',
            background: 'var(--bg-timeline)',
          }}
        >
          <div style={{ width: timelineWidth, position: 'relative', minHeight: '100%' }}>
            {/* Time Ruler (DaVinci Style Clean Milliseconds/Seconds) */}
            <div
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              style={{
                height: 24,
                borderBottom: '1px solid var(--border-subtle)',
                background: '#111114',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
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
                    lineHeight: '24px',
                    pointerEvents: 'none',
                  }}
                >
                  {sec}s
                </div>
              ))}
            </div>

            {/* Track Lanes */}
            <div style={{ position: 'relative' }}>
              {tracks.map((track) => (
                <div
                  key={track.id}
                  style={{
                    height: track.height || 40,
                    borderBottom: '1px solid #1c1c22',
                    position: 'relative',
                    background: track.locked ? 'rgba(0,0,0,0.4)' : '#141418',
                  }}
                >
                  {/* Clips on this track */}
                  {track.clips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const clipLeft = clip.start * pxPerSecond;
                    const clipWidth = Math.max(10, clip.duration * pxPerSecond);

                    return (
                      <div
                        key={clip.id}
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
                            trackId: track.id,
                            startX: e.clientX,
                            initStart: clip.start,
                            initDuration: clip.duration,
                            initOffset: clip.offset || 0,
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
                                trackId: track.id,
                                startX: e.clientX,
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

                        {/* Keyframe Diamonds for Blur Track (DaVinci Gold Diamonds) */}
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
                                trackId: track.id,
                                startX: e.clientX,
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
              ))}
            </div>

            {/* DaVinci / Premiere Standard Amber Playhead */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: currentTime * pxPerSecond,
                width: 1.5,
                background: '#f59e0b',
                pointerEvents: 'none',
                zIndex: 40,
              }}
            >
              {/* Triangular Cursor Head */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: -4.5,
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '7px solid #f59e0b',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
