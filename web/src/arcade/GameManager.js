import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";
import { LapSystem } from "../race/LapSystem.js";
import { TrackGenerator } from "./TrackGenerator.js";
import { PlayerController, createDriver, createVehicleMesh, buildPlayerStats, randomCharacterId, randomVehicleId } from "./PlayerController.js";
import { AIController } from "./AIController.js";
import { PowerUpSystem } from "./PowerUpSystem.js";
import { AudioManager } from "./AudioManager.js";
import { SmokeSystem } from "./SmokeSystem.js";
import { EventsSystem } from "./EventsSystem.js";

export class GameManager {
  constructor(canvas, uiManager) {
    this.canvas = canvas;
    this.ui = uiManager;
    this.settings = window.AnimalKartSettings || {};

    const touchQuery = window.matchMedia?.("(pointer: coarse) and (hover: none)");
    this.isTouchDevice = !!(touchQuery?.matches || navigator.maxTouchPoints > 0);
    this.minFpsLimit = this.isTouchDevice ? 30 : 60;

    const requestedFpsLimit = this.settings.fpsLimit;
    if (requestedFpsLimit === "unlimited") {
      this.targetFpsLimit = "unlimited";
    } else {
      const numericLimit = Number(requestedFpsLimit);
      this.targetFpsLimit = Number.isFinite(numericLimit)
        ? Math.max(this.minFpsLimit, numericLimit)
        : this.minFpsLimit;
    }

    this.frameIntervalMs = this.targetFpsLimit === "unlimited" ? 0 : 1000 / this.targetFpsLimit;
    this.lastFrameTick = 0;
    this.manualQualityTier = this._normalizeQualityTier(this.settings.quality);
    this.usePostProcessing = !this.isTouchDevice;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isTouchDevice,
      powerPreference: "high-performance",
      desynchronized: this.settings.vsync === false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouchDevice ? 0.85 : 1.0));
    this.renderer.shadowMap.enabled = !this.isTouchDevice;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.setClearColor(0x82ddff);

    this.scene = null;
    this.camera = null;
    this.miniCamera = null;
    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.colorPass = null;
    this.contrastPass = null;
    this.outputPass = null;
    this.pmremGenerator = null;
    this.skyMesh = null;
    this.cameraLookTarget = new THREE.Vector3();

    this.keys = new Set();
    this.justPressed = new Set();
    this.keyDownHandler = null;
    this.keyUpHandler = null;
    this.resizeHandler = null;

    this.track = null;
    this.powerUps = null;
    this.audio = new AudioManager();
    this.smoke = null;
    this.events = null;

    this.player = null;
    this.playerController = null;
    this.aiControllers = [];
    this.racers = [];
    this.difficulty = "medium";

    this.totalLaps = 3;
    this.isInfiniteMode = false;
    this.finishCount = 0;
    this.isRunning = false;
    this.lastTime = performance.now();
    this.lastFpsSample = performance.now();
    this.framesSinceSample = 0;
    this.rafId = null;

    this.cityMonster = null;
    this.cityProjectiles = [];
    this.cityThrowTimer = 0;
    this.playerRespawnTimer = 0;
    this.dynamicHazardTimer = 0;
    this.dynamicEventTimer = 0;
    this.activeTrackEvent = null;
    this.eventProps = [];
    this.qualityTier = this.manualQualityTier || (this.isTouchDevice ? "low" : "balanced");
    this.shadowTier = this.qualityTier;
    this.enableMiniMap = !this.isTouchDevice;
    this.smokeEmissionFactor = this.isTouchDevice ? 0.45 : 1;
    this.effectFrameCounter = 0;
    this.raceIntroActive = false;
    this.raceIntroTimer = 0;
    this.raceIntroDuration = 4.8;
    this.cameraMode = 0; // 0=trasera, 1=frontal, 2=1erpersona, 3=lateral
    this.raceCountdownActive = false;
    this.raceCountdownTimer = 0;
    this.raceCountdownStage = 0;
    this.victoryCinematicActive = false;
    this.victoryTimer = 0;
    this.finishPending = false;
    this.finishMessage = "";
    this.victorySparkTimer = 0;

    this._tmpForward = new THREE.Vector3();
    this._tmpSide = new THREE.Vector3();
    this._tmpDesiredPos = new THREE.Vector3();
    this._tmpDesiredLook = new THREE.Vector3();
    this._tmpGroundForward = new THREE.Vector3();
    this._tmpGroundLook = new THREE.Vector3();
    this._tmpGroundNormal = new THREE.Vector3(0, 1, 0);
    this._tmpNormalMatrix = new THREE.Matrix3();
    this._tmpIntroTarget = new THREE.Vector3();
    this._tmpIntroCam = new THREE.Vector3();
    this.introPathIndex = 0;
    this.characterEmojis = { racer1: "🐴", racer2: "🦁", racer3: "🐢", racer4: "🦊", racer5: "🐻", racer6: "🦅" };

    // Raycast vertical para el unico sistema de suelo.
    this.raycaster = new THREE.Raycaster();
    this.raycasterDir = new THREE.Vector3(0, -1, 0);
    this.groundMeshes = [];
    this.groundMeshByRoute = {};

    this.miniMapCanvas = document.getElementById("miniMap");
    this.miniMapCtx = this.miniMapCanvas ? this.miniMapCanvas.getContext("2d") : null;
    this.miniMapBounds = null;
    this.miniMapPath = [];
    this.miniMapTrail = [];
    this.miniMapTrailTimer = 0;
    this._tmpMapVec = new THREE.Vector2();

    this._bindInput();
    this._bindResize();
  }

  _normalizeQualityTier(tier) {
    if (tier === "medium") return "balanced";
    if (tier === "low" || tier === "balanced" || tier === "high") return tier;
    return null;
  }

  _getPixelRatioCapForTier(tier) {
    const isLandscape = window.innerWidth > window.innerHeight;

    if (this.isTouchDevice) {
      if (isLandscape) {
        if (tier === "low") return 0.72;
        if (tier === "balanced") return 0.8;
        return 0.88;
      }
      if (tier === "low") return 0.8;
      if (tier === "balanced") return 0.9;
      return 0.98;
    }

    if (tier === "low") return 0.9;
    if (tier === "balanced") return 1.0;
    return 1.05;
  }

  _applyQualityTier(tier, shouldResize = true) {
    this.qualityTier = tier;
    const pixelRatioCap = this._getPixelRatioCapForTier(tier);

    if (tier === "low") {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
      this.renderer.toneMappingExposure = 0.9;
      if (this.bloomPass) this.bloomPass.strength = 0.04;
      if (this.sunLight && this.shadowTier !== "low") {
        this.sunLight.shadow.mapSize.set(768, 768);
        this.shadowTier = "low";
      }
    } else if (tier === "balanced") {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
      this.renderer.toneMappingExposure = 0.93;
      if (this.bloomPass) this.bloomPass.strength = 0.08;
      if (this.sunLight && this.shadowTier !== "balanced") {
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.shadowTier = "balanced";
      }
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
      this.renderer.toneMappingExposure = 0.96;
      if (this.bloomPass) this.bloomPass.strength = 0.12;
      if (this.sunLight && this.shadowTier !== "high") {
        this.sunLight.shadow.mapSize.set(1536, 1536);
        this.shadowTier = "high";
      }
    }

    if (shouldResize) {
      this._onResize();
    }
  }

  _bindInput() {
    this.keyDownHandler = (e) => {
      if (!this.keys.has(e.code)) this.justPressed.add(e.code);
      this.keys.add(e.code);
      // Cambiar cámara con C
      if (e.code === "KeyC" && this.isRunning && !this.raceIntroActive && !this.raceCountdownActive) {
        this.cameraMode = (this.cameraMode + 1) % 4;
      }
      // Saltar intro con ESC o ESPACIO
      if ((e.code === "Escape" || e.code === "Space") && this.raceIntroActive) {
        this.raceIntroActive = false;
        this._startRaceCountdown();
      }
    };

    this.keyUpHandler = (e) => {
      this.keys.delete(e.code);
      this.justPressed.delete(e.code);
    };

    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
  }

  _bindResize() {
    this.resizeHandler = () => this._onResize();
    window.addEventListener("resize", this.resizeHandler);
  }

  start(config) {
    this.difficulty = config.difficulty || "medium";
    
    // Configurar número de vueltas
    const lapsConfig = config.laps || "3";
    if (lapsConfig === "infinite") {
      this.totalLaps = 999; // Modo infinito: número muy alto
      this.isInfiniteMode = true;
    } else {
      this.totalLaps = parseInt(lapsConfig, 10) || 3;
      this.isInfiniteMode = false;
    }
    
    this._buildScene(config);
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFrameTick = this.lastTime;
    this.lastFpsSample = this.lastTime;
    this.framesSinceSample = 0;
    this.rafId = requestAnimationFrame((t) => this._loop(t));
  }

  _buildScene(config) {
    const fogColor = config.trackId === "desert" ? 0xe1b56b : config.trackId === "city" ? 0xa2b5cc : 0x85dfff;
    this.baseFogColor = fogColor;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(fogColor, 220, 1180);

    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1800);
    this.miniCamera = new THREE.OrthographicCamera(-260, 260, 260, -260, 1, 2200);
    this.miniCamera.position.set(0, 560, 0);

    this._addLights(config.trackId);
    this._addSky();
    if (this.usePostProcessing) {
      this._setupPostProcessing();
    }
    this._applyQualityTier(this.qualityTier, false);
    this._loadHDRI(config.trackId);

    this.track = TrackGenerator.create(this.scene, config.trackId);
    // Sistema unico de suelo: raycast sobre mallas jugables (main + rutas alternativas).
    this.groundMeshes = this.track.groundMeshes || (this.track.mainMesh ? [this.track.mainMesh] : []);
    this.groundMeshByRoute = this.track.groundMeshByRoute || { main: this.track.mainMesh || null };
    this.events = new EventsSystem(this.scene, config.trackId);
    this.events.initializeTrack(this.track.samples);
    this.powerUps = new PowerUpSystem(this.scene, this.track, (eventName, racer) => this.audio.play(eventName, racer?.characterId));
    this.smoke = new SmokeSystem(this.scene, this.camera);

    this._buildRacers(config);
    this._syncRacerVisualsStatic();
    
    // Inicializar sistema de vueltas después de crear los racers
    this.lapSystem = new LapSystem(this.track, this.racers, this.totalLaps);
    
    this._buildTrackHazards();
    this._buildCityEvent(config.trackId);
    this._initTrackDynamicEvents();
    this._initMiniMapData();
    this._enableFrustumCulling();
    this._onResize();

    if (!this.enableMiniMap && this.miniMapCanvas) {
      this.miniMapCanvas.classList.remove("visible");
      this.miniMapCanvas.style.display = "none";
    }

    this.audio.start(config.trackId);
    if (this.audio.master) {
      const volume = Number.isFinite(this.settings.volume) ? this.settings.volume : 0.45;
      this.audio.master.gain.value = Math.max(0, Math.min(1, volume));
    }
    this._startRaceIntro();

    this.ui.setMenuVisible(false);
    this.ui.hideFinish();
    this.ui.setRaceUIVisible(false);
  }

  _startRaceIntro() {
    this.raceIntroActive = true;
    this.raceIntroTimer = 0;
    this.raceIntroDuration = 6.0;
  }

  _startRaceCountdown() {
    this.raceCountdownActive = true;
    this.raceCountdownTimer = 0;
    this.raceCountdownStage = 0;
    this.ui.setCountdownText("3");
    this.ui.setCountdownVisible(true);
  }

  _syncRacerVisualsStatic() {
    if (!this.racers?.length) return;

    for (const r of this.racers) {
      if (!r?.mesh) continue;
      r.mesh.visible = !r.eliminated;
      r.mesh.position.copy(r.position);

      const forward = this._tmpGroundForward.set(Math.sin(r.heading), 0, Math.cos(r.heading));
      const look = this._tmpGroundLook.copy(r.position).add(forward);
      r.mesh.up.set(0, 1, 0);
      r.mesh.lookAt(look);

      if (r.mesh.userData.driverRoot) {
        r.mesh.userData.driverRoot.position.y = 2.4;
        r.mesh.userData.driverRoot.rotation.z = 0;
      }
    }
  }

  _getRacersCenter() {
    const center = this._tmpIntroTarget.set(0, 0, 0);
    if (!this.racers?.length) return center;
    for (const r of this.racers) center.add(r.position);
    center.multiplyScalar(1 / this.racers.length);
    return center;
  }

  _updateLineupCamera(dt) {
    if (!this.racers?.length) return;
    const center = this._getRacersCenter();
    const player = this.player;
    
    // Cámara detrás del jugador en línea de salida
    const forward = this._tmpForward.set(Math.sin(player.heading), 0, Math.cos(player.heading));
    const side = this._tmpSide.set(forward.z, 0, -forward.x);

    this._tmpIntroTarget.copy(player.position).addScaledVector(forward, 8).setY(player.position.y + 1.5);
    this._tmpIntroCam
      .copy(player.position)
      .addScaledVector(forward, -18)
      .addScaledVector(side, 2.0)
      .setY(player.position.y + 6.5);

    this.camera.position.lerp(this._tmpIntroCam, 1 - Math.exp(-5.2 * dt));
    this.cameraLookTarget.lerp(this._tmpIntroTarget, 1 - Math.exp(-6.4 * dt));
    this.camera.lookAt(this.cameraLookTarget);
  }

  _updateRaceCountdown(dt) {
    if (!this.raceCountdownActive) return;
    this._syncRacerVisualsStatic();
    this._updateLineupCamera(dt);
    this.raceCountdownTimer += dt;

    const stageDurations = [1.0, 1.0, 1.0, 0.9];
    const labels = ["3", "2", "1", "GO"];

    let acc = 0;
    let nextStage = stageDurations.length;
    for (let i = 0; i < stageDurations.length; i++) {
      acc += stageDurations[i];
      if (this.raceCountdownTimer < acc) {
        nextStage = i;
        break;
      }
    }

    if (nextStage !== this.raceCountdownStage && nextStage < labels.length) {
      this.raceCountdownStage = nextStage;
      this.ui.setCountdownText(labels[nextStage]);
    }

    if (this.raceCountdownTimer >= stageDurations.reduce((a, b) => a + b, 0)) {
      this.raceCountdownActive = false;
      this.ui.setCountdownVisible(false);
      this.ui.setRaceUIVisible(true);
    }
  }

  _updateRaceIntro(dt) {
    if (!this.raceIntroActive || !this.racers?.length) return;
    this._syncRacerVisualsStatic();

    this.raceIntroTimer += dt;
    const t = THREE.MathUtils.clamp(this.raceIntroTimer / this.raceIntroDuration, 0, 1);
    
    // Recorrer la pista siguiendo los waypoints
    const samples = this.track.samples;
    if (!samples || samples.length === 0) return;
    
    const totalPathLength = samples.length;
    const pathProgress = t * totalPathLength;
    const sampleIdx = Math.floor(pathProgress) % totalPathLength;
    const nextIdx = (sampleIdx + 1) % totalPathLength;
    const localT = pathProgress - Math.floor(pathProgress);
    
    const currentSample = samples[sampleIdx];
    const nextSample = samples[nextIdx];
    
    // Interpolar posición entre dos puntos de waypoint
    const cameraTarget = new THREE.Vector3().lerpVectors(currentSample.p, nextSample.p, localT);
    cameraTarget.y += 80; // Altura de cámara
    
    // Calcular punto a mirar (un poco adelante del recorrido)
    const lookAheadIdx = (sampleIdx + Math.floor(totalPathLength * 0.15)) % totalPathLength;
    const lookTarget = samples[lookAheadIdx].p.clone().setY(samples[lookAheadIdx].p.y + 15);
    
    this._tmpIntroCam.copy(cameraTarget);
    this._tmpIntroTarget.copy(lookTarget);

    this.camera.position.lerp(this._tmpIntroCam, 1 - Math.exp(-4.8 * dt));
    this.cameraLookTarget.lerp(this._tmpIntroTarget, 1 - Math.exp(-6.2 * dt));
    this.camera.lookAt(this.cameraLookTarget);

    if (t >= 1) {
      this.raceIntroActive = false;
      this._startRaceCountdown();
    }
  }

  _startVictoryCinematic(pos) {
    this.victoryCinematicActive = true;
    this.victoryTimer = 0;
    this.victorySparkTimer = 0;
    this.finishPending = true;
    this.finishMessage = pos === 1
      ? `Ganaste. Terminaste en posicion ${pos} (${this.difficulty}).`
      : `Carrera terminada. Terminaste en posicion ${pos} (${this.difficulty}).`;
    this.ui.setRaceUIVisible(false);
    this.ui.setCountdownText("VICTORIA");
    this.ui.setCountdownVisible(true);
  }

  _updateVictoryCinematic(dt) {
    if (!this.victoryCinematicActive || !this.player) return;

    this.victoryTimer += dt;
    this.victorySparkTimer -= dt;
    const p = this.player;

    const orbit = this.victoryTimer * 0.95;
    const radius = 10.8;
    this._tmpIntroTarget.copy(p.position).setY(p.position.y + 1.8);
    this._tmpIntroCam
      .set(
        p.position.x + Math.cos(orbit) * radius,
        p.position.y + 5.8 + Math.sin(this.victoryTimer * 1.8) * 0.4,
        p.position.z + Math.sin(orbit) * radius
      );
    this.camera.position.lerp(this._tmpIntroCam, 1 - Math.exp(-4.2 * dt));
    this.cameraLookTarget.lerp(this._tmpIntroTarget, 1 - Math.exp(-6.4 * dt));
    this.camera.lookAt(this.cameraLookTarget);

    const driver = p.mesh?.userData?.driverRoot;
    if (driver) {
      driver.position.y = 2.45 + Math.sin(this.victoryTimer * 6.2) * 0.16;
      driver.rotation.z = Math.sin(this.victoryTimer * 4.0) * 0.22;
      driver.rotation.y = Math.sin(this.victoryTimer * 2.6) * 0.18;
    }

    if (this.victorySparkTimer <= 0 && this.smoke) {
      this.victorySparkTimer = 0.22;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + this.victoryTimer * 0.9;
        const r = 4.4 + Math.random() * 4.8;
        const fp = new THREE.Vector3(
          p.position.x + Math.cos(a) * r,
          p.position.y + 3.4 + Math.random() * 3.6,
          p.position.z + Math.sin(a) * r
        );
        this.smoke.emitSparks(fp, 2.1);
      }
    }

    this.smoke?.update(dt);

    if (this.victoryTimer >= 5.6) {
      this.victoryCinematicActive = false;
      this.ui.setCountdownVisible(false);
      this.isRunning = false;
      this.ui.showFinish(this.finishMessage);
      if (this.finishMessage.startsWith("Ganaste")) this.audio.play("victory", this.player.characterId);
    }
  }

  _addLights(trackId = "nature") {
    // Luces diferenciadas por tipo de pista para atmósfera única
    const lightConfig = {
      nature: {
        ambientColor: 0xc7d5f0,
        ambientIntensity: 0.45,
        sunColor: 0xfffaf0,
        sunIntensity: 1.35,
        sunPosition: [280, 380, -120],
        fillColor: 0xa8c8ff,
        fillIntensity: 0.35,
        bounceColorSky: 0xb8d8ff,
        bounceColorGround: 0x7a9550,
        bounceIntensity: 0.28,
      },
      city: {
        ambientColor: 0xd9e3ff,
        ambientIntensity: 0.38,
        sunColor: 0xfff5e8,
        sunIntensity: 1.25,
        sunPosition: [240, 360, -100],
        fillColor: 0xc8d8f0,
        fillIntensity: 0.32,
        bounceColorSky: 0xd0deff,
        bounceColorGround: 0x8a7a6a,
        bounceIntensity: 0.24,
      },
      desert: {
        ambientColor: 0xf5e8d0,
        ambientIntensity: 0.42,
        sunColor: 0xfff8d6,
        sunIntensity: 1.42,
        sunPosition: [300, 400, -140],
        fillColor: 0xf0d8b8,
        fillIntensity: 0.38,
        bounceColorSky: 0xf0d8c0,
        bounceColorGround: 0xc9956a,
        bounceIntensity: 0.32,
      },
    };

    const config = lightConfig[trackId] || lightConfig.nature;

    const ambient = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(config.sunColor, config.sunIntensity);
    sun.position.set(...config.sunPosition);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.00012;
    sun.shadow.normalBias = 0.02;
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 1500;
    this.sunLight = sun;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(config.fillColor, config.fillIntensity);
    fill.position.set(-180, 160, 140);
    this.scene.add(fill);

    const bounce = new THREE.HemisphereLight(config.bounceColorSky, config.bounceColorGround, config.bounceIntensity);
    this.scene.add(bounce);
  }

  _addSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1800, 40, 24),
      new THREE.MeshStandardMaterial({
        color: 0xa3ddff,
        emissive: 0x223347,
        emissiveIntensity: 0.42,
        roughness: 0.98,
        metalness: 0.02,
        side: THREE.BackSide,
      })
    );
    this.scene.add(sky);
    this.skyMesh = sky;
  }

  _setupPostProcessing() {
    const width = Math.max(1, this.canvas.clientWidth || this.canvas.width || 1280);
    const height = Math.max(1, this.canvas.clientHeight || this.canvas.height || 720);

    // Optional: if addon modules fail to load, rendering falls back to plain renderer.
    Promise.all([
      import("https://esm.sh/three@0.164.1/examples/jsm/postprocessing/EffectComposer.js"),
      import("https://esm.sh/three@0.164.1/examples/jsm/postprocessing/RenderPass.js"),
      import("https://esm.sh/three@0.164.1/examples/jsm/postprocessing/ShaderPass.js"),
      import("https://esm.sh/three@0.164.1/examples/jsm/postprocessing/OutputPass.js"),
      import("https://esm.sh/three@0.164.1/examples/jsm/postprocessing/UnrealBloomPass.js"),
      import("https://esm.sh/three@0.164.1/examples/jsm/shaders/BrightnessContrastShader.js"),
      import("https://esm.sh/three@0.164.1/examples/jsm/shaders/ColorCorrectionShader.js"),
    ])
      .then(([
        { EffectComposer },
        { RenderPass },
        { ShaderPass },
        { OutputPass },
        { UnrealBloomPass },
        { BrightnessContrastShader },
        { ColorCorrectionShader },
      ]) => {
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.14, 0.32, 0.72);
        this.composer.addPass(this.bloomPass);

        this.colorPass = new ShaderPass(ColorCorrectionShader);
        this.colorPass.uniforms.powRGB.value.set(1.0, 1.0, 1.0);
        this.colorPass.uniforms.mulRGB.value.set(1.02, 1.01, 1.0);
        this.colorPass.uniforms.addRGB.value.set(0.0, 0.0, 0.0);
        this.composer.addPass(this.colorPass);

        this.contrastPass = new ShaderPass(BrightnessContrastShader);
        this.contrastPass.uniforms.brightness.value = -0.01;
        this.contrastPass.uniforms.contrast.value = 0.08;
        this.composer.addPass(this.contrastPass);

        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);
        this.composer.setSize(Math.floor(width * 0.85), Math.floor(height * 0.85));
      })
      .catch(() => {
        this.composer = null;
      });
  }

  _loadHDRI(trackId) {
    const hdriByTrack = {
      city: "https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr",
      desert: "https://threejs.org/examples/textures/equirectangular/royal_esplanade_1k.hdr",
      nature: "https://threejs.org/examples/textures/equirectangular/blouberg_sunrise_2_1k.hdr",
    };

    const url = hdriByTrack[trackId] || hdriByTrack.nature;
    this.pmremGenerator = this.pmremGenerator || new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    import("https://esm.sh/three@0.164.1/examples/jsm/loaders/RGBELoader.js")
      .then(({ RGBELoader }) => {
        new RGBELoader().load(
          url,
          (hdrTexture) => {
            const envMap = this.pmremGenerator.fromEquirectangular(hdrTexture).texture;
            this.scene.environment = envMap;
            this.scene.background = envMap;
            hdrTexture.dispose();
            if (this.skyMesh) this.skyMesh.visible = false;
          },
          undefined,
          () => {
            if (this.skyMesh) this.skyMesh.visible = true;
          }
        );
      })
      .catch(() => {
        if (this.skyMesh) this.skyMesh.visible = true;
      });
  }

  _buildRacers(config) {
    const playerStats = buildPlayerStats(config.characterId, config.vehicleId);

    const diffScale = this.difficulty === "easy" ? 0.9 : this.difficulty === "hard" ? 1.18 : 1.0;
    const aiAChar = randomCharacterId();
    const aiAVeh = randomVehicleId();
    const aiBChar = randomCharacterId();
    const aiBVeh = randomVehicleId();

    const aiAStats = buildPlayerStats(aiAChar, aiAVeh);
    const aiBStats = buildPlayerStats(aiBChar, aiBVeh);
    aiAStats.maxSpeed *= diffScale;
    aiAStats.boostMaxSpeed *= diffScale;
    aiBStats.maxSpeed *= diffScale;
    aiBStats.boostMaxSpeed *= diffScale;

    this.player = this._createRacer(config.characterId, config.vehicleId, config.vehicleColor, this.track.spawnIndices[0], true, playerStats);
    const ai1 = this._createRacer(aiAChar, aiAVeh, "#48cae4", this.track.spawnIndices[1], false, aiAStats);
    const ai2 = this._createRacer(aiBChar, aiBVeh, "#90be6d", this.track.spawnIndices[2], false, aiBStats);

    this.racers = [this.player, ai1, ai2];
    this.playerController = new PlayerController(this.player, playerStats);
    this.aiControllers = [
      new AIController(ai1, this.track, this.powerUps, 1.0, this.difficulty),
      new AIController(ai2, this.track, this.powerUps, 1.2, this.difficulty),
    ];

    const p = this.player.position;
    this.camera.position.set(p.x, p.y + 11, p.z - 21);
    this.cameraLookTarget.copy(p);
  }

  _createRacer(characterId, vehicleId, color, sampleIndex, isPlayer, stats) {
    const mesh = createVehicleMesh(this.scene, vehicleId, color);
    const driver = createDriver(characterId);
    driver.position.set(0, 2.4, 0.2);
    mesh.add(driver);
    mesh.userData.driverRoot = driver;

    const s = this.track.samples[sampleIndex];
    const heading = Math.atan2(s.tan.x, s.tan.z);

    return {
      id: `${characterId}-${vehicleId}-${sampleIndex}`,
      isPlayer,
      characterId,
      vehicleId,
      stats,
      mesh,
      position: s.p.clone().setY(s.p.y + 0.42),
      heading,
      speed: 0,
      velocity: new THREE.Vector3(),
      sideSlip: 0,
      driftFactor: 0,
      driftTimer: 0,
      wasDrifting: false,
      turboEnergy: 0,
      boostTimer: 0,
      lap: 1,
      finished: false,
      finishOrder: 0,
      nextCheckpoint: 0,
      sampleIndex,
      lastSampleIndex: sampleIndex,
      hitTimer: 0,
      controlLossTimer: 0,
      currentItem: null,
      activeRoute: "main",
      routeCooldown: 0,
      eliminated: false,
      raceProgress: 0,
      health: 100,
      collisionCooldown: 0,
      hazardCooldown: 0,
      jumpCooldown: 0,
      airTimer: 0,
      airVelocity: 0,
      stuckTimer: 0,
      outOfBoundsTimer: 0,
      groundNormal: new THREE.Vector3(0, 1, 0),
      visualUp: new THREE.Vector3(0, 1, 0),
    };
  }

  _buildTrackHazards() {
    this.hazardMeshes = [];
    for (const hz of this.track.hazards || []) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(hz.radius * 1.6, 1.4, hz.radius * 1.6),
        new THREE.MeshStandardMaterial({ color: 0x763626, roughness: 0.9, flatShading: true })
      );
      mesh.position.copy(hz.position).setY(hz.position.y + 0.6);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
        mesh.frustumCulled = true;
      this.scene.add(mesh);
      this.hazardMeshes.push({ mesh, data: hz, seed: Math.random() * Math.PI * 2, active: true });
    }

    this.dynamicHazardTimer = 3.4;
  }

  _buildCityEvent(trackId) {
    if (trackId !== "city" || !this.track.cityEventAnchor) {
      this.cityMonster = null;
      this.cityProjectiles.length = 0;
      return;
    }

    const anchor = this.track.cityEventAnchor;
    const monster = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.DodecahedronGeometry(6.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x52645d, roughness: 0.9, flatShading: true })
    );
    body.castShadow = true;
    monster.add(body);

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff3d6, roughness: 0.45, emissive: 0x553311, emissiveIntensity: 0.15, flatShading: true })
    );
    eye.position.set(0, 1.1, 4.5);
    monster.add(eye);

    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x1f2833, roughness: 0.4, flatShading: true })
    );
    iris.position.set(0, 1.1, 5.4);
    monster.add(iris);

    monster.position.copy(anchor).setY(anchor.y + 12);
    this.scene.add(monster);
    this.cityMonster = monster;
    this.cityThrowTimer = 2.4;
  }

  _initTrackDynamicEvents() {
    this.eventProps = [];
    this.activeTrackEvent = null;
    this.dynamicEventTimer = 4 + Math.random() * 3;
  }

  _enableFrustumCulling() {
    this.scene.traverse((obj) => {
      if (obj.isMesh || obj.isInstancedMesh) {
        obj.frustumCulled = true;
      }
    });
  }

  _updateRacerProgress(racer) {
    racer.lastSampleIndex = racer.sampleIndex;
    racer.sampleIndex = TrackGenerator.nearestSample(racer.position, this.track.samples, racer.sampleIndex, racer.isPlayer ? 95 : 68);

    const nearEnd = racer.lastSampleIndex > this.track.sampleCount * 0.84;
    const nearStart = racer.sampleIndex < this.track.sampleCount * 0.14;

    if (nearEnd && nearStart && racer.speed > 8) {
      racer.lap += 1;
      if (racer.lap > this.totalLaps) {
        racer.lap = this.totalLaps;
        racer.finished = true;
        this.finishCount += 1;
        racer.finishOrder = this.finishCount;
      }
    }
  }

  _applyCombatStatus(racer, dt) {
    if (racer.eliminated) {
      racer.speed = 0;
      racer.velocity.set(0, 0, 0);
      return;
    }

    if (racer.hitTimer > 0) {
      racer.hitTimer -= dt;
      racer.speed = Math.min(racer.speed, 9);
      const recovery = racer.stats?.hitRecovery || 1;
      racer.velocity.multiplyScalar(0.86 + (recovery - 1) * 0.05);
    }

    racer.collisionCooldown = Math.max(0, racer.collisionCooldown - dt);
    racer.hazardCooldown = Math.max(0, racer.hazardCooldown - dt);
    racer.jumpCooldown = Math.max(0, racer.jumpCooldown - dt);
    racer.health = Math.min(100, racer.health + dt * 2.2);

    if (racer.controlLossTimer > 0) {
      racer.controlLossTimer -= dt;
      racer.heading += Math.sin(performance.now() * 0.03) * 0.06;
      racer.sideSlip += Math.sin(performance.now() * 0.022) * 0.22;
    }
  }

  _applyDamage(racer, amount, stagger = 0.35) {
    if (racer.eliminated) return;
    racer.health = Math.max(0, racer.health - amount);
    racer.hitTimer = Math.max(racer.hitTimer, stagger);
    racer.speed *= THREE.MathUtils.clamp(1 - amount * 0.008, 0.55, 0.96);

    // Damage penalizes handling temporarily, but avoids frustrating hard resets.
    if (racer.health < 35) {
      racer.controlLossTimer = Math.max(racer.controlLossTimer, 0.5);
    }
  }

  _updateSafetyRespawn(dt) {
    const p = this.player;
    if (!p || p.eliminated) return;

    const mainSample = this.track.samples[p.sampleIndex] || this.track.samples[0];
    const routeSamples = this._currentSamplesFor(p);
    const routeSample = routeSamples[p.sampleIndex] || mainSample;

    const mainDist = p.position.distanceToSquared(mainSample.p);
    const routeDist = p.position.distanceToSquared(routeSample.p);
    const safeRadius = this.track.halfWidth * 4.8;
    const offTrackFar = Math.min(mainDist, routeDist) > safeRadius * safeRadius;
    const outOfWorld = p.position.y < -18;
    const almostStopped = p.velocity.lengthSq() < 2.5;

    p.outOfBoundsTimer = offTrackFar ? p.outOfBoundsTimer + dt : Math.max(0, p.outOfBoundsTimer - dt * 0.7);
    p.stuckTimer = almostStopped && offTrackFar ? p.stuckTimer + dt : Math.max(0, p.stuckTimer - dt * 0.8);

    const routeTan = routeSample.tan.clone().setY(0).normalize();
    const planarVel = p.velocity.clone().setY(0);
    const movingFast = planarVel.lengthSq() > 48;
    let reverseOffTrack = false;
    if (movingFast) {
      planarVel.normalize();
      reverseOffTrack = planarVel.dot(routeTan) < -0.38 && offTrackFar;
    }
    p.reverseOffTrackTimer = reverseOffTrack
      ? (p.reverseOffTrackTimer || 0) + dt
      : Math.max(0, (p.reverseOffTrackTimer || 0) - dt * 1.25);

    if ((p.reverseOffTrackTimer || 0) > 3.0) {
      this._resetRacerToTrack(p);
      p.reverseOffTrackTimer = 0;
      p.outOfBoundsTimer = 0;
      p.stuckTimer = 0;
      return;
    }

    if (outOfWorld || p.outOfBoundsTimer > 1.35 || p.stuckTimer > 2.4) {
      this._resetRacerToTrack(p);
      p.hitTimer = 0.35;
      p.hazardCooldown = 0.5;
      p.outOfBoundsTimer = 0;
      p.stuckTimer = 0;
    }
  }

  _resetRacerToTrack(racer) {
    const routeSamples = this._currentSamplesFor(racer);
    const idx = TrackGenerator.nearestSample(racer.position, routeSamples, racer.sampleIndex || 0, 80);
    const s = routeSamples[idx] || this.track.samples[0];
    racer.position.copy(s.p).setY(s.p.y + 0.42);
    racer.heading = Math.atan2(s.tan.x, s.tan.z);
    racer.speed = 0;
    racer.velocity.set(0, 0, 0);
    racer.sideSlip = 0;
    racer.controlLossTimer = 0;
    racer.sampleIndex = idx;
    racer.activeRoute = "main";
    racer.routeCooldown = 0.9;
  }

  _surfaceGripAt(racer) {
    const zones = this.track.surfaceZones || [];
    for (const z of zones) {
      const inRange = z.start <= z.end
        ? racer.sampleIndex >= z.start && racer.sampleIndex <= z.end
        : racer.sampleIndex >= z.start || racer.sampleIndex <= z.end;

      if (inRange) return z.gripMultiplier;
    }
    return 1;
  }

  _getGroundMeshesForRacer(racer) {
    const routeName = racer?.activeRoute || "main";
    const activeMesh = this.groundMeshByRoute?.[routeName] || null;
    const mainMesh = this.groundMeshByRoute?.main || null;

    if (activeMesh && mainMesh && activeMesh !== mainMesh) return [activeMesh, mainMesh];
    if (activeMesh) return [activeMesh];
    if (mainMesh) return [mainMesh];
    return this.groundMeshes || [];
  }

  _selectGroundHit(intersections, position, racer) {
    if (!intersections || intersections.length === 0) return null;

    const currentY = position.y;
    const maxRise = racer?.activeRoute !== "main" ? 2.4 : 1.6;
    const maxDrop = racer?.activeRoute !== "main" ? 1.8 : 1.2;
    let best = null;
    let bestScore = Infinity;

    for (const hit of intersections) {
      const candidateY = hit.point.y + 0.42;
      const delta = candidateY - currentY;

      if (delta > maxRise || delta < -maxDrop) continue;

      let score = Math.abs(delta);
      if (delta >= -0.15 && delta <= 0.95) score *= 0.75;

      if (score < bestScore) {
        best = hit;
        bestScore = score;
      }
    }

    return best || intersections[0];
  }

  _getTerrainHeightAt(position, racer = null) {
    // Sistema unico: raycast vertical sobre mallas de suelo jugables.
    const groundMeshes = this._getGroundMeshesForRacer(racer);
    if (groundMeshes.length > 0) {
      const rayOrigin = position.clone().setY(position.y + 24);
      this.raycaster.set(rayOrigin, this.raycasterDir);
      this.raycaster.far = 80;
      const intersections = this.raycaster.intersectObjects(groundMeshes, true);
      if (intersections.length > 0) {
        const hit = this._selectGroundHit(intersections, position, racer);
        if (racer && hit.face) {
          this._tmpNormalMatrix.getNormalMatrix(hit.object.matrixWorld);
          this._tmpGroundNormal.copy(hit.face.normal).applyMatrix3(this._tmpNormalMatrix).normalize();
          if (this._tmpGroundNormal.y < 0.35) {
            this._tmpGroundNormal.set(0, 1, 0);
          }
          racer.groundNormal.lerp(this._tmpGroundNormal, 0.35).normalize();
        }
        return hit.point.y + 0.42;
      }
    }

    // Fallback: si no hay raycast, aplicar gravedad para evitar que floten indefinidamente
    if (racer) racer.groundNormal.lerp(this._tmpGroundNormal.set(0, 1, 0), 0.2).normalize();
    return position.y - 0.18; // Bajada gradual si no hay terreno detectado
  }

  _applySpecialZoneEffects(racer, dt) {
    const pads = this.track.turboPads || [];
    for (const p of pads) {
      if (racer.position.distanceToSquared(p.position) < p.radius * p.radius) {
        racer.boostTimer = Math.max(racer.boostTimer, 0.22 + p.strength * 0.2);
      }
    }

    const mudZones = this.track.mudZones || [];
    for (const z of mudZones) {
      if (racer.position.distanceToSquared(z.position) < z.radius * z.radius) {
        racer.speed *= 1 - dt * z.drag;
        racer.velocity.multiplyScalar(1 - dt * (z.drag * 0.7));
      }
    }

    const dangerZones = this.track.dangerZones || [];
    for (const z of dangerZones) {
      if (racer.position.distanceToSquared(z.position) < z.radius * z.radius && racer.hazardCooldown <= 0) {
        racer.hazardCooldown = 0.34;
        this._applyDamage(racer, z.damage, 0.4);
        if (!racer.isPlayer || Math.random() < 0.5) {
          this.smoke?.emitSparks(racer.position.clone().setY(racer.position.y + 0.4), 0.75);
        }
      }
    }
  }

  _trySwitchToRoute(racer, routeName) {
    const route = this.track.routes?.[routeName];
    if (!route || racer.routeCooldown > 0) return;

    const d2 = racer.position.distanceToSquared(route.entryPoint);
    if (d2 < route.entryRadius * route.entryRadius) {
      if (!racer.isPlayer) {
        const aiChance = this.difficulty === "hard" ? 0.95 : 0;
        if (Math.random() > aiChance) return;
      }
      racer.activeRoute = routeName;
      racer.routeCooldown = 2.4;
      racer.sampleIndex = TrackGenerator.nearestSample(racer.position, route.samples, 0, 34);
    }
  }

  _updateRouteState(racer, dt) {
    racer.routeCooldown = Math.max(0, racer.routeCooldown - dt);

    if (racer.activeRoute === "main") {
      const branchChoices = this.track.branchChoices || [];
      for (const branch of branchChoices) {
        const distanceSq = racer.position.distanceToSquared(branch.entryPoint);
        const branchRadius = branch.entryRadius * (racer.isPlayer ? 1.15 : 1.0);
        if (distanceSq > branchRadius * branchRadius) continue;

        if (racer.isPlayer) {
          // Evita entrar a ramales por mantener giro durante una curva normal.
          const chooseLeft = this.justPressed.has("KeyA") || this.justPressed.has("ArrowLeft");
          const chooseRight = this.justPressed.has("KeyD") || this.justPressed.has("ArrowRight");

          if (chooseLeft) {
            racer.activeRoute = branch === branchChoices[0] ? "branchA" : "branchB";
            racer.routeCooldown = 2.4;
            racer.sampleIndex = TrackGenerator.nearestSample(racer.position, this.track.routes[racer.activeRoute].samples, 0, 34);
          } else if (chooseRight) {
            racer.activeRoute = branch === branchChoices[0] ? "branchA_alt" : "branchB_alt";
            racer.routeCooldown = 2.4;
            racer.sampleIndex = TrackGenerator.nearestSample(racer.position, this.track.routes[racer.activeRoute].samples, 0, 34);
          } else {
            // Sin input, mantener la trayectoria principal hasta que el jugador elija.
            continue;
          }
          continue;
        }

        const altBaseChance = this.difficulty === "hard" ? 0.52 : this.difficulty === "easy" ? 0.2 : 0.34;
        const speedBias = THREE.MathUtils.clamp((racer.speed - 26) / 32, -0.14, 0.2);
        const riskPenalty = racer.health < 45 || racer.hitTimer > 0 ? 0.22 : 0;
        const useAlt = Math.random() < THREE.MathUtils.clamp(altBaseChance + speedBias - riskPenalty, 0.05, 0.9);

        racer.activeRoute = useAlt
          ? (branch === branchChoices[0] ? "branchA_alt" : "branchB_alt")
          : (branch === branchChoices[0] ? "branchA" : "branchB");
        racer.routeCooldown = 2.4;
        racer.sampleIndex = TrackGenerator.nearestSample(racer.position, this.track.routes[racer.activeRoute].samples, 0, 34);
        return;
      }

      return;
    }

    const route = this.track.routes?.[racer.activeRoute];
    if (!route) {
      racer.activeRoute = "main";
      return;
    }

    const leaveD2 = racer.position.distanceToSquared(route.exitPoint);
    if (leaveD2 < route.exitRadius * route.exitRadius) {
      racer.activeRoute = "main";
      racer.routeCooldown = 1.2;
      racer.sampleIndex = TrackGenerator.nearestSample(racer.position, this.track.samples, route.exitMainIndex, 80);
    }
  }

  _currentSamplesFor(racer) {
    if (racer.activeRoute !== "main" && this.track.routes?.[racer.activeRoute]) {
      return this.track.routes[racer.activeRoute].samples;
    }
    return this.track.samples;
  }

  _resolveVehicleCollisions() {
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i];
        const b = this.racers[j];

        if (a.eliminated || b.eliminated) continue;

        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distSq = dx * dx + dz * dz;
        const minDistSq = 3.7 * 3.7; // Pre-calcular para evitar hypot

        if (distSq < minDistSq) {
          const dist = Math.sqrt(distSq);
          const nx = dist > 0 ? dx / dist : 1;
          const nz = dist > 0 ? dz / dist : 0;
          const overlap = (3.7 - dist) * 0.55;

          // Separar vehículos
          a.position.x -= nx * overlap;
          a.position.z -= nz * overlap;
          b.position.x += nx * overlap;
          b.position.z += nz * overlap;

          // Aplicar solo empuje lateral, sin frenado ni daño
          const impulse = 3.2;
          a.velocity.x -= nx * impulse;
          a.velocity.z -= nz * impulse;
          b.velocity.x += nx * impulse;
          b.velocity.z += nz * impulse;

          a.sideSlip -= nx * 0.8;
          a.sideSlip -= nz * 0.8;
          b.sideSlip += nx * 0.8;
          b.sideSlip += nz * 0.8;

          // Cooldown para evitar vibración continua
          if (a.collisionCooldown <= 0 && b.collisionCooldown <= 0) {
            a.collisionCooldown = 0.18;
            b.collisionCooldown = 0.18;

            if (this.smoke) {
              const impact = new THREE.Vector3(
                (a.position.x + b.position.x) * 0.5,
                (a.position.y + b.position.y) * 0.5 + 0.7,
                (a.position.z + b.position.z) * 0.5
              );
              this.smoke.emitSparks(impact, 1.3);
            }
          }
        }
      }
    }
  }

  _updateAI(dt) {
    for (const ai of this.aiControllers) {
      ai.update(dt, this.racers);
    }
  }

  _updatePlayer(dt) {
    const grip = this._surfaceGripAt(this.player);
    this.playerController.update(dt, this.keys, grip);

    const wantsItemUse = this.justPressed.has("KeyE") || this.justPressed.has("KeyQ") || (this.justPressed.has("Space") && this.player.driftFactor < 0.2);
    if (wantsItemUse) {
      this.powerUps.tryUseItem(this.player, this.racers);
    }
  }

  _updateAllRacers(dt) {
    for (const r of this.racers) {
      this._applyCombatStatus(r, dt);

      if (r.eliminated) {
        r.mesh.visible = false;
        continue;
      }

      r.mesh.visible = true;
      this._updateRouteState(r, dt, this.keys);

      const routeSamples = this._currentSamplesFor(r);
      const inAltRoute = r.activeRoute !== "main";
      const searchWindow = r.isPlayer
        ? (inAltRoute ? Math.min(26, Math.max(12, Math.floor(routeSamples.length * 0.16))) : 68)
        : (inAltRoute ? 34 : 62);
      r.lastSampleIndex = r.sampleIndex;
      r.sampleIndex = TrackGenerator.nearestSample(r.position, routeSamples, r.sampleIndex, searchWindow);

      TrackGenerator.constrainToTrack(r, this.track, 0.74, routeSamples, r.sampleIndex, dt);

      // Ajustar altura despues del constrain para que no vuelva a hundirse en rampas.
      const targetHeight = this._getTerrainHeightAt(r.position, r);
        if (r.airTimer > 0) {
          r.airTimer = Math.max(0, r.airTimer - dt);
          r.position.y += r.airVelocity * dt;
          r.airVelocity -= dt * 24.0;

          const minAirHeight = targetHeight + 0.24;
          if (r.position.y <= minAirHeight && r.airVelocity < 0) {
            r.position.y = minAirHeight;
            r.airTimer = 0;
            r.airVelocity = 0;
          }
        } else {
          const liftAssist = targetHeight > r.position.y + 0.08 ? 0.72 : 0.58;
          r.position.y = THREE.MathUtils.lerp(r.position.y, targetHeight, liftAssist);
        }

      r.raceProgress = this._computeRaceProgress(r, routeSamples);

      const gripScale = this._surfaceGripAt(r);
      if (gripScale < 1) {
        r.velocity.multiplyScalar(1 - (1 - gripScale) * dt * 2.1);
        r.speed *= 1 - (1 - gripScale) * dt;
        if (!r.isPlayer && this.smoke && r.speed > 18 && Math.random() < 0.35) {
          this.smoke.emitDust(r, 1);
        }
      }

      this._applySpecialZoneEffects(r, dt);

      const driftingNow = r.driftFactor > 0.42 && Math.abs(r.speed) > 14;
      if (r.isPlayer && driftingNow && !r.wasDrifting) {
        this.audio.play("drift-start", r.characterId);
      }
      if (driftingNow) r.wasDrifting = true;
      else if (r.driftFactor < 0.18) r.wasDrifting = false;

      if (r.boostTimer > 0.05 && this.smoke && Math.random() < (r.isPlayer ? 0.85 : 0.35)) {
        this.smoke.emitBoostFlame(r, 1);
      }

      if (!r.isPlayer && this.track.id === "desert" && this.smoke && r.speed > 20 && Math.random() < 0.12) {
        this.smoke.emitDust(r, 1);
      }

      r.visualUp.lerp(r.groundNormal, 0.22).normalize();
      const groundForward = this._tmpGroundForward.set(Math.sin(r.heading), 0, Math.cos(r.heading)).projectOnPlane(r.visualUp);
      if (groundForward.lengthSq() < 0.0001) {
        groundForward.set(0, 0, 1).projectOnPlane(r.visualUp);
      }
      groundForward.normalize();
      this._tmpGroundLook.copy(r.position).add(groundForward);

      r.mesh.position.copy(r.position);
      r.mesh.up.copy(r.visualUp);
      r.mesh.lookAt(this._tmpGroundLook);
    }

    this._resolveHazards();
    this._updateDynamicHazards(dt);
    this._resolveVehicleCollisions();
  }

  _activateTrackEvent(type) {
    this.activeTrackEvent = type;
    this.eventProps = [];

    if (type === "traffic-wave") {
      for (let i = 0; i < 4; i++) {
        const idx = (Math.random() * this.track.sampleCount) | 0;
        const s = this.track.samples[idx];
        const car = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 1.2, 4.2),
          new THREE.MeshStandardMaterial({ color: 0xe56b6f, roughness: 0.72, flatShading: true })
        );
        car.position.copy(s.p).setY(s.p.y + 0.75);
        car.castShadow = true;
        this.scene.add(car);
        this.eventProps.push({ mesh: car, sample: idx, speed: 46 + Math.random() * 18, life: 8.6 });
      }
      return;
    }

    if (type === "falling-rock") {
      for (let i = 0; i < 5; i++) {
        const idx = (Math.random() * this.track.sampleCount) | 0;
        const s = this.track.samples[idx];
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(2 + Math.random() * 1.2, 0),
          new THREE.MeshStandardMaterial({ color: 0x656d78, roughness: 0.9, flatShading: true })
        );
        rock.position.copy(s.p).add(new THREE.Vector3((Math.random() - 0.5) * 18, 20 + Math.random() * 16, (Math.random() - 0.5) * 18));
        rock.castShadow = true;
        this.scene.add(rock);
        this.eventProps.push({ mesh: rock, vel: new THREE.Vector3((Math.random() - 0.5) * 4, -12 - Math.random() * 8, (Math.random() - 0.5) * 4), life: 5.2 });
      }
      return;
    }

    if (type === "sandstorm") {
      this.eventProps.push({ life: 7.8, strength: 0.7 + Math.random() * 0.35 });
      this.scene.fog = new THREE.Fog(0xcba35f, 80, 560);
    }
  }

  _updateTrackDynamicEvent(dt) {
    this.dynamicEventTimer -= dt;

    if (this.dynamicEventTimer <= 0 && !this.activeTrackEvent) {
      const events = this.track.dynamicEvents || [];
      if (events.length > 0) {
        const chosen = events[(Math.random() * events.length) | 0];
        this._activateTrackEvent(chosen.type);
        this.dynamicEventTimer = chosen.cooldownMin + Math.random() * (chosen.cooldownMax - chosen.cooldownMin);
      }
    }

    if (!this.activeTrackEvent) return;

    if (this.activeTrackEvent === "traffic-wave") {
      for (let i = this.eventProps.length - 1; i >= 0; i--) {
        const e = this.eventProps[i];
        e.life -= dt;
        e.sample = (e.sample + Math.floor(e.speed * dt)) % this.track.sampleCount;
        const s = this.track.samples[e.sample];
        e.mesh.position.copy(s.p).setY(s.p.y + 0.75);
        e.mesh.rotation.y = Math.atan2(s.tan.x, s.tan.z);

        for (const r of this.racers) {
          if (r.eliminated) continue;
          if (e.mesh.position.distanceToSquared(r.position) < 3.2 * 3.2 && r.hazardCooldown <= 0) {
            r.hazardCooldown = 0.28;
            this._applyDamage(r, 11, 0.55);
            this.audio.play("hit", r.characterId);
          }
        }

        if (e.life <= 0) {
          this.scene.remove(e.mesh);
          this.eventProps.splice(i, 1);
        }
      }

      if (this.eventProps.length === 0) this.activeTrackEvent = null;
      return;
    }

    if (this.activeTrackEvent === "falling-rock") {
      for (let i = this.eventProps.length - 1; i >= 0; i--) {
        const e = this.eventProps[i];
        e.life -= dt;
        e.mesh.position.addScaledVector(e.vel, dt);
        e.mesh.rotation.x += dt * 2.1;
        e.mesh.rotation.z += dt * 1.7;

        for (const r of this.racers) {
          if (r.eliminated) continue;
          if (e.mesh.position.distanceToSquared(r.position) < 3 * 3 && r.hazardCooldown <= 0) {
            r.hazardCooldown = 0.32;
            this._applyDamage(r, 14, 0.75);
            this.audio.play("hit", r.characterId);
          }
        }

        if (e.life <= 0 || e.mesh.position.y < -2) {
          this.scene.remove(e.mesh);
          this.eventProps.splice(i, 1);
        }
      }

      if (this.eventProps.length === 0) this.activeTrackEvent = null;
      return;
    }

    if (this.activeTrackEvent === "sandstorm") {
      const e = this.eventProps[0];
      if (!e) {
        this.activeTrackEvent = null;
        return;
      }

      e.life -= dt;
      for (const r of this.racers) {
        if (r.eliminated) continue;
        r.speed *= 1 - dt * 0.12 * e.strength;
      }

      if (e.life <= 0) {
        this.scene.fog = new THREE.Fog(this.baseFogColor || 0x85dfff, 180, 980);
        this.eventProps.length = 0;
        this.activeTrackEvent = null;
      }
    }

    const ramps = this.track.ramps || [];
    for (const ramp of ramps) {
      const d2 = racer.position.distanceToSquared(ramp.position);
      if (d2 < ramp.radius * ramp.radius && racer.jumpCooldown <= 0 && racer.airTimer <= 0.02 && racer.speed > 16) {
        racer.jumpCooldown = 0.9;
        racer.airTimer = Math.max(racer.airTimer, ramp.airTime || 0.28);
        racer.airVelocity = Math.max(racer.airVelocity, (ramp.launchVelocity || 8.6) + Math.min(6.5, racer.speed * 0.042));
        racer.boostTimer = Math.max(racer.boostTimer, 0.3);

        if (this.smoke && (racer.isPlayer || Math.random() < 0.35)) {
          this.smoke.emitSparks(racer.position.clone().setY(racer.position.y + 0.25), 0.9);
        }
      }
    }
  }

  _computeRaceProgress(racer, routeSamples) {
    const normLap = Math.max(0, racer.lap - 1);

    if (racer.activeRoute === "main") {
      return normLap + racer.sampleIndex / this.track.sampleCount;
    }

    const route = this.track.routes?.[racer.activeRoute];
    if (!route) return normLap + racer.sampleIndex / this.track.sampleCount;

    const routeNorm = racer.sampleIndex / Math.max(1, routeSamples.length);
    const span = ((route.exitMainIndex - route.entryMainIndex + this.track.sampleCount) % this.track.sampleCount) || 1;
    const mapped = (route.entryMainIndex + routeNorm * span) % this.track.sampleCount;

    return normLap + mapped / this.track.sampleCount;
  }

  _updateDynamicHazards(dt) {
    this.dynamicHazardTimer -= dt;
    const t = performance.now() * 0.001;

    for (const hz of this.hazardMeshes || []) {
      hz.mesh.position.y = hz.data.position.y + 0.6 + Math.sin(t * 2.1 + hz.seed) * 0.35;
      hz.mesh.rotation.y += dt * 0.7;
      hz.mesh.visible = hz.active;
      if (this.player?.position && hz.mesh.position.distanceToSquared(this.player.position) > 210 * 210) {
        hz.mesh.visible = false;
        continue;
      }
    }

    if (this.dynamicHazardTimer > 0 || !this.hazardMeshes?.length) return;
    this.dynamicHazardTimer = 4.2 + Math.random() * 2.6;

    for (const hz of this.hazardMeshes) hz.active = false;

    const pick = this.hazardMeshes[(Math.random() * this.hazardMeshes.length) | 0];
    const idx = (Math.random() * this.track.sampleCount) | 0;
    const sample = this.track.samples[idx];
    const side = Math.random() < 0.5 ? -1 : 1;
    pick.data.position.copy(sample.p).addScaledVector(sample.normal, side * this.track.halfWidth * 0.5);
    pick.mesh.position.copy(pick.data.position).setY(pick.data.position.y + 0.6);
    pick.active = true;
  }

  _resolveHazards() {
    for (const hz of this.hazardMeshes || []) {
      if (!hz.active) continue;
      if (this.player?.position && hz.mesh.position.distanceToSquared(this.player.position) > 260 * 260) continue;
      for (const r of this.racers) {
        if (r.eliminated) continue;
        const d2 = hz.mesh.position.distanceToSquared(r.position);
        if (d2 < hz.data.radius * hz.data.radius && r.hazardCooldown <= 0) {
          r.hazardCooldown = 0.3;
          this._applyDamage(r, 12, 0.55);
          this.smoke?.emitSparks(r.position.clone().setY(r.position.y + 0.5), 1.2);
          this.audio.play("hit", r.characterId);
        }
      }
    }
  }

  _updateCityEvent(dt) {
    if (!this.cityMonster) return;

    this.cityMonster.rotation.y += dt * 0.35;
    this.cityThrowTimer -= dt;

    if (this.cityThrowTimer <= 0 && this.player && !this.player.eliminated) {
      this.cityThrowTimer = 1.5 + Math.random() * 1.5;
      const garbage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.3 + Math.random() * 0.6, 0),
        new THREE.MeshStandardMaterial({ color: 0x4d4d4d, roughness: 0.94, flatShading: true })
      );
      garbage.castShadow = true;
      garbage.frustumCulled = true;
      garbage.position.copy(this.cityMonster.position).add(new THREE.Vector3((Math.random() - 0.5) * 4, -2, (Math.random() - 0.5) * 4));

      const toPlayer = this.player.position.clone().sub(garbage.position).setY(0);
      const vel = toPlayer.normalize().multiplyScalar(36 + Math.random() * 8);
      vel.y = 9 + Math.random() * 2;

      this.scene.add(garbage);
      this.cityProjectiles.push({ mesh: garbage, velocity: vel, life: 4.3 });
    }

    for (let i = this.cityProjectiles.length - 1; i >= 0; i--) {
      const p = this.cityProjectiles[i];
      p.life -= dt;
      p.velocity.y -= dt * 14;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 4;
      p.mesh.rotation.z += dt * 2.7;

      if (this.player && !this.player.eliminated && p.mesh.position.distanceToSquared(this.player.position) < 3.6 * 3.6) {
        this._applyDamage(this.player, 22, 0.9);
        this.player.hazardCooldown = 0.45;
        this.audio.play("hit", this.player.characterId);
        this.scene.remove(p.mesh);
        this.cityProjectiles.splice(i, 1);
        continue;
      }

      if (p.life <= 0 || p.mesh.position.y < -4) {
        this.scene.remove(p.mesh);
        this.cityProjectiles.splice(i, 1);
      }
    }
  }

  _eliminatePlayer() {
    this.player.eliminated = true;
    this.playerRespawnTimer = 2.6;
    this.audio.play("eliminated", this.player.characterId);
  }

  _updatePlayerRespawn(dt) {
    if (!this.player.eliminated) return;
    this.playerRespawnTimer -= dt;
    if (this.playerRespawnTimer > 0) return;

    this.player.eliminated = false;
    const respawnIndex = (this.player.sampleIndex - 18 + this.track.sampleCount) % this.track.sampleCount;
    const s = this.track.samples[respawnIndex];
    this.player.position.copy(s.p).setY(s.p.y + 0.42);
    this.player.heading = Math.atan2(s.tan.x, s.tan.z);
    this.player.speed = 0;
    this.player.velocity.set(0, 0, 0);
    this.player.hitTimer = 0.4;
    this.player.health = 78;
    this.player.hazardCooldown = 0.8;
    this.player.collisionCooldown = 0.4;
  }

  _updateCamera(dt) {
    const p = this.player;
    const forward = this._tmpForward.set(Math.sin(p.heading), 0, Math.cos(p.heading));
    const side = this._tmpSide.set(forward.z, 0, -forward.x);

    let desiredPos, desiredLook;

    if (this.cameraMode === 0) {
      // Vista trasera (por defecto)
      desiredPos = this._tmpDesiredPos
        .copy(p.position)
        .addScaledVector(forward, -21)
        .addScaledVector(side, 1.2)
        .setY(p.position.y + 10.6);
      desiredLook = this._tmpDesiredLook
        .copy(p.position)
        .addScaledVector(forward, 9)
        .setY(p.position.y + 2.0);
    } else if (this.cameraMode === 1) {
      // Vista frontal (mirando al coche)
      desiredPos = this._tmpDesiredPos
        .copy(p.position)
        .addScaledVector(forward, 20)
        .addScaledVector(side, -0.5)
        .setY(p.position.y + 8.0);
      desiredLook = this._tmpDesiredLook
        .copy(p.position)
        .setY(p.position.y + 1.8);
    } else if (this.cameraMode === 2) {
      // Primera persona
      desiredPos = this._tmpDesiredPos
        .copy(p.position)
        .setY(p.position.y + 3.2);
      desiredLook = this._tmpDesiredLook
        .copy(p.position)
        .addScaledVector(forward, 20)
        .setY(p.position.y + 3.2);
    } else if (this.cameraMode === 3) {
      // Vista lateral
      desiredPos = this._tmpDesiredPos
        .copy(p.position)
        .addScaledVector(side, 18)
        .addScaledVector(forward, 4)
        .setY(p.position.y + 9.0);
      desiredLook = this._tmpDesiredLook
        .copy(p.position)
        .setY(p.position.y + 2.0);
    }

    this.camera.position.lerp(desiredPos, 1 - Math.exp(-6.2 * dt));
    this.cameraLookTarget.lerp(desiredLook, 1 - Math.exp(-7.1 * dt));
    this.camera.lookAt(this.cameraLookTarget);

    const speedRatio = THREE.MathUtils.clamp(this.player.velocity.length() / 92, 0, 1);
    this.camera.fov = THREE.MathUtils.lerp(58, 78, speedRatio);
    this.camera.updateProjectionMatrix();

    this.miniCamera.position.x = p.position.x;
    this.miniCamera.position.z = p.position.z;
    this.miniCamera.lookAt(p.position.x, 0, p.position.z);
  }

  _updateHeadlightLOD() {
    if (!this.player) return;
    const pPos = this.player.position;

    for (const r of this.racers) {
      const beams = r.mesh?.userData?.headlightBeams;
      if (!beams) continue;

      const dist2 = r.position.distanceToSquared(pPos);
      const enable = r.isPlayer || dist2 < 120 * 120;
      for (const b of beams) {
        b.visible = enable;
        b.intensity = enable ? (r.isPlayer ? 2.2 : 1.1) : 0;
      }
    }
  }

  _getRanking() {
    const sorted = [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishOrder - b.finishOrder;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.raceProgress - a.raceProgress;
    });
    return sorted;
  }

  _checkFinish() {
    if (!this.player.finished || !this.isRunning || this.victoryCinematicActive || this.finishPending) return;

    const ranking = this._getRanking();
    const pos = ranking.indexOf(this.player) + 1;
    this._startVictoryCinematic(pos);
  }

  _initMiniMapData() {
    if (!this.miniMapCanvas || !this.track?.samples?.length) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssSize = this.miniMapCanvas.clientWidth || 176;
    const pxSize = Math.max(128, Math.floor(cssSize * dpr));
    if (this.miniMapCanvas.width !== pxSize || this.miniMapCanvas.height !== pxSize) {
      this.miniMapCanvas.width = pxSize;
      this.miniMapCanvas.height = pxSize;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const s of this.track.samples) {
      if (s.p.x < minX) minX = s.p.x;
      if (s.p.x > maxX) maxX = s.p.x;
      if (s.p.z < minZ) minZ = s.p.z;
      if (s.p.z > maxZ) maxZ = s.p.z;
    }

    const pad = Math.max(this.track.halfWidth * 0.9, 24);
    this.miniMapBounds = {
      minX: minX - pad,
      maxX: maxX + pad,
      minZ: minZ - pad,
      maxZ: maxZ + pad,
    };

    this.miniMapPath = [];
    for (let i = 0; i < this.track.samples.length; i += 2) {
      this.miniMapPath.push(this._worldToMiniMapPoint(this.track.samples[i].p));
    }
    this.miniMapTrail.length = 0;
    this.miniMapTrailTimer = 0;
  }

  _worldToMiniMapPoint(pos) {
    if (!this.miniMapBounds) return { x: 0.5, y: 0.5 };
    const width = Math.max(1, this.miniMapBounds.maxX - this.miniMapBounds.minX);
    const height = Math.max(1, this.miniMapBounds.maxZ - this.miniMapBounds.minZ);
    const nx = (pos.x - this.miniMapBounds.minX) / width;
    const ny = 1 - (pos.z - this.miniMapBounds.minZ) / height;
    return { x: THREE.MathUtils.clamp(nx, 0, 1), y: THREE.MathUtils.clamp(ny, 0, 1) };
  }

  _drawMiniMap() {
    if (!this.enableMiniMap) return;

    const ctx = this.miniMapCtx;
    const canvas = this.miniMapCanvas;
    if (!ctx || !canvas || !this.player || !this.track) return;
    if (!this.isRunning || this.raceIntroActive || this.raceCountdownActive) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.5 - 6;

    this.miniMapTrailTimer += 1;
    const trailStep = this.isTouchDevice ? 4 : 2;
    if (this.miniMapTrailTimer >= trailStep) {
      this.miniMapTrailTimer = 0;
      this.miniMapTrail.push(this._worldToMiniMapPoint(this.player.position));
      if (this.miniMapTrail.length > 110) this.miniMapTrail.shift();
    }

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const bgGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
    bgGrad.addColorStop(0, "rgba(13, 30, 45, 0.95)");
    bgGrad.addColorStop(1, "rgba(8, 14, 24, 0.95)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (this.miniMapPath.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.miniMapPath.length; i++) {
        const p = this.miniMapPath[i];
        const x = cx + (p.x - 0.5) * radius * 1.72;
        const y = cy + (p.y - 0.5) * radius * 1.72;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(115, 156, 190, 0.32)";
      ctx.lineWidth = Math.max(2, radius * 0.035);
      ctx.stroke();
    }

    if (this.miniMapTrail.length > 1) {
      ctx.beginPath();
      for (let i = 0; i < this.miniMapTrail.length; i++) {
        const p = this.miniMapTrail[i];
        const x = cx + (p.x - 0.5) * radius * 1.72;
        const y = cy + (p.y - 0.5) * radius * 1.72;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(64, 226, 255, 0.78)";
      ctx.lineWidth = Math.max(1.6, radius * 0.022);
      ctx.stroke();
    }

    for (const r of this.racers) {
      if (r.eliminated) continue;
      const p = this._worldToMiniMapPoint(r.position);
      const x = cx + (p.x - 0.5) * radius * 1.72;
      const y = cy + (p.y - 0.5) * radius * 1.72;

      if (r.isPlayer) continue;
      
      // Mostrar emoji en lugar de círculo para NPCs
      ctx.font = `${Math.max(8, radius * 0.08)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const emoji = this.characterEmojis[r.characterId] || "🐴";
      ctx.fillText(emoji, x, y);
    }

    const pp = this._worldToMiniMapPoint(this.player.position);
    const px = cx + (pp.x - 0.5) * radius * 1.72;
    const py = cy + (pp.y - 0.5) * radius * 1.72;
    const heading = this.player.heading;
    const markerSize = Math.max(4.5, radius * 0.08);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(heading);
    ctx.beginPath();
    ctx.moveTo(0, -markerSize * 1.2);
    ctx.lineTo(markerSize * 0.72, markerSize * 0.95);
    ctx.lineTo(-markerSize * 0.72, markerSize * 0.95);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 82, 82, 1)";
    ctx.fill();
    ctx.restore();

    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, radius - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(231, 246, 255, 0.95)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  _loop(now) {
    if (this.frameIntervalMs > 0 && now - this.lastFrameTick < this.frameIntervalMs) {
      this.rafId = requestAnimationFrame((t) => this._loop(t));
      return;
    }

    this.lastFrameTick = now;
    this.effectFrameCounter += 1;
    const shouldUpdateHeavyEffects = !this.isTouchDevice || (this.effectFrameCounter % 2 === 0);
    const dt = Math.min(0.033, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;

    if (this.isRunning) {
      if (this.victoryCinematicActive) {
        this._updateVictoryCinematic(dt);
      } else if (this.raceIntroActive) {
        this._updateRaceIntro(dt);
        if (shouldUpdateHeavyEffects) this.smoke.update(dt);
        this.audio.update(this.player, dt);
      } else if (this.raceCountdownActive) {
        this._updateRaceCountdown(dt);
        if (shouldUpdateHeavyEffects) this.smoke.update(dt);
        this.audio.update(this.player, dt);
      } else {
        this._updatePlayer(dt);
        this._updateAI(dt);
        this._updateAllRacers(dt);

        // Actualizar sistema de vueltas
        if (this.lapSystem) this.lapSystem.update();

        this.powerUps.update(dt, this.racers);
        if (this.events) this.events.update(dt, this.racers);
        this._updateTrackDynamicEvent(dt);
        this._updateCityEvent(dt);
        this._updateSafetyRespawn(dt);
        this._updatePlayerRespawn(dt);

        for (const ai of this.aiControllers) {
          const chance = this.difficulty === "hard" ? 0.014 : this.difficulty === "easy" ? 0.006 : 0.009;
          if (Math.random() < chance) {
            this.powerUps.tryUseItem(ai.vehicle, this.racers);
          }
        }

        if (shouldUpdateHeavyEffects && this.player.driftFactor > 0.3 && !this.player.eliminated) {
          this.smoke.emit(this.player, this.smokeEmissionFactor);
        }

        for (const ai of this.aiControllers) {
          if (shouldUpdateHeavyEffects && ai.vehicle.driftFactor > 0.45 && Math.random() < 0.18) {
            this.smoke.emit(ai.vehicle, this.smokeEmissionFactor * 0.8);
          }
        }

        if (shouldUpdateHeavyEffects) this.smoke.update(dt);
        this.audio.update(this.player, dt);
        this._updateHeadlightLOD();

        this._updateCamera(dt);
        const rank = this._getRanking();
        const playerPos = rank.indexOf(this.player) + 1;

        // En modo infinito, mostrar "∞" en lugar del número de vueltas
        const displayLaps = this.isInfiniteMode ? "∞" : this.totalLaps;
        this.ui.updateHUD(this.player, playerPos, this.racers.length, displayLaps);
        this._checkFinish();
      }
    }

    this._updateFPS(now);

    this.renderer.setViewport(0, 0, this.renderer.domElement.width, this.renderer.domElement.height);
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    this._drawMiniMap();

    this.justPressed.clear();
    this.rafId = requestAnimationFrame((t) => this._loop(t));
  }

  _updateFPS(now) {
    this.framesSinceSample += 1;
    const elapsed = now - this.lastFpsSample;
    if (elapsed > 250) {
      const fps = Math.round((this.framesSinceSample * 1000) / elapsed);

      if (!this.manualQualityTier) {
        const lowThreshold = this.isTouchDevice ? 28 : 54;
        const highThreshold = this.isTouchDevice ? 45 : 72;
        const nextTier = fps < lowThreshold ? "low" : fps > highThreshold ? "high" : "balanced";
        if (nextTier !== this.qualityTier) {
          this._applyQualityTier(nextTier);
        }
      }

      this.ui.setFPS(fps);
      this.framesSinceSample = 0;
      this.lastFpsSample = now;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.events) this.events.dispose();
    this.audio.stop();
    this.ui.setRaceUIVisible(false);
    this.ui.setCountdownVisible(false);

    if (this.keyDownHandler) window.removeEventListener("keydown", this.keyDownHandler);
    if (this.keyUpHandler) window.removeEventListener("keyup", this.keyUpHandler);
    if (this.resizeHandler) window.removeEventListener("resize", this.resizeHandler);
  }

  _onResize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width < 2 || height < 2) return;

    const pixelRatioCap = this._getPixelRatioCapForTier(this.qualityTier);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap));
    this.renderer.setSize(width, height, false);

    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.composer) {
      const baseScale = this.qualityTier === "low" ? 0.52 : this.qualityTier === "balanced" ? 0.64 : 0.74;
      const landscapePenalty = this.isTouchDevice && width > height ? 0.08 : 0;
      const scale = Math.max(0.46, baseScale - landscapePenalty);
      this.composer.setSize(Math.floor(width * scale), Math.floor(height * scale));
      if (this.bloomPass) this.bloomPass.resolution.set(width, height);
    }

    if (this.miniMapCanvas && this.track) {
      this._initMiniMapData();
    }
  }
}
