import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const ITEMS = ["rocket", "spikes", "turbo", "shield", "pulse"];

export class PowerUpSystem {
  constructor(scene, track, onEvent = null) {
    this.scene = scene;
    this.track = track;
    this.onEvent = onEvent;

    this.boxes = [];
    this.rockets = [];
    this.spikes = [];
    this.shields = [];

    this.geo = {
      pickupTri: new THREE.TetrahedronGeometry(1.0, 0),
      pickupCore: new THREE.ConeGeometry(0.42, 0.95, 3),
      pickupHalo: new THREE.TorusGeometry(1.08, 0.08, 8, 18),
      pickupAura: new THREE.OctahedronGeometry(1.34, 0),
      spikeCone: new THREE.ConeGeometry(0.38, 0.88, 8),
      spikeBase: new THREE.CylinderGeometry(1.32, 1.42, 0.2, 16),
      spikePlate: new THREE.CylinderGeometry(1.18, 1.22, 0.08, 16),
      shield: new THREE.TorusGeometry(2.3, 0.16, 8, 18),
      shieldInner: new THREE.TorusGeometry(1.55, 0.1, 8, 16),
      pulse: new THREE.RingGeometry(1.2, 1.6, 20),
      rocketNose: new THREE.ConeGeometry(0.4, 1.0, 8),
      rocketBody: new THREE.CylinderGeometry(0.36, 0.42, 1.55, 10),
      rocketFin: new THREE.BoxGeometry(0.11, 0.36, 0.5),
      rocketFlame: new THREE.ConeGeometry(0.21, 0.72, 7),
    };

    this.mat = {
      pickupTri: new THREE.MeshStandardMaterial({ color: 0x76f7ff, roughness: 0.22, metalness: 0.2, emissive: 0x2ec5ff, emissiveIntensity: 0.58, flatShading: true }),
      pickupCore: new THREE.MeshStandardMaterial({ color: 0xf8fdff, roughness: 0.15, metalness: 0.45, emissive: 0x8bf2ff, emissiveIntensity: 0.5, flatShading: true }),
      pickupHalo: new THREE.MeshStandardMaterial({ color: 0xc8f8ff, roughness: 0.2, metalness: 0.4, emissive: 0x5fd2ff, emissiveIntensity: 0.4, flatShading: true }),
      pickupAura: new THREE.MeshStandardMaterial({ color: 0x8fe8ff, roughness: 0.3, metalness: 0.12, emissive: 0x4ec8ff, emissiveIntensity: 0.24, transparent: true, opacity: 0.62, flatShading: true }),
      spike: new THREE.MeshStandardMaterial({ color: 0x8f99a8, roughness: 0.42, metalness: 0.78, flatShading: true }),
      spikeTip: new THREE.MeshStandardMaterial({ color: 0xdadfe8, roughness: 0.22, metalness: 0.9, flatShading: true }),
      spikeBase: new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.6, metalness: 0.4, flatShading: true }),
      spikePlate: new THREE.MeshStandardMaterial({ color: 0x3d4755, roughness: 0.48, metalness: 0.56, flatShading: true }),
      shield: new THREE.MeshStandardMaterial({ color: 0x7be0ff, emissive: 0x2962ff, emissiveIntensity: 0.32, roughness: 0.38, flatShading: true }),
      shieldInner: new THREE.MeshStandardMaterial({ color: 0xb4efff, emissive: 0x4b9dff, emissiveIntensity: 0.28, roughness: 0.3, metalness: 0.2, flatShading: true }),
      pulse: new THREE.MeshStandardMaterial({ color: 0xa8dadc, transparent: true, opacity: 0.8, side: THREE.DoubleSide, roughness: 0.5, flatShading: true }),
      rocketBody: new THREE.MeshStandardMaterial({ color: 0xd64747, roughness: 0.42, metalness: 0.5, emissive: 0x4a1111, emissiveIntensity: 0.24, flatShading: true }),
      rocketNose: new THREE.MeshStandardMaterial({ color: 0xc8d4e6, roughness: 0.28, metalness: 0.82, flatShading: true }),
      rocketFin: new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.5, metalness: 0.4, flatShading: true }),
      rocketFlame: new THREE.MeshStandardMaterial({ color: 0xffad42, emissive: 0xff8a00, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.0, transparent: true, opacity: 0.92, flatShading: true }),
    };

    this._buildBoxes();
  }

  _buildBoxes() {
    for (const idx of this.track.pickupIndices) {
      const s = this.track.samples[idx];
      const group = new THREE.Group();

      const triangles = [];
      for (let i = 0; i < 3; i++) {
        const tri = new THREE.Mesh(this.geo.pickupTri, this.mat.pickupTri.clone());
        tri.position.set(Math.cos((Math.PI * 2 * i) / 3) * 0.78, 0, Math.sin((Math.PI * 2 * i) / 3) * 0.78);
        tri.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
        tri.castShadow = true;
        tri.receiveShadow = true;
        group.add(tri);
        triangles.push(tri);
      }

      const core = new THREE.Mesh(this.geo.pickupCore, this.mat.pickupCore);
      core.rotation.y = Math.PI * 0.33;
      core.scale.setScalar(0.92);
      group.add(core);

      const halo = new THREE.Mesh(this.geo.pickupHalo, this.mat.pickupHalo);
      halo.rotation.x = Math.PI * 0.5;
      group.add(halo);

      const aura = new THREE.Mesh(this.geo.pickupAura, this.mat.pickupAura);
      aura.scale.setScalar(0.9);
      group.add(aura);

      group.position.copy(s.p).add(new THREE.Vector3(0, 1.9, 0));
      group.userData = { idx, active: true, respawn: 0, spin: Math.random() * Math.PI * 2, triangles, core, halo, aura };
      this.scene.add(group);
      this.boxes.push(group);
    }
  }

  update(dt, racers) {
    this._updateBoxes(dt, racers);
    this._updateRockets(dt, racers);
    this._updateSpikes(dt, racers);
    this._updateShields(dt, racers);
  }

  _updateBoxes(dt, racers) {
    for (const box of this.boxes) {
      box.userData.spin += dt * 2.4;
      box.rotation.y = box.userData.spin;
      box.userData.core.rotation.y -= dt * 2.8;
      box.userData.core.rotation.z += dt * 1.7;
      box.userData.halo.rotation.z += dt * 1.9;
      box.userData.aura.rotation.x += dt * 0.9;
      box.userData.aura.rotation.z -= dt * 1.3;

      const pulse = 0.84 + Math.sin(box.userData.spin * 2.1) * 0.2;
      box.userData.core.scale.setScalar(pulse);
      box.userData.halo.material.emissiveIntensity = 0.28 + Math.max(0, Math.sin(box.userData.spin * 2.8)) * 0.26;
      box.userData.aura.material.emissiveIntensity = 0.2 + Math.max(0, Math.sin(box.userData.spin * 3.1)) * 0.22;

      const tris = box.userData.triangles || [];
      for (let i = 0; i < tris.length; i++) {
        const tri = tris[i];
        const a = box.userData.spin * 1.35 + (i * Math.PI * 2) / tris.length;
        tri.position.set(Math.cos(a) * 0.82, Math.sin(box.userData.spin * 2.4 + i) * 0.16, Math.sin(a) * 0.82);
        tri.rotation.x += dt * (1.8 + i * 0.2);
        tri.rotation.y -= dt * (2.2 + i * 0.25);
        tri.material.emissiveIntensity = 0.4 + Math.max(0, Math.sin(box.userData.spin * 4 + i)) * 0.38;
      }

      if (!box.userData.active) {
        box.userData.respawn -= dt;
        if (box.userData.respawn <= 0) {
          box.userData.active = true;
          box.visible = true;
        }
        continue;
      }

      for (const r of racers) {
        if (r.eliminated) continue;
        const dx = box.position.x - r.position.x;
        const dz = box.position.z - r.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 5.2 * 5.2) {
          r.currentItem = ITEMS[(Math.random() * ITEMS.length) | 0];
          box.userData.active = false;
          box.userData.respawn = 5.0;
          box.visible = false;
          this.onEvent?.("pickup", r);
          break;
        }
      }
    }
  }

  tryUseItem(racer, racers) {
    if (!racer.currentItem) return false;

    if (racer.currentItem === "turbo") {
      racer.boostTimer = Math.max(racer.boostTimer, 1.3);
      racer.currentItem = null;
      this.onEvent?.("use-item", racer);
      return true;
    }

    if (racer.currentItem === "spikes") {
      const mesh = this._createSpikeTrap();
      const baseY = racer.position.y + 0.08;
      mesh.position.copy(racer.position).setY(baseY);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.spikes.push({ mesh, owner: racer, life: 8.5, radius: 2.05, spin: Math.random() * Math.PI * 2, baseY });
      racer.currentItem = null;
      this.onEvent?.("use-item", racer);
      return true;
    }

    if (racer.currentItem === "shield") {
      const mesh = new THREE.Group();
      const outer = new THREE.Mesh(this.geo.shield, this.mat.shield);
      outer.rotation.x = Math.PI * 0.5;
      mesh.add(outer);
      const inner = new THREE.Mesh(this.geo.shieldInner, this.mat.shieldInner);
      inner.rotation.x = Math.PI * 0.5;
      inner.rotation.z = Math.PI * 0.25;
      mesh.add(inner);
      mesh.position.copy(racer.position).add(new THREE.Vector3(0, 1.2, 0));
      this.scene.add(mesh);
      this.shields.push({ owner: racer, mesh, life: 5.0 });
      racer.currentItem = null;
      this.onEvent?.("use-item", racer);
      return true;
    }

    if (racer.currentItem === "pulse") {
      const pulseMesh = new THREE.Mesh(this.geo.pulse, this.mat.pulse.clone());
      pulseMesh.rotation.x = -Math.PI * 0.5;
      pulseMesh.position.copy(racer.position).setY(racer.position.y + 0.2);
      this.scene.add(pulseMesh);

      for (const r of racers) {
        if (r === racer) continue;
        const d2 = r.position.distanceToSquared(racer.position);
        if (d2 < 8.5 * 8.5) {
          r.controlLossTimer = Math.max(r.controlLossTimer, 0.9);
          r.hitTimer = Math.max(r.hitTimer, 0.6);
          r.speed *= 0.68;
          this.onEvent?.("hit", r);
        }
      }

      this.shields.push({ owner: racer, mesh: pulseMesh, life: 0.32, pulseOnly: true });
      racer.currentItem = null;
      this.onEvent?.("use-item", racer);
      return true;
    }

    if (racer.currentItem === "rocket") {
      const target = this._findTargetAhead(racer, racers);
      if (!target) return false;

      const mesh = this._createRocketMesh();
      mesh.position.copy(racer.position).add(new THREE.Vector3(0, 1.8, 0));
      mesh.castShadow = true;
      this.scene.add(mesh);

      this.rockets.push({ mesh, owner: racer, target, speed: 130, life: 4.2, heading: racer.heading });
      racer.currentItem = null;
      this.onEvent?.("use-item", racer);
      return true;
    }

    return false;
  }

  _findTargetAhead(racer, racers) {
    const sorted = [...racers].sort((a, b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      return b.sampleIndex - a.sampleIndex;
    });

    const idx = sorted.indexOf(racer);
    if (idx > 0) return sorted[idx - 1];

    // Si el racer va de primero, usar el rival más cercano para que el cohete siempre funcione.
    let nearest = null;
    let bestD2 = Infinity;
    for (const r of racers) {
      if (r === racer || r.eliminated) continue;
      const d2 = racer.position.distanceToSquared(r.position);
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = r;
      }
    }
    return nearest;
  }

  _updateRockets(dt, racers) {
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rocket = this.rockets[i];
      rocket.life -= dt;
      if (rocket.life <= 0 || !rocket.target) {
        this.scene.remove(rocket.mesh);
        this.rockets.splice(i, 1);
        continue;
      }

      const toTarget = rocket.target.position.clone().sub(rocket.mesh.position);
      const desiredHeading = Math.atan2(toTarget.x, toTarget.z);
      let delta = desiredHeading - rocket.heading;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      rocket.heading += THREE.MathUtils.clamp(delta, -3.2 * dt, 3.2 * dt);

      const f = new THREE.Vector3(Math.sin(rocket.heading), 0, Math.cos(rocket.heading));
      rocket.mesh.position.addScaledVector(f, rocket.speed * dt);
      rocket.mesh.lookAt(rocket.mesh.position.clone().add(f));
      const flame = rocket.mesh.userData?.flame;
      if (flame) {
        flame.scale.y = 0.82 + Math.random() * 0.42;
        flame.material.opacity = 0.72 + Math.random() * 0.24;
      }

      for (const r of racers) {
        if (r === rocket.owner) continue;
        if (rocket.mesh.position.distanceToSquared(r.position) < 2.8 * 2.8) {
          r.hitTimer = Math.max(r.hitTimer, 1.1);
          r.speed *= 0.15;
          r.velocity.multiplyScalar(0.15);
          this.onEvent?.("hit", r);
          this.scene.remove(rocket.mesh);
          this.rockets.splice(i, 1);
          break;
        }
      }
    }
  }

  _updateSpikes(dt, racers) {
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const spike = this.spikes[i];
      spike.life -= dt;
      spike.spin += dt * 1.8;
      spike.mesh.rotation.y = spike.spin;
      spike.mesh.position.y = spike.baseY + Math.sin(spike.spin * 1.7) * 0.03;
      if (spike.life <= 0) {
        this.scene.remove(spike.mesh);
        this.spikes.splice(i, 1);
        continue;
      }

      for (const r of racers) {
        if (r === spike.owner) continue;
        const d2 = spike.mesh.position.distanceToSquared(r.position);
        if (d2 < spike.radius * spike.radius) {
          r.controlLossTimer = Math.max(r.controlLossTimer, 1.4);
          r.speed *= 0.55;
          this.onEvent?.("hit", r);
          this.scene.remove(spike.mesh);
          this.spikes.splice(i, 1);
          break;
        }
      }
    }
  }

  _updateShields(dt, racers) {
    for (let i = this.shields.length - 1; i >= 0; i--) {
      const s = this.shields[i];
      s.life -= dt;

      if (s.pulseOnly) {
        s.mesh.scale.addScalar(dt * 9.2);
        s.mesh.material.opacity = Math.max(0, s.mesh.material.opacity - dt * 2.6);
        if (s.life <= 0) {
          this.scene.remove(s.mesh);
          this.shields.splice(i, 1);
        }
        continue;
      }

      s.mesh.position.copy(s.owner.position).setY(s.owner.position.y + 1.2);
      s.mesh.rotation.z += dt * 2.5;
      const inner = s.mesh.children?.[1];
      if (inner) inner.rotation.z -= dt * 3.6;

      for (const rocket of this.rockets) {
        if (rocket.owner === s.owner) continue;
        if (rocket.mesh.position.distanceToSquared(s.owner.position) < 2.9 * 2.9) {
          this.scene.remove(rocket.mesh);
          rocket.life = 0;
        }
      }

      if (s.life <= 0 || s.owner.eliminated) {
        this.scene.remove(s.mesh);
        this.shields.splice(i, 1);
      }
    }
  }

  _createSpikeTrap() {
    const trap = new THREE.Group();
    const base = new THREE.Mesh(this.geo.spikeBase, this.mat.spikeBase);
    base.position.y = 0.08;
    base.castShadow = true;
    base.receiveShadow = true;
    trap.add(base);

    const plate = new THREE.Mesh(this.geo.spikePlate, this.mat.spikePlate);
    plate.position.y = 0.2;
    plate.castShadow = true;
    plate.receiveShadow = true;
    trap.add(plate);

    const center = new THREE.Mesh(this.geo.spikeCone, this.mat.spikeTip);
    center.position.y = 0.78;
    center.scale.set(0.56, 1.45, 0.56);
    center.castShadow = true;
    trap.add(center);

    for (let ring = 0; ring < 2; ring++) {
      const count = ring === 0 ? 10 : 14;
      const radius = ring === 0 ? 0.54 : 0.92;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ring * 0.12;
        const spike = new THREE.Mesh(this.geo.spikeCone, ring === 0 ? this.mat.spikeTip : this.mat.spike);
        const hScale = ring === 0 ? 0.9 + Math.random() * 0.22 : 0.65 + Math.random() * 0.2;
        spike.position.set(Math.cos(a) * radius, 0.46 + (ring === 0 ? 0.04 : 0), Math.sin(a) * radius);
        spike.scale.set(0.45 + Math.random() * 0.12, hScale, 0.45 + Math.random() * 0.12);
        spike.rotation.x = Math.PI * 0.03;
        spike.rotation.z = -Math.PI * 0.03;
        spike.castShadow = true;
        trap.add(spike);
      }
    }

    return trap;
  }

  _createRocketMesh() {
    const rocket = new THREE.Group();

    const body = new THREE.Mesh(this.geo.rocketBody, this.mat.rocketBody);
    body.castShadow = true;
    rocket.add(body);

    const nose = new THREE.Mesh(this.geo.rocketNose, this.mat.rocketNose);
    nose.position.y = 1.22;
    nose.castShadow = true;
    rocket.add(nose);

    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(this.geo.rocketFin, this.mat.rocketFin);
      fin.position.set(0, -0.58, 0.28);
      fin.rotation.y = (Math.PI * 2 * i) / 4;
      fin.castShadow = true;
      rocket.add(fin);
    }

    const flame = new THREE.Mesh(this.geo.rocketFlame, this.mat.rocketFlame.clone());
    flame.position.y = -1.1;
    flame.rotation.x = Math.PI;
    rocket.add(flame);

    rocket.rotation.x = Math.PI * 0.5;
    rocket.userData.flame = flame;
    return rocket;
  }
}
