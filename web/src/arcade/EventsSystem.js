import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

/**
 * EventsSystem.js - Eventos dinámicos: monstruos, obstáculos, peligros.
 * Añade gameplay dinámico y desafíos especiales por pista.
 */

// ======================== MONSTRUO CIUDAD ========================

export class CityMonster {
  constructor(scene, trackSamples) {
    this.scene = scene;
    this.trackSamples = trackSamples;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.health = 100;
    this.maxHealth = 100;
    this.speed = 8;
    this.attackCooldown = 0;
    this.attackInterval = 3.0;
    this.targetRacer = null;
    this.mesh = null;
    this.projectiles = [];
    this.lastPosition = new THREE.Vector3();

    this._createMesh();
    this._setRandomPosition();
  }

  _createMesh() {
    const group = new THREE.Group();

    // Cuerpo del monstruo (caja grande)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.2, 2.0),
      new THREE.MeshStandardMaterial({
        color: 0x8b0000,
        flatShading: true,
        roughness: 0.6,
        metalness: 0.1,
      })
    );
    body.castShadow = true;
    group.add(body);

    // Cabeza (esfera)
    const head = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.9, 3),
      new THREE.MeshStandardMaterial({
        color: 0xa00000,
        flatShading: true,
        roughness: 0.5,
      })
    );
    head.position.y = 1.7;
    head.castShadow = true;
    group.add(head);

    // Ojos brillantes
    const eyeL = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffff00,
        flatShading: true,
        emissive: 0xffff00,
        emissiveIntensity: 0.8,
      })
    );
    eyeL.position.set(-0.3, 1.95, 0.8);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffff00,
        flatShading: true,
        emissive: 0xffff00,
        emissiveIntensity: 0.8,
      })
    );
    eyeR.position.set(0.3, 1.95, 0.8);
    group.add(eyeR);

    // Boca abierta
    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    mouth.position.set(0, 1.5, 0.85);
    group.add(mouth);

    // Brazos
    for (let i = 0; i < 2; i++) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1.4, 0.4),
        new THREE.MeshStandardMaterial({
          color: 0x8b0000,
          flatShading: true,
        })
      );
      arm.position.set(i === 0 ? -0.9 : 0.9, 0.8, 0);
      arm.castShadow = true;
      group.add(arm);
    }

    // Patas
    for (let i = 0; i < 2; i++) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.5, 0.5),
        new THREE.MeshStandardMaterial({
          color: 0x6b0000,
          flatShading: true,
        })
      );
      leg.position.set(i === 0 ? -0.4 : 0.4, -0.3, 0.2);
      leg.castShadow = true;
      group.add(leg);
    }

    this.mesh = group;
    this.scene.add(group);
  }

  _setRandomPosition() {
    if (this.trackSamples.length === 0) return;

    const idx = Math.floor(Math.random() * this.trackSamples.length);
    const sample = this.trackSamples[idx];

    this.position.copy(sample.p);
    this.position.y += 5; // Aparecer en el aire
    this.lastPosition.copy(this.position);
    this.mesh.position.copy(this.position);
  }

  update(dt, racers) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    // Seleccionar objetivo (racer más cercano)
    let closestRacer = null;
    let closestDist = Infinity;

    for (const racer of racers) {
      if (racer.eliminated) continue;
      const dist = this.position.distanceTo(racer.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestRacer = racer;
      }
    }

    this.targetRacer = closestRacer;

    if (this.targetRacer) {
      // Moverse hacia el objetivo
      const direction = new THREE.Vector3()
        .subVectors(this.targetRacer.position, this.position)
        .normalize();
      this.velocity.lerp(direction.multiplyScalar(this.speed), dt * 0.5);

      // Atacar (lanzar basura)
      if (this.attackCooldown <= 0 && closestDist < 80) {
        this._throwProjectile();
        this.attackCooldown = this.attackInterval;
      }
    }

    // Gravedad
    this.velocity.y -= 9.8 * dt;

    // Aplicar velocidad
    this.lastPosition.copy(this.position);
    this.position.addScaledVector(this.velocity, dt);

    // Límites del mundo
    if (this.position.y < -30) {
      this._setRandomPosition();
    }

    this.mesh.position.copy(this.position);

    // Rotar para mirar hacia objetivo
    if (this.targetRacer) {
      const direction = new THREE.Vector3()
        .subVectors(this.targetRacer.position, this.position)
        .normalize();
      const lookAngle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = lookAngle;
    }

    // Actualizar proyectiles
    this._updateProjectiles(dt);
  }

  _throwProjectile() {
    if (!this.targetRacer) return;

    const proj = new Projectile(
      this.scene,
      this.position.clone(),
      this.targetRacer.position.clone(),
      this.targetRacer
    );
    this.projectiles.push(proj);
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);

      if (proj.isDead) {
        proj.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.projectiles.forEach((p) => p.dispose());
  }
}

// ======================== PROYECTIL (BASURA DEL MONSTRUO) ========================

class Projectile {
  constructor(scene, startPos, targetPos, targetRacer) {
    this.scene = scene;
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3()
      .subVectors(targetPos, startPos)
      .normalize()
      .multiplyScalar(25);

    this.targetRacer = targetRacer;
    this.lifetime = 8;
    this.isDead = false;
    this.mesh = null;
    this.damage = 22;
    this.stagger = 0.9;

    this._createMesh();
  }

  _createMesh() {
    const group = new THREE.Group();

    // Basura (caja)
    const trash = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x8b6914,
        flatShading: true,
      })
    );
    trash.castShadow = true;
    group.add(trash);

    this.mesh = group;
    this.mesh.position.copy(this.position);
    this.scene.add(group);
  }

  update(dt) {
    this.lifetime -= dt;

    if (this.lifetime <= 0) {
      this.isDead = true;
      return;
    }

    // Gravedad
    this.velocity.y -= 9.8 * dt;

    // Movimiento
    this.position.addScaledVector(this.velocity, dt);
    this.mesh.position.copy(this.position);

    // Rotación
    this.mesh.rotation.x += 0.15;
    this.mesh.rotation.y += 0.2;

    // Caer del mundo
    if (this.position.y < -50) {
      this.isDead = true;
    }
  }

  checkHit(racer) {
    // Verificar colisión con racer
    const dist = this.position.distanceTo(racer.position);
    if (dist < 2.0) {
      this.isDead = true;
      return true;
    }
    return false;
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}

// ======================== OBSTÁCULO DINÁMICO ========================

export class DynamicObstacle {
  constructor(scene, position, type = "box") {
    this.scene = scene;
    this.position = position.clone();
    this.type = type;
    this.mesh = null;
    this.visible = true;
    this.respawnTimer = 0;
    this.respawnTime = 5;
    this.damage = 15;
    this.rotationSpeed = 2;

    this._createMesh();
  }

  _createMesh() {
    let geom;
    let color = 0xff4444;

    if (this.type === "box") {
      geom = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    } else if (this.type === "spike") {
      geom = new THREE.ConeGeometry(0.8, 1.5, 8);
      color = 0xffaa00;
    } else if (this.type === "ball") {
      geom = new THREE.SphereGeometry(0.8, 8, 8);
      color = 0x4444ff;
    }

    const mesh = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        emissive: color,
        emissiveIntensity: 0.2,
      })
    );

    mesh.castShadow = true;
    mesh.position.copy(this.position);
    this.mesh = mesh;
    this.scene.add(mesh);
  }

  update(dt) {
    if (!this.visible) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.visible = true;
        this.mesh.visible = true;
      }
    } else {
      // Rotación
      this.mesh.rotation.x += dt * this.rotationSpeed * 0.3;
      this.mesh.rotation.y += dt * this.rotationSpeed;
    }
  }

  hit() {
    this.visible = false;
    this.mesh.visible = false;
    this.respawnTimer = this.respawnTime;
  }

  dispose() {
    this.scene.remove(this.mesh);
  }
}

// ======================== SISTEMA DE EVENTOS ========================

export class EventsSystem {
  constructor(scene, trackId) {
    this.scene = scene;
    this.trackId = trackId;
    this.cityMonster = null;
    this.obstacles = [];
    this.projectiles = [];
  }

  initializeTrack(trackSamples) {
    if (this.trackId === "city") {
      this.cityMonster = new CityMonster(this.scene, trackSamples);

      // Crear obstáculos dinámicos
      const obstacleCount = 4;
      for (let i = 0; i < obstacleCount; i++) {
        const idx = Math.floor((Math.random() * trackSamples.length) * 0.7);
        const sample = trackSamples[idx];
        const type = ["box", "spike", "ball"][Math.floor(Math.random() * 3)];
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          2,
          (Math.random() - 0.5) * 10
        );
        const obs = new DynamicObstacle(
          this.scene,
          sample.p.clone().add(offset),
          type
        );
        this.obstacles.push(obs);
      }
    } else if (this.trackId === "desert") {
      // Eventos desierto
      const obstacleCount = 3;
      for (let i = 0; i < obstacleCount; i++) {
        const idx = Math.floor(Math.random() * trackSamples.length);
        const sample = trackSamples[idx];
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          1,
          (Math.random() - 0.5) * 15
        );
        const obs = new DynamicObstacle(
          this.scene,
          sample.p.clone().add(offset),
          "ball"
        );
        this.obstacles.push(obs);
      }
    }
  }

  update(dt, racers) {
    if (this.cityMonster) {
      this.cityMonster.update(dt, racers);

      // Detectar golpes de proyectiles
      for (const proj of this.cityMonster.projectiles) {
        for (const racer of racers) {
          if (!racer.eliminated && proj.checkHit(racer)) {
            racer.health = Math.max(0, racer.health - proj.damage);
            racer.hitTimer = proj.stagger;
          }
        }
      }
    }

    // Actualizar obstáculos
    for (const obs of this.obstacles) {
      obs.update(dt);
    }

    // Detectar colisiones con obstáculos
    for (const racer of racers) {
      if (racer.eliminated) continue;

      for (const obs of this.obstacles) {
        if (!obs.visible) continue;
        const dist = racer.position.distanceTo(obs.position);
        if (dist < 2.0) {
          racer.health = Math.max(0, racer.health - obs.damage);
          obs.hit();
        }
      }
    }
  }

  dispose() {
    if (this.cityMonster) {
      this.cityMonster.dispose();
    }
    this.obstacles.forEach((o) => o.dispose());
  }
}
