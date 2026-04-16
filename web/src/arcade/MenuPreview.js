import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";
import { createDriver, createVehicleMesh } from "./PlayerController.js";
import { getCharacterModel } from "./CharacterModels.js";
import { getVehicleModel } from "./VehicleModels.js";

function setupRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height, false);
  return renderer;
}

function setupScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 220 / 140, 0.1, 100);
  camera.position.set(0, 2.4, 8);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xfff3d4, 1.1);
  sun.position.set(6, 9, 4);
  scene.add(sun);
  return { scene, camera };
}

export class MenuPreview {
  constructor() {
    this.characterCanvas = document.getElementById("previewCharacter");
    this.vehicleCanvas = document.getElementById("previewVehicle");
    this.trackCanvas = document.getElementById("previewTrack");

    if (!this.characterCanvas || !this.vehicleCanvas || !this.trackCanvas) {
      this.enabled = false;
      return;
    }

    this.enabled = true;

    this.characterRenderer = setupRenderer(this.characterCanvas);
    this.vehicleRenderer = setupRenderer(this.vehicleCanvas);
    this.trackRenderer = setupRenderer(this.trackCanvas);

    this.characterCtx = setupScene();
    this.vehicleCtx = setupScene();
    this.trackCtx = setupScene();

    this.characterRoot = new THREE.Group();
    this.characterCtx.scene.add(this.characterRoot);

    this.vehicleRoot = new THREE.Group();
    this.vehicleCtx.scene.add(this.vehicleRoot);

    this.trackRoot = new THREE.Group();
    this.trackCtx.scene.add(this.trackRoot);

    this.lastCharacter = null;
    this.lastVehicle = null;
    this.lastColor = "#ff4d6d";
    this.lastTrack = null;

    this.drag = {
      character: { active: false, lastX: 0, offset: 0 },
      vehicle: { active: false, lastX: 0, offset: 0 },
      track: { active: false, lastX: 0, offset: 0 },
    };

    this._bindPointer(this.characterCanvas, this.drag.character);
    this._bindPointer(this.vehicleCanvas, this.drag.vehicle);
    this._bindPointer(this.trackCanvas, this.drag.track);

    this.running = true;
    requestAnimationFrame((t) => this._loop(t));
  }

  _bindPointer(canvas, state) {
    const onDown = (e) => {
      state.active = true;
      state.lastX = e.clientX;
      canvas.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e) => {
      if (!state.active) return;
      const dx = e.clientX - state.lastX;
      state.lastX = e.clientX;
      state.offset += dx * 0.01;
    };

    const onUp = (e) => {
      state.active = false;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onUp);
    canvas.addEventListener("pointercancel", onUp);
  }

  update(selection) {
    if (!this.enabled) return;

    const { characterId, vehicleId, vehicleColor, trackId } = selection;

    if (characterId !== this.lastCharacter) {
      this._rebuildCharacter(characterId);
      this.lastCharacter = characterId;
    }

    if (vehicleId !== this.lastVehicle || vehicleColor !== this.lastColor) {
      this._rebuildVehicle(vehicleId, vehicleColor);
      this.lastVehicle = vehicleId;
      this.lastColor = vehicleColor;
    }

    if (trackId !== this.lastTrack) {
      this._rebuildTrack(trackId);
      this.lastTrack = trackId;
    }
  }

  _clearGroup(group) {
    while (group.children.length) {
      const c = group.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material.dispose();
      }
    }
  }

  _rebuildCharacter(characterId) {
    this._clearGroup(this.characterRoot);

    try {
      const character = getCharacterModel(characterId);
      character.position.set(0, 0.42, 0);
      this.characterRoot.add(character);
    } catch (e) {
      console.warn("CharacterModel fallback:", characterId);
      const driver = createDriver(characterId);
      driver.position.set(0, 0, 0);
      this.characterRoot.add(driver);
    }

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.6, 0.5, 18),
      new THREE.MeshStandardMaterial({ color: 0x346d3f, roughness: 0.9, flatShading: true })
    );
    base.position.y = -0.2;
    this.characterRoot.add(base);
  }

  _rebuildVehicle(vehicleId, color) {
    this._clearGroup(this.vehicleRoot);

    let kart;

    try {
      kart = getVehicleModel(vehicleId, color);
    } catch (e) {
      console.warn("VehicleModel fallback:", vehicleId);
      const tmpScene = new THREE.Scene();
      kart = createVehicleMesh(tmpScene, vehicleId, color);
      tmpScene.remove(kart);
    }

    this.vehicleRoot.add(kart);
  }

  _rebuildTrack(trackId) {
    this._clearGroup(this.trackRoot);

    const points = trackId === "city"
      ? [
          new THREE.Vector3(-3.2, 0, 2.8),
          new THREE.Vector3(-1.2, 0.4, 3.6),
          new THREE.Vector3(1.8, 0.2, 2.3),
          new THREE.Vector3(3.4, 0.5, -0.4),
          new THREE.Vector3(1.5, 0.1, -2.8),
          new THREE.Vector3(-1.9, 0.3, -3.4),
          new THREE.Vector3(-3.5, 0.7, -0.6),
        ]
      : trackId === "desert"
        ? [
            new THREE.Vector3(-3.4, 0.2, 2.8),
            new THREE.Vector3(-1.7, 0.9, 3.8),
            new THREE.Vector3(1.3, 0.6, 2.4),
            new THREE.Vector3(3.7, 1.3, 0.8),
            new THREE.Vector3(2.9, 0.3, -2.2),
            new THREE.Vector3(-0.2, 1.1, -3.7),
            new THREE.Vector3(-3.1, 0.5, -2.1),
          ]
        : [
          new THREE.Vector3(-3.1, 0.1, 2.9),
          new THREE.Vector3(-1.4, 0.8, 3.5),
          new THREE.Vector3(1.9, 0.5, 2.1),
          new THREE.Vector3(3.2, 0.9, -0.9),
          new THREE.Vector3(1.2, 0.2, -3.1),
          new THREE.Vector3(-1.8, 0.4, -3.2),
          new THREE.Vector3(-3.4, 0.6, -0.4),
        ];

    const curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.18);
    const strip = [];
    const half = 0.42;

    for (let i = 0; i < 90; i++) {
      const t = i / 90;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      strip.push(p.clone().addScaledVector(n, half), p.clone().addScaledVector(n, -half));
    }

    const g = new THREE.BufferGeometry();
    const positions = [];
    const indices = [];
    for (const p of strip) positions.push(p.x, p.y, p.z);
    for (let i = 0; i < 89; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();

    const roadColor = trackId === "city" ? 0x4a5163 : trackId === "desert" ? 0x8f5d2f : 0x43506a;
    const m = new THREE.MeshStandardMaterial({ color: roadColor, roughness: 0.85, flatShading: true });
    const road = new THREE.Mesh(g, m);
    this.trackRoot.add(road);

    const env = new THREE.Mesh(
      new THREE.CircleGeometry(5.8, 32),
      new THREE.MeshStandardMaterial({ color: trackId === "city" ? 0x99b48f : trackId === "desert" ? 0xd6a25b : 0x74bc63, roughness: 0.95, flatShading: true })
    );
    env.rotation.x = -Math.PI * 0.5;
    env.position.y = -0.1;
    this.trackRoot.add(env);
  }

  _loop() {
    if (!this.running || !this.enabled) return;

    const spin = performance.now() * 0.0006;
    this.characterRoot.rotation.y = spin + this.drag.character.offset;
    this.vehicleRoot.rotation.y = spin + this.drag.vehicle.offset;
    this.trackRoot.rotation.y = spin * 0.35 + this.drag.track.offset;

    this.characterRenderer.render(this.characterCtx.scene, this.characterCtx.camera);
    this.vehicleRenderer.render(this.vehicleCtx.scene, this.vehicleCtx.camera);
    this.trackRenderer.render(this.trackCtx.scene, this.trackCtx.camera);

    requestAnimationFrame((t) => this._loop(t));
  }
}
