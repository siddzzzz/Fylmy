import React, { useState } from 'react';
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
} from 'lucide-react';
import { formatSecondsOnly, FILTER_PRESETS } from '../types/defaults';

export function MediaBin({
  mediaAssets,
  tracks = [],
  onImportFiles,
  onAddDemoClip,
  onAddDemoAudio,
  onAddClipToTimeline,
  onAddBlurToTimeline,
  onAddTextToTimeline,
  onApplyFilterPreset,
  onAddTrack,
  selectedClip,
  isGeneratingDemo,
}) {
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'blur' | 'text' | 'filters'

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

            {/* Test Clips */}
            <div style={{
              background: '#16161a',
              border: '1px solid #272730',
              borderRadius: 4,
              padding: 9,
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Reference Test Footage
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={onAddDemoClip}
                  disabled={isGeneratingDemo}
                  style={{
                    flex: 1,
                    padding: '5px 7px',
                    borderRadius: 3,
                    background: '#22222a',
                    border: '1px solid #333340',
                    color: '#e2e8f0',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <FileVideo size={12} color="#60a5fa" />
                  <span>{isGeneratingDemo ? 'Generating...' : 'Motion Target (1080p)'}</span>
                </button>
                <button
                  onClick={onAddDemoAudio}
                  disabled={isGeneratingDemo}
                  style={{
                    padding: '5px 7px',
                    borderRadius: 3,
                    background: '#22222a',
                    border: '1px solid #333340',
                    color: '#34d399',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <Music size={12} />
                  <span>Audio Stems</span>
                </button>
              </div>
            </div>

            {/* Asset List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Clips in Bin ({mediaAssets.length})
              </div>

              {mediaAssets.length === 0 ? (
                <div style={{
                  padding: 24,
                  textAlign: 'center',
                  background: '#131317',
                  border: '1px solid #25252e',
                  borderRadius: 4,
                  color: '#64748b',
                  fontSize: 11,
                  lineHeight: 1.5,
                }}>
                  Media pool is empty.<br />
                  Import files or load Reference Footage.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 7 }}>
                  {mediaAssets.map((asset) => (
                    <div
                      key={asset.id}
                      style={{
                        background: '#19191f',
                        borderRadius: 4,
                        overflow: 'hidden',
                        border: '1px solid #282832',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Thumbnail */}
                      <div style={{
                        height: 70,
                        background: '#0d0d10',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
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

                        <div style={{
                          position: 'absolute',
                          bottom: 3,
                          right: 3,
                          background: 'rgba(0,0,0,0.8)',
                          padding: '1px 4px',
                          borderRadius: 2,
                          fontSize: 9,
                          fontWeight: 600,
                          fontFamily: 'var(--font-mono)',
                          color: '#e2e8f0',
                        }}>
                          {formatSecondsOnly(asset.duration)}
                        </div>
                      </div>

                      {/* Info & Multi-Layer Add Options */}
                      <div style={{ padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: '#cbd5e1',
                        }} title={asset.name}>
                          {asset.name}
                        </span>

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

        {/* TAB 2: MASK & CENSOR (KEYFRAMED MOTION TRACKING) */}
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

        {/* TAB 3: TITLES */}
        {activeTab === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Standard Title Cards
            </div>

            {[
              {
                title: 'Broadcast Lower Third',
                desc: 'Clean matte bar with presenter credit',
                text: 'SPEAKER NAME\nLead Video Editor',
                fontSize: 34,
                color: '#ffffff',
                bgColor: 'rgba(18,18,22,0.85)',
                yPos: 82,
              },
              {
                title: 'Main Feature Title',
                desc: 'Minimalist centered headline',
                text: 'FEATURE FILM TITLE',
                fontSize: 56,
                color: '#ffffff',
                bgColor: 'transparent',
                yPos: 50,
              },
              {
                title: 'Subtitle Translation',
                desc: 'Accented dialog caption',
                text: 'Dialogue spoken here with crisp contrast.',
                fontSize: 32,
                color: '#fbbf24',
                bgColor: 'rgba(0,0,0,0.75)',
                yPos: 88,
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
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{preset.title}</div>
                  <div style={{ fontSize: 10, color: '#71717a' }}>{preset.desc}</div>
                </div>
                <button
                  onClick={() => onAddTextToTimeline(preset)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 3,
                    background: '#252530',
                    border: '1px solid #383847',
                    color: '#d4d4d8',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <Plus size={11} />
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
