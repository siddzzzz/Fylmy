import React from 'react';
import { X, Command } from 'lucide-react';

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause playback' },
    { key: 'J / K / L', desc: 'Shuttle controls: Rewind / Pause / Fast-Forward' },
    { key: 'S or C', desc: 'Split clip at current playhead position' },
    { key: 'Shift + S', desc: 'Razor cut across ALL tracks at playhead' },
    { key: 'Delete', desc: 'Delete selected clip' },
    { key: 'Shift + Del', desc: 'Ripple Delete (deletes clip & closes timeline gap)' },
    { key: 'M', desc: 'Add timeline marker / beat bookmark' },
    { key: 'Ctrl + D', desc: 'Duplicate selected clip' },
    { key: 'Ctrl + S', desc: 'Save .fylmy project file' },
    { key: '← / →', desc: 'Step 1 frame backward / forward (1/30s)' },
    { key: 'Home / End', desc: 'Jump to start / end of timeline' },
    { key: 'Ctrl + Z', desc: 'Undo last action' },
    { key: 'Ctrl + Y', desc: 'Redo last action' },
    { key: '?', desc: 'Toggle keyboard shortcuts cheatsheet' },
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 20,
    }}>
      <div style={{
        width: 440,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-header)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>
            <Command size={16} color="#818cf8" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shortcuts.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.desc}</span>
              <kbd style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                padding: '3px 7px',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: '#818cf8',
              }}>
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
