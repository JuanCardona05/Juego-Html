import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

export class SmokeSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.pool = [];
    this.live = [];
    this.sparkPool = [];
    this.liveSparks = [];

    const geo = new THREE.PlaneGeometry(0.9, 0.9);
    for (let i = 0; i < 160; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xe9ecef,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: THREE.DoubleSide,
        roughness: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.pool.push(mesh);
    }

    const sparkGeo = new THREE.SphereGeometry(0.08, 6, 6);
    for (let i = 0; i < 120; i++) {
      const spark = new THREE.Mesh(
        sparkGeo,
        new THREE.MeshStandardMaterial({
          color: 0xffd166,
          emissive: 0xff8a00,
          emissiveIntensity: 0.8,
          roughness: 0.25,
          metalness: 0.6,
        })
      );
      spark.visible = false;
      scene.add(spark);
      this.sparkPool.push(spark);
    }
  }

  emit(vehicle, amount = 1) {
    if (!vehicle.mesh.userData.rearWheelLocal) return;
    if (this.live.length > 120) return;

    for (let i = 0; i < amount; i++) {
      if (this.pool.length === 0) return;
      for (const offset of vehicle.mesh.userData.rearWheelLocal) {
        const mesh = this.pool.pop();
        mesh.visible = true;

        const pos = offset.clone().applyEuler(new THREE.Euler(0, vehicle.heading, 0)).add(vehicle.position);
        mesh.position.copy(pos);
        mesh.scale.setScalar(1);

        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 2.4,
          1.4 + Math.random() * 0.8,
          (Math.random() - 0.5) * 2.4
        );

        const forward = vehicle.velocity.clone().setY(0);
        if (forward.lengthSq() > 0.001) {
          vel.addScaledVector(forward.normalize(), -1.8 * Math.max(0.2, vehicle.driftFactor));
        }

        this.live.push({
          mesh,
          vel,
          life: 0.45 + Math.random() * 0.35,
          age: 0,
          spin: (Math.random() - 0.5) * 2.2,
          color: 0xe9ecef,
          opacityScale: 0.56,
          growth: 2.2,
        });
      }
    }
  }

  emitDust(vehicle, amount = 1) {
    if (!vehicle.mesh.userData.rearWheelLocal) return;
    if (this.live.length > 120) return;

    for (let i = 0; i < amount; i++) {
      if (this.pool.length === 0) return;

      for (const offset of vehicle.mesh.userData.rearWheelLocal) {
        const mesh = this.pool.pop();
        if (!mesh) return;
        mesh.visible = true;

        const pos = offset.clone().applyEuler(new THREE.Euler(0, vehicle.heading, 0)).add(vehicle.position);
        mesh.position.copy(pos).add(new THREE.Vector3(0, 0.08, 0));
        mesh.scale.setScalar(0.85);
        mesh.material.color.set(0xc8ae86);

        const forward = vehicle.velocity.clone().setY(0).normalize();
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 3.6,
          1.0 + Math.random() * 1.2,
          (Math.random() - 0.5) * 3.6
        ).addScaledVector(forward, -2.4);

        this.live.push({
          mesh,
          vel,
          life: 0.35 + Math.random() * 0.28,
          age: 0,
          spin: (Math.random() - 0.5) * 2.8,
          color: 0xc8ae86,
          opacityScale: 0.45,
          growth: 2.9,
        });
      }
    }
  }

  emitBoostFlame(vehicle, amount = 1) {
    if (!vehicle.mesh.userData.rearWheelLocal) return;
    if (this.live.length > 130) return;

    for (let i = 0; i < amount; i++) {
      if (this.pool.length === 0) return;

      for (const offset of vehicle.mesh.userData.rearWheelLocal) {
        const mesh = this.pool.pop();
        if (!mesh) return;
        mesh.visible = true;

        const pos = offset.clone().applyEuler(new THREE.Euler(0, vehicle.heading, 0)).add(vehicle.position);
        mesh.position.copy(pos).add(new THREE.Vector3(0, 0.22, 0));
        mesh.scale.setScalar(0.54 + Math.random() * 0.34);
        mesh.material.color.set(0xffa646);

        const forward = vehicle.velocity.clone().setY(0);
        const forwardNorm = forward.lengthSq() > 0.001 ? forward.normalize() : new THREE.Vector3(Math.sin(vehicle.heading), 0, Math.cos(vehicle.heading));
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 1.9,
          0.9 + Math.random() * 0.8,
          (Math.random() - 0.5) * 1.9
        ).addScaledVector(forwardNorm, -4.2 - Math.random() * 1.7);

        this.live.push({
          mesh,
          vel,
          life: 0.14 + Math.random() * 0.1,
          age: 0,
          spin: (Math.random() - 0.5) * 3.0,
          color: 0xffa646,
          emissive: 0xff5b00,
          emissiveIntensity: 1.0,
          opacityScale: 0.76,
          growth: 1.4,
        });
      }
    }
  }

  emitSparks(position, intensity = 1) {
    if (this.liveSparks.length > 80) return;
    const count = Math.min(14, Math.max(5, Math.floor(7 * intensity)));
    for (let i = 0; i < count; i++) {
      const spark = this.sparkPool.pop();
      if (!spark) return;
      spark.visible = true;
      spark.position.copy(position);
      spark.scale.setScalar(0.8 + Math.random() * 0.6);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        4 + Math.random() * 8,
        (Math.random() - 0.5) * 12
      ).multiplyScalar(0.35 + intensity * 0.2);

      this.liveSparks.push({
        mesh: spark,
        vel,
        life: 0.22 + Math.random() * 0.22,
        age: 0,
      });
    }
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.age += dt;
      const t = p.age / p.life;

      if (t >= 1) {
        p.mesh.visible = false;
        this.pool.push(p.mesh);
        this.live.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.position.y += dt * 1.8;
      p.mesh.rotation.y += p.spin * dt;
      p.mesh.material.color.setHex(p.color);
      if (p.emissive != null) {
        p.mesh.material.emissive.setHex(p.emissive);
        p.mesh.material.emissiveIntensity = (1 - t) * (p.emissiveIntensity ?? 0.9);
      } else {
        p.mesh.material.emissive.setHex(0x000000);
        p.mesh.material.emissiveIntensity = 0;
      }
      p.mesh.scale.setScalar(1 + t * p.growth);
      p.mesh.material.opacity = (1 - t) * p.opacityScale;
      p.mesh.lookAt(this.camera.position);
    }

    for (let i = this.liveSparks.length - 1; i >= 0; i--) {
      const s = this.liveSparks[i];
      s.age += dt;
      const t = s.age / s.life;

      if (t >= 1) {
        s.mesh.visible = false;
        this.sparkPool.push(s.mesh);
        this.liveSparks.splice(i, 1);
        continue;
      }

      s.vel.y -= dt * 21;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.material.emissiveIntensity = (1 - t) * 1.1;
      s.mesh.material.opacity = 1;
      s.mesh.scale.setScalar(0.9 - t * 0.6);
    }
  }
}
