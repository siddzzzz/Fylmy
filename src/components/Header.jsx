import React, { useState } from 'react';
import {
  Film,
  Monitor,
  Smartphone,
  Square,
  Layout,
  Download,
  RotateCcw,
  RotateCw,
  HelpCircle,
  SlidersHorizontal,
  Clock,
} from 'lucide-react';
import { ASPECT_RATIOS } from '../types/defaults';

export function Header({
  projectName,
  setProjectName,
  aspectRatio,
  setAspectRatio,
  durationMode = 'auto',
  setDurationMode,
  customDuration = 30,
  setCustomDuration,
  totalDuration = 10,
  maxClipEndTime = 0,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenExport,
  onOpenShortcuts,
}) {
  const [aspectDropdownOpen, setAspectDropdownOpen] = useState(false);
  const [durationDropdownOpen, setDurationDropdownOpen] = useState(false);
  const currentAspect = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['16:9'];

  const getAspectIcon = (ratioKey) => {
    switch (ratioKey) {
      case '16:9': return <Monitor size={14} />;
      case '9:16': return <Smartphone size={14} />;
      case '1:1': return <Square size={14} />;
      case '4:5': return <Layout size={14} />;
      case '21:9': return <Film size={14} />;
      default: return <Monitor size={14} />;
    }
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-header)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 14px',
      position: 'relative',
      zIndex: 50,
    }}>
      {/* Left: Professional Brand & Project Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 8px',
          background: '#1d1d23',
          border: '1px solid #2d2d38',
          borderRadius: 4,
        }}>
          <Film size={15} color="#94a3b8" />
          <span style={{
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '1.2px',
            color: '#f8fafc',
          }}>
            FYLMY
          </span>
        </div>

        {/* Project Name editable */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Project Name"
          style={{
            background: '#121215',
            border: '1px solid #272730',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 9px',
            borderRadius: 4,
            outline: 'none',
            width: 170,
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
          onBlur={(e) => (e.target.style.borderColor = '#272730')}
        />

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            style={{
              padding: '5px 7px',
              borderRadius: 4,
              background: '#1a1a20',
              border: '1px solid #2a2a34',
              color: canUndo ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            style={{
              padding: '5px 7px',
              borderRadius: 4,
              background: '#1a1a20',
              border: '1px solid #2a2a34',
              color: canRedo ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* Center Group: Aspect Ratio & Duration Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Aspect Ratio Selector with Quick Social Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setAspectDropdownOpen(!aspectDropdownOpen);
                setDurationDropdownOpen(false);
              }}
              style={{
                background: '#1a1a20',
                border: '1px solid #2c2c36',
                padding: '5px 11px',
                borderRadius: 4,
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {getAspectIcon(aspectRatio)}
              <span>{currentAspect.name}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>▼</span>
            </button>

            {aspectDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginTop: 5,
                  background: '#16161b',
                  border: '1px solid #32323e',
                  borderRadius: 6,
                  padding: 4,
                  minWidth: 260,
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', padding: '6px 8px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Canvas Format Presets
                </div>
                {Object.entries(ASPECT_RATIOS).map(([key, item]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setAspectRatio(key);
                      setAspectDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '7px 8px',
                      borderRadius: 4,
                      textAlign: 'left',
                      background: aspectRatio === key ? '#232734' : 'transparent',
                      color: aspectRatio === key ? '#60a5fa' : 'var(--text-primary)',
                      border: aspectRatio === key ? '1px solid #2e4374' : '1px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (aspectRatio !== key) e.currentTarget.style.background = '#1f1f26';
                    }}
                    onMouseLeave={(e) => {
                      if (aspectRatio !== key) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {getAspectIcon(key)}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick 1-Click Social Format Buttons */}
          <button
            onClick={() => setAspectRatio('16:9')}
            title="1-Click YouTube Widescreen (16:9)"
            style={{
              padding: '4px 7px',
              borderRadius: 3,
              fontSize: 11,
              fontWeight: aspectRatio === '16:9' ? 700 : 500,
              background: aspectRatio === '16:9' ? '#1e2d4a' : '#141418',
              border: aspectRatio === '16:9' ? '1px solid #3b82f6' : '1px solid #24242e',
              color: aspectRatio === '16:9' ? '#93c5fd' : '#71717a',
            }}
          >
            16:9
          </button>
          <button
            onClick={() => setAspectRatio('9:16')}
            title="1-Click TikTok / Reels / Shorts (9:16)"
            style={{
              padding: '4px 7px',
              borderRadius: 3,
              fontSize: 11,
              fontWeight: aspectRatio === '9:16' ? 700 : 500,
              background: aspectRatio === '9:16' ? '#2e1c36' : '#141418',
              border: aspectRatio === '9:16' ? '1px solid #c084fc' : '1px solid #24242e',
              color: aspectRatio === '9:16' ? '#f0abfc' : '#71717a',
            }}
          >
            9:16
          </button>
        </div>

        {/* Sequence Duration Selector (Auto Fit Footage vs Custom User-Defined) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setDurationDropdownOpen(!durationDropdownOpen);
              setAspectDropdownOpen(false);
            }}
            style={{
              background: '#1a1a20',
              border: '1px solid #2c2c36',
              padding: '5px 11px',
              borderRadius: 4,
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Sequence Duration Settings"
          >
            <Clock size={13} color="#94a3b8" />
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {totalDuration}s
            </span>
            <span style={{ fontSize: 9, color: durationMode === 'auto' ? '#38bdf8' : '#f59e0b', fontWeight: 700 }}>
              [{durationMode === 'auto' ? 'AUTO' : 'CUSTOM'}]
            </span>
            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>▼</span>
          </button>

          {durationDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: 5,
                background: '#16161b',
                border: '1px solid #32323e',
                borderRadius: 6,
                padding: 10,
                minWidth: 270,
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
                    padding: '6px 4px',
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
                    padding: '6px 4px',
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
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, padding: '4px 2px' }}>
                  Sequence length automatically matches your footage: <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{maxClipEndTime > 0 ? `${maxClipEndTime}s` : '10s (Empty)'}</span>.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
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
                        padding: '5px 8px',
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
      </div>

      {/* Right: Technical Actions & Solid Workstation Deliver Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts"
          style={{
            padding: '5px 9px',
            borderRadius: 4,
            background: '#18181e',
            border: '1px solid #282832',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <HelpCircle size={13} />
          <span>Hotkeys</span>
        </button>

        {/* Deliver / Export CTA Button (Solid Studio Blue, No Purple Gradient) */}
        <button
          onClick={onOpenExport}
          style={{
            padding: '6px 14px',
            borderRadius: 4,
            background: '#2563eb',
            border: '1px solid #3b82f6',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.3px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
        >
          <Download size={13} />
          <span>Export Render</span>
        </button>
      </div>
    </header>
  );
}
