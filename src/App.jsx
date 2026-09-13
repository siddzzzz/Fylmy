import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { MediaBin } from './components/MediaBin';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Timeline } from './components/Timeline';
import { Inspector } from './components/Inspector';
import { ExportModal } from './components/ExportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

import { Compositor } from './engine/Compositor';
import { AudioEngine } from './engine/AudioEngine';
import { renderAndExportVideo } from './engine/ExportEngine';
import {
  ASPECT_RATIOS,
  DEFAULT_TRACKS,
  calculateEffectiveVolume,
} from './types/defaults';
import {
  processImportedFile,
} from './utils/sampleMedia';

export default function App() {
  // --- Project State ---
  const [projectName, setProjectName] = useState('Untitled Sequence 1');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [customResolution, setCustomResolution] = useState({ width: 1280, height: 720 });
  const [tracks, setTracks] = useState(DEFAULT_TRACKS);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [pxPerSecond, setPxPerSecond] = useState(55);
  const [zoomLevel, setZoomLevel] = useState('fit');

  // --- Duration Management (Auto-match clips vs User-defined Custom) ---
  const [durationMode, setDurationMode] = useState('auto'); // 'auto' | 'custom'
  const [customDuration, setCustomDuration] = useState(30);

  // --- Timeline Height (Vertically Resizable / Expandable) ---
  const [timelineHeight, setTimelineHeight] = useState(290);

  // --- Modals State ---
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // --- Undo / Redo History ---
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // --- References & Engines ---
  const canvasRef = useRef(null);
  const compositorRef = useRef(null);
  const audioEngineRef = useRef(null);
  const mediaElementsRef = useRef(new Map());
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Aspect ratio configuration (preset or custom resolution)
  const currentAspectConfig = useMemo(() => {
    if (aspectRatio === 'custom') {
      const w = Math.max(100, Math.min(7680, customResolution.width || 1920));
      const h = Math.max(100, Math.min(4320, customResolution.height || 1080));
      return {
        name: `Custom (${w} × ${h})`,
        label: `${w} × ${h} (User Defined)`,
        width: w,
        height: h,
        ratio: w / h,
        icon: 'SlidersHorizontal',
      };
    }
    return ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['16:9'];
  }, [aspectRatio, customResolution]);

  // Initialize Engines
  useEffect(() => {
    if (canvasRef.current && !compositorRef.current) {
      compositorRef.current = new Compositor(canvasRef.current);
    }
    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioEngine();
    }
  }, []);

  // Compute total timeline duration based on actual video footage length or custom choice
  const maxClipEndTime = useMemo(() => {
    let max = 0;
    for (const t of tracks) {
      for (const c of t.clips) {
        if (c.start + c.duration > max) {
          max = c.start + c.duration;
        }
      }
    }
    return Math.round(max * 100) / 100;
  }, [tracks]);

  const totalDuration = useMemo(() => {
    if (durationMode === 'custom') {
      return Math.max(1, customDuration);
    }
    // Auto mode: exactly match the end of the longest footage, or 10s if timeline is empty
    return maxClipEndTime > 0 ? maxClipEndTime : 10;
  }, [maxClipEndTime, durationMode, customDuration]);

  // Selected clip helper
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const t of tracks) {
      const found = t.clips.find((c) => c.id === selectedClipId);
      if (found) {
        return { ...found, trackType: t.type, trackId: t.id };
      }
    }
    return null;
  }, [tracks, selectedClipId]);

  // Record History State for Undo/Redo
  const pushHistory = useCallback((newTracks) => {
    setHistory((prev) => {
      const upToNow = prev.slice(0, historyIndex + 1);
      return [...upToNow, JSON.parse(JSON.stringify(newTracks))];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevTracks = history[historyIndex - 1];
      setTracks(JSON.parse(JSON.stringify(prevTracks)));
      setHistoryIndex((idx) => idx - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextTracks = history[historyIndex + 1];
      setTracks(JSON.parse(JSON.stringify(nextTracks)));
      setHistoryIndex((idx) => idx + 1);
    }
  }, [history, historyIndex]);

  // Setup media elements for any new assets & clips (ensures independent decode pipeline per clip)
  useEffect(() => {
    // 1. Maintain asset-level fallback elements
    mediaAssets.forEach((asset) => {
      if (!mediaElementsRef.current.has(asset.id)) {
        if (asset.type === 'video') {
          const vid = document.createElement('video');
          vid.src = asset.url;
          vid.crossOrigin = 'anonymous';
          vid.muted = false;
          vid.playsInline = true;
          vid.preload = 'auto';
          mediaElementsRef.current.set(asset.id, vid);
        } else if (asset.type === 'audio') {
          const aud = document.createElement('audio');
          aud.src = asset.url;
          aud.preload = 'auto';
          mediaElementsRef.current.set(asset.id, aud);
        } else if (asset.type === 'image') {
          const img = new Image();
          img.src = asset.url;
          mediaElementsRef.current.set(asset.id, img);
        }
      }
    });

    // 2. Instantiate dedicated media elements per timeline clip (prevents multi-clip/multi-track collision)
    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.assetId && !mediaElementsRef.current.has(clip.id)) {
          const asset = mediaAssets.find((a) => a.id === clip.assetId);
          if (asset) {
            if (asset.type === 'video') {
              const vid = document.createElement('video');
              vid.src = asset.url;
              vid.crossOrigin = 'anonymous';
              vid.muted = false;
              vid.playsInline = true;
              vid.preload = 'auto';
              mediaElementsRef.current.set(clip.id, vid);
            } else if (asset.type === 'audio') {
              const aud = document.createElement('audio');
              aud.src = asset.url;
              aud.preload = 'auto';
              mediaElementsRef.current.set(clip.id, aud);
            } else if (asset.type === 'image') {
              const img = new Image();
              img.src = asset.url;
              mediaElementsRef.current.set(clip.id, img);
            }
          }
        }
      });
    });
  }, [mediaAssets, tracks]);

  const currentTimeRef = useRef(currentTime);
  const lastUiTimeUpdateRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Master Render Canvas Frame
  const renderFrame = useCallback((t) => {
    if (compositorRef.current) {
      compositorRef.current.renderFrame({
        currentTime: t,
        tracks,
        mediaElements: mediaElementsRef.current,
        aspectRatioConfig: currentAspectConfig,
        activeClipId: selectedClipId,
        previewMode: true,
      });
    }
  }, [tracks, currentAspectConfig, selectedClipId]);

  // Seek and sync all media elements to a specific timestamp
  const seekAllMedia = useCallback((targetTime, playing) => {
    for (const track of tracks) {
      for (const clip of track.clips) {
        const mediaEl = mediaElementsRef.current.get(clip.id) || mediaElementsRef.current.get(clip.assetId);
        if (!mediaEl) continue;

        const isClipActive = targetTime >= clip.start && targetTime < clip.start + clip.duration;

        if (isClipActive) {
          const relTime = targetTime - clip.start;
          const desiredMediaTime = relTime * (clip.speed || 1) + (clip.offset || 0);
          const effectiveClipVol = calculateEffectiveVolume(clip, relTime);

          // Connect Web Audio
          if (audioEngineRef.current && (mediaEl instanceof HTMLVideoElement || mediaEl instanceof HTMLAudioElement)) {
            audioEngineRef.current.connectMediaElement(
              mediaEl,
              track.volume,
              effectiveClipVol,
              track.muted
            );
          }

          if (mediaEl instanceof HTMLVideoElement || mediaEl instanceof HTMLAudioElement) {
            mediaEl.playbackRate = clip.speed || 1;

            // Only seek if difference is noticeable (> 40ms)
            if (Math.abs(mediaEl.currentTime - desiredMediaTime) > 0.04) {
              mediaEl.currentTime = Math.max(0, desiredMediaTime);
            }

            if (playing) {
              if (mediaEl.paused) {
                mediaEl.play().catch(() => {});
              }
            } else {
              if (!mediaEl.paused) {
                mediaEl.pause();
              }
            }
          }
        } else {
          // Pause media outside active duration
          if (mediaEl instanceof HTMLVideoElement || mediaEl instanceof HTMLAudioElement) {
            if (!mediaEl.paused) {
              mediaEl.pause();
            }
          }
        }
      }
    }
  }, [tracks]);

  // High-performance smooth animation frame playback loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      renderFrame(currentTimeRef.current);
      return;
    }

    let animId = null;

    const tick = (now) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // High precision monotonic delta progression
      let nextTime = currentTimeRef.current + deltaSec;

      // Find primary active video/audio element to maintain audio-video lock without jitter
      let masterEl = null;
      let masterClip = null;

      for (const track of tracks) {
        if (track.muted) continue;
        for (const clip of track.clips) {
          const el = mediaElementsRef.current.get(clip.id) || mediaElementsRef.current.get(clip.assetId);
          if (el instanceof HTMLVideoElement && !el.paused && el.readyState >= 2) {
            const isInside = nextTime >= clip.start && nextTime < clip.start + clip.duration;
            if (isInside) {
              masterEl = el;
              masterClip = clip;
              break;
            }
          }
        }
        if (masterEl) break;
      }

      if (masterEl && masterClip) {
        // Direct sync with hardware decoded video time with soft low-pass filter (zero stutter / zero jumping)
        const videoClockTime = masterClip.start + (masterEl.currentTime - (masterClip.offset || 0)) / (masterClip.speed || 1);
        if (!isNaN(videoClockTime) && videoClockTime >= 0) {
          const drift = videoClockTime - nextTime;
          if (Math.abs(drift) > 0.3) {
            nextTime = videoClockTime;
          } else if (Math.abs(drift) > 0.03) {
            nextTime += drift * 0.12;
          }
        }
      }

      // Check sequence boundaries
      if (nextTime >= totalDuration) {
        setIsPlaying(false);
        currentTimeRef.current = 0;
        seekAllMedia(0, false);
        renderFrame(0);
        setCurrentTime(0);
        return;
      }

      // Manage clip transitions and real-time dynamic volume automation curve
      for (const track of tracks) {
        for (const clip of track.clips) {
          const mediaEl = mediaElementsRef.current.get(clip.id) || mediaElementsRef.current.get(clip.assetId);
          if (!mediaEl || !(mediaEl instanceof HTMLVideoElement || mediaEl instanceof HTMLAudioElement)) continue;

          const isClipActive = nextTime >= clip.start && nextTime < clip.start + clip.duration;

          if (isClipActive) {
            const relTime = nextTime - clip.start;
            const desiredMediaTime = relTime * (clip.speed || 1) + (clip.offset || 0);

            // Dynamically modulate audio volume (Filmora keyframes & fades curve)
            if (audioEngineRef.current) {
              const effectiveVol = calculateEffectiveVolume(clip, relTime);
              audioEngineRef.current.connectMediaElement(
                mediaEl,
                track.volume,
                effectiveVol,
                track.muted
              );
            }

            if (mediaEl.paused) {
              mediaEl.playbackRate = clip.speed || 1;
              mediaEl.currentTime = Math.max(0, desiredMediaTime);
              mediaEl.play().catch(() => {});
            } else if (mediaEl !== masterEl) {
              // Secondary stream (audio/overlay): only re-sync on significant drift (> 250ms)
              if (Math.abs(mediaEl.currentTime - desiredMediaTime) > 0.25) {
                mediaEl.currentTime = Math.max(0, desiredMediaTime);
              }
            }
          } else {
            if (!mediaEl.paused) {
              mediaEl.pause();
            }
          }
        }
      }

      currentTimeRef.current = nextTime;
      renderFrame(nextTime);

      // Throttle React state updates to ~30fps to avoid virtual DOM thrashing during 60fps canvas rendering
      if (now - lastUiTimeUpdateRef.current >= 32 || nextTime >= totalDuration) {
        lastUiTimeUpdateRef.current = now;
        setCurrentTime(nextTime);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, totalDuration, tracks, renderFrame, seekAllMedia]);

  // Manual Seek
  const handleSeek = useCallback((time) => {
    const clamped = Math.max(0, Math.min(totalDuration, time));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    seekAllMedia(clamped, isPlaying);
    renderFrame(clamped);
  }, [totalDuration, isPlaying, seekAllMedia, renderFrame]);

  // Frame Stepper
  const handleStepFrame = useCallback((direction) => {
    handleSeek(currentTimeRef.current + direction * (1 / 30));
  }, [handleSeek]);

  // Play / Pause Toggle
  const handleTogglePlay = useCallback(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.resume();
    }
    setIsPlaying((prev) => {
      const nextPlaying = !prev;
      seekAllMedia(currentTimeRef.current, nextPlaying);
      return nextPlaying;
    });
  }, [seekAllMedia]);

  // --- Track / Clip Mutations ---

  // Move clip between tracks (cross-track dragging or layer re-assignment)
  const handleMoveClipToTrack = useCallback((clipId, targetTrackId, newStart = null) => {
    setTracks((prevTracks) => {
      let movedClip = null;
      let clipTrackType = 'video';

      for (const t of prevTracks) {
        const found = t.clips.find((c) => c.id === clipId);
        if (found) {
          clipTrackType = t.type;
          movedClip = { ...found };
          if (newStart !== null) {
            movedClip.start = Math.max(0, Math.round(newStart * 100) / 100);
          }
          break;
        }
      }
      if (!movedClip) return prevTracks;

      let actualTargetTrackId = targetTrackId;
      let newTrackToInsert = null;

      if (targetTrackId === 'new_layer' || targetTrackId === 'new_video_layer' || targetTrackId === 'new_audio_layer') {
        if (clipTrackType === 'audio' || targetTrackId === 'new_audio_layer') {
          const audioTrackCount = prevTracks.filter((t) => t.type === 'audio').length + 1;
          actualTargetTrackId = 'track-a' + audioTrackCount;
          newTrackToInsert = {
            id: actualTargetTrackId,
            name: `A${audioTrackCount} (Audio)`,
            code: `A${audioTrackCount}`,
            type: 'audio',
            height: 40,
            muted: false,
            locked: false,
            volume: 1,
            color: '#065f46',
            accent: '#10b981',
            clips: [],
          };
        } else {
          const videoTrackCount = prevTracks.filter((t) => t.type === 'video').length + 1;
          actualTargetTrackId = 'track-v' + videoTrackCount;
          newTrackToInsert = {
            id: actualTargetTrackId,
            name: `V${videoTrackCount} (Overlay)`,
            code: `V${videoTrackCount}`,
            type: 'video',
            height: 44,
            muted: false,
            locked: false,
            volume: 1,
            color: '#1e3a8a',
            accent: '#3b82f6',
            clips: [],
          };
        }
      }

      movedClip.trackId = actualTargetTrackId;
      pushHistory(prevTracks);

      let workingTracks = prevTracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      }));

      if (newTrackToInsert) {
        if (newTrackToInsert.type === 'video') {
          workingTracks = [newTrackToInsert, ...workingTracks];
        } else {
          workingTracks = [...workingTracks, newTrackToInsert];
        }
      }

      return workingTracks.map((t) =>
        t.id === actualTargetTrackId ? { ...t, clips: [...t.clips, movedClip] } : t
      );
    });
  }, [pushHistory]);

  // Add a new track (e.g. V3, V4, A3)
  const handleAddTrack = useCallback((type = 'video') => {
    setTracks((prevTracks) => {
      pushHistory(prevTracks);
      if (type === 'video') {
        const videoTrackCount = prevTracks.filter((t) => t.type === 'video').length + 1;
        const newTrack = {
          id: 'track-v' + videoTrackCount,
          name: `V${videoTrackCount} (Overlay)`,
          code: `V${videoTrackCount}`,
          type: 'video',
          height: 44,
          muted: false,
          locked: false,
          volume: 1,
          color: '#1e3a8a',
          accent: '#3b82f6',
          clips: [],
        };
        // Add new video track at the top
        return [newTrack, ...prevTracks];
      } else {
        const audioTrackCount = prevTracks.filter((t) => t.type === 'audio').length + 1;
        const newTrack = {
          id: 'track-a' + audioTrackCount,
          name: `A${audioTrackCount} (Audio)`,
          code: `A${audioTrackCount}`,
          type: 'audio',
          height: 40,
          muted: false,
          locked: false,
          volume: 1,
          color: '#065f46',
          accent: '#10b981',
          clips: [],
        };
        return [...prevTracks, newTrack];
      }
    });
  }, [pushHistory]);

  // Delete an unused or empty track
  const handleDeleteTrack = useCallback((trackId) => {
    setTracks((prevTracks) => {
      const trackToDelete = prevTracks.find((t) => t.id === trackId);
      if (!trackToDelete) return prevTracks;

      // Keep at least 1 video track and 1 audio track
      const sameTypeCount = prevTracks.filter((t) => t.type === trackToDelete.type).length;
      if (sameTypeCount <= 1 && (trackToDelete.type === 'video' || trackToDelete.type === 'audio')) {
        return prevTracks;
      }
      if (trackToDelete.type === 'blur' || trackToDelete.type === 'text') {
        return prevTracks;
      }

      pushHistory(prevTracks);
      return prevTracks.filter((t) => t.id !== trackId);
    });
  }, [pushHistory]);

  const handleUpdateClip = useCallback((clipId, updates) => {
    setTracks((prevTracks) => {
      const nextTracks = prevTracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
      }));
      return nextTracks;
    });
  }, []);

  const handleDeleteClip = useCallback((clipId) => {
    if (!clipId) return;
    setTracks((prevTracks) => {
      pushHistory(prevTracks);
      return prevTracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      }));
    });
    if (selectedClipId === clipId) setSelectedClipId(null);
  }, [selectedClipId, pushHistory]);

  const handleDuplicateClip = useCallback(() => {
    if (!selectedClip) return;
    const duplicated = {
      ...JSON.parse(JSON.stringify(selectedClip)),
      id: 'clip-' + Math.random().toString(36).substring(2, 9),
      name: `${selectedClip.name} (Copy)`,
      start: selectedClip.start + selectedClip.duration + 0.5,
    };

    setTracks((prevTracks) => {
      pushHistory(prevTracks);
      return prevTracks.map((t) => {
        if (t.id === selectedClip.trackId) {
          return { ...t, clips: [...t.clips, duplicated] };
        }
        return t;
      });
    });
    setSelectedClipId(duplicated.id);
  }, [selectedClip, pushHistory]);

  // Split clip at playhead
  const handleSplitClip = useCallback(() => {
    if (!selectedClip) return;
    const splitTime = currentTime;

    // Check if playhead is strictly inside the clip duration
    if (splitTime <= selectedClip.start || splitTime >= selectedClip.start + selectedClip.duration) {
      return;
    }

    const firstDuration = splitTime - selectedClip.start;
    const secondDuration = selectedClip.duration - firstDuration;
    const secondOffset = (selectedClip.offset || 0) + firstDuration * (selectedClip.speed || 1);

    const firstClip = {
      ...selectedClip,
      duration: Math.round(firstDuration * 100) / 100,
    };

    const secondClip = {
      ...JSON.parse(JSON.stringify(selectedClip)),
      id: 'clip-' + Math.random().toString(36).substring(2, 9),
      name: `${selectedClip.name} (Part 2)`,
      start: Math.round(splitTime * 100) / 100,
      duration: Math.round(secondDuration * 100) / 100,
      offset: Math.round(secondOffset * 100) / 100,
    };

    setTracks((prevTracks) => {
      pushHistory(prevTracks);
      return prevTracks.map((t) => {
        if (t.id === selectedClip.trackId) {
          return {
            ...t,
            clips: t.clips.map((c) => (c.id === selectedClip.id ? firstClip : c)).concat(secondClip),
          };
        }
        return t;
      });
    });

    setSelectedClipId(secondClip.id);
  }, [selectedClip, currentTime, pushHistory]);

  // Keyframe Blur Tracking Management
  const handleUpdateBlurKeyframe = useCallback((clipId, relativeTime, newProps) => {
    setTracks((prevTracks) => {
      return prevTracks.map((t) => {
        if (t.type !== 'blur') return t;
        return {
          ...t,
          clips: t.clips.map((c) => {
            if (c.id !== clipId) return c;

            const existingKf = (c.keyframes || []).find((k) => Math.abs(k.time - relativeTime) < 0.15);
            let updatedKeyframes;

            if (existingKf) {
              updatedKeyframes = c.keyframes.map((k) =>
                k.id === existingKf.id ? { ...k, ...newProps } : k
              );
            } else {
              const newKf = {
                id: 'kf-' + Math.random().toString(36).substring(2, 7),
                time: Math.round(relativeTime * 100) / 100,
                x: newProps.x ?? 40,
                y: newProps.y ?? 40,
                width: newProps.width ?? 20,
                height: newProps.height ?? 20,
                intensity: newProps.intensity ?? c.intensity ?? 25,
              };
              updatedKeyframes = [...(c.keyframes || []), newKf].sort((a, b) => a.time - b.time);
            }

            return { ...c, keyframes: updatedKeyframes };
          }),
        };
      });
    });
  }, []);

  const handleAddKeyframeAtPlayhead = useCallback(() => {
    if (!selectedClip || selectedClip.trackType !== 'blur') return;
    const relTime = Math.max(0, Math.min(selectedClip.duration, currentTime - selectedClip.start));

    if (compositorRef.current) {
      const cur = compositorRef.current.getInterpolatedKeyframe(selectedClip.keyframes, relTime);
      handleUpdateBlurKeyframe(selectedClip.id, relTime, {
        x: cur.x,
        y: cur.y,
        width: cur.width,
        height: cur.height,
      });
    }
  }, [selectedClip, currentTime, handleUpdateBlurKeyframe]);

  const handleDeleteKeyframe = useCallback((clipId, kfId) => {
    setTracks((prevTracks) => {
      return prevTracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          return {
            ...c,
            keyframes: (c.keyframes || []).filter((k) => k.id !== kfId),
          };
        }),
      }));
    });
  }, []);

  // Track Header Actions
  const handleToggleMuteTrack = useCallback((trackId) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)));
  }, []);

  const handleToggleLockTrack = useCallback((trackId) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, locked: !t.locked } : t)));
  }, []);

  // --- Add Items to Timeline (Single / Atomic) ---

  const handleAddClipToTimeline = useCallback((asset, specificTrackId = null, startTime = null) => {
    setTracks((prevTracks) => {
      let targetTrackId = specificTrackId;
      let newTrackToInsert = null;

      if (targetTrackId === 'new_layer' || targetTrackId === 'new_video_layer' || targetTrackId === 'new_audio_layer') {
        if (asset.type === 'audio' || targetTrackId === 'new_audio_layer') {
          const audioTrackCount = prevTracks.filter((t) => t.type === 'audio').length + 1;
          targetTrackId = 'track-a' + audioTrackCount;
          newTrackToInsert = {
            id: targetTrackId,
            name: `A${audioTrackCount} (Audio)`,
            code: `A${audioTrackCount}`,
            type: 'audio',
            height: 40,
            muted: false,
            locked: false,
            volume: 1,
            color: '#065f46',
            accent: '#10b981',
            clips: [],
          };
        } else {
          const videoTrackCount = prevTracks.filter((t) => t.type === 'video').length + 1;
          targetTrackId = 'track-v' + videoTrackCount;
          newTrackToInsert = {
            id: targetTrackId,
            name: `V${videoTrackCount} (Overlay)`,
            code: `V${videoTrackCount}`,
            type: 'video',
            height: 44,
            muted: false,
            locked: false,
            volume: 1,
            color: '#1e3a8a',
            accent: '#3b82f6',
            clips: [],
          };
        }
      } else if (!targetTrackId) {
        if (asset.type === 'audio') {
          targetTrackId = 'track-a1';
        } else {
          if (selectedClip && selectedClip.trackType === 'video') {
            targetTrackId = selectedClip.trackId;
          } else {
            targetTrackId = 'track-v1';
          }
        }
      }

      const nextStart = startTime !== null ? Math.max(0, startTime) : currentTime;
      const isBaseTrack = targetTrackId === 'track-v1';
      const newClip = {
        id: 'clip-' + Math.random().toString(36).substring(2, 9),
        trackId: targetTrackId,
        assetId: asset.id,
        name: asset.name,
        start: Math.round(nextStart * 100) / 100,
        duration: Math.round((asset.duration || 6) * 100) / 100,
        offset: 0,
        assetDuration: asset.duration || 6,
        speed: 1,
        volume: 1,
        transform: {
          x: isBaseTrack ? 0 : 35,
          y: isBaseTrack ? 0 : -25,
          scale: isBaseTrack ? 1 : 0.65,
          rotation: 0,
          opacity: 1,
          fitMode: 'contain',
          mirrorBlurBg: isBaseTrack,
        },
        filters: {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          temperature: 0,
          vignette: 0,
        },
      };

      pushHistory(prevTracks);

      let workingTracks = [...prevTracks];
      if (newTrackToInsert) {
        if (newTrackToInsert.type === 'video') {
          // Add new video track at the top
          workingTracks = [newTrackToInsert, ...workingTracks];
        } else {
          workingTracks = [...workingTracks, newTrackToInsert];
        }
      }

      // Check if target track exists
      const trackExists = workingTracks.some((t) => t.id === targetTrackId);
      if (!trackExists) {
        const fallbackTrack = workingTracks.find((t) => t.type === (asset.type === 'audio' ? 'audio' : 'video'));
        if (fallbackTrack) {
          targetTrackId = fallbackTrack.id;
          newClip.trackId = targetTrackId;
        }
      }

      setTimeout(() => setSelectedClipId(newClip.id), 0);

      return workingTracks.map((t) =>
        t.id === targetTrackId ? { ...t, clips: [...t.clips, newClip] } : t
      );
    });
  }, [selectedClip, currentTime, pushHistory]);

  // Import and immediately add dropped external file to timeline
  const handleImportAndAddClip = useCallback(async (file, specificTrackId = null, startTime = null) => {
    try {
      const asset = await processImportedFile(file);
      setMediaAssets((prev) => [...prev, asset]);
      handleAddClipToTimeline(asset, specificTrackId, startTime);
    } catch (err) {
      console.error('Failed to import dropped file:', err);
    }
  }, [handleAddClipToTimeline]);

  const handleAddBlurToTimeline = useCallback((style = 'gaussian') => {
    const newBlurClip = {
      id: 'clip-' + Math.random().toString(36).substring(2, 9),
      trackId: 'track-blur',
      name: style === 'pixelate' ? 'Mosaic Censor' : 'Gaussian Blur',
      start: currentTime,
      duration: 6,
      blurStyle: style,
      intensity: 25,
      keyframes: [
        { id: 'kf-1', time: 0, x: 25, y: 55, width: 20, height: 16, intensity: 25 },
        { id: 'kf-2', time: 5.5, x: 65, y: 52, width: 20, height: 16, intensity: 25 },
      ],
    };

    setTracks((prev) => {
      pushHistory(prev);
      return prev.map((t) => (t.id === 'track-blur' ? { ...t, clips: [...t.clips, newBlurClip] } : t));
    });
    setSelectedClipId(newBlurClip.id);
  }, [currentTime, pushHistory]);

  const handleAddTextToTimeline = useCallback((preset) => {
    const newTextClip = {
      id: 'clip-' + Math.random().toString(36).substring(2, 9),
      trackId: 'track-text',
      name: preset.title,
      start: currentTime,
      duration: 4,
      textConfig: {
        text: preset.text,
        fontSize: preset.fontSize,
        fontFamily: 'Outfit, sans-serif',
        color: preset.color,
        bgColor: preset.bgColor,
        align: 'center',
        yPos: preset.yPos,
      },
    };

    setTracks((prev) => {
      pushHistory(prev);
      return prev.map((t) => (t.id === 'track-text' ? { ...t, clips: [...t.clips, newTextClip] } : t));
    });
    setSelectedClipId(newTextClip.id);
  }, [currentTime, pushHistory]);

  const handleApplyFilterPreset = useCallback((filterValues) => {
    if (!selectedClip || selectedClip.trackType !== 'video') return;
    handleUpdateClip(selectedClip.id, { filters: { ...filterValues } });
  }, [selectedClip, handleUpdateClip]);

  // Rename media asset inside editor Media Pool and sync clip names
  const handleRenameMediaAsset = useCallback((assetId, newName) => {
    if (!newName || !newName.trim()) return;
    const cleanName = newName.trim();
    setMediaAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, name: cleanName } : a))
    );
    // Also update any clips on timeline derived from this asset that have matching name
    setTracks((prevTracks) =>
      prevTracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.assetId === assetId ? { ...c, name: cleanName } : c)),
      }))
    );
  }, []);

  // Import local user files
  const handleImportFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const asset = await processImportedFile(file);
      setMediaAssets((prev) => [...prev, asset]);
      // Automatically place first imported file on timeline
      handleAddClipToTimeline(asset);
    }
  };

  // --- Global Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in text input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleSplitClip();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrame(-1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleStepFrame(1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        handleSeek(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        handleSeek(totalDuration);
      } else if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.code === 'KeyY') {
        e.preventDefault();
        handleRedo();
      } else if (e.ctrlKey && e.code === 'KeyD') {
        e.preventDefault();
        handleDuplicateClip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleTogglePlay,
    handleSplitClip,
    handleDeleteClip,
    selectedClipId,
    handleStepFrame,
    handleSeek,
    totalDuration,
    handleUndo,
    handleRedo,
    handleDuplicateClip,
  ]);



  // Video Export Handler
  const handleStartExport = async (exportSettings) => {
    // Pause playback before export
    setIsPlaying(false);
    return await renderAndExportVideo({
      tracks,
      mediaAssets,
      aspectRatioConfig: currentAspectConfig,
      duration: totalDuration,
      projectName,
      exportSettings,
      onProgress: exportSettings.onProgress,
    });
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-app)',
    }}>
      {/* 1. Header Bar */}
      <Header
        projectName={projectName}
        setProjectName={setProjectName}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        customResolution={customResolution}
        setCustomResolution={setCustomResolution}
        durationMode={durationMode}
        setDurationMode={setDurationMode}
        customDuration={customDuration}
        setCustomDuration={setCustomDuration}
        totalDuration={totalDuration}
        maxClipEndTime={maxClipEndTime}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
      />

      {/* 2. Middle Workspace (Left MediaBin + Center Preview + Right Inspector) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <MediaBin
          mediaAssets={mediaAssets}
          tracks={tracks}
          onImportFiles={handleImportFiles}
          onAddClipToTimeline={handleAddClipToTimeline}
          onAddBlurToTimeline={handleAddBlurToTimeline}
          onAddTextToTimeline={handleAddTextToTimeline}
          onApplyFilterPreset={handleApplyFilterPreset}
          onAddTrack={handleAddTrack}
          selectedClip={selectedClip}
          onRenameMediaAsset={handleRenameMediaAsset}
        />

        <PreviewPlayer
          canvasRef={canvasRef}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          currentTime={currentTime}
          duration={totalDuration}
          onSeek={handleSeek}
          onStepFrame={handleStepFrame}
          aspectRatioConfig={currentAspectConfig}
          selectedClip={selectedClip}
          onUpdateBlurKeyframe={handleUpdateBlurKeyframe}
          onAddKeyframeAtPlayhead={handleAddKeyframeAtPlayhead}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
        />

        <Inspector
          selectedClip={selectedClip}
          tracks={tracks}
          onUpdateClip={handleUpdateClip}
          onDeleteClip={handleDeleteClip}
          onMoveClipToTrack={handleMoveClipToTrack}
          onAddTrack={handleAddTrack}
          currentTime={currentTime}
          onSeek={handleSeek}
          onAddKeyframeAtPlayhead={handleAddKeyframeAtPlayhead}
          onDeleteKeyframe={handleDeleteKeyframe}
        />
      </div>

      {/* 3. Bottom Dock (Timeline & Tracks) */}
      <Timeline
        tracks={tracks}
        currentTime={currentTime}
        duration={totalDuration}
        durationMode={durationMode}
        setDurationMode={setDurationMode}
        customDuration={customDuration}
        setCustomDuration={setCustomDuration}
        maxClipEndTime={maxClipEndTime}
        onSeek={handleSeek}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onSplitClip={handleSplitClip}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onUpdateClip={handleUpdateClip}
        onMoveClipToTrack={handleMoveClipToTrack}
        onAddTrack={handleAddTrack}
        onDeleteTrack={handleDeleteTrack}
        onToggleMuteTrack={handleToggleMuteTrack}
        onToggleLockTrack={handleToggleLockTrack}
        onAddClipToTimeline={handleAddClipToTimeline}
        onImportAndAddClip={handleImportAndAddClip}
        onImportFiles={handleImportFiles}
        mediaAssets={mediaAssets}
        timelineHeight={timelineHeight}
        setTimelineHeight={setTimelineHeight}
        pxPerSecond={pxPerSecond}
        setPxPerSecond={setPxPerSecond}
      />

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        aspectRatioConfig={currentAspectConfig}
        duration={totalDuration}
        onStartExport={handleStartExport}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
