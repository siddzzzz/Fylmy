/**
 * Fylmy Web Audio Engine
 * Synchronizes audio and video playback, handles volume levels,
 * track muting, and master gain.
 */

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.sourceNodes = new Map(); // mediaElement -> MediaElementAudioSourceNode
    this.gainNodes = new Map(); // mediaElement -> GainNode
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.audioCtx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioCtx();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);
    this.initialized = true;
  }

  resume() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setMasterVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioCtx?.currentTime || 0);
    }
  }

  /**
   * Connect a video or audio HTML media element to Web Audio graph
   */
  connectMediaElement(mediaEl, trackVolume = 1, clipVolume = 1, isMuted = false) {
    if (!this.initialized) this.init();
    if (!this.audioCtx) return;

    try {
      let source = this.sourceNodes.get(mediaEl);
      let gain = this.gainNodes.get(mediaEl);

      if (!source) {
        source = this.audioCtx.createMediaElementSource(mediaEl);
        gain = this.audioCtx.createGain();
        source.connect(gain);
        gain.connect(this.masterGain);

        this.sourceNodes.set(mediaEl, source);
        this.gainNodes.set(mediaEl, gain);
      }

      const effectiveGain = isMuted ? 0 : Math.max(0, Math.min(1, trackVolume * clipVolume));
      if (gain._lastGain === undefined || Math.abs(gain._lastGain - effectiveGain) > 0.005) {
        gain.gain.setValueAtTime(effectiveGain, this.audioCtx.currentTime);
        gain._lastGain = effectiveGain;
      }
    } catch (e) {
      // MediaElementSource may already be attached or element not yet ready
      // Safe fallback to direct element volume
      mediaEl.volume = isMuted ? 0 : Math.max(0, Math.min(1, trackVolume * clipVolume));
    }
  }

  getDestination() {
    if (!this.initialized) this.init();
    return this.masterGain;
  }
}
