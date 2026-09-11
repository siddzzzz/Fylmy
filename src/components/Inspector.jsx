import React from 'react';
import {
  Sliders,
  Maximize2,
  Volume2,
  Gauge,
  Sparkles,
  EyeOff,
  Type,
  Key,
  Trash2,
  Target,
  Layers,
  Plus,
} from 'lucide-react';
import { formatSecondsOnly } from '../types/defaults';

export function Inspector({
  selectedClip,
  tracks = [],
  onUpdateClip,
  onDeleteClip,
  onMoveClipToTrack,
  onAddTrack,
  currentTime,
  onSeek,
  onAddKeyframeAtPlayhead,
  onDeleteKeyframe,
}) {
  if (!selectedClip) {
    return (
      <aside style={{
        width: 280,
        minWidth: 280,
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        textAlign: 'center',
        color: '#64748b',
      }}>
        <Sliders size={28} style={{ opacity: 0.25, marginBottom: 10 }} />
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
          No Clip Selected
        </div>
        <p style={{ fontSize: 11, lineHeight: 1.5 }}>
          Select a clip in the timeline to inspect and modify transform, grading, or tracking keyframes.
        </p>
      </aside>
    );
  }

  const isVideo = selectedClip.trackType === 'video';
  const isBlur = selectedClip.trackType === 'blur';
  const isText = selectedClip.trackType === 'text';
  const isAudio = selectedClip.trackType === 'audio';

  const transform = selectedClip.transform || {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    fitMode: 'contain',
    mirrorBlurBg: true,
  };

  const filters = selectedClip.filters || {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    temperature: 0,
    vignette: 0,
  };

  const textConfig = selectedClip.textConfig || {
    text: 'Title Text',
    fontSize: 48,
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    color: '#ffffff',
    bgColor: 'rgba(0,0,0,0.6)',
    align: 'center',
    yPos: 80,
  };

  const updateTransform = (key, val) => {
    onUpdateClip(selectedClip.id, {
      transform: { ...transform, [key]: val },
    });
  };

  const updateFilters = (key, val) => {
    onUpdateClip(selectedClip.id, {
      filters: { ...filters, [key]: val },
    });
  };

  const updateText = (key, val) => {
    onUpdateClip(selectedClip.id, {
      textConfig: { ...textConfig, [key]: val },
    });
  };

  return (
    <aside style={{
      width: 280,
      minWidth: 280,
      background: 'var(--bg-panel)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflowY: 'auto',
      zIndex: 20,
    }}>
      {/* Inspector Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        background: '#131316',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
          {isBlur ? <Target size={14} color="#f59e0b" /> : isText ? <Type size={14} color="#fb923c" /> : <Sliders size={14} color="#60a5fa" />}
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedClip.name}
          </span>
        </div>
        <button
          onClick={() => onDeleteClip(selectedClip.id)}
          title="Delete Clip (Del)"
          style={{
            padding: '3px 6px',
            borderRadius: 3,
            background: '#221515',
            border: '1px solid #451a1a',
            color: '#f87171',
          }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Track / Layer Assignment Routing */}
        {(isVideo || isAudio) && (
          <div style={{
            background: '#16161b',
            border: '1px solid #282834',
            borderRadius: 4,
            padding: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Track / Layer Assignment
              </div>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: '#e2e8f0',
                background: isVideo ? '#1e3a8a' : '#065f46',
                border: '1px solid #383848',
                padding: '1px 5px',
                borderRadius: 2,
              }}>
                {selectedClip.trackId?.replace('track-', '').toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(isVideo ? tracks.filter((t) => t.type === 'video') : tracks.filter((t) => t.type === 'audio')).map((t) => {
                const isCurrent = t.id === selectedClip.trackId;
                return (
                  <button
                    key={t.id}
                    onClick={() => onMoveClipToTrack && onMoveClipToTrack(selectedClip.id, t.id, selectedClip.start)}
                    style={{
                      flex: '1 0 calc(33% - 4px)',
                      padding: '5px 4px',
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: isCurrent ? 700 : 500,
                      background: isCurrent ? (isVideo ? '#2563eb' : '#059669') : '#202028',
                      color: isCurrent ? '#ffffff' : '#94a3b8',
                      border: isCurrent ? '1px solid #60a5fa' : '1px solid #30303c',
                      textAlign: 'center',
                    }}
                  >
                    {t.code || t.name.split(' ')[0]}
                  </button>
                );
              })}

              <button
                onClick={() => onMoveClipToTrack && onMoveClipToTrack(selectedClip.id, isVideo ? 'new_video_layer' : 'new_audio_layer', selectedClip.start)}
                style={{
                  flex: '1 0 calc(33% - 4px)',
                  padding: '5px 4px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  background: '#1a1a24',
                  color: isVideo ? '#93c5fd' : '#6ee7b7',
                  border: '1px solid #3b4260',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <Plus size={10} />
                <span>+ Layer</span>
              </button>
            </div>
          </div>
        )}

        {/* VIDEO CONTROLS */}
        {isVideo && (
          <>
            {/* Section: Framing & Transform */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }}>
                Framing & Transform
              </div>

              {/* Fit Mode Segmented Control */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {[
                  { id: 'contain', label: 'Fit' },
                  { id: 'cover', label: 'Fill' },
                  { id: 'stretch', label: 'Stretch' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => updateTransform('fitMode', mode.id)}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: transform.fitMode === mode.id ? 700 : 500,
                      background: transform.fitMode === mode.id ? '#2563eb' : '#1a1a20',
                      border: transform.fitMode === mode.id ? '1px solid #3b82f6' : '1px solid #282832',
                      color: transform.fitMode === mode.id ? '#ffffff' : '#94a3b8',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Mirror Blur Background */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, cursor: 'pointer', marginBottom: 10, color: '#94a3b8' }}>
                <input
                  type="checkbox"
                  checked={transform.mirrorBlurBg ?? true}
                  onChange={(e) => updateTransform('mirrorBlurBg', e.target.checked)}
                  style={{ accentColor: '#2563eb' }}
                />
                <span>Frosted Mirror Background</span>
              </label>

              {/* Scale / Zoom */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                  <span>Scale</span>
                  <span className="val-badge">{Math.round((transform.scale || 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.05"
                  value={transform.scale || 1}
                  onChange={(e) => updateTransform('scale', parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Position X / Y */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                    <span>X</span>
                    <span className="val-badge">{transform.x || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-400"
                    max="400"
                    step="5"
                    value={transform.x || 0}
                    onChange={(e) => updateTransform('x', parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                    <span>Y</span>
                    <span className="val-badge">{transform.y || 0}</span>
                  </div>
                  <input
                    type="range"
                    min="-400"
                    max="400"
                    step="5"
                    value={transform.y || 0}
                    onChange={(e) => updateTransform('y', parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Opacity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                  <span>Opacity</span>
                  <span className="val-badge">{Math.round((transform.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={transform.opacity ?? 1}
                  onChange={(e) => updateTransform('opacity', parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Section: Playback Speed & Audio */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }}>
                Speed & Gain
              </div>

              {/* Speed Buttons */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateClip(selectedClip.id, { speed: s })}
                    style={{
                      flex: 1,
                      padding: '4px 2px',
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: (selectedClip.speed || 1) === s ? 700 : 500,
                      background: (selectedClip.speed || 1) === s ? '#242430' : '#17171d',
                      border: (selectedClip.speed || 1) === s ? '1px solid #3b82f6' : '1px solid #282832',
                      color: (selectedClip.speed || 1) === s ? '#60a5fa' : '#94a3b8',
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Audio Volume */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                  <span>Volume Gain</span>
                  <span className="val-badge">{Math.round((selectedClip.volume ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={selectedClip.volume ?? 1}
                  onChange={(e) => onUpdateClip(selectedClip.id, { volume: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Section: Color Grading */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }}>
                Primary Color Grading
              </div>

              {/* Brightness */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                  <span>Brightness</span>
                  <span className="val-badge">{filters.brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={filters.brightness}
                  onChange={(e) => updateFilters('brightness', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Contrast */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                  <span>Contrast</span>
                  <span className="val-badge">{filters.contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="180"
                  value={filters.contrast}
                  onChange={(e) => updateFilters('contrast', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Saturation */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                  <span>Saturation</span>
                  <span className="val-badge">{filters.saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.saturation}
                  onChange={(e) => updateFilters('saturation', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Temperature */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                  <span>White Balance (K)</span>
                  <span className="val-badge">{filters.temperature > 0 ? `+${filters.temperature}` : filters.temperature}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={filters.temperature}
                  onChange={(e) => updateFilters('temperature', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Vignette */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                  <span>Lens Vignette</span>
                  <span className="val-badge">{filters.vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.vignette}
                  onChange={(e) => updateFilters('vignette', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </>
        )}

        {/* BLUR / CENSOR CONTROLS (WITH MOTION TRACKING KEYFRAMES) */}
        {isBlur && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }}>
                Mask Rendering Mode
              </div>

              {/* Style: Gaussian vs Pixelate */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                {[
                  { id: 'gaussian', label: 'Gaussian Blur' },
                  { id: 'pixelate', label: 'Mosaic Censor' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onUpdateClip(selectedClip.id, { blurStyle: s.id })}
                    style={{
                      flex: 1,
                      padding: '5px 6px',
                      borderRadius: 3,
                      fontSize: 11,
                      fontWeight: (selectedClip.blurStyle || 'gaussian') === s.id ? 700 : 500,
                      background: (selectedClip.blurStyle || 'gaussian') === s.id ? '#b45309' : '#18181e',
                      border: (selectedClip.blurStyle || 'gaussian') === s.id ? '1px solid #d97706' : '1px solid #282832',
                      color: '#ffffff',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Intensity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                  <span>Radius / Block Size</span>
                  <span className="val-badge">{selectedClip.intensity || 25}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={selectedClip.intensity || 25}
                  onChange={(e) => onUpdateClip(selectedClip.id, { intensity: parseInt(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Tracking Keyframe Table */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Motion Track Points ({(selectedClip.keyframes || []).length})
                </span>
                <button
                  onClick={onAddKeyframeAtPlayhead}
                  style={{
                    padding: '3px 6px',
                    borderRadius: 3,
                    background: '#241a0e',
                    border: '1px solid #b45309',
                    color: '#fbbf24',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  + Add Point
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                {(selectedClip.keyframes || []).map((kf, i) => {
                  const absoluteTime = selectedClip.start + kf.time;
                  const isCurrent = Math.abs(currentTime - absoluteTime) < 0.1;
                  return (
                    <div
                      key={kf.id || i}
                      style={{
                        background: isCurrent ? '#261c10' : '#15151a',
                        border: isCurrent ? '1px solid #d97706' : '1px solid #282832',
                        borderRadius: 3,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div
                        onClick={() => onSeek(absoluteTime)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                        title="Jump to this keyframe"
                      >
                        <Target size={11} color="#f59e0b" />
                        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f1f5f9' }}>
                          {formatSecondsOnly(absoluteTime)}
                        </span>
                        <span style={{ fontSize: 9, color: '#71717a' }}>
                          [X:{Math.round(kf.x)}% Y:{Math.round(kf.y)}%]
                        </span>
                      </div>

                      <button
                        onClick={() => onDeleteKeyframe(selectedClip.id, kf.id)}
                        disabled={(selectedClip.keyframes || []).length <= 1}
                        style={{ color: '#71717a', padding: 2 }}
                        title="Delete keyframe point"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TEXT CONTROLS */}
        {isText && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.8 }}>
              Typography
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Text Content</div>
              <textarea
                value={textConfig.text || ''}
                onChange={(e) => updateText('text', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  background: '#131317',
                  border: '1px solid #282832',
                  borderRadius: 4,
                  padding: 7,
                  color: '#ffffff',
                  fontSize: 12,
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                <span>Font Size</span>
                <span className="val-badge">{textConfig.fontSize || 48}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="120"
                value={textConfig.fontSize || 48}
                onChange={(e) => updateText('fontSize', parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Fill Color</div>
                <input
                  type="color"
                  value={textConfig.color || '#ffffff'}
                  onChange={(e) => updateText('color', e.target.value)}
                  style={{ width: '100%', height: 28, borderRadius: 3, background: 'none', border: '1px solid #282832', cursor: 'pointer' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>Position Y</div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={textConfig.yPos || 80}
                  onChange={(e) => updateText('yPos', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              {['left', 'center', 'right'].map((align) => (
                <button
                  key={align}
                  onClick={() => updateText('align', align)}
                  style={{
                    flex: 1,
                    padding: '5px',
                    borderRadius: 3,
                    fontSize: 11,
                    textTransform: 'capitalize',
                    background: (textConfig.align || 'center') === align ? '#282834' : '#16161c',
                    border: (textConfig.align || 'center') === align ? '1px solid #4a4a60' : '1px solid #24242e',
                    color: (textConfig.align || 'center') === align ? '#ffffff' : '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AUDIO CONTROLS */}
        {isAudio && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }}>
              Audio Bus Level
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                <span>Gain</span>
                <span className="val-badge">{Math.round((selectedClip.volume ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={selectedClip.volume ?? 1}
                onChange={(e) => onUpdateClip(selectedClip.id, { volume: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
