import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Upload,
  EyeOff,
  Type,
  Music,
  Sliders,
  Sparkles,
  Video,
  FileVideo,
  Target,
  Edit2,
  Check,
  X,
  Play,
  Pause,
  Volume2,
  Mic,
} from 'lucide-react';
import { formatSecondsOnly, FILTER_PRESETS } from '../types/defaults';
import { BUILTIN_SFX_PRESETS, createAssetFromSfxPreset } from '../utils/sfxGenerator';

export function MediaBin({
  mediaAssets,
  tracks = [],
  onImportFiles,
  onAddClipToTimeline,
  onAddBlurToTimeline,
  onAddTextToTimeline,
  onApplyFilterPreset,
  onAddTrack,
  selectedClip,
  onRenameMediaAsset,
}) {
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'sfx' | 'blur' | 'text' | 'filters'
  const [hoveredScrubAssetId, setHoveredScrubAssetId] = useState(null);
  const [hoverScrubPct, setHoverScrubPct] = useState(0);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isDragOverBin, setIsDragOverBin] = useState(false);
  const [auditioningPresetId, setAuditioningPresetId] = useState(null);
  const auditionAudioRef = useRef(null);

  const handleAuditionSfx = async (preset) => {
    try {
      if (auditioningPresetId === preset.id) {
        if (auditionAudioRef.current) {
          auditionAudioRef.current.pause();
        }
        setAuditioningPresetId(null);
        return;
      }
      const asset = await createAssetFromSfxPreset(preset);
      if (auditionAudioRef.current) {
        auditionAudioRef.current.pause();
      }
      const audio = new Audio(asset.url);
      auditionAudioRef.current = audio;
      setAuditioningPresetId(preset.id);
      audio.onended = () => setAuditioningPresetId(null);
      audio.play();
    } catch (e) {
      console.error('Failed to audition SFX:', e);
    }
  };

  const videoTracks = tracks.filter((t) => t.type === 'video');
  const audioTracks = tracks.filter((t) => t.type === 'audio');

  return (
    <aside style={{
      width: 290,
      minWidth: 290,
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      zIndex: 20,
    }}>
      {/* Workstation Tab Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-subtle)',
        background: '#131316',
        padding: '3px 4px',
        gap: 3,
      }}>
        {[
          { id: 'media', label: 'Media Pool', icon: FolderOpen },
          { id: 'sfx', label: 'Sound FX', icon: Music },
          { id: 'blur', label: 'Mask / Censor', icon: Target },
          { id: 'text', label: 'Titles', icon: Type },
          { id: 'filters', label: 'Color LUTs', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '6px 3px',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? '#24242c' : 'transparent',
                color: isActive ? '#f8fafc' : '#71717a',
                border: isActive ? '1px solid #383844' : '1px solid transparent',
              }}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* TAB 1: MEDIA POOL */}
        {activeTab === 'media' && (
          <div
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOverBin(true);
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOverBin(false);
            }}
            onDrop={(e) => {
              if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOverBin(false);
                if (onImportFiles) {
                  onImportFiles(e);
                }
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minHeight: '100%',
              borderRadius: 6,
              border: isDragOverBin ? '2px dashed #3b82f6' : '2px dashed transparent',
              background: isDragOverBin ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {/* Import Button */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '8px 10px',
                borderRadius: 4,
                background: '#1c1c22',
                border: '1px solid #2e2e38',
                cursor: 'pointer',
                color: '#e2e8f0',
                fontSize: 12,
                fontWeight: 600,
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#474758';
                e.currentTarget.style.background = '#22222a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2e2e38';
                e.currentTarget.style.background = '#1c1c22';
              }}
            >
              <Upload size={13} color="#94a3b8" />
              <span>Import Footage / Audio</span>
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={onImportFiles}
                style={{ display: 'none' }}
              />
            </label>

            {/* Asset List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Clips in Bin ({mediaAssets.length})
              </div>

              {mediaAssets.length === 0 ? (
                <div style={{
                  padding: 28,
                  textAlign: 'center',
                  background: '#131317',
                  border: '1px solid #25252e',
                  borderRadius: 4,
                  color: '#64748b',
                  fontSize: 11,
                  lineHeight: 1.5,
                }}>
                  Media pool is empty.<br />
                  Click <strong style={{ color: '#94a3b8' }}>Import Footage / Audio</strong> or drop files here to add to bin.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
                  {mediaAssets.map((asset) => (
                    <div
                      key={asset.id}
                      draggable={true}
                      onDragStart={(e) => {
                        window.__fylmy_dragged_asset = asset;
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'asset', asset }));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onDragEnd={() => {
                        window.__fylmy_dragged_asset = null;
                      }}
                      title="Drag and drop onto timeline track, or use layer buttons"
                      style={{
                        background: '#19191f',
                        borderRadius: 4,
                        overflow: 'hidden',
                        border: '1px solid #282832',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'grab',
                        transition: 'border-color 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#47475a';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#282832';
                      }}
                    >
                      {/* Thumbnail with Hover Scrubbing */}
                      <div
                        onMouseMove={(e) => {
                          if (asset.type !== 'video') return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          setHoveredScrubAssetId(asset.id);
                          setHoverScrubPct(pct);
                        }}
                        onMouseLeave={() => {
                          setHoveredScrubAssetId(null);
                        }}
                        style={{
                          height: 70,
                          background: '#0d0d10',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'ew-resize',
                        }}
                      >
                        {asset.thumbnailUrl ? (
                          <img
                            src={asset.thumbnailUrl}
                            alt={asset.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : asset.type === 'audio' ? (
                          <Music size={20} color="#10b981" />
                        ) : (
                          <Video size={20} color="#3b82f6" />
                        )}

                        {/* Hover Scrub Line Indicator */}
                        {hoveredScrubAssetId === asset.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              bottom: 0,
                              left: `${hoverScrubPct * 100}%`,
                              width: 2,
                              background: '#fbbf24',
                              boxShadow: '0 0 6px #f59e0b',
                              zIndex: 10,
                            }}
                          />
                        )}

                        <div style={{
                          position: 'absolute',
                          bottom: 3,
                          right: 3,
                          background: 'rgba(0,0,0,0.85)',
                          padding: '1px 4px',
                          borderRadius: 2,
                          fontSize: 9,
                          fontWeight: 600,
                          fontFamily: 'var(--font-mono)',
                          color: hoveredScrubAssetId === asset.id ? '#fbbf24' : '#e2e8f0',
                        }}>
                          {hoveredScrubAssetId === asset.id
                            ? `${(hoverScrubPct * (asset.duration || 0)).toFixed(1)}s`
                            : formatSecondsOnly(asset.duration)}
                        </div>
                      </div>

                      {/* Info & Multi-Layer Add Options */}
                      <div style={{ padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {editingAssetId === asset.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onRenameMediaAsset && onRenameMediaAsset(asset.id, editingName);
                                  setEditingAssetId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingAssetId(null);
                                }
                              }}
                              autoFocus
                              style={{
                                flex: 1,
                                background: '#121216',
                                border: '1px solid #3b82f6',
                                color: '#ffffff',
                                fontSize: 10,
                                padding: '2px 4px',
                                borderRadius: 2,
                                outline: 'none',
                              }}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRenameMediaAsset && onRenameMediaAsset(asset.id, editingName);
                                setEditingAssetId(null);
                              }}
                              style={{ color: '#34d399', padding: 2 }}
                              title="Save Name (Enter)"
                            >
                              <Check size={11} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAssetId(null);
                              }}
                              style={{ color: '#94a3b8', padding: 2 }}
                              title="Cancel (Esc)"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: '#cbd5e1',
                                flex: 1,
                                cursor: 'text',
                              }}
                              title={`Double click to rename: ${asset.name}`}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingAssetId(asset.id);
                                setEditingName(asset.name);
                              }}
                            >
                              {asset.name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAssetId(asset.id);
                                setEditingName(asset.name);
                              }}
                              style={{ color: '#64748b', padding: 2, opacity: 0.7 }}
                              title="Rename Asset in Editor"
                            >
                              <Edit2 size={10} />
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', justifyContent: 'flex-end' }}>
                          {asset.type !== 'audio' ? (
                            <>
                              {/* Dynamic Video Layers */}
                              {[...videoTracks].reverse().map((vt) => (
                                <button
                                  key={vt.id}
                                  onClick={() => onAddClipToTimeline(asset, vt.id)}
                                  title={`Add footage to ${vt.name}`}
                                  style={{
                                    padding: '2px 5px',
                                    borderRadius: 2,
                                    background: vt.id === 'track-v1' ? '#1d4ed8' : '#1e3a8a',
                                    border: vt.id === 'track-v1' ? '1px solid #2563eb' : '1px solid #3b82f6',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: vt.id === 'track-v1' ? '#ffffff' : '#93c5fd',
                                  }}
                                >
                                  +{vt.code || vt.name.split(' ')[0]}
                                </button>
                              ))}
                              {/* Add to New Layer */}
                              <button
                                onClick={() => onAddClipToTimeline(asset, 'new_video_layer')}
                                title="Add footage to a brand new Video Layer (V...)"
                                style={{
                                  padding: '2px 5px',
                                  borderRadius: 2,
                                  background: '#22222c',
                                  border: '1px solid #47475a',
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: '#e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <Plus size={9} color="#60a5fa" />
                                <span>Layer</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Dynamic Audio Layers */}
                              {audioTracks.map((at) => (
                                <button
                                  key={at.id}
                                  onClick={() => onAddClipToTimeline(asset, at.id)}
                                  title={`Add audio to ${at.name}`}
                                  style={{
                                    padding: '2px 5px',
                                    borderRadius: 2,
                                    background: at.id === 'track-a1' ? '#047857' : '#065f46',
                                    border: at.id === 'track-a1' ? '1px solid #059669' : '1px solid #10b981',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: at.id === 'track-a1' ? '#ffffff' : '#6ee7b7',
                                  }}
                                >
                                  +{at.code || at.name.split(' ')[0]}
                                </button>
                              ))}
                              {/* Add to New Audio Layer */}
                              <button
                                onClick={() => onAddClipToTimeline(asset, 'new_audio_layer')}
                                title="Add audio to a brand new Audio Track (A...)"
                                style={{
                                  padding: '2px 5px',
                                  borderRadius: 2,
                                  background: '#22222c',
                                  border: '1px solid #47475a',
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: '#e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                              >
                                <Plus size={9} color="#34d399" />
                                <span>Layer</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BUILT-IN SOUND FX & MUSIC */}
        {activeTab === 'sfx' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              background: '#131b17',
              border: '1px solid #1c3d2d',
              borderRadius: 4,
              padding: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: '#a7f3d0' }}>
                <Music size={14} color="#10b981" />
                <span>Royalty-Free SFX & Beats</span>
              </div>
              <p style={{ fontSize: 11, color: '#6ee7b7', marginTop: 4, lineHeight: 1.4 }}>
                Instant procedural audio assets. Click to preview or add directly to audio tracks.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BUILTIN_SFX_PRESETS.map((preset) => {
                const isAuditioning = auditioningPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    draggable={true}
                    onDragStart={async (e) => {
                      const asset = await createAssetFromSfxPreset(preset);
                      window.__fylmy_dragged_asset = asset;
                      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'asset', asset }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onDragEnd={() => {
                      window.__fylmy_dragged_asset = null;
                    }}
                    style={{
                      background: '#17171e',
                      border: '1px solid #282835',
                      borderRadius: 4,
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      cursor: 'grab',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
                      <button
                        onClick={() => handleAuditionSfx(preset)}
                        title={isAuditioning ? 'Stop Preview' : 'Audition Sound'}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: isAuditioning ? '#10b981' : '#22222d',
                          border: isAuditioning ? '1px solid #34d399' : '1px solid #383848',
                          color: isAuditioning ? '#042f2e' : '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          cursor: 'pointer',
                        }}
                      >
                        {isAuditioning ? <Pause size={10} /> : <Play size={10} style={{ marginLeft: 1 }} />}
                      </button>

                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {preset.name}
                        </div>
                        <div style={{ fontSize: 9, color: '#71717a', display: 'flex', gap: 6, marginTop: 1 }}>
                          <span style={{ color: '#34d399', fontWeight: 600 }}>{preset.category}</span>
                          <span>•</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{preset.duration}s</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {audioTracks.map((at) => (
                        <button
                          key={at.id}
                          onClick={async () => {
                            const asset = await createAssetFromSfxPreset(preset);
                            onAddClipToTimeline(asset, at.id);
                          }}
                          title={`Add to ${at.name}`}
                          style={{
                            padding: '3px 6px',
                            borderRadius: 2,
                            background: '#064e3b',
                            border: '1px solid #059669',
                            fontSize: 9,
                            fontWeight: 700,
                            color: '#a7f3d0',
                            cursor: 'pointer',
                          }}
                        >
                          +{at.code || at.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MASK & CENSOR (KEYFRAMED MOTION TRACKING) */}
        {activeTab === 'blur' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: '#18181f',
              border: '1px solid #2d2d38',
              borderRadius: 4,
              padding: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12, color: '#f1f5f9' }}>
                <Target size={14} color="#f59e0b" />
                <span>Motion Tracking Mask</span>
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5, lineHeight: 1.5 }}>
                Position a blur or mosaic mask over moving faces, vehicle plates, or sensitive content. Keyframe interpolation tracks the target across frames.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <button
                onClick={() => onAddBlurToTimeline('gaussian')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 4,
                  background: '#202028',
                  border: '1px solid #353542',
                  color: '#f1f5f9',
                  fontWeight: 600,
                  fontSize: 12,
                  justifyContent: 'flex-start',
                }}
              >
                <EyeOff size={14} color="#d97706" />
                <span>+ Gaussian Optical Blur Mask</span>
              </button>

              <button
                onClick={() => onAddBlurToTimeline('pixelate')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 4,
                  background: '#202028',
                  border: '1px solid #353542',
                  color: '#f1f5f9',
                  fontWeight: 600,
                  fontSize: 12,
                  justifyContent: 'flex-start',
                }}
              >
                <Target size={14} color="#0284c7" />
                <span>+ Mosaic / Pixelate Censor</span>
              </button>
            </div>

            <div style={{
              background: '#131317',
              borderRadius: 4,
              padding: 10,
              border: '1px solid #24242e',
              fontSize: 10,
              color: '#71717a',
              lineHeight: 1.6,
            }}>
              <strong style={{ color: '#a1a1aa' }}>Tracking Workflow:</strong>
              <ol style={{ paddingLeft: 16, marginTop: 4 }}>
                <li>Add mask to timeline.</li>
                <li>Position the crosshair box on the target in the Program Monitor.</li>
                <li>Scrub playhead forward and adjust position; keyframes (◆) link motion automatically.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 3: TITLES & SUBTITLES */}
        {activeTab === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Social Captions & Title Cards
            </div>

            {[
              {
                title: '⚡ Viral Reel / Shorts Subtitle',
                desc: 'High-retention bold yellow text with outline',
                text: 'WAIT UNTIL THE END! 🤯',
                fontSize: 38,
                color: '#facc15',
                strokeColor: '#000000',
                strokeWidth: 4,
                bgColor: 'rgba(0,0,0,0.85)',
                yPos: 80,
              },
              {
                title: '🔥 Attention-Grabbing Hook',
                desc: 'Top headline to boost video watch-time',
                text: 'HOW TO EDIT LIKE A PRO',
                fontSize: 44,
                color: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 3,
                bgColor: '#2563eb',
                yPos: 20,
              },
              {
                title: '🎙️ Broadcast Lower Third',
                desc: 'Presenter name & role banner',
                text: 'ALEX RIVERA\nLead Video Producer',
                fontSize: 32,
                color: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 0,
                bgColor: 'rgba(18,18,24,0.9)',
                yPos: 84,
              },
              {
                title: '🔔 Subscribe & Like Pill',
                desc: 'Call to action banner for YouTube',
                text: '▶ SUBSCRIBE & TURN ON NOTIFICATIONS',
                fontSize: 30,
                color: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 0,
                bgColor: '#dc2626',
                yPos: 88,
              },
              {
                title: '🚨 Breaking News Alert',
                desc: 'Urgent topic header bar',
                text: 'BREAKING UPDATE:\nImportant Announcement',
                fontSize: 36,
                color: '#fef08a',
                strokeColor: '#000000',
                strokeWidth: 0,
                bgColor: 'rgba(153, 27, 27, 0.95)',
                yPos: 22,
              },
              {
                title: '🎬 Cinematic Feature Title',
                desc: 'Minimalist centered typography',
                text: 'THE FINAL CUT',
                fontSize: 56,
                color: '#ffffff',
                strokeColor: '#000000',
                strokeWidth: 0,
                bgColor: 'transparent',
                yPos: 50,
              },
            ].map((preset, idx) => (
              <div
                key={idx}
                style={{
                  background: '#18181f',
                  border: '1px solid #2b2b36',
                  borderRadius: 4,
                  padding: 9,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {preset.title}
                  </div>
                  <div style={{ fontSize: 10, color: '#71717a', marginTop: 1 }}>{preset.desc}</div>
                </div>
                <button
                  onClick={() => onAddTextToTimeline(preset)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 3,
                    background: '#242430',
                    border: '1px solid #383848',
                    color: '#e2e8f0',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  <Plus size={10} />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: COLOR LUTS */}
        {activeTab === 'filters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Standard Color LUT Presets
            </div>

            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onApplyFilterPreset(preset.filters)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 4,
                  background: '#191920',
                  border: '1px solid #2a2a35',
                  color: '#e2e8f0',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#474758')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a2a35')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Sliders size={13} color="#94a3b8" />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{preset.name}</span>
                </div>
                <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>Apply</span>
              </button>
            ))}

            {!selectedClip && (
              <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                Select a video clip on timeline to apply grade.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
