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
} from 'lucide-react';
import { ASPECT_RATIOS } from '../types/defaults';

export function Header({
  projectName,
  setProjectName,
  aspectRatio,
  setAspectRatio,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenExport,
  onOpenShortcuts,
}) {
  const [aspectDropdownOpen, setAspectDropdownOpen] = useState(false);
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

      {/* Center: Workstation Aspect Ratio Selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setAspectDropdownOpen(!aspectDropdownOpen)}
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
