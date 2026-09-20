/**
 * Fylmy Web Audio Engine
 * Synchronizes audio and video playback, handles volume levels,
 * track muting, master gain, 3-Band Parametric Equalizer,
 * Low-Cut / De-hum filtering, and real-time audio ducking.
 */

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.sourceNodes = new Map(); // mediaElement -> MediaElementAudioSourceNode
    this.gainNodes = new Map(); // mediaElement -> GainNode
    this.filterNodes = new Map(); // mediaElement -> { lowCut, bass, mid, treble }
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
   * Connect a video or audio HTML media element to Web Audio graph with EQ processing
   */
  connectMediaElement(mediaEl, trackVolume = 1, clipVolume = 1, isMuted = false, eqSettings = null) {
    if (!this.initialized) this.init();
    if (!this.audioCtx) return;

    try {
      let source = this.sourceNodes.get(mediaEl);
      let gain = this.gainNodes.get(mediaEl);
      let filters = this.filterNodes.get(mediaEl);

      if (!source) {
        source = this.audioCtx.createMediaElementSource(mediaEl);
        gain = this.audioCtx.createGain();

        // 1. High-pass (Low-cut @ 80Hz for de-hum / rumble elimination)
        const lowCut = this.audioCtx.createBiquadFilter();
        lowCut.type = 'highpass';
        lowCut.frequency.value = 80;
        lowCut.Q.value = 0.707;

        // 2. Bass (Lowshelf @ 120Hz)
        const bass = this.audioCtx.createBiquadFilter();
        bass.type = 'lowshelf';
        bass.frequency.value = 120;
        bass.gain.value = 0;

        // 3. Mid (Peaking @ 1500Hz)
        const mid = this.audioCtx.createBiquadFilter();
        mid.type = 'peaking';
        mid.frequency.value = 1500;
        mid.Q.value = 1.0;
        mid.gain.value = 0;

        // 4. Treble (Highshelf @ 7000Hz)
        const treble = this.audioCtx.createBiquadFilter();
        treble.type = 'highshelf';
        treble.frequency.value = 7000;
        treble.gain.value = 0;

        // Chain nodes: Source -> LowCut -> Bass -> Mid -> Treble -> Gain -> Master
        source.connect(lowCut);
        lowCut.connect(bass);
        bass.connect(mid);
        mid.connect(treble);
        treble.connect(gain);
        gain.connect(this.masterGain);

        filters = { lowCut, bass, mid, treble };
        this.sourceNodes.set(mediaEl, source);
        this.gainNodes.set(mediaEl, gain);
        this.filterNodes.set(mediaEl, filters);
      }

      // Update Parametric EQ parameters
      if (filters) {
        const targetBassGain = eqSettings?.bass ?? 0;
        const targetMidGain = eqSettings?.mid ?? 0;
        const targetTrebleGain = eqSettings?.treble ?? 0;
        const targetLowCutFreq = eqSettings?.lowCut ? 80 : 10; // 10Hz effectively bypasses low-cut

        const now = this.audioCtx.currentTime;
        filters.bass.gain.setTargetAtTime(targetBassGain, now, 0.05);
        filters.mid.gain.setTargetAtTime(targetMidGain, now, 0.05);
        filters.treble.gain.setTargetAtTime(targetTrebleGain, now, 0.05);
        filters.lowCut.frequency.setTargetAtTime(targetLowCutFreq, now, 0.05);
      }

      const effectiveGain = isMuted ? 0 : Math.max(0, Math.min(1.5, trackVolume * clipVolume));
      if (gain._lastGain === undefined || Math.abs(gain._lastGain - effectiveGain) > 0.005) {
        gain.gain.setValueAtTime(effectiveGain, this.audioCtx.currentTime);
        gain._lastGain = effectiveGain;
      }
    } catch (e) {
      // MediaElementSource fallback
      mediaEl.volume = isMuted ? 0 : Math.max(0, Math.min(1, trackVolume * clipVolume));
    }
  }

  getDestination() {
    if (!this.initialized) this.init();
    return this.masterGain;
  }
}
