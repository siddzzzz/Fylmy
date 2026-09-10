import React, { useState } from 'react';
import {
  X,
  Download,
  CheckCircle,
  Film,
  Loader,
  AlertCircle,
  HardDrive,
} from 'lucide-react';

export function ExportModal({
  isOpen,
  onClose,
  aspectRatioConfig,
  duration,
  onStartExport,
}) {
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [format, setFormat] = useState('webm');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportResult, setExportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setErrorMsg(null);
    setExportResult(null);

    try {
      const result = await onStartExport({
        resolution,
        fps,
        format,
        onProgress: (p) => setProgress(p),
      });
      setExportResult(result);
    } catch (err) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Export failed. Please check browser permissions.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: 20,
    }}>
      <div style={{
        width: 460,
        background: '#16161b',
        border: '1px solid #2e2e38',
        borderRadius: 6,
        boxShadow: '0 12px 36px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #282832',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#121215',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Film size={15} color="#60a5fa" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Render Deliverable</div>
              <div style={{ fontSize: 10, color: '#71717a' }}>Offline high-definition video export</div>
            </div>
          </div>
          {!isExporting && (
            <button onClick={onClose} style={{ color: '#71717a', padding: 3 }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isExporting && !exportResult && (
            <>
              {/* Resolution selection */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Resolution Output
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { id: '720p', label: '720p HD', desc: '1280 × 720' },
                    { id: '1080p', label: '1080p FHD', desc: '1920 × 1080' },
                    { id: '4k', label: '4K UHD', desc: '3840 × 2160' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      onClick={() => setResolution(res.id)}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 4,
                        background: resolution === res.id ? '#202738' : '#18181f',
                        border: resolution === res.id ? '1px solid #3b82f6' : '1px solid #282832',
                        color: resolution === res.id ? '#ffffff' : '#94a3b8',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{res.label}</span>
                      <span style={{ fontSize: 9, color: resolution === res.id ? '#93c5fd' : '#64748b' }}>{res.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate & Format */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Timebase
                  </label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 4,
                      background: '#18181f',
                      border: '1px solid #282832',
                      color: '#f8fafc',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  >
                    <option value={30}>30.00 fps (Broadcast)</option>
                    <option value={60}>60.00 fps (High Motion)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Format Container
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 4,
                      background: '#18181f',
                      border: '1px solid #282832',
                      color: '#f8fafc',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  >
                    <option value="webm">WebM (VP9 Codec)</option>
                    <option value="mp4">MP4 (H.264 AVC)</option>
                  </select>
                </div>
              </div>

              {/* Summary info box */}
              <div style={{
                background: '#121215',
                border: '1px solid #24242e',
                borderRadius: 4,
                padding: 10,
                fontSize: 11,
                color: '#71717a',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Framing: <strong style={{ color: '#cbd5e1' }}>{aspectRatioConfig.name}</strong></span>
                <span>Duration: <strong style={{ color: '#cbd5e1' }}>{duration.toFixed(1)}s</strong></span>
              </div>
            </>
          )}

          {/* Rendering Progress */}
          {isExporting && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 4,
                background: '#1b2234',
                border: '1px solid #2e4168',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Loader size={20} color="#60a5fa" style={{ animation: 'spin 1.5s linear infinite' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                  Encoding Video Stream... {progress}%
                </div>
                <div style={{ fontSize: 11, color: '#71717a', marginTop: 3 }}>
                  Compositing frames, motion-tracking masks, and audio busses...
                </div>
              </div>

              {/* Progress bar (Studio Blue, No Purple) */}
              <div style={{
                width: '100%',
                height: 6,
                background: '#1a1a20',
                border: '1px solid #2b2b36',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: '#2563eb',
                  transition: 'width 0.15s ease-out',
                }} />
              </div>
            </div>
          )}

          {/* Export Complete State */}
          {exportResult && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 4,
                background: '#13281d',
                border: '1px solid #1e4b33',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle size={22} color="#10b981" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                  Render Job Complete
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                  Your video has been rendered without watermarks.
                </div>
              </div>

              {/* Download Button */}
              <a
                href={exportResult.downloadUrl}
                download={exportResult.filename}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 20px',
                  borderRadius: 4,
                  background: '#059669',
                  border: '1px solid #10b981',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 12,
                  textDecoration: 'none',
                }}
              >
                <Download size={14} />
                <span>Save Video File</span>
              </a>
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: '#221515',
              border: '1px solid #451a1a',
              borderRadius: 4,
              padding: 9,
              fontSize: 11,
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}>
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          background: '#121215',
          borderTop: '1px solid #282832',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}>
          {!isExporting && (
            <button
              onClick={onClose}
              style={{
                padding: '5px 12px',
                borderRadius: 4,
                background: '#1a1a20',
                border: '1px solid #2a2a34',
                color: '#94a3b8',
                fontSize: 12,
              }}
            >
              {exportResult ? 'Close' : 'Cancel'}
            </button>
          )}

          {!isExporting && !exportResult && (
            <button
              onClick={handleExport}
              style={{
                padding: '5px 16px',
                borderRadius: 4,
                background: '#2563eb',
                border: '1px solid #3b82f6',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              Start Render
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
