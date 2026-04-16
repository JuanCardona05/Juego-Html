export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.trackId = "nature";

    this.engine = null;
    this.music = null;
    this.ambient = [];
    this.driftNoise = null;
    this.driftGain = null;
    this.driftFilter = null;
    this.driftTone = null;
    this.driftToneGain = null;
    this.musicState = null;
    this.menuMusicTimeout = null;

    this.enabled = false;
  }

  _ensureContext() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  start(trackId) {
    this._ensureContext();
    if (this.enabled) return;
    this.trackId = trackId;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.enabled = true;

    this._buildMusicLayer();
    this._buildEngineLayer();
    this._buildAmbientLayer(trackId);

    this._buildDriftNoise();
  }

  _buildMusicLayer() {
    const a = this.ctx.createOscillator();
    const b = this.ctx.createOscillator();
    const c = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 90;

    a.type = "triangle";
    b.type = "square";
    c.type = "sine";
    a.frequency.value = 220;
    b.frequency.value = 329.63;
    c.frequency.value = 440;
    gain.gain.value = 0.034;
    a.connect(gain);
    b.connect(gain);
    c.connect(gain);
    gain.connect(hp).connect(this.master);
    a.start();
    b.start();
    c.start();
    this.music = { a, b, c, gain, hp };

    const profile = this._getRaceMusicProfile(this.trackId);
    this.musicState = {
      profile,
      step: 0,
      nextNoteAt: this.ctx.currentTime + 0.05,
      pulse: 0,
    };
  }

  _getRaceMusicProfile(trackId) {
    if (trackId === "city") {
      return {
        tempo: 116,
        melody: [523.25, 587.33, 659.25, 698.46, 659.25, 587.33, 523.25, 493.88],
        bass: [130.81, 146.83, 164.81, 146.83],
      };
    }

    if (trackId === "desert") {
      return {
        tempo: 102,
        melody: [392.0, 440.0, 466.16, 523.25, 466.16, 440.0, 392.0, 349.23],
        bass: [98.0, 110.0, 116.54, 87.31],
      };
    }

    return {
      tempo: 110,
      melody: [440.0, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88],
      bass: [110.0, 123.47, 130.81, 98.0],
    };
  }

  _tickRaceMusic(now, speed) {
    if (!this.music || !this.musicState) return;

    const { profile } = this.musicState;
    const beat = 60 / profile.tempo;
    const stepDur = beat * 0.5;

    while (this.musicState.nextNoteAt <= now + 0.04) {
      const step = this.musicState.step;
      const note = profile.melody[step % profile.melody.length];
      const bass = profile.bass[Math.floor(step / 2) % profile.bass.length];
      const speedEnergy = Math.min(speed / 80, 1);

      this.music.a.frequency.setTargetAtTime(note, this.musicState.nextNoteAt, 0.03);
      this.music.b.frequency.setTargetAtTime(note * 1.5, this.musicState.nextNoteAt, 0.03);
      this.music.c.frequency.setTargetAtTime(bass, this.musicState.nextNoteAt, 0.04);

      const pulseUp = 0.026 + speedEnergy * 0.01;
      const pulseDown = 0.015 + speedEnergy * 0.006;
      const accent = step % 4 === 0 ? 1.18 : 1.0;

      this.music.gain.gain.setValueAtTime(pulseUp * accent, this.musicState.nextNoteAt);
      this.music.gain.gain.exponentialRampToValueAtTime(
        pulseDown,
        this.musicState.nextNoteAt + stepDur * 0.85
      );

      this.musicState.step += 1;
      this.musicState.nextNoteAt += stepDur;
    }
  }

  _buildEngineLayer() {
    const low = this.ctx.createOscillator();
    const mid = this.ctx.createOscillator();
    const high = this.ctx.createOscillator();
    const lowGain = this.ctx.createGain();
    const midGain = this.ctx.createGain();
    const highGain = this.ctx.createGain();
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 40;

    low.type = "sawtooth";
    mid.type = "triangle";
    high.type = "square";

    low.frequency.value = 70;
    mid.frequency.value = 110;
    high.frequency.value = 180;

    lowGain.gain.value = 0.0001;
    midGain.gain.value = 0.0001;
    highGain.gain.value = 0.0001;

    low.connect(lowGain).connect(hp);
    mid.connect(midGain).connect(hp);
    high.connect(highGain).connect(hp);
    hp.connect(this.master);

    low.start();
    mid.start();
    high.start();

    this.engine = { low, mid, high, lowGain, midGain, highGain };
  }

  _buildAmbientLayer(trackId) {
    this.ambient = [];

    const makeLayer = (type, freq, gainValue, lfoFreq, lfoAmount) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = gainValue;
      lfo.frequency.value = lfoFreq;
      lfoGain.gain.value = lfoAmount;

      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(gain).connect(this.master);
      osc.start();
      lfo.start();

      this.ambient.push({ osc, gain, lfo });
    };

    if (trackId === "city") {
      makeLayer("sawtooth", 90, 0.011, 0.17, 25);
      makeLayer("triangle", 140, 0.008, 0.11, 20);
      makeLayer("square", 220, 0.005, 0.08, 14);
    } else if (trackId === "desert") {
      makeLayer("triangle", 78, 0.012, 0.06, 16);
      makeLayer("sine", 116, 0.008, 0.1, 12);
      makeLayer("sine", 156, 0.004, 0.05, 8);
    } else {
      makeLayer("sine", 120, 0.01, 0.07, 16);
      makeLayer("triangle", 250, 0.006, 0.13, 40);
      makeLayer("sine", 420, 0.003, 0.2, 70);
    }
  }

  _buildDriftNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const out = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      out[i] = (Math.random() * 2 - 1) * 0.25;
    }

    this.driftNoise = this.ctx.createBufferSource();
    this.driftNoise.buffer = buffer;
    this.driftNoise.loop = true;

    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    lp.Q.value = 0.9;

    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 380;

    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0.0001;
    this.driftFilter = lp;

    this.driftNoise.connect(hp).connect(lp).connect(this.driftGain).connect(this.master);
    this.driftNoise.start();

    // Capa tonal de chillido de llanta para que el derrape se perciba claramente.
    this.driftTone = this.ctx.createOscillator();
    this.driftTone.type = "sawtooth";
    this.driftTone.frequency.value = 950;
    const toneFilter = this.ctx.createBiquadFilter();
    toneFilter.type = "bandpass";
    toneFilter.frequency.value = 1200;
    toneFilter.Q.value = 1.4;
    this.driftToneGain = this.ctx.createGain();
    this.driftToneGain.gain.value = 0.0001;
    this.driftTone.connect(toneFilter).connect(this.driftToneGain).connect(this.master);
    this.driftTone.start();
  }

  update(player, dt) {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    const speed = Math.max(0, player.velocity.length());

    this.engine.low.frequency.setTargetAtTime(58 + speed * 2.4, now, 0.05);
    this.engine.mid.frequency.setTargetAtTime(102 + speed * 3.3, now, 0.05);
    this.engine.high.frequency.setTargetAtTime(170 + speed * 5.1, now, 0.05);

    this.engine.lowGain.gain.setTargetAtTime(0.03 + Math.min(speed / 160, 0.08), now, 0.06);
    this.engine.midGain.gain.setTargetAtTime(0.015 + Math.min(speed / 220, 0.05), now, 0.06);
    this.engine.highGain.gain.setTargetAtTime(0.004 + Math.min(speed / 300, 0.03), now, 0.08);

    const driftAmt = player.driftFactor || 0;
    const driftAudible = driftAmt > 0.18 ? driftAmt : 0;
    const speedNorm = Math.min(speed / 72, 1);
    this.driftGain.gain.setTargetAtTime(0.0001 + driftAudible * (0.075 + speedNorm * 0.03), now, 0.03);
    if (this.driftFilter) {
      this.driftFilter.frequency.setTargetAtTime(1200 + driftAudible * 2400 + speedNorm * 520, now, 0.05);
    }
    if (this.driftTone && this.driftToneGain) {
      this.driftTone.frequency.setTargetAtTime(780 + driftAudible * 780 + speedNorm * 320, now, 0.035);
      this.driftToneGain.gain.setTargetAtTime(0.0001 + driftAudible * (0.038 + speedNorm * 0.015), now, 0.03);
    }

    this._tickRaceMusic(now, speed);

    const envBoost = this.trackId === "city" ? 0.005 : this.trackId === "desert" ? 0.004 : 0.003;
    this.music.hp.frequency.setTargetAtTime(90 + speed * (1.2 + envBoost * 40), now, 0.14);
  }

  play(eventName, characterId = "cat") {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain).connect(this.master);

    if (eventName === "pickup") {
      // Sonido de pickup mejorado con múltiples tonos
      const playPickupTone = (freq, duration, startTime, delay = 0) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.4, startTime + delay + duration * 0.4);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, startTime + delay + duration);
        
        filter.type = "lowpass";
        filter.frequency.value = 12000;
        
        gain.gain.setValueAtTime(0.001, startTime + delay);
        gain.gain.linearRampToValueAtTime(0.07, startTime + delay + duration * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + delay + duration);
        
        osc.connect(filter).connect(gain).connect(this.master);
        osc.start(startTime + delay);
        osc.stop(startTime + delay + duration);
      };
      
      // Tres tonos para efecto "chime" brillante
      playPickupTone(1100, 0.18, now, 0);      // Tono principal
      playPickupTone(1700, 0.14, now, 0.03);   // Tono alto
      playPickupTone(580, 0.12, now, 0.06);    // Tono bajo
      return;
    }

    if (eventName === "use-item") {
      osc.type = "square";
      osc.frequency.setValueAtTime(390, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.14);
      this._playCharacterVoice(characterId, "use", now);
      return;
    }

    if (eventName === "character-use") {
      this._playCharacterVoice(characterId, "use", now);
      return;
    }

    if (eventName === "drift-start") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.18);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.065, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.22);

      const hiss = this.ctx.createOscillator();
      const hissGain = this.ctx.createGain();
      hiss.type = "sawtooth";
      hiss.frequency.setValueAtTime(1500, now);
      hiss.frequency.exponentialRampToValueAtTime(740, now + 0.12);
      hissGain.gain.setValueAtTime(0.001, now);
      hissGain.gain.exponentialRampToValueAtTime(0.03, now + 0.02);
      hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      hiss.connect(hissGain).connect(this.master);
      hiss.start(now);
      hiss.stop(now + 0.16);
      return;
    }

    if (eventName === "hit" || eventName === "collision") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
      this._playCharacterVoice(characterId, "hit", now);
      return;
    }

    if (eventName === "victory") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.setValueAtTime(523.25, now + 0.12);
      osc.frequency.setValueAtTime(659.25, now + 0.24);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.52);
      this._playCharacterVoice(characterId, "win", now);
      return;
    }

    if (eventName === "eliminated") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.28);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.34);
      this._playCharacterVoice(characterId, "eliminated", now);
    }
  }

  _playCharacterVoice(characterId, mode, now) {
    const profile = {
      cat: { base: 470, wave: "triangle" },
      dog: { base: 320, wave: "square" },
      falcon: { base: 620, wave: "sawtooth" },
      panda: { base: 280, wave: "triangle" },
    }[characterId] || { base: 420, wave: "triangle" };

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = profile.wave;
    osc.connect(gain).connect(this.master);

    if (mode === "use") {
      osc.frequency.setValueAtTime(profile.base * 1.2, now);
      osc.frequency.exponentialRampToValueAtTime(profile.base * 1.7, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    if (mode === "win") {
      osc.frequency.setValueAtTime(profile.base * 1.1, now);
      osc.frequency.setValueAtTime(profile.base * 1.42, now + 0.1);
      osc.frequency.setValueAtTime(profile.base * 1.88, now + 0.2);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      osc.start(now);
      osc.stop(now + 0.35);
      return;
    }

    if (mode === "eliminated") {
      osc.frequency.setValueAtTime(profile.base, now);
      osc.frequency.exponentialRampToValueAtTime(profile.base * 0.36, now + 0.2);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.25);
      return;
    }

    osc.frequency.setValueAtTime(profile.base * 0.92, now);
    osc.frequency.exponentialRampToValueAtTime(profile.base * 0.62, now + 0.11);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  startMenuMusic() {
    try {
      this._ensureContext();

      if (this.ctx?.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      this.stopMenuMusic();

      const playMenuNote = (freq, duration, type = "sine", volume = 0.08) => {
        try {
          const startTime = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = type;
          osc.frequency.value = freq;
          osc.connect(gain).connect(this.master);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(volume, startTime + duration * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.95);

          osc.start(startTime);
          osc.stop(startTime + duration);
        } catch (error) {
          console.log("Error en nota del menú:", error);
        }
      };

      const patterns = [
        [
          { freq: 523.25, type: "square", vol: 0.1 },
          { freq: 659.25, type: "square", vol: 0.09 },
          { freq: 784, type: "triangle", vol: 0.08 },
          { freq: 587.33, type: "square", vol: 0.09 },
        ],
        [
          { freq: 659.25, type: "triangle", vol: 0.1 },
          { freq: 783.99, type: "square", vol: 0.09 },
          { freq: 987.77, type: "triangle", vol: 0.08 },
          { freq: 783.99, type: "square", vol: 0.09 },
        ],
        [
          { freq: 784, type: "square", vol: 0.1 },
          { freq: 659.25, type: "triangle", vol: 0.09 },
          { freq: 587.33, type: "square", vol: 0.08 },
          { freq: 523.25, type: "triangle", vol: 0.09 },
        ],
      ];

      let patternIndex = 0;

      const playSequence = () => {
        const pattern = patterns[patternIndex % patterns.length];
        for (let i = 0; i < pattern.length; i++) {
          setTimeout(() => {
            const note = pattern[i];
            playMenuNote(note.freq, 0.1, note.type, note.vol);
          }, i * 100);
        }
        patternIndex += 1;
      };

      playSequence();
      this.menuMusicTimeout = setInterval(playSequence, 800);
      console.log("Música del menú animada iniciada");
    } catch (error) {
      console.error("Error en música de menú:", error);
    }
  }

  stopMenuMusic() {
    try {
      if (this.menuMusicTimeout) {
        clearInterval(this.menuMusicTimeout);
        this.menuMusicTimeout = null;
      }
    } catch (error) {
      console.error("Error deteniendo música:", error);
    }
  }

  stop() {
    if (!this.enabled) return;
    this.enabled = false;

    this.stopMenuMusic();

    const stopNode = (node) => {
      if (!node) return;
      try {
        node.stop?.();
      } catch {
        // ignore nodes already stopped
      }
      try {
        node.disconnect?.();
      } catch {
        // ignore disconnect errors
      }
    };

    stopNode(this.music?.a);
    stopNode(this.music?.b);
    stopNode(this.music?.c);
    try { this.music?.hp?.disconnect(); } catch {}
    this.music = null;
    this.musicState = null;

    stopNode(this.engine?.low);
    stopNode(this.engine?.mid);
    stopNode(this.engine?.high);
    stopNode(this.engine?.lowGain);
    stopNode(this.engine?.midGain);
    stopNode(this.engine?.highGain);
    this.engine = null;

    for (const layer of this.ambient) {
      stopNode(layer?.osc);
      stopNode(layer?.lfo);
      stopNode(layer?.gain);
    }
    this.ambient = [];

    stopNode(this.driftNoise);
    stopNode(this.driftGain);
    stopNode(this.driftFilter);
    stopNode(this.driftTone);
    stopNode(this.driftToneGain);
    this.driftNoise = null;
    this.driftGain = null;
    this.driftFilter = null;
    this.driftTone = null;
    this.driftToneGain = null;
  }
}
