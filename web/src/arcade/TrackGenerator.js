import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

function makeNoiseTexture(baseHex, accentHex, stripeHex = null, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const base = new THREE.Color(baseHex);
  const accent = new THREE.Color(accentHex);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < size * 9; i++) {
    const t = Math.random();
    const c = base.clone().lerp(accent, t * 0.75);
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = 1 + Math.random() * 2.5;
    ctx.fillStyle = `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)}, ${0.12 + Math.random() * 0.2})`;
    ctx.fillRect(x, y, s, s);
  }

  if (stripeHex != null) {
    const stripe = new THREE.Color(stripeHex);
    ctx.fillStyle = `rgba(${Math.floor(stripe.r * 255)}, ${Math.floor(stripe.g * 255)}, ${Math.floor(stripe.b * 255)}, 0.07)`;
    for (let y = 0; y < size; y += 48) {
      ctx.fillRect(0, y, size, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function createRoadTexture(roadColor) {
  const accent = new THREE.Color(roadColor).offsetHSL(0, 0, -0.08).getHex();
  const tex = makeNoiseTexture(roadColor, accent, 0xffffff, 512);
  tex.repeat.set(4, 28);
  return tex;
}

function createGroundTexture(baseHex, accentHex) {
  const tex = makeNoiseTexture(baseHex, accentHex, null, 512);
  tex.repeat.set(12, 12);
  return tex;
}

function makeInstanced(geometry, material, count, castShadow = true, receiveShadow = true) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.frustumCulled = true;
  return mesh;
}

function sampleCurve(curve, count) {
  const samples = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const p = curve.getPointAt(t);
    // Subtle micro-undulations improve depth cues without changing track flow.
    const undulation = Math.sin(i * 0.045) * 0.6 + Math.cos(i * 0.021) * 0.4;
    p.y += undulation * 0.22;
    const tan = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    samples.push({ p, tan, normal, index: i });
  }
  return samples;
}

function buildRibbonMesh(scene, samples, halfWidth, color) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= samples.length; i++) {
    const s = samples[i % samples.length];
    const left = s.p.clone().addScaledVector(s.normal, halfWidth);
    const right = s.p.clone().addScaledVector(s.normal, -halfWidth);

    positions.push(left.x, left.y + 0.06, left.z, right.x, right.y + 0.06, right.z);
    uvs.push(0, i / samples.length, 1, i / samples.length);

    if (i < samples.length) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();

  const m = new THREE.MeshStandardMaterial({
    color,
    map: createRoadTexture(color),
    roughness: 0.78,
    metalness: 0.14,
    envMapIntensity: 0.24,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });

  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addRoadDetails(scene, samples, halfWidth, style) {
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.62, metalness: 0.16, flatShading: true, envMapIntensity: 0.18 });
  const barrierMat = new THREE.MeshStandardMaterial({ color: style.barrierColor, roughness: 0.84, metalness: 0.1, flatShading: true });

  const markerIndices = [];
  for (let i = 0; i < samples.length; i += 3) markerIndices.push(i);

  const markerMesh = makeInstanced(new THREE.BoxGeometry(0.65, 0.26, 3), stripeMat, markerIndices.length * 2, true, true);
  const markerDummy = new THREE.Object3D();
  let markerAt = 0;

  for (const i of markerIndices) {
    const s = samples[i];
    const l = s.p.clone().addScaledVector(s.normal, halfWidth + 0.8);
    const r = s.p.clone().addScaledVector(s.normal, -halfWidth - 0.8);
    const yRot = Math.atan2(s.tan.x, s.tan.z);

    markerDummy.position.copy(l).setY(l.y + 0.24);
    markerDummy.rotation.set(0, yRot, 0);
    markerDummy.updateMatrix();
    markerMesh.setMatrixAt(markerAt++, markerDummy.matrix);

    markerDummy.position.copy(r).setY(r.y + 0.24);
    markerDummy.rotation.set(0, yRot, 0);
    markerDummy.updateMatrix();
    markerMesh.setMatrixAt(markerAt++, markerDummy.matrix);
  }

  markerMesh.instanceMatrix.needsUpdate = true;
  markerMesh.computeBoundingSphere();
  scene.add(markerMesh);

  for (let i = 0; i < samples.length; i += 11) {
    const s = samples[i];
    const n = samples[(i + 11) % samples.length];

    const l1 = s.p.clone().addScaledVector(s.normal, halfWidth + 3.1);
    const r1 = s.p.clone().addScaledVector(s.normal, -halfWidth - 3.1);
    const l2 = n.p.clone().addScaledVector(n.normal, halfWidth + 3.1);
    const r2 = n.p.clone().addScaledVector(n.normal, -halfWidth - 3.1);

    addBarrier(scene, l1, l2, barrierMat);
    addBarrier(scene, r1, r2, barrierMat);
  }
}

function addBarrier(scene, a, b, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, len), mat);
  rail.position.copy(mid).setY(mid.y + 1.55);
  rail.rotation.y = Math.atan2(dir.x, dir.z);
  rail.castShadow = true;
  scene.add(rail);

  const postA = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 2.4, 8), mat);
  postA.position.copy(a).setY(a.y + 1.2);
  postA.castShadow = true;
  scene.add(postA);

  const postB = postA.clone();
  postB.position.copy(b).setY(b.y + 1.2);
  scene.add(postB);
}

function addCityEnvironment(scene) {
  const grassMap = createGroundTexture(0x90c27d, 0x7db56a);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(640, 56),
    new THREE.MeshStandardMaterial({ color: 0x90c27d, map: grassMap, roughness: 0.92, metalness: 0.02, flatShading: true })
  );
  ground.rotation.x = -Math.PI * 0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  const asphaltPatch = new THREE.Mesh(
    new THREE.CircleGeometry(560, 52),
    new THREE.MeshStandardMaterial({ color: 0x737c8f, map: createGroundTexture(0x737c8f, 0x626a7b), roughness: 0.82, metalness: 0.11, flatShading: true })
  );
  asphaltPatch.rotation.x = -Math.PI * 0.5;
  asphaltPatch.position.y = 0.01;
  asphaltPatch.receiveShadow = true;
  scene.add(asphaltPatch);

  const buildingMat = new THREE.MeshStandardMaterial({ color: 0x9ea7b9, roughness: 0.7, metalness: 0.08, flatShading: true });
  const buildings = makeInstanced(new THREE.BoxGeometry(1, 1, 1), buildingMat, 34, true, true);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 34; i++) {
    const w = 12 + Math.random() * 18;
    const h = 22 + Math.random() * 42;
    const d = 12 + Math.random() * 18;
    const angle = (i / 34) * Math.PI * 2;
    const radius = 360 + (i % 4) * 30;

    dummy.position.set(Math.cos(angle) * radius, h * 0.5, Math.sin(angle) * radius);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    buildings.setMatrixAt(i, dummy.matrix);
  }

  buildings.instanceMatrix.needsUpdate = true;
  buildings.computeBoundingSphere();
  scene.add(buildings);
}

function addNatureEnvironment(scene) {
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(1700, 64),
    new THREE.MeshStandardMaterial({ color: 0x46bbe8, map: createGroundTexture(0x46bbe8, 0x2d9ed1), roughness: 0.28, metalness: 0.24, flatShading: true, envMapIntensity: 0.24 })
  );
  sea.rotation.x = -Math.PI * 0.5;
  sea.position.y = -2.2;
  sea.receiveShadow = true;
  scene.add(sea);

  const outerTerrain = new THREE.Mesh(
    new THREE.CircleGeometry(1320, 64),
    new THREE.MeshStandardMaterial({ color: 0xaab8a6, map: createGroundTexture(0xaab8a6, 0x8fa08b), roughness: 0.96, metalness: 0.01, flatShading: true })
  );
  outerTerrain.rotation.x = -Math.PI * 0.5;
  outerTerrain.position.y = -0.02;
  outerTerrain.receiveShadow = true;
  scene.add(outerTerrain);

  const island = new THREE.Mesh(
    new THREE.CircleGeometry(980, 64),
    new THREE.MeshStandardMaterial({ color: 0x7bcf70, map: createGroundTexture(0x7bcf70, 0x5bb056), roughness: 0.94, metalness: 0.03, flatShading: true })
  );
  island.rotation.x = -Math.PI * 0.5;
  island.position.y = 0.01;
  island.receiveShadow = true;
  scene.add(island);

  const meadowRing = new THREE.Mesh(
    new THREE.RingGeometry(680, 940, 56),
    new THREE.MeshStandardMaterial({ color: 0x8ccc74, roughness: 0.94, metalness: 0.02, flatShading: true, side: THREE.DoubleSide })
  );
  meadowRing.rotation.x = -Math.PI * 0.5;
  meadowRing.position.y = 0.015;
  meadowRing.receiveShadow = false;
  scene.add(meadowRing);

  const shoreline = new THREE.Mesh(
    new THREE.RingGeometry(960, 1005, 64),
    new THREE.MeshStandardMaterial({ color: 0xd8efe7, roughness: 0.62, metalness: 0.06, transparent: true, opacity: 0.68, flatShading: true, side: THREE.DoubleSide })
  );
  shoreline.rotation.x = -Math.PI * 0.5;
  shoreline.position.y = -0.01;
  shoreline.receiveShadow = false;
  scene.add(shoreline);

  const cliffMaterial = new THREE.MeshStandardMaterial({ color: 0x6e7f5e, roughness: 0.9, metalness: 0.02, flatShading: true });
  const cliffMesh = makeInstanced(new THREE.DodecahedronGeometry(1, 0), cliffMaterial, 44, false, true);
  const cliffDummy = new THREE.Object3D();
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    const r = 1000 + (i % 5) * 28 + Math.random() * 20;
    const s = 20 + Math.random() * 34;
    cliffDummy.position.set(Math.cos(a) * r, 7 + Math.random() * 10, Math.sin(a) * r);
    cliffDummy.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    cliffDummy.scale.set(s, s * (0.75 + Math.random() * 0.45), s * (0.85 + Math.random() * 0.35));
    cliffDummy.updateMatrix();
    cliffMesh.setMatrixAt(i, cliffDummy.matrix);
  }
  cliffMesh.instanceMatrix.needsUpdate = true;
  cliffMesh.computeBoundingSphere();
  scene.add(cliffMesh);

  // Decoracion radial cercana desactivada para mantener el carril completamente libre.
}

// ============================================
// FUNCIONES DE MEJORA AMBIENTAL
// ============================================

function addBackgroundMountains(scene, trackId, intensity = 1, samples = null, halfWidth = 22) {
  const mountainCount = Math.max(6, Math.floor((6 + Math.random() * 3) * intensity));
  const colors = trackId === "desert" ? [0x8b6f47, 0xa0845f, 0x9d7e54] : trackId === "city" ? [0x6b7a8e, 0x758594, 0x677a8f] : [0x4a6741, 0x5a7751, 0x527e63];
  const quickSamples = samples && samples.length > 0 ? samples.filter((_, idx) => idx % 9 === 0) : null;
  const minRoadClearance = halfWidth + 200;

  for (let i = 0; i < mountainCount; i++) {
    let x = 0;
    let z = 0;
    let placed = false;
    const mountainRadius = 68 + Math.random() * 58;
    const heightVariation = 100 + Math.random() * 130;
    const baseHeight = heightVariation * 0.5;

    for (let attempt = 0; attempt < 14; attempt++) {
      const angle = (i / mountainCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.65;
      const distance = 860 + Math.random() * 340;
      x = Math.cos(angle) * distance;
      z = Math.sin(angle) * distance;

      if (!quickSamples) {
        placed = true;
        break;
      }

      let tooClose = false;
      for (const s of quickSamples) {
        const dx = s.p.x - x;
        const dz = s.p.z - z;
        const d = Math.hypot(dx, dz);
        if (d < minRoadClearance + mountainRadius * 0.7) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        placed = true;
        break;
      }
    }

    if (!placed) continue;

    const mountainGeometry = new THREE.ConeGeometry(mountainRadius, heightVariation, 7);
    const colorIdx = Math.floor(Math.random() * colors.length);
    const mountainMaterial = new THREE.MeshStandardMaterial({
      color: colors[colorIdx],
      roughness: 0.92,
      metalness: 0.01,
      flatShading: true,
    });

    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.set(x, baseHeight, z);
    mountain.rotation.y = Math.random() * Math.PI;
    mountain.castShadow = false;
    mountain.receiveShadow = true;
    scene.add(mountain);

    // Agregar picos secundarios para mayor detalle
    if (Math.random() > 0.6) {
      for (let j = 0; j < 2; j++) {
        const peakOffset = 70 + Math.random() * 100;
        const peakAngle = Math.random() * Math.PI * 2;
        const peakX = x + Math.cos(peakAngle) * peakOffset;
        const peakZ = z + Math.sin(peakAngle) * peakOffset;
        const peakHeight = (heightVariation * 0.56) + Math.random() * 44;

        const peakGeometry = new THREE.ConeGeometry(34 + Math.random() * 30, peakHeight, 6);
        const peakMaterial = new THREE.MeshStandardMaterial({
          color: colors[(colorIdx + 1) % colors.length],
          roughness: 0.9,
          metalness: 0.01,
          flatShading: true,
        });

        const peak = new THREE.Mesh(peakGeometry, peakMaterial);
        peak.position.set(peakX, peakHeight * 0.5, peakZ);
        peak.castShadow = false;
        peak.receiveShadow = true;
        scene.add(peak);
      }
    }
  }
}

function isTooCloseToRoad(pos, roadProbe, halfWidth, extraClearance = 16) {
  const limit = halfWidth + extraClearance;
  const limitSq = limit * limit;
  for (const s of roadProbe) {
    const dx = pos.x - s.p.x;
    const dz = pos.z - s.p.z;
    if (dx * dx + dz * dz < limitSq) return true;
  }
  return false;
}

function addEnhancedVegetation(scene, trackId, samples, halfWidth) {
  // Definir puntos de biomas para la pista de naturaleza
  const biomaSections = {
    forest: { start: 0, end: 0.22, density: "high" },
    snow: { start: 0.22, end: 0.4, density: "medium" },
    mountain: { start: 0.4, end: 0.58, density: "medium" },
    openField: { start: 0.58, end: 0.8, density: "low" },
    technical: { start: 0.8, end: 1.0, density: "high" },
  };

  // Opciones de vegetación según bioma
  const vegetationByBioma = {
    forest: {
      treeDensity: 45,
      bushDensity: 35,
      rockDensity: 15,
      colors: {
        treeTall: [0x2d5016, 0x3a6b1f, 0x4a7c2c],
        treeWide: [0x3d6b22, 0x4a8030, 0x5a9140],
        bush: [0x5a8f45, 0x6a9f55, 0x4f7a3a],
        rock: [0x7a8a7a, 0x8a9a8a, 0x6a7a6a],
      },
    },
    mountain: {
      treeDensity: 25,
      bushDensity: 15,
      rockDensity: 35,
      colors: {
        treeTall: [0x2d4f1a, 0x3d5f2a, 0x4d6f3a],
        treeWide: [0x3d5f22, 0x4d6f32, 0x5d7f42],
        bush: [0x5a8f45, 0x6a9f55, 0x4f7a3a],
        rock: [0x8a9a8a, 0x9aaa9a, 0x7a8a7a],
      },
    },
    snow: {
      treeDensity: 14,
      bushDensity: 10,
      rockDensity: 16,
      colors: {
        treeTall: [0x6b7f8f, 0x7f95a6, 0x5f7282],
        treeWide: [0x8aa3b8, 0x9bb1c2, 0x7b92a5],
        bush: [0xdde7ef, 0xcfdce7, 0xeaf3fa],
        rock: [0xd3dde6, 0xc4d0db, 0xe6eef5],
      },
    },
    openField: {
      treeDensity: 10,
      bushDensity: 8,
      rockDensity: 5,
      colors: {
        treeTall: [0x3d6b22, 0x4a8030, 0x5a9140],
        treeWide: [0x4a8030, 0x5a9140, 0x6aa050],
        bush: [0x5a8f45, 0x6a9f55, 0x4f7a3a],
        rock: [0x8a9a8a, 0x9aaa9a, 0x7a8a7a],
      },
    },
    technical: {
      treeDensity: 30,
      bushDensity: 25,
      rockDensity: 20,
      colors: {
        treeTall: [0x2d5016, 0x3a6b1f, 0x4a7c2c],
        treeWide: [0x3d6b22, 0x4a8030, 0x5a9140],
        bush: [0x5a8f45, 0x6a9f55, 0x4f7a3a],
        rock: [0x7a8a7a, 0x8a9a8a, 0x6a7a6a],
      },
    },
  };

  const offset = halfWidth + 40;
  const groundY = trackId === "nature" ? 0.15 : 0.35;
  const roadProbe = samples.filter((_, idx) => idx % 6 === 0);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4e3f, roughness: 0.84, flatShading: true });
  const snowPatchMat = new THREE.MeshStandardMaterial({ color: 0xf2f8ff, roughness: 0.98, metalness: 0, flatShading: true });

  const materialCache = {};
  for (const name in vegetationByBioma) {
    const cfg = vegetationByBioma[name];
    materialCache[name] = {
      treeTall: cfg.colors.treeTall.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.86, flatShading: true })),
      treeWide: cfg.colors.treeWide.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.86, flatShading: true })),
      bush: cfg.colors.bush.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true })),
      rock: cfg.colors.rock.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.93, flatShading: true })),
    };
  }

  // Mapear muestras a biomas
  for (let biomaName in biomaSections) {
    const bioma = biomaSections[biomaName];
    const startIdx = Math.floor(samples.length * bioma.start);
    const endIdx = Math.floor(samples.length * bioma.end);
    const vegConfig = vegetationByBioma[biomaName];
    const mats = materialCache[biomaName];

    if (biomaName === "snow") {
      const patchCount = Math.max(8, Math.floor((endIdx - startIdx) / 22));
      for (let i = 0; i < patchCount; i++) {
        const sampleIdx = startIdx + Math.floor(Math.random() * (endIdx - startIdx));
        const sample = samples[sampleIdx];
        const side = Math.random() > 0.5 ? 1 : -1;
        const distFromTrack = offset + 20 + Math.random() * 60;
        const patchPos = sample.p.clone().addScaledVector(sample.normal, side * distFromTrack);
        patchPos.y = groundY + 0.04;
        if (isTooCloseToRoad(patchPos, roadProbe, halfWidth, 16)) continue;

        const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 10), snowPatchMat);
        patch.position.copy(patchPos);
        patch.rotation.x = -Math.PI * 0.5;
        patch.rotation.z = Math.random() * Math.PI;
        const size = 8 + Math.random() * 16;
        patch.scale.set(size, size, size);
        patch.receiveShadow = true;
        patch.castShadow = false;
        scene.add(patch);
      }
    }

    // Árboles altos y anchos
    const treeCount = Math.max(6, Math.floor((endIdx - startIdx) * (vegConfig.treeDensity / 130)));
    for (let i = 0; i < treeCount; i++) {
      const sampleIdx = startIdx + Math.floor(Math.random() * (endIdx - startIdx));
      const sample = samples[sampleIdx];
      const side = Math.random() > 0.5 ? 1 : -1;
      const distFromTrack = offset + 16 + Math.random() * 72;

      const basePos = sample.p.clone().addScaledVector(sample.normal, side * distFromTrack);
      basePos.y = groundY + (Math.random() - 0.5) * 0.45;
      if (isTooCloseToRoad(basePos, roadProbe, halfWidth, 18)) continue;
      // Tipo de árbol: alto o ancho
      if (Math.random() > 0.4) {
        // Árbol alto (conífera)
        const treeHeight = 18 + Math.random() * 16;
        const trunkGeometry = new THREE.CylinderGeometry(1.15, 1.45, treeHeight, 5);

        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.copy(basePos).setY(basePos.y + treeHeight * 0.5);
        trunk.castShadow = false;
        trunk.receiveShadow = false;
        scene.add(trunk);

        // Copa del árbol
        const foliageGeometry = new THREE.ConeGeometry(6 + Math.random() * 4, 14 + Math.random() * 10, 6);
        const foliageMaterial = mats.treeTall[Math.floor(Math.random() * mats.treeTall.length)];
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.copy(basePos).setY(basePos.y + treeHeight + 6);
        foliage.castShadow = false;
        foliage.receiveShadow = false;
        scene.add(foliage);
      } else {
        // Árbol ancho (deciduo)
        const treeHeight = 12 + Math.random() * 14;
        const trunkGeometry = new THREE.CylinderGeometry(1.6, 2.0, treeHeight, 6);

        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.copy(basePos).setY(basePos.y + treeHeight * 0.5);
        trunk.castShadow = false;
        trunk.receiveShadow = false;
        scene.add(trunk);

        // Copa más ancha
        const foliageGeometry = new THREE.SphereGeometry(7 + Math.random() * 5, 5, 4);
        const foliageMaterial = mats.treeWide[Math.floor(Math.random() * mats.treeWide.length)];
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.copy(basePos).setY(basePos.y + treeHeight - 2);
        foliage.castShadow = false;
        foliage.receiveShadow = false;
        scene.add(foliage);
      }
    }

    // Arbustos y vegetación media
    const bushCount = Math.max(5, Math.floor((endIdx - startIdx) * (vegConfig.bushDensity / 145)));
    for (let i = 0; i < bushCount; i++) {
      const sampleIdx = startIdx + Math.floor(Math.random() * (endIdx - startIdx));
      const sample = samples[sampleIdx];
      const side = Math.random() > 0.5 ? 1 : -1;
      const distFromTrack = offset + 22 + Math.random() * 64;

      const basePos = sample.p.clone().addScaledVector(sample.normal, side * distFromTrack);
      basePos.y = groundY + (Math.random() - 0.5) * 0.35;
      if (isTooCloseToRoad(basePos, roadProbe, halfWidth, 15)) continue;

      const bushGeometry = new THREE.SphereGeometry(2.8 + Math.random() * 2.4, 4, 3);
      const bushMaterial = mats.bush[Math.floor(Math.random() * mats.bush.length)];

      const bush = new THREE.Mesh(bushGeometry, bushMaterial);
      bush.position.copy(basePos).setY(basePos.y + 2);
      bush.scale.set(1 + Math.random() * 0.5, 0.8 + Math.random() * 0.4, 1 + Math.random() * 0.5);
      bush.castShadow = false;
      bush.receiveShadow = false;
      scene.add(bush);
    }

    // Rocas naturales
    const rockCount = Math.max(3, Math.floor((endIdx - startIdx) * (vegConfig.rockDensity / 170)));
    for (let i = 0; i < rockCount; i++) {
      const sampleIdx = startIdx + Math.floor(Math.random() * (endIdx - startIdx));
      const sample = samples[sampleIdx];
      const side = Math.random() > 0.5 ? 1 : -1;
      const distFromTrack = offset + 24 + Math.random() * 64;

      const basePos = sample.p.clone().addScaledVector(sample.normal, side * distFromTrack);
      basePos.y = groundY + (Math.random() - 0.5) * 0.28;
      if (isTooCloseToRoad(basePos, roadProbe, halfWidth, 14)) continue;

      const rockGeometry = new THREE.DodecahedronGeometry(1.8 + Math.random() * 3.2, 0);
      const rockMaterial = mats.rock[Math.floor(Math.random() * mats.rock.length)];

      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.copy(basePos).setY(basePos.y + 2);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.scale.set(1 + Math.random() * 0.6, 0.8 + Math.random() * 0.4, 1 + Math.random() * 0.6);
      rock.castShadow = false;
      rock.receiveShadow = false;
      scene.add(rock);
    }
  }
}

function addDesertEnvironment(scene) {
  const sandMap = createGroundTexture(0xd9a441, 0xc99239);
  const sand = new THREE.Mesh(
    new THREE.CircleGeometry(700, 58),
    new THREE.MeshStandardMaterial({ color: 0xd9a441, map: sandMap, roughness: 0.95, metalness: 0.02, flatShading: true })
  );
  sand.rotation.x = -Math.PI * 0.5;
  sand.receiveShadow = true;
  scene.add(sand);

  for (let i = 0; i < 56; i++) {
    const dune = new THREE.Mesh(
      new THREE.ConeGeometry(12 + Math.random() * 16, 8 + Math.random() * 14, 5),
      new THREE.MeshStandardMaterial({ color: 0xe5b65d, roughness: 0.9, flatShading: true })
    );
    const a = (i / 56) * Math.PI * 2;
    const r = 360 + (i % 8) * 52;
    dune.position.set(Math.cos(a) * r, 2.5 + Math.random() * 4.5, Math.sin(a) * r);
    dune.rotation.y = Math.random() * Math.PI;
    dune.castShadow = false;
    dune.receiveShadow = true;
    scene.add(dune);
  }

  for (let i = 0; i < 36; i++) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(4 + Math.random() * 7, 0),
      new THREE.MeshStandardMaterial({ color: 0xa06d3a, roughness: 0.88, flatShading: true })
    );
    const a = (i / 36) * Math.PI * 2;
    const r = 350 + (i % 6) * 56;
    rock.position.set(Math.cos(a) * r, 2 + Math.random() * 5, Math.sin(a) * r);
    rock.castShadow = false;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  for (let i = 0; i < 20; i++) {
    const cactus = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x3f8f57, roughness: 0.86, flatShading: true })
    );
    trunk.position.y = 4;
    cactus.add(trunk);

    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.58, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x3f8f57, roughness: 0.86, flatShading: true })
    );
    arm.position.set(1.2, 4.8, 0);
    arm.rotation.z = -Math.PI * 0.35;
    cactus.add(arm);

    const a = (i / 20) * Math.PI * 2;
    const r = 330 + (i % 4) * 80;
    cactus.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    cactus.rotation.y = Math.random() * Math.PI;
    scene.add(cactus);
  }
}

function addTrackVisualProps(scene, samples, halfWidth, trackId) {
  const signMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.45, metalness: 0.2, flatShading: true });
  const arrowMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5, metalness: 0.1, emissive: 0x5f3a00, emissiveIntensity: 0.18, flatShading: true });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x404a54, roughness: 0.72, metalness: 0.22, flatShading: true });
  const propColor = trackId === "desert" ? 0x9b6f3d : trackId === "city" ? 0x73839a : 0x4f7a52;
  const propMat = new THREE.MeshStandardMaterial({ color: propColor, roughness: 0.86, metalness: 0.05, flatShading: true });

  const poleIndices = [];
  const bushIndices = [];
  for (let i = 0; i < samples.length; i += 22) {
    if (i % 44 === 0) continue;
    poleIndices.push(i);
    bushIndices.push(i);
  }

  const poleMesh = makeInstanced(new THREE.CylinderGeometry(0.12, 0.12, 3.1, 7), poleMat, poleIndices.length, true, true);
  const bushMesh = makeInstanced(new THREE.DodecahedronGeometry(1.6, 0), propMat, bushIndices.length, true, true);
  const dummy = new THREE.Object3D();

  let poleAt = 0;
  let bushAt = 0;
  for (const i of poleIndices) {
    const s = samples[i];
    const side = i % 2 === 0 ? 1 : -1;
    const pos = s.p.clone().addScaledVector(s.normal, side * (halfWidth + 7.6));

    dummy.position.copy(pos).setY(pos.y + 1.5);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleMesh.setMatrixAt(poleAt++, dummy.matrix);

    dummy.position.copy(pos).setY(pos.y + 0.9);
    const bushScale = 0.78 + Math.random() * 0.9;
    dummy.rotation.set(Math.random() * 0.18, Math.random() * Math.PI, Math.random() * 0.18);
    dummy.scale.set(bushScale, bushScale, bushScale);
    dummy.updateMatrix();
    bushMesh.setMatrixAt(bushAt++, dummy.matrix);
  }

  poleMesh.instanceMatrix.needsUpdate = true;
  bushMesh.instanceMatrix.needsUpdate = true;
  poleMesh.computeBoundingSphere();
  bushMesh.computeBoundingSphere();
  scene.add(poleMesh);
  scene.add(bushMesh);

  for (let i = 0; i < samples.length; i += 44) {
    const s = samples[i];
    const side = i % 2 === 0 ? 1 : -1;
    const pos = s.p.clone().addScaledVector(s.normal, side * (halfWidth + 7.6));

    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.12), signMat);
    sign.position.copy(pos).setY(pos.y + 3.1);
    sign.rotation.y = Math.atan2(s.tan.x, s.tan.z) + (side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
    sign.castShadow = true;
    sign.frustumCulled = true;
    scene.add(sign);

    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.1, 3), arrowMat);
    arrow.position.copy(s.p).addScaledVector(s.normal, side * (halfWidth - 0.4)).setY(s.p.y + 0.16);
    arrow.rotation.x = -Math.PI * 0.5;
    arrow.rotation.z = -Math.PI * 0.5;
    arrow.rotation.y = Math.atan2(s.tan.x, s.tan.z);
    arrow.receiveShadow = true;
    arrow.frustumCulled = true;
    scene.add(arrow);
  }
}

function addNatureBiomeDecor(scene, samples, halfWidth) {
  const forestMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.88, flatShading: true });
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x7a838f, roughness: 0.9, flatShading: true });
  const fieldMat = new THREE.MeshStandardMaterial({ color: 0x8fd06a, roughness: 0.86, flatShading: true });
  const techMat = new THREE.MeshStandardMaterial({ color: 0x3a4658, roughness: 0.75, metalness: 0.08, flatShading: true });

  const biomes = [
    { start: 0.0, end: 0.24, type: "forest" },
    { start: 0.24, end: 0.5, type: "mountain" },
    { start: 0.5, end: 0.76, type: "field" },
    { start: 0.76, end: 1.0, type: "technical" },
  ];

  for (const biome of biomes) {
    const from = Math.floor(samples.length * biome.start);
    const to = Math.floor(samples.length * biome.end);
    const step = biome.type === "technical" ? 14 : 20;

    for (let i = from; i < to; i += step) {
      const s = samples[i % samples.length];
      const side = i % 2 === 0 ? 1 : -1;
      const offset = halfWidth + 46 + (i % 4) * 10;
      const pos = s.p.clone().addScaledVector(s.normal, side * offset);
      pos.y = 0.18 + ((i % 3) - 1) * 0.1;

      if (biome.type === "forest") {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 7.2, 7), new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.88, flatShading: true }));
        trunk.position.copy(pos).setY(pos.y + 3.4);
        trunk.castShadow = false;
        scene.add(trunk);

        const crown = new THREE.Mesh(new THREE.ConeGeometry(3.1, 8.0, 7), forestMat);
        crown.position.copy(pos).setY(pos.y + 9.2);
        crown.castShadow = false;
        scene.add(crown);
      } else if (biome.type === "mountain") {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6 + (i % 3) * 0.9, 0), mountainMat);
        rock.position.copy(pos).setY(pos.y + 2.1 + (i % 2) * 1.1);
        rock.castShadow = false;
        rock.receiveShadow = true;
        scene.add(rock);
      } else if (biome.type === "field") {
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0 + (i % 3) * 0.5, 0), fieldMat);
        bush.position.copy(pos).setY(pos.y + 1.0);
        bush.castShadow = false;
        scene.add(bush);
      } else {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 0.4), techMat);
        post.position.copy(pos).setY(pos.y + 1.2);
        post.castShadow = false;
        scene.add(post);

        const marker = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.12), new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.5, flatShading: true }));
        marker.position.copy(pos).setY(pos.y + 2.5);
        marker.rotation.y = Math.atan2(s.tan.x, s.tan.z);
        scene.add(marker);
      }
    }
  }
}

function buildNatureAdventureSections(scene, samples, halfWidth) {
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.86, metalness: 0.04, flatShading: true });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x4b3b2a, roughness: 0.8, metalness: 0.08, flatShading: true });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f7d8b, roughness: 0.92, metalness: 0.02, flatShading: true });

  const sectionDefs = [
    { ratio: 0.18, span: 54, type: "wood" },
    { ratio: 0.41, span: 48, type: "stone" },
    { ratio: 0.66, span: 52, type: "wood" },
  ];

  for (const def of sectionDefs) {
    const start = Math.floor(samples.length * def.ratio) % samples.length;
    const plankStep = 2;
    const plankCount = Math.floor(def.span / plankStep) * 3;
    const plankMesh = makeInstanced(new THREE.BoxGeometry(halfWidth * 0.96, 0.22, 1.34), def.type === "stone" ? stoneMat : plankMat, plankCount, false, true);
    const sideBeamMesh = makeInstanced(new THREE.BoxGeometry(0.34, 0.4, 1.4), edgeMat, plankCount * 2, false, true);
    const supportMesh = makeInstanced(new THREE.CylinderGeometry(0.22, 0.28, 2.2, 6), edgeMat, Math.ceil(plankCount * 0.5), false, true);
    const dummy = new THREE.Object3D();

    let plankAt = 0;
    let edgeAt = 0;
    let supportAt = 0;

    for (let o = 0; o < def.span; o += plankStep) {
      const idx = (start + o + samples.length) % samples.length;
      const s = samples[idx];
      const yaw = Math.atan2(s.tan.x, s.tan.z);

      for (let lane = -1; lane <= 1; lane++) {
        dummy.position.copy(s.p).addScaledVector(s.normal, lane * (halfWidth * 0.36)).setY(s.p.y + 0.14);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        if (plankAt < plankCount) plankMesh.setMatrixAt(plankAt++, dummy.matrix);
      }

      const leftEdge = s.p.clone().addScaledVector(s.normal, halfWidth * 0.95);
      const rightEdge = s.p.clone().addScaledVector(s.normal, -halfWidth * 0.95);

      dummy.position.copy(leftEdge).setY(leftEdge.y + 0.38);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sideBeamMesh.setMatrixAt(edgeAt++, dummy.matrix);

      dummy.position.copy(rightEdge).setY(rightEdge.y + 0.38);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      sideBeamMesh.setMatrixAt(edgeAt++, dummy.matrix);

      if (o % 4 === 0 && supportAt < supportMesh.count) {
        dummy.position.copy(s.p).setY(s.p.y - 0.9);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(1, 1 + Math.random() * 0.25, 1);
        dummy.updateMatrix();
        supportMesh.setMatrixAt(supportAt++, dummy.matrix);
      }
    }

    plankMesh.count = plankAt;
    sideBeamMesh.count = edgeAt;
    supportMesh.count = supportAt;
    plankMesh.instanceMatrix.needsUpdate = true;
    sideBeamMesh.instanceMatrix.needsUpdate = true;
    supportMesh.instanceMatrix.needsUpdate = true;
    plankMesh.computeBoundingSphere();
    sideBeamMesh.computeBoundingSphere();
    supportMesh.computeBoundingSphere();
    scene.add(plankMesh);
    scene.add(sideBeamMesh);
    scene.add(supportMesh);
  }

  const ramps = [];
  const jumpRatios = [0.245, 0.615];
  const jumpMat = new THREE.MeshStandardMaterial({ color: 0x596a83, roughness: 0.74, metalness: 0.1, flatShading: true });
  const landingMat = new THREE.MeshStandardMaterial({ color: 0x45566e, roughness: 0.78, metalness: 0.08, flatShading: true });

  for (const ratio of jumpRatios) {
    const idx = Math.floor(samples.length * ratio) % samples.length;
    const s = samples[idx];
    const yaw = Math.atan2(s.tan.x, s.tan.z);

    const ramp = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 0.82, 0.42, 7.2), jumpMat);
    ramp.position.copy(s.p).setY(s.p.y + 0.26);
    ramp.rotation.set(-0.22, yaw, 0);
    ramp.receiveShadow = true;
    ramp.castShadow = false;
    scene.add(ramp);

    const landingSample = samples[(idx + 14) % samples.length];
    const landing = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 0.9, 0.14, 8.0), landingMat);
    landing.position.copy(landingSample.p).setY(landingSample.p.y + 0.1);
    landing.rotation.y = Math.atan2(landingSample.tan.x, landingSample.tan.z);
    landing.receiveShadow = true;
    landing.castShadow = false;
    scene.add(landing);

    ramps.push({
      position: s.p.clone(),
      radius: halfWidth * 0.62,
      launchVelocity: 9.2,
      airTime: 0.3,
    });
  }

  return { ramps };
}

function buildCheckpoints(scene, samples, halfWidth) {
  const checkpoints = [];
  const checkpointCount = 12;
  const checkpointMat = new THREE.MeshStandardMaterial({
    color: 0xffdd00,
    emissive: 0xffaa00,
    emissiveIntensity: 0.8,
    roughness: 0.3,
    metalness: 0.5,
    flatShaping: true,
  });

  for (let i = 0; i < checkpointCount; i++) {
    const ratio = i / checkpointCount;
    const idx = Math.floor(samples.length * ratio) % samples.length;
    const sample = samples[idx];

    // Crear checkpoint visual
    const cpSize = halfWidth * 0.6;
    const cpGeometry = new THREE.BoxGeometry(cpSize * 2, 0.3, 1.2);
    const checkpoint = new THREE.Mesh(cpGeometry, checkpointMat);
    checkpoint.position.copy(sample.p).setY(sample.p.y + 0.15);
    checkpoint.rotation.y = Math.atan2(sample.tan.x, sample.tan.z);
    checkpoint.castShadow = false;
    checkpoint.receiveShadow = true;
    scene.add(checkpoint);

    // Datos del checkpoint para detección (compatible con LapSystem)
    const cpObj = sample.p.clone();
    cpObj.r = cpSize * 1.4; // Radio de detección accesible directamente
    checkpoints.push(cpObj);
  }

  return checkpoints;
}

function buildFinishLine(scene, samples, halfWidth) {
  // Crear línea de meta visual (arco tricolor)
  const finishIdx = 0;
  const sample = samples[finishIdx];

  const finishHeight = 12;
  const finishWidth = halfWidth * 2.2;

  // Arco izquierdo (rojo)
  const arcLeftGeo = new THREE.TorusGeometry(finishWidth * 0.4, 0.4, 8, 16, 0, Math.PI);
  const redMat = new THREE.MeshStandardMaterial({ color: 0xff2d2d, emissive: 0xff1a1a, emissiveIntensity: 1.1, roughness: 0.35 });
  const arcLeft = new THREE.Mesh(arcLeftGeo, redMat);
  arcLeft.position.copy(sample.p).setY(sample.p.y + finishHeight * 0.5);
  arcLeft.rotation.x = Math.PI * 0.5;
  arcLeft.rotation.z = Math.PI * 0.5;
  arcLeft.castShadow = true;
  arcLeft.receiveShadow = true;
  scene.add(arcLeft);

  // Arco central (blanco)
  const arcCenterGeo = new THREE.TorusGeometry(finishWidth * 0.24, 0.48, 10, 24, 0, Math.PI);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3 });
  const arcCenter = new THREE.Mesh(arcCenterGeo, whiteMat);
  arcCenter.position.copy(sample.p).setY(sample.p.y + finishHeight);
  arcCenter.rotation.x = Math.PI * 0.5;
  arcCenter.castShadow = true;
  arcCenter.receiveShadow = true;
  scene.add(arcCenter);

  // Pilares de meta
  const pillarGeo = new THREE.CylinderGeometry(0.8, 1.0, finishHeight, 10);
  const pillarMatL = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xaa1a10, emissiveIntensity: 0.45, roughness: 0.5, metalness: 0.2 });
  const pillarMatR = new THREE.MeshStandardMaterial({ color: 0x2e7dff, emissive: 0x103c88, emissiveIntensity: 0.45, roughness: 0.5, metalness: 0.2 });

  const pillarLeft = new THREE.Mesh(pillarGeo, pillarMatL);
  pillarLeft.position.copy(sample.p).addScaledVector(sample.normal, halfWidth + 1).setY(sample.p.y + finishHeight * 0.5);
  pillarLeft.castShadow = true;
  pillarLeft.receiveShadow = true;
  scene.add(pillarLeft);

  const pillarRight = new THREE.Mesh(pillarGeo, pillarMatR);
  pillarRight.position.copy(sample.p).addScaledVector(sample.normal, -halfWidth - 1).setY(sample.p.y + finishHeight * 0.5);
  pillarRight.castShadow = true;
  pillarRight.receiveShadow = true;
  scene.add(pillarRight);

  // Bandera de meta
  const flagGeo = new THREE.PlaneGeometry(6, 3.4);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xfff26b, emissive: 0xe5c94f, emissiveIntensity: 0.9, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.copy(sample.p).setY(sample.p.y + finishHeight * 0.8);
  flag.rotation.y = Math.atan2(sample.tan.x, sample.tan.z);
  flag.castShadow = true;
  flag.receiveShadow = true;
  scene.add(flag);

  // Barra de meta tipo ajedrez para legibilidad inmediata.
  const bannerGeo = new THREE.BoxGeometry(finishWidth * 1.9, 0.35, 1.0);
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, emissiveIntensity: 0.25, roughness: 0.38, metalness: 0.08 });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.copy(sample.p).setY(sample.p.y + finishHeight - 0.8);
  banner.rotation.y = Math.atan2(sample.tan.x, sample.tan.z);
  banner.castShadow = true;
  banner.receiveShadow = true;
  scene.add(banner);

  // Franja ajedrezada luminosa sobre el asfalto para identificar la meta al instante.
  const checkerCanvas = document.createElement("canvas");
  checkerCanvas.width = 128;
  checkerCanvas.height = 32;
  const checkerCtx = checkerCanvas.getContext("2d");
  const cells = 16;
  const cellW = checkerCanvas.width / cells;
  const cellH = checkerCanvas.height / 2;
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < cells; x++) {
      checkerCtx.fillStyle = (x + y) % 2 === 0 ? "#ffffff" : "#111111";
      checkerCtx.fillRect(x * cellW, y * cellH, cellW, cellH);
    }
  }
  const checkerTex = new THREE.CanvasTexture(checkerCanvas);
  checkerTex.wrapS = THREE.RepeatWrapping;
  checkerTex.wrapT = THREE.RepeatWrapping;
  checkerTex.repeat.set(1, 1);

  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(finishWidth * 1.85, 5.6),
    new THREE.MeshStandardMaterial({
      map: checkerTex,
      color: 0xffffff,
      emissive: 0x2a2a2a,
      emissiveIntensity: 0.44,
      roughness: 0.34,
      metalness: 0.08,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
  );
  strip.position.copy(sample.p).addScaledVector(sample.tan, 1.1).setY(sample.p.y + 0.08);
  strip.rotation.x = -Math.PI * 0.5;
  strip.rotation.z = Math.atan2(sample.tan.x, sample.tan.z);
  strip.receiveShadow = true;
  scene.add(strip);

  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x9ee8ff, emissive: 0x4bb8ff, emissiveIntensity: 0.95, roughness: 0.24, metalness: 0.1 });
  const beaconGeo = new THREE.CylinderGeometry(0.34, 0.34, 2.8, 10);
  const beaconLeft = new THREE.Mesh(beaconGeo, beaconMat);
  beaconLeft.position.copy(sample.p).addScaledVector(sample.normal, halfWidth + 2.6).setY(sample.p.y + 1.45);
  beaconLeft.castShadow = true;
  scene.add(beaconLeft);

  const beaconRight = beaconLeft.clone();
  beaconRight.position.copy(sample.p).addScaledVector(sample.normal, -halfWidth - 2.6).setY(sample.p.y + 1.45);
  scene.add(beaconRight);

  const trussMat = new THREE.MeshStandardMaterial({ color: 0x5d6774, roughness: 0.36, metalness: 0.48 });
  const truss = new THREE.Mesh(
    new THREE.BoxGeometry(finishWidth * 2.15, 0.42, 0.42),
    trussMat
  );
  truss.position.copy(sample.p).setY(sample.p.y + finishHeight + 1.25);
  truss.rotation.y = Math.atan2(sample.tan.x, sample.tan.z);
  truss.castShadow = true;
  truss.receiveShadow = true;
  scene.add(truss);

  const lanePaintMat = new THREE.MeshStandardMaterial({ color: 0xf9fdff, roughness: 0.24, metalness: 0.02, emissive: 0x1e2e35, emissiveIntensity: 0.3, side: THREE.DoubleSide });
  for (let i = -2; i <= 2; i++) {
    const lanePaint = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 5.4), lanePaintMat);
    lanePaint.position.copy(sample.p).addScaledVector(sample.normal, i * (halfWidth * 0.35)).addScaledVector(sample.tan, 1.05).setY(sample.p.y + 0.085);
    lanePaint.rotation.x = -Math.PI * 0.5;
    lanePaint.rotation.z = Math.atan2(sample.tan.x, sample.tan.z);
    lanePaint.receiveShadow = true;
    scene.add(lanePaint);
  }

  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff9de, emissive: 0xffd35a, emissiveIntensity: 1.15, roughness: 0.28, metalness: 0.1 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), lampMat);
    lamp.position.copy(sample.p)
      .addScaledVector(sample.normal, Math.cos(a) * (halfWidth + 2.1))
      .addScaledVector(sample.tan, Math.sin(a) * 1.6)
      .setY(sample.p.y + 3.1 + Math.max(0, Math.sin(a)) * 0.8);
    scene.add(lamp);
  }
}

function buildSpecialZones(scene, samples, halfWidth, trackId) {
  const turboPads = [];
  const mudZones = [];
  const dangerZones = [];

  const turboMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x006f88, emissiveIntensity: 0.55, roughness: 0.28, metalness: 0.32, flatShading: true });
  const mudMat = new THREE.MeshStandardMaterial({ color: 0x6f4e37, roughness: 0.96, metalness: 0.02, flatShading: true });
  const dangerMat = new THREE.MeshStandardMaterial({ color: 0xd00000, emissive: 0x4b0000, emissiveIntensity: 0.22, roughness: 0.62, metalness: 0.08, flatShading: true });

  const turboRatios = trackId === "city" ? [0.14, 0.46, 0.74] : [0.12, 0.41, 0.7];
  const mudRatios = [];
  const dangerRatios = [];

  for (const ratio of turboRatios) {
    const idx = Math.floor(samples.length * ratio) % samples.length;
    const s = samples[idx];

    const pad = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 0.85, 0.08, 6.6), turboMat);
    pad.position.copy(s.p).setY(s.p.y + 0.07);
    pad.rotation.y = Math.atan2(s.tan.x, s.tan.z);
    pad.receiveShadow = true;
    pad.frustumCulled = true;
    scene.add(pad);

    turboPads.push({ position: s.p.clone(), radius: halfWidth * 0.6, strength: 1.2 });
  }

  for (const ratio of mudRatios) {
    const idx = Math.floor(samples.length * ratio) % samples.length;
    const s = samples[idx];
    const side = ratio > 0.5 ? -1 : 1;
    const pos = s.p.clone().addScaledVector(s.normal, side * (halfWidth * 0.36));

    const mud = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 0.9, 0.04, 8.2), mudMat);
    mud.position.copy(pos).setY(pos.y + 0.05);
    mud.rotation.y = Math.atan2(s.tan.x, s.tan.z);
    mud.receiveShadow = true;
    mud.frustumCulled = true;
    scene.add(mud);

    mudZones.push({ position: pos, radius: halfWidth * 0.62, drag: 0.8 });
  }

  for (const ratio of dangerRatios) {
    const idx = Math.floor(samples.length * ratio) % samples.length;
    const s = samples[idx];
    const side = ratio > 0.45 ? 1 : -1;
    const pos = s.p.clone().addScaledVector(s.normal, side * (halfWidth * 0.5));

    const danger = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 12), dangerMat);
    danger.position.copy(pos).setY(pos.y + 0.08);
    danger.rotation.x = -Math.PI * 0.5;
    danger.receiveShadow = true;
    danger.frustumCulled = true;
    scene.add(danger);

    dangerZones.push({ position: pos, radius: 1.9, damage: 6 });
  }

  return { turboPads, mudZones, dangerZones };
}

function buildShortcutRoute(scene, mainSamples, startIndex, endIndex, width, color, elevation = 0) {
  const start = mainSamples[startIndex].p;
  const end = mainSamples[endIndex].p;

  const toEnd = new THREE.Vector3().subVectors(end, start);
  const side = new THREE.Vector3(-toEnd.z, 0, toEnd.x).normalize();
  const midA = start.clone().lerp(end, 0.33).addScaledVector(side, width * 0.8);
  const midB = start.clone().lerp(end, 0.66).addScaledVector(side, -width * 0.5);
  midA.y = THREE.MathUtils.lerp(start.y, end.y, 0.33) + elevation;
  midB.y = THREE.MathUtils.lerp(start.y, end.y, 0.66) + elevation;

  const routeCurve = new THREE.CatmullRomCurve3([start.clone(), midA, midB, end.clone()], false, "catmullrom", 0.15);
  const samples = sampleCurve(routeCurve, 180);
  const mesh = buildRibbonMesh(scene, samples, width * 0.35, color);

  return {
    mesh,
    samples,
    entryMainIndex: startIndex,
    exitMainIndex: endIndex,
    entryPoint: start.clone(),
    exitPoint: end.clone(),
    entryRadius: width * 1.3,
    exitRadius: width * 1.3,
  };
}

function buildBranchRoute(scene, mainSamples, startIndex, endIndex, width, color, options = {}) {
  const startSample = mainSamples[startIndex];
  const endSample = mainSamples[endIndex];
  const start = startSample.p;
  const end = endSample.p;
  const mid = start.clone().add(end).multiplyScalar(0.5);

  const bend = options.bend ?? 0;
  const lift = options.lift ?? 0;
  const lateral = startSample.normal.clone().setY(0).normalize();
  mid.addScaledVector(lateral, bend);
  mid.y += lift;

  const routeCurve = new THREE.CatmullRomCurve3([start.clone(), mid, end.clone()], false, "catmullrom", 0.08);
  const samples = sampleCurve(routeCurve, options.sampleCount ?? 160);
  const mesh = buildRibbonMesh(scene, samples, (options.branchWidth ?? width * 0.36), color);

  return {
    mesh,
    samples,
    entryMainIndex: startIndex,
    exitMainIndex: endIndex,
    entryPoint: start.clone(),
    exitPoint: end.clone(),
    entryRadius: width * 1.15,
    exitRadius: width * 1.15,
    kind: options.kind || "bypass",
    label: options.label || "Branch",
  };
}

function addBranchIndicators(scene, branchChoices, halfWidth) {
  const leftMat = new THREE.MeshStandardMaterial({ color: 0x39c6ff, emissive: 0x114466, emissiveIntensity: 0.3, roughness: 0.55, metalness: 0.08, flatShading: true });
  const rightMat = new THREE.MeshStandardMaterial({ color: 0xff8c35, emissive: 0x552200, emissiveIntensity: 0.3, roughness: 0.55, metalness: 0.08, flatShading: true });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x39424d, roughness: 0.8, metalness: 0.05, flatShading: true });

  for (const branch of branchChoices) {
    const entry = branch.entryPoint;
    const normal = branch.normal.clone().normalize();
    const leftPos = entry.clone().addScaledVector(normal, halfWidth + 3.2);
    const rightPos = entry.clone().addScaledVector(normal, -(halfWidth + 3.2));

    const leftPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.8, 6), poleMat);
    leftPole.position.copy(leftPos).setY(leftPos.y + 1.35);
    leftPole.castShadow = true;
    scene.add(leftPole);

    const leftArrow = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.0, 3), leftMat);
    leftArrow.position.copy(leftPos).setY(leftPos.y + 2.8);
    leftArrow.rotation.x = -Math.PI * 0.5;
    leftArrow.rotation.z = Math.PI * 0.5;
    leftArrow.rotation.y = Math.atan2(normal.x, normal.z);
    scene.add(leftArrow);

    const rightPole = leftPole.clone();
    rightPole.position.copy(rightPos).setY(rightPos.y + 1.35);
    scene.add(rightPole);

    const rightArrow = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.0, 3), rightMat);
    rightArrow.position.copy(rightPos).setY(rightPos.y + 2.8);
    rightArrow.rotation.x = -Math.PI * 0.5;
    rightArrow.rotation.z = -Math.PI * 0.5;
    rightArrow.rotation.y = Math.atan2(-normal.x, -normal.z);
    scene.add(rightArrow);
  }
}

function buildTrackDefinition(trackId) {
  if (trackId === "desert") {
    return {
      id: "desert",
      width: 25,
      sampleCount: 1080,
      roadColor: 0x8f5d2f,
      rampColor: 0xb57a48,
      barrierColor: 0x7a4f2b,
      points: [
        new THREE.Vector3(0, 2.0, 320),
        new THREE.Vector3(108, 6.4, 292),
        new THREE.Vector3(206, 14.2, 238),
        new THREE.Vector3(302, 11.0, 134),
        new THREE.Vector3(338, 8.0, 32),
        new THREE.Vector3(312, 16.4, -78),
        new THREE.Vector3(238, 22.0, -184),
        new THREE.Vector3(124, 12.6, -258),
        new THREE.Vector3(8, 6.5, -304),
        new THREE.Vector3(-108, 3.8, -286),
        new THREE.Vector3(-218, 8.4, -232),
        new THREE.Vector3(-314, 18.2, -134),
        new THREE.Vector3(-350, 24.0, -6),
        new THREE.Vector3(-320, 13.2, 116),
        new THREE.Vector3(-230, 7.4, 210),
        new THREE.Vector3(-118, 4.2, 286),
      ],
      environment: "desert",
    };
  }

  if (trackId === "city") {
    return {
      id: "city",
      width: 22,
      sampleCount: 1020,
      roadColor: 0x393f4f,
      rampColor: 0x535b6f,
      barrierColor: 0x4f3a2e,
      points: [
        new THREE.Vector3(0, 1.8, 310),
        new THREE.Vector3(110, 2.5, 298),
        new THREE.Vector3(238, 8.8, 252),
        new THREE.Vector3(335, 4.0, 162),
        new THREE.Vector3(355, 2.0, 55),
        new THREE.Vector3(312, 6.0, -45),
        new THREE.Vector3(238, 16.0, -142),
        new THREE.Vector3(132, 11.0, -232),
        new THREE.Vector3(20, 6.2, -285),
        new THREE.Vector3(-110, 2.2, -273),
        new THREE.Vector3(-230, 6.5, -214),
        new THREE.Vector3(-324, 13.5, -118),
        new THREE.Vector3(-356, 18.0, 6),
        new THREE.Vector3(-318, 10.0, 122),
        new THREE.Vector3(-228, 4.8, 214),
        new THREE.Vector3(-112, 3.2, 284),
      ],
      environment: "city",
    };
  }

  return {
    id: "nature",
    width: 24,
    sampleCount: 1220,
    roadColor: 0x343c4f,
    rampColor: 0x4b566e,
    barrierColor: 0x7c5539,
    points: [
      // Seccion 1: recta rapida de salida
      new THREE.Vector3(-40, 4.0, 560),
      new THREE.Vector3(160, 5.0, 556),
      new THREE.Vector3(360, 7.0, 536),
      new THREE.Vector3(540, 11.0, 470),

      // Seccion 2: curva suave y subida progresiva
      new THREE.Vector3(650, 16.0, 354),
      new THREE.Vector3(698, 22.0, 220),
      new THREE.Vector3(688, 27.0, 92),

      // Seccion 3: hairpin tecnico en altura
      new THREE.Vector3(622, 31.0, -26),
      new THREE.Vector3(500, 32.0, -116),
      new THREE.Vector3(330, 30.0, -166),

      // Seccion 4: descenso rapido con curvatura abierta
      new THREE.Vector3(130, 24.0, -194),
      new THREE.Vector3(-74, 18.0, -214),
      new THREE.Vector3(-258, 14.0, -262),

      // Seccion 5: hairpin cerrado inferior
      new THREE.Vector3(-366, 12.0, -352),
      new THREE.Vector3(-410, 13.0, -462),
      new THREE.Vector3(-330, 16.0, -548),

      // Seccion 6: recta larga inferior y recuperacion
      new THREE.Vector3(-140, 20.0, -582),
      new THREE.Vector3(74, 24.0, -562),
      new THREE.Vector3(278, 30.0, -502),

      // Seccion 7: zona montanosa tecnica
      new THREE.Vector3(398, 35.0, -398),
      new THREE.Vector3(390, 38.0, -270),
      new THREE.Vector3(298, 37.0, -166),
      new THREE.Vector3(164, 33.0, -88),

      // Seccion 8: regreso con bajada suave al inicio
      new THREE.Vector3(20, 26.0, -10),
      new THREE.Vector3(-102, 19.0, 100),
      new THREE.Vector3(-152, 13.0, 236),
      new THREE.Vector3(-126, 9.0, 384),
      new THREE.Vector3(-70, 6.0, 504),
    ],
    environment: "nature",
  };
}

export class TrackGenerator {
  static create(scene, trackId) {
    const def = buildTrackDefinition(trackId);

    if (def.environment === "city") {
      addCityEnvironment(scene);
    } else if (def.environment === "desert") {
      addDesertEnvironment(scene);
    } else {
      addNatureEnvironment(scene);
    }

    const curve = new THREE.CatmullRomCurve3(def.points, true, "catmullrom", 0.18);
    const samples = sampleCurve(curve, def.sampleCount);
    const halfWidth = def.width * 0.5;

    const roadMesh = buildRibbonMesh(scene, samples, halfWidth, def.roadColor);
    addRoadDetails(scene, samples, halfWidth, def);
    // Props decorativos desactivados para mantener el camino jugable libre de obstaculos.
    const specialZones = buildSpecialZones(scene, samples, halfWidth, def.id);
    const checkpoints = buildCheckpoints(scene, samples, halfWidth);
    buildFinishLine(scene, samples, halfWidth);
    
    const mountainIntensity = def.id === "nature" ? 1.0 : def.id === "desert" ? 0.95 : 0.8;
    addBackgroundMountains(scene, def.id, mountainIntensity, samples, halfWidth);

    let natureExtras = { ramps: [] };
    if (def.id === "nature") {
      // Capa principal de biomas (más coherente y ligera).
      addEnhancedVegetation(scene, def.id, samples, halfWidth);
      natureExtras = buildNatureAdventureSections(scene, samples, halfWidth);
    }

    const hasAlternateRoutes = def.id !== "nature";
    const routes = {};
    const branchChoices = [];
    const groundMeshes = [roadMesh];
    const groundMeshByRoute = { main: roadMesh };

    if (hasAlternateRoutes) {
      const shortcutA = buildShortcutRoute(scene, samples, Math.floor(def.sampleCount * 0.16), Math.floor(def.sampleCount * 0.28), def.width, def.rampColor, 0);
      const shortcutB = buildShortcutRoute(scene, samples, Math.floor(def.sampleCount * 0.55), Math.floor(def.sampleCount * 0.7), def.width, def.rampColor, 0);
      const shortcutC = buildShortcutRoute(scene, samples, Math.floor(def.sampleCount * 0.77), Math.floor(def.sampleCount * 0.9), def.width, def.rampColor, 0);

      const branchA = {
        entryIndex: Math.floor(def.sampleCount * 0.16),
        entryPoint: samples[Math.floor(def.sampleCount * 0.16)].p.clone(),
        normal: samples[Math.floor(def.sampleCount * 0.16)].normal.clone(),
        entryRadius: def.width * 1.15,
        leftRoute: buildBranchRoute(scene, samples, Math.floor(def.sampleCount * 0.16), Math.floor(def.sampleCount * 0.28), def.width, 0x3e5f86, {
          lift: 0,
          bend: def.width * 0.08,
          sampleCount: 170,
          branchWidth: def.width * 0.3,
          kind: "straight",
          label: "Recta A",
        }),
        rightRoute: buildBranchRoute(scene, samples, Math.floor(def.sampleCount * 0.16), Math.floor(def.sampleCount * 0.28), def.width, def.rampColor, {
          lift: 0,
          bend: def.width * 0.14,
          sampleCount: 170,
          branchWidth: def.width * 0.31,
          kind: "alt",
          label: "Alterna A",
        }),
        hint: "Izquierda = trazado estable | Derecha = alterna",
      };

      const branchB = {
        entryIndex: Math.floor(def.sampleCount * 0.55),
        entryPoint: samples[Math.floor(def.sampleCount * 0.55)].p.clone(),
        normal: samples[Math.floor(def.sampleCount * 0.55)].normal.clone(),
        entryRadius: def.width * 1.15,
        leftRoute: buildBranchRoute(scene, samples, Math.floor(def.sampleCount * 0.55), Math.floor(def.sampleCount * 0.7), def.width, 0x3e5f86, {
          lift: 0,
          bend: -def.width * 0.07,
          sampleCount: 170,
          branchWidth: def.width * 0.3,
          kind: "straight",
          label: "Recta B",
        }),
        rightRoute: buildBranchRoute(scene, samples, Math.floor(def.sampleCount * 0.55), Math.floor(def.sampleCount * 0.7), def.width, def.rampColor, {
          lift: 0,
          bend: -def.width * 0.14,
          sampleCount: 170,
          branchWidth: def.width * 0.31,
          kind: "alt",
          label: "Alterna B",
        }),
        hint: "Izquierda = trazado estable | Derecha = alterna",
      };

      branchChoices.push(branchA, branchB);
      addBranchIndicators(scene, branchChoices, halfWidth);

      routes.shortcutA = shortcutA;
      routes.shortcutB = shortcutB;
      routes.shortcutC = shortcutC;
      routes.branchA = branchA.leftRoute;
      routes.branchA_alt = branchA.rightRoute;
      routes.branchB = branchB.leftRoute;
      routes.branchB_alt = branchB.rightRoute;

      groundMeshes.push(
        shortcutA.mesh,
        shortcutB.mesh,
        shortcutC.mesh,
        branchA.leftRoute.mesh,
        branchA.rightRoute.mesh,
        branchB.leftRoute.mesh,
        branchB.rightRoute.mesh
      );

      groundMeshByRoute.shortcutA = shortcutA.mesh;
      groundMeshByRoute.shortcutB = shortcutB.mesh;
      groundMeshByRoute.shortcutC = shortcutC.mesh;
      groundMeshByRoute.branchA = branchA.leftRoute.mesh;
      groundMeshByRoute.branchA_alt = branchA.rightRoute.mesh;
      groundMeshByRoute.branchB = branchB.leftRoute.mesh;
      groundMeshByRoute.branchB_alt = branchB.rightRoute.mesh;
    }

    const spawnIndices = [12, 3, def.sampleCount - 10, def.sampleCount - 24];
    const pickupIndices = [48, 122, 196, 276, 354, 430, 510, 600, 688, 770, 858, 940]
      .map((i) => i % def.sampleCount);

    const hazards = [];

    const surfaceZones = def.id === "city"
      ? [
          { start: Math.floor(def.sampleCount * 0.07), end: Math.floor(def.sampleCount * 0.19), gripMultiplier: 0.82 },
          { start: Math.floor(def.sampleCount * 0.42), end: Math.floor(def.sampleCount * 0.52), gripMultiplier: 0.76 },
          { start: Math.floor(def.sampleCount * 0.72), end: Math.floor(def.sampleCount * 0.8), gripMultiplier: 0.88 },
        ]
      : [
          { start: Math.floor(def.sampleCount * 0.11), end: Math.floor(def.sampleCount * 0.22), gripMultiplier: 0.84 },
          { start: Math.floor(def.sampleCount * 0.36), end: Math.floor(def.sampleCount * 0.47), gripMultiplier: 0.73 },
          { start: Math.floor(def.sampleCount * 0.79), end: Math.floor(def.sampleCount * 0.9), gripMultiplier: 0.8 },
        ];

    const cityEventAnchor = def.id === "city" ? samples[Math.floor(def.sampleCount * 0.64)].p.clone().add(new THREE.Vector3(30, 0, 16)) : null;
    const dynamicEvents = [];

    const filteredGroundMeshes = groundMeshes.filter(Boolean);

    return {
      id: def.id,
      curve,
      samples,
      width: def.width,
      halfWidth,
      sampleCount: def.sampleCount,
      spawnIndices,
      pickupIndices,
      checkpoints,
      routes,
      branchChoices,
      mainMesh: roadMesh,
      groundMeshes: filteredGroundMeshes,
      groundMeshByRoute,
      ramps: natureExtras.ramps,
      hazards,
      surfaceZones,
      turboPads: specialZones.turboPads,
      mudZones: specialZones.mudZones,
      dangerZones: specialZones.dangerZones,
      cityEventAnchor,
      dynamicEvents,
    };
  }

  static nearestSample(position, samples, hint = 0, window = 90) {
    const n = samples.length;
    let best = hint;
    let bestDist = Infinity;

    for (let o = -window; o <= window; o++) {
      const idx = (hint + o + n) % n;
      const d = samples[idx].p.distanceToSquared(position);
      if (d < bestDist) {
        best = idx;
        bestDist = d;
      }
    }

    return best;
  }

  static constrainToTrack(vehicle, track, penalty = 0.74, sampleSet = track.samples, sampleIndex = vehicle.sampleIndex, dt = 0.016) {
    const s = sampleSet[sampleIndex];
    const to = vehicle.position.clone().sub(s.p);
    const lateral = to.dot(s.normal);
    const isMainRoute = sampleSet === track.samples;
    const laneWidth = isMainRoute ? track.halfWidth : track.halfWidth * 0.66;
    const limit = laneWidth - (isMainRoute ? 1.45 : 1.8);

    if (Math.abs(lateral) > limit) {
      // Sin correccion de posicion X/Z: solo amortiguacion para mantener estabilidad.
      const overshoot = Math.abs(lateral) - limit;
      const speedBleed = THREE.MathUtils.clamp(0.42 + overshoot * 0.1, 0.42, 1.25);
      vehicle.speed = Math.max(0, vehicle.speed - speedBleed * dt * 22);
      vehicle.velocity.multiplyScalar(1 - THREE.MathUtils.clamp(dt * (0.7 + overshoot * 0.12), 0, 0.22));
      vehicle.sideSlip = THREE.MathUtils.damp(vehicle.sideSlip, 0, 6.5, dt);

      const lateralVel = vehicle.velocity.dot(s.normal);
      if (lateralVel * lateral > 0) {
        vehicle.velocity.addScaledVector(s.normal, -lateralVel * 0.78);
      }
    }
  }
}
