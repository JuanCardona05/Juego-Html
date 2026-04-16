import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";
import { getCharacterModel } from "./CharacterModels.js";
import { getVehicleModel } from "./VehicleModels.js";

const STEER_Y_SIGN = -1;
const CHARACTER_IDS = ["cat", "dog", "falcon", "panda", "monkey", "rabbit"];
const VEHICLE_IDS = ["speedster", "stable", "offroad", "formula", "truck", "buggy"];

const CHARACTER_PROFILE = {
  cat: {
    maxSpeed: 4,
    boostMaxSpeed: 4,
    accel: 0,
    steerRate: 0,
    normalGrip: 0,
    hitRecovery: 1.0,
  },
  dog: {
    maxSpeed: 0,
    boostMaxSpeed: 0,
    accel: 0,
    steerRate: 0.35,
    driftSteerRate: 0.2,
    normalGrip: 0.45,
    driftGrip: 0.35,
    hitRecovery: 1.0,
  },
  falcon: {
    maxSpeed: -1,
    boostMaxSpeed: -1,
    accel: 5.2,
    brake: 1.5,
    steerRate: 0.1,
    normalGrip: -0.2,
    hitRecovery: 1.2,
  },
  panda: {
    maxSpeed: -3,
    boostMaxSpeed: -2,
    accel: -1,
    brake: 3,
    steerRate: 0.25,
    normalGrip: 0.7,
    driftGrip: 0.45,
    hitRecovery: 0.72,
  },
  monkey: {
    maxSpeed: 1,
    boostMaxSpeed: 1,
    accel: 2,
    brake: 1,
    steerRate: 0.18,
    normalGrip: 0.2,
    driftGrip: 0.1,
    hitRecovery: 1.0,
  },
  rabbit: {
    maxSpeed: 2,
    boostMaxSpeed: 3,
    accel: 1,
    brake: 1,
    steerRate: 0.5,
    driftSteerRate: 0.3,
    normalGrip: 0.5,
    driftGrip: 0.25,
    hitRecovery: 0.9,
  },
};

const VEHICLE_PROFILE = {
  speedster: {
    maxSpeed: 6,
    boostMaxSpeed: 8,
    accel: 0,
    steerRate: -0.25,
    driftGrip: -0.3,
  },
  stable: {
    maxSpeed: -2,
    boostMaxSpeed: -1,
    accel: 2,
    steerRate: 0.15,
    normalGrip: 0.5,
  },
  offroad: {
    maxSpeed: -4,
    boostMaxSpeed: -2,
    accel: 4.4,
    brake: 2.5,
    steerRate: 0.2,
    normalGrip: 1.1,
    driftGrip: 0.45,
  },
  formula: {
    maxSpeed: 9,
    boostMaxSpeed: 12,
    accel: 1.4,
    brake: -0.8,
    steerRate: -0.45,
    driftSteerRate: -0.25,
    normalGrip: -0.85,
    driftGrip: -0.6,
  },
  truck: {
    maxSpeed: -3,
    boostMaxSpeed: -2,
    accel: 3.0,
    brake: 4,
    steerRate: -0.15,
    normalGrip: 0.9,
    driftGrip: 0.3,
    hitRecovery: 1.3,
  },
  buggy: {
    maxSpeed: 2,
    boostMaxSpeed: 4,
    accel: 3.5,
    brake: 1,
    steerRate: 0.35,
    driftSteerRate: 0.25,
    normalGrip: 0.6,
    driftGrip: 0.2,
  },
};

function applyStatDelta(base, delta = {}) {
  for (const [key, value] of Object.entries(delta)) {
    if (typeof base[key] === "number") base[key] += value;
  }
}

function pickPaint(vehicleId) {
  if (vehicleId === "formula") return { trim: 0x0b132b, accent: 0xf8f32b, wheel: 0x0f1115 };
  if (vehicleId === "offroad") return { trim: 0x2f3e46, accent: 0xe76f51, wheel: 0x1f2428 };
  if (vehicleId === "stable") return { trim: 0x355070, accent: 0x99d98c, wheel: 0x111111 };
  return { trim: 0x283447, accent: 0x00e5ff, wheel: 0x121212 };
}

function applyStickerToonLook(root, options = {}) {
  const edgeColor = options.edgeColor ?? 0x262b35;
  const edgeOpacity = options.edgeOpacity ?? 0.92;

  const maxMetalness = options.maxMetalness ?? 0.2;
  const minRoughness = options.minRoughness ?? 0.42;
  const maxOutlinedMeshes = options.maxOutlinedMeshes ?? 24;
  const edgeThreshold = options.edgeThreshold ?? 24;
  const edgeWidthScale = options.edgeWidthScale ?? 1;

  let outlined = 0;
  root.traverse((obj) => {
    if (!obj.isMesh) return;

    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((mat) => {
        if (!mat?.clone) return mat;
        const next = mat.clone();
        if (typeof next.metalness === "number") next.metalness = Math.min(next.metalness, maxMetalness);
        if (typeof next.roughness === "number") next.roughness = Math.max(next.roughness, minRoughness);
        if (typeof next.envMapIntensity === "number") next.envMapIntensity = Math.min(next.envMapIntensity, 0.4);
        next.flatShading = true;
        next.needsUpdate = true;
        return next;
      });
    } else if (obj.material?.clone) {
      const next = obj.material.clone();
      if (typeof next.metalness === "number") next.metalness = Math.min(next.metalness, maxMetalness);
      if (typeof next.roughness === "number") next.roughness = Math.max(next.roughness, minRoughness);
      if (typeof next.envMapIntensity === "number") next.envMapIntensity = Math.min(next.envMapIntensity, 0.4);
      next.flatShading = true;
      next.needsUpdate = true;
      obj.material = next;
    }

    if (outlined < maxOutlinedMeshes && obj.geometry) {
      let skipEdge = false;
      if (!Array.isArray(obj.material) && obj.material?.transparent) skipEdge = true;
      if (Array.isArray(obj.material) && obj.material.some((m) => m?.transparent)) skipEdge = true;

      if (!skipEdge) {
        const edges = new THREE.EdgesGeometry(obj.geometry, edgeThreshold);
        if (edges.attributes.position && edges.attributes.position.count > 0) {
          const edgeMat = new THREE.LineBasicMaterial({
            color: edgeColor,
            transparent: true,
            opacity: edgeOpacity,
            depthWrite: false,
          });
          const lines = new THREE.LineSegments(edges, edgeMat);
          lines.renderOrder = 2;
          lines.scale.setScalar(1.0008 * edgeWidthScale);
          lines.raycast = () => {};
          obj.add(lines);
          outlined += 1;
        }
      }
    }
  });
}

function buildMascotKart(vehicleId, colorHex) {
  const group = new THREE.Group();
  const bodyColor = new THREE.Color(colorHex);
  const trimColor = vehicleId === "formula" ? 0xffffff : vehicleId === "offroad" ? 0xffd166 : vehicleId === "truck" ? 0xe1e6f0 : 0xd9f2ff;

  const sizeByVehicle = {
    speedster: { w: 3.7, h: 0.78, d: 5.5, wing: 4.7, wheelR: 0.62 },
    stable: { w: 3.85, h: 0.82, d: 5.8, wing: 4.8, wheelR: 0.64 },
    offroad: { w: 4.05, h: 0.9, d: 5.9, wing: 5.0, wheelR: 0.7 },
    formula: { w: 3.5, h: 0.7, d: 6.1, wing: 5.2, wheelR: 0.58 },
    truck: { w: 4.15, h: 0.95, d: 6.0, wing: 5.1, wheelR: 0.76 },
    buggy: { w: 3.8, h: 0.82, d: 5.7, wing: 4.9, wheelR: 0.66 },
  };
  const k = sizeByVehicle[vehicleId] || sizeByVehicle.stable;

  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.52, metalness: 0.08, flatShading: true });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.5, metalness: 0.04, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2f3b4b, roughness: 0.65, metalness: 0.05, flatShading: true });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xfff1a8, roughness: 0.5, metalness: 0.04, flatShading: true });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(k.w, k.h, k.d), bodyMat);
  floor.position.y = 0.92;
  floor.castShadow = true;
  floor.receiveShadow = true;
  group.add(floor);

  const sidePodL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 2.9), darkMat);
  sidePodL.position.set(k.w * 0.33, 1.0, -0.35);
  sidePodL.castShadow = true;
  group.add(sidePodL);
  const sidePodR = sidePodL.clone();
  sidePodR.position.x *= -1;
  group.add(sidePodR);

  const cockpit = new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 0.38, 4, 8), trimMat);
  cockpit.position.set(0, 1.42, 0.05);
  cockpit.scale.set(1.15, 0.9, 1.3);
  cockpit.castShadow = true;
  group.add(cockpit);

  const nose = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 0.56, 4, 8), bodyMat);
  nose.position.set(0, 1.0, k.d * 0.44);
  nose.rotation.x = Math.PI * 0.5;
  nose.scale.set(0.92, 1.15, 1.0);
  nose.castShadow = true;
  group.add(nose);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 1.9), trimMat);
  stripe.position.set(0, 1.2, k.d * 0.42);
  group.add(stripe);

  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(k.w * 1.02, 0.22, 0.42), bodyMat);
  frontWing.position.set(0, 0.6, k.d * 0.53);
  frontWing.castShadow = true;
  group.add(frontWing);

  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(k.wing, 0.28, 0.46), bodyMat);
  rearWing.position.set(0, 1.95, -k.d * 0.5 - 0.12);
  rearWing.castShadow = true;
  group.add(rearWing);

  const rearWingSupport = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.28), darkMat);
  rearWingSupport.position.set(0, 1.45, -k.d * 0.45);
  rearWingSupport.castShadow = true;
  group.add(rearWingSupport);

  // Variantes visuales claras por vehículo para que se note el cambio.
  if (vehicleId === "formula") {
    const noseTip = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 8), trimMat);
    noseTip.position.set(0, 1.0, k.d * 0.58);
    noseTip.rotation.x = Math.PI * 0.5;
    noseTip.castShadow = true;
    group.add(noseTip);

    const sideWingL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 1.3), trimMat);
    sideWingL.position.set(k.w * 0.44, 0.78, k.d * 0.28);
    group.add(sideWingL);
    const sideWingR = sideWingL.clone();
    sideWingR.position.x *= -1;
    group.add(sideWingR);
  } else if (vehicleId === "offroad") {
    const rollbarL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.25, 6), darkMat);
    rollbarL.position.set(-0.95, 1.75, -0.1);
    group.add(rollbarL);
    const rollbarR = rollbarL.clone();
    rollbarR.position.x = 0.95;
    group.add(rollbarR);

    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.14, 1.25), trimMat);
    rack.position.set(0, 2.28, -0.1);
    group.add(rack);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(k.w * 1.05, 0.28, 0.46), darkMat);
    bumper.position.set(0, 0.58, k.d * 0.54);
    group.add(bumper);
  } else if (vehicleId === "truck") {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.1, 1.45), trimMat);
    cabin.position.set(0, 1.75, 0.62);
    cabin.castShadow = true;
    group.add(cabin);

    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.7, 2.6), darkMat);
    bed.position.set(0, 1.22, -1.55);
    bed.castShadow = true;
    group.add(bed);
  } else if (vehicleId === "buggy") {
    const cageL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 6), darkMat);
    cageL.position.set(-0.85, 1.8, -0.1);
    cageL.rotation.z = Math.PI * 0.08;
    group.add(cageL);
    const cageR = cageL.clone();
    cageR.position.x = 0.85;
    cageR.rotation.z = -Math.PI * 0.08;
    group.add(cageR);

    const spare = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.16, 8, 12), darkMat);
    spare.position.set(0, 1.5, -2.18);
    spare.rotation.y = Math.PI * 0.5;
    group.add(spare);
  } else if (vehicleId === "stable") {
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(k.w * 0.95, 0.2, 0.38), trimMat);
    bumperF.position.set(0, 0.58, k.d * 0.55);
    group.add(bumperF);

    const bumperR = new THREE.Mesh(new THREE.BoxGeometry(k.w * 0.9, 0.2, 0.36), trimMat);
    bumperR.position.set(0, 0.62, -k.d * 0.55);
    group.add(bumperR);
  } else {
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 1.6), trimMat);
    finL.position.set(k.w * 0.44, 1.02, 0.25);
    group.add(finL);
    const finR = finL.clone();
    finR.position.x *= -1;
    group.add(finR);
  }

  // Firma visual trasera por tipo para distinguirlos desde la cámara de juego.
  if (vehicleId === "speedster") {
    const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.24), accentMat);
    tailBlade.position.set(0, 1.35, -k.d * 0.58);
    group.add(tailBlade);
  } else if (vehicleId === "stable") {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.58, 1.15), trimMat);
    trunk.position.set(0, 1.28, -k.d * 0.43);
    group.add(trunk);
  } else if (vehicleId === "offroad") {
    const rearSpare = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 8, 12), darkMat);
    rearSpare.position.set(0, 1.52, -k.d * 0.56);
    rearSpare.rotation.y = Math.PI * 0.5;
    group.add(rearSpare);
  } else if (vehicleId === "formula") {
    const centerFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.92, 0.24), trimMat);
    centerFin.position.set(0, 1.65, -k.d * 0.5);
    group.add(centerFin);
  } else if (vehicleId === "truck") {
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.28, 0.22), accentMat);
    bedFrame.position.set(0, 1.52, -k.d * 0.62);
    group.add(bedFrame);
  } else if (vehicleId === "buggy") {
    const rearBar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.42), darkMat);
    rearBar.position.set(0, 1.45, -k.d * 0.58);
    group.add(rearBar);
  }

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2a313d, roughness: 0.92, metalness: 0.02, flatShading: true });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x8f7a2a, roughness: 0.44, metalness: 0.38, flatShading: true });
  const wheelGeo = new THREE.CylinderGeometry(k.wheelR, k.wheelR, 0.6, 10);
  const rearWheelPos = [
    [k.w * 0.42, 0.68, -k.d * 0.36],
    [-k.w * 0.42, 0.68, -k.d * 0.36],
    [k.w * 0.34, 0.66, k.d * 0.33],
    [-k.w * 0.34, 0.66, k.d * 0.33],
  ];

  for (const [x, y, z] of rearWheelPos) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI * 0.5;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(k.wheelR * 0.45, k.wheelR * 0.45, 0.64, 8), rimMat);
    rim.rotation.z = Math.PI * 0.5;
    rim.position.set(x, y, z);
    group.add(rim);
  }

  return { group, wheel: k };
}

function buildMascotDriver(characterId) {
  const root = new THREE.Group();
  const palette = {
    cat: { fur: 0xf39a1f, accent: 0xffffff, ear: 0xf36f21 },
    dog: { fur: 0xb68655, accent: 0xf2e2cc, ear: 0x8f5f3d },
    falcon: { fur: 0xa7b8ca, accent: 0xf2f5f8, ear: 0x6e87a1 },
    panda: { fur: 0xf2f2f2, accent: 0x1e1f22, ear: 0x1b1b1d },
    monkey: { fur: 0xc39050, accent: 0xf0dcc3, ear: 0x9b6a35 },
    rabbit: { fur: 0xf8f5fb, accent: 0xf0bfdc, ear: 0xff8fc1 },
  };
  const c = palette[characterId] || palette.cat;

  const suit = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 0.32, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e485c, roughness: 0.58, metalness: 0.06, flatShading: true })
  );
  suit.position.set(0, 0.6, 0.02);
  suit.castShadow = true;
  root.add(suit);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 12, 10),
    new THREE.MeshStandardMaterial({ color: c.fur, roughness: 0.62, metalness: 0.04, flatShading: true })
  );
  head.position.set(0, 1.42, 0.04);
  head.castShadow = true;
  root.add(head);

  if (characterId !== "falcon") {
    const muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 8),
      new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.64, metalness: 0.02, flatShading: true })
    );
    muzzle.position.set(0, 1.14, 0.42);
    muzzle.scale.set(1.04, 0.82, 0.72);
    root.add(muzzle);
  }

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.48, metalness: 0.03, flatShading: true });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
  eyeL.position.set(-0.15, 1.34, 0.46);
  root.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.15;
  root.add(eyeR);

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x6d4d31, roughness: 0.46, metalness: 0.08, flatShading: true })
  );
  nose.position.set(0, 1.2, 0.56);
  if (characterId !== "falcon") root.add(nose);

  const earMat = new THREE.MeshStandardMaterial({ color: c.ear, roughness: 0.58, metalness: 0.03, flatShading: true });

  if (characterId === "cat") {
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.36, 6), earMat);
    earL.position.set(-0.33, 1.82, 0.04);
    earL.rotation.z = Math.PI * 0.08;
    root.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.33;
    earR.rotation.z = -Math.PI * 0.08;
    root.add(earR);
  } else if (characterId === "dog") {
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.34), new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.64, metalness: 0.02, flatShading: true }));
    snout.position.set(0, 1.14, 0.56);
    root.add(snout);

    const earL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.16, 3, 6), earMat);
    earL.position.set(-0.34, 1.62, 0.08);
    earL.rotation.z = Math.PI * 0.18;
    root.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.34;
    earR.rotation.z = -Math.PI * 0.18;
    root.add(earR);
  } else if (characterId === "falcon") {
    head.scale.set(1.0, 0.92, 0.86);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 6), new THREE.MeshStandardMaterial({ color: 0xffb000, roughness: 0.45, metalness: 0.08, flatShading: true }));
    beak.position.set(0, 1.2, 0.64);
    beak.rotation.x = Math.PI * 0.5;
    root.add(beak);

    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 5), earMat);
    crest.position.set(0, 1.8, -0.02);
    root.add(crest);
  } else if (characterId === "panda") {
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x1f2023, roughness: 0.64, metalness: 0.02, flatShading: true });
    const patchL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), patchMat);
    patchL.position.set(-0.18, 1.34, 0.42);
    patchL.scale.set(1.1, 0.9, 0.5);
    root.add(patchL);
    const patchR = patchL.clone();
    patchR.position.x = 0.18;
    root.add(patchR);

    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), earMat);
    earL.position.set(-0.34, 1.72, 0.03);
    root.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.34;
    root.add(earR);
  } else if (characterId === "rabbit") {
    const earL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.34, 3, 7), earMat);
    earL.position.set(-0.2, 2.02, 0.02);
    earL.scale.set(0.95, 1.45, 0.95);
    earL.rotation.z = Math.PI * 0.05;
    root.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.2;
    earR.rotation.z = -Math.PI * 0.05;
    root.add(earR);
  } else {
    // monkey se mantiene con oreja corta, que fue el personaje validado visualmente.
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), earMat);
    earL.position.set(-0.31, 1.55, 0.02);
    root.add(earL);
    const earR = earL.clone();
    earR.position.x = 0.31;
    root.add(earR);
  }

  const handMat = new THREE.MeshStandardMaterial({ color: c.fur, roughness: 0.62, metalness: 0.02, flatShading: true });
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), handMat);
  handL.position.set(-0.24, 0.88, 0.32);
  root.add(handL);
  const handR = handL.clone();
  handR.position.x = 0.24;
  root.add(handR);

  // Rasgos visibles desde atrás para distinguir personajes en carrera.
  if (characterId === "cat") {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.62, 6), new THREE.MeshStandardMaterial({ color: c.ear, roughness: 0.6, metalness: 0.02, flatShading: true }));
    tail.position.set(0, 0.92, -0.38);
    tail.rotation.x = Math.PI * 0.38;
    root.add(tail);
  } else if (characterId === "dog") {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.56, 6), new THREE.MeshStandardMaterial({ color: c.ear, roughness: 0.6, metalness: 0.02, flatShading: true }));
    tail.position.set(0, 0.92, -0.36);
    tail.rotation.x = Math.PI * 0.28;
    root.add(tail);
  } else if (characterId === "falcon") {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x5f738a, roughness: 0.58, metalness: 0.03, flatShading: true });
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.78), wingMat);
    wingL.position.set(-0.36, 0.98, -0.08);
    wingL.rotation.z = Math.PI * 0.14;
    root.add(wingL);
    const wingR = wingL.clone();
    wingR.position.x = 0.36;
    wingR.rotation.z = -Math.PI * 0.14;
    root.add(wingR);
  } else if (characterId === "panda") {
    const pandaEarMat = new THREE.MeshStandardMaterial({ color: 0x1f2023, roughness: 0.62, metalness: 0.02, flatShading: true });
    const earBackL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), pandaEarMat);
    earBackL.position.set(-0.36, 1.75, -0.08);
    root.add(earBackL);
    const earBackR = earBackL.clone();
    earBackR.position.x = 0.36;
    root.add(earBackR);
  } else if (characterId === "rabbit") {
    const rearEarMat = new THREE.MeshStandardMaterial({ color: 0xf3d4e6, roughness: 0.6, metalness: 0.02, flatShading: true });
    const earBackL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.26, 3, 7), rearEarMat);
    earBackL.position.set(-0.18, 2.15, -0.05);
    earBackL.scale.set(0.9, 1.35, 0.9);
    root.add(earBackL);
    const earBackR = earBackL.clone();
    earBackR.position.x = 0.18;
    root.add(earBackR);
  }

  return root;
}

export function randomCharacterId() {
  return CHARACTER_IDS[(Math.random() * CHARACTER_IDS.length) | 0];
}

export function randomVehicleId() {
  return VEHICLE_IDS[(Math.random() * VEHICLE_IDS.length) | 0];
}

export function buildPlayerStats(characterId, vehicleId) {
  const base = {
    maxSpeed: 58,
    boostMaxSpeed: 86,
    accel: 34,
    brake: 39,
    drag: 5.0,
    steerRate: 2.2,
    driftSteerRate: 2.82,
    normalGrip: 7.7,
    driftGrip: 2.1,
    driftSpeedThreshold: 18,
    hitRecovery: 1,
  };

  applyStatDelta(base, VEHICLE_PROFILE[vehicleId] || VEHICLE_PROFILE.stable);
  applyStatDelta(base, CHARACTER_PROFILE[characterId] || CHARACTER_PROFILE.dog);

  return base;
}

export function createVehicleMesh(scene, vehicleId, colorHex) {
  // Usar modelos mejorados para todos los vehículos cuando estén disponibles.
  try {
    const vehicle = getVehicleModel(vehicleId, colorHex);
    applyStickerToonLook(vehicle, { maxOutlinedMeshes: 30, edgeThreshold: 22, edgeWidthScale: 1.02, maxMetalness: 0.24, minRoughness: 0.36 });
    vehicle.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    scene.add(vehicle);

    const wheelAnchorByVehicle = {
      speedster: { x: 1.76, y: 0.62, z: 1.9 },
      stable: { x: 1.72, y: 0.6, z: 1.9 },
      offroad: { x: 1.85, y: 0.75, z: 1.8 },
      formula: { x: 1.82, y: 0.58, z: 2.22 },
      truck: { x: 1.95, y: 0.88, z: 2.15 },
      buggy: { x: 1.78, y: 0.7, z: 1.95 },
    };
    const ws = wheelAnchorByVehicle[vehicleId] || wheelAnchorByVehicle.stable;
    vehicle.userData.rearWheelLocal = [
      new THREE.Vector3(ws.x, ws.y, -ws.z + 0.04),
      new THREE.Vector3(-ws.x, ws.y, -ws.z + 0.04),
    ];

    const headlightBeams = [];
    const headlightTargets = [];
    for (let i = 0; i < 2; i++) {
      const beam = new THREE.Object3D();
      const target = new THREE.Object3D();
      headlightBeams.push(beam);
      headlightTargets.push(target);
    }
    vehicle.userData.headlightBeams = headlightBeams;
    vehicle.userData.headlightTargets = headlightTargets;

    return vehicle;
  } catch (e) {
    console.warn("VehicleModel fallback:", vehicleId, e);
  }

  // Código original para vehículos existentes
  const color = new THREE.Color(colorHex);
  const paint = pickPaint(vehicleId);
  const group = new THREE.Group();

  const vehicleShape = vehicleId === "speedster"
    ? { w: 3.8, h: 0.85, d: 5.9, hood: 2.6, wheelRadius: 0.62, wheelWidth: 0.58, wheelY: 0.58, wheelX: 1.72, wheelZ: 1.9 }
    : vehicleId === "offroad"
      ? { w: 3.6, h: 1.2, d: 5.5, hood: 2.2, wheelRadius: 0.72, wheelWidth: 0.62, wheelY: 0.66, wheelX: 1.76, wheelZ: 1.84 }
      : vehicleId === "formula"
        ? { w: 3.3, h: 0.72, d: 6.4, hood: 3.0, wheelRadius: 0.58, wheelWidth: 0.56, wheelY: 0.52, wheelX: 1.68, wheelZ: 2.22 }
        : { w: 3.4, h: 1.0, d: 5.2, hood: 1.9, wheelRadius: 0.64, wheelWidth: 0.58, wheelY: 0.6, wheelX: 1.72, wheelZ: 1.9 };

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(vehicleShape.w, vehicleShape.h, vehicleShape.d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.22, metalness: 0.54, envMapIntensity: 0.7, flatShading: true })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.75, vehicleShape.hood),
    new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.28, metalness: 0.35, envMapIntensity: 0.65, flatShading: true })
  );
  roof.position.set(0, vehicleId === "formula" ? 1.42 : 1.63, vehicleId === "formula" ? 0.9 : 1.2);
  roof.castShadow = true;
  group.add(roof);

  const rear = new THREE.Mesh(
    new THREE.BoxGeometry(vehicleId === "formula" ? 2.1 : 2.5, 0.7, vehicleId === "formula" ? 2.8 : 1.8),
    new THREE.MeshStandardMaterial({ color: paint.trim, roughness: 0.38, metalness: 0.42, envMapIntensity: 0.55, flatShading: true })
  );
  rear.position.set(0, 1.4, vehicleId === "formula" ? -1.5 : -1.85);
  rear.castShadow = true;
  group.add(rear);

  const frontNose = new THREE.Mesh(
    new THREE.BoxGeometry(vehicleId === "formula" ? 1.0 : 1.6, 0.42, vehicleId === "formula" ? 2.1 : 1.1),
    new THREE.MeshStandardMaterial({ color: paint.accent, roughness: 0.24, metalness: 0.46, envMapIntensity: 0.72, flatShading: true })
  );
  frontNose.position.set(0, 1.02, vehicleId === "formula" ? 3.0 : 2.6);
  frontNose.castShadow = true;
  group.add(frontNose);

  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(vehicleId === "formula" ? 3.1 : 3.4, 0.2, 0.26),
    new THREE.MeshStandardMaterial({ color: paint.trim, roughness: 0.32, metalness: 0.46, envMapIntensity: 0.58, flatShading: true })
  );
  spoiler.position.set(0, vehicleId === "formula" ? 1.82 : 2.15, vehicleId === "formula" ? -3.08 : -2.82);
  spoiler.castShadow = true;
  group.add(spoiler);

  const sideFinL = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.5, 2.4),
    new THREE.MeshStandardMaterial({ color: paint.trim, roughness: 0.38, metalness: 0.34, envMapIntensity: 0.5, flatShading: true })
  );
  sideFinL.position.set(vehicleShape.w * 0.5 + 0.08, 1.08, 0.1);
  group.add(sideFinL);
  const sideFinR = sideFinL.clone();
  sideFinR.position.x *= -1;
  group.add(sideFinR);

  const wheelGeo = new THREE.CylinderGeometry(vehicleShape.wheelRadius, vehicleShape.wheelRadius, vehicleShape.wheelWidth, 14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: paint.wheel, roughness: 0.94, flatShading: true });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xeae6da, roughness: 0.22, metalness: 0.76, envMapIntensity: 0.85, flatShading: true });

  const wheelOffsets = [
    [vehicleShape.wheelX, vehicleShape.wheelY, vehicleShape.wheelZ],
    [-vehicleShape.wheelX, vehicleShape.wheelY, vehicleShape.wheelZ],
    [vehicleShape.wheelX, vehicleShape.wheelY, -vehicleShape.wheelZ],
    [-vehicleShape.wheelX, vehicleShape.wheelY, -vehicleShape.wheelZ],
  ];

  for (const [x, y, z] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI * 0.5;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(vehicleShape.wheelRadius * 0.48, vehicleShape.wheelRadius * 0.48, vehicleShape.wheelWidth + 0.02, 10), rimMat);
    rim.rotation.z = Math.PI * 0.5;
    rim.position.set(x, y, z);
    rim.castShadow = true;
    group.add(rim);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(vehicleShape.wheelRadius * 0.18, vehicleShape.wheelRadius * 0.18, vehicleShape.wheelWidth + 0.08, 8),
      new THREE.MeshStandardMaterial({ color: paint.trim, roughness: 0.5, metalness: 0.24, flatShading: true })
    );
    hub.rotation.z = Math.PI * 0.5;
    hub.position.set(x, y, z);
    group.add(hub);

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(vehicleShape.wheelRadius * 0.3, vehicleShape.wheelRadius * 0.3, 0.08, 10),
      new THREE.MeshStandardMaterial({ color: 0xb7bfcb, roughness: 0.28, metalness: 0.82, flatShading: true })
    );
    disc.rotation.z = Math.PI * 0.5;
    disc.position.set(x, y, z);
    group.add(disc);
  }

  const neonColor = vehicleId === "speedster" ? 0x00e5ff : vehicleId === "formula" ? 0xf7f06d : vehicleId === "offroad" ? 0xff8c42 : 0x80ff72;
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.12, 4.8),
    new THREE.MeshStandardMaterial({ color: neonColor, emissive: neonColor, emissiveIntensity: 0.24, roughness: 0.4, flatShading: true })
  );
  neon.position.y = vehicleId === "offroad" ? 0.56 : 0.48;
  group.add(neon);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(vehicleShape.w * 0.76, 0.34, vehicleShape.hood * 0.56),
    new THREE.MeshStandardMaterial({
      color: 0x94c4ff,
      roughness: 0.04,
      metalness: 0.08,
      envMapIntensity: 1.1,
      transparent: true,
      opacity: 0.5,
      flatShading: true,
    })
  );
  windshield.position.set(0, vehicleId === "formula" ? 1.25 : 1.55, vehicleId === "formula" ? 1.68 : 1.34);
  windshield.rotation.x = -Math.PI * 0.1;
  windshield.castShadow = true;
  group.add(windshield);

  const mirrorMat = new THREE.MeshStandardMaterial({ color: paint.trim, roughness: 0.42, metalness: 0.35, flatShading: true });
  const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.34), mirrorMat);
  mirrorL.position.set(vehicleShape.w * 0.42, 1.44, 1.1);
  group.add(mirrorL);
  const mirrorR = mirrorL.clone();
  mirrorR.position.x *= -1;
  group.add(mirrorR);

  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(vehicleShape.w * 0.62, 0.22, 0.34),
    new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.56, metalness: 0.2, flatShading: true })
  );
  diffuser.position.set(0, 0.58, -vehicleShape.d * 0.5 - 0.08);
  group.add(diffuser);

  const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.38, 8);
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xaeb7c1, roughness: 0.24, metalness: 0.88, flatShading: true });
  const exhaustL = new THREE.Mesh(exhaustGeo, exhaustMat);
  exhaustL.rotation.x = Math.PI * 0.5;
  exhaustL.position.set(vehicleShape.w * 0.23, 0.66, -vehicleShape.d * 0.5 - 0.2);
  group.add(exhaustL);
  const exhaustR = exhaustL.clone();
  exhaustR.position.x *= -1;
  group.add(exhaustR);

  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfff7dd,
    emissive: 0xffdc8a,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.55,
    flatShading: true,
  });

  const headlightOffsets = [
    new THREE.Vector3(vehicleShape.w * 0.26, 1.08, vehicleShape.d * 0.5 + 0.02),
    new THREE.Vector3(-vehicleShape.w * 0.26, 1.08, vehicleShape.d * 0.5 + 0.02),
  ];

  const headlightBeams = [];
  const headlightTargets = [];

  for (const offset of headlightOffsets) {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), headlightMat);
    lens.position.copy(offset);
    lens.castShadow = false;
    group.add(lens);

    const beam = new THREE.SpotLight(0xfff2c4, 2.4, 95, Math.PI * 0.2, 0.42, 1.7);
    beam.position.copy(offset);
    beam.castShadow = false;
    const beamTarget = new THREE.Object3D();
    beamTarget.position.copy(offset).add(new THREE.Vector3(0, -0.12, 20));
    group.add(beamTarget);
    beam.target = beamTarget;
    group.add(beam);
    headlightBeams.push(beam);
    headlightTargets.push(beamTarget);
  }

  group.userData.rearWheelLocal = [
    new THREE.Vector3(vehicleShape.wheelX, vehicleShape.wheelY - 0.03, -vehicleShape.wheelZ + 0.04),
    new THREE.Vector3(-vehicleShape.wheelX, vehicleShape.wheelY - 0.03, -vehicleShape.wheelZ + 0.04),
  ];
  group.userData.headlightBeams = headlightBeams;
  group.userData.headlightTargets = headlightTargets;

  applyStickerToonLook(group, { maxOutlinedMeshes: 26, edgeThreshold: 22, edgeWidthScale: 1.02, maxMetalness: 0.22, minRoughness: 0.4 });

  scene.add(group);
  return group;
}

export function createDriver(characterId) {
  const root = new THREE.Group();

  try {
    const model = getCharacterModel(characterId);
    model.scale.setScalar(0.78);
    model.position.set(0, 0.02, 0.02);
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    root.add(model);

    applyStickerToonLook(root, { maxOutlinedMeshes: 20, edgeThreshold: 24, edgeWidthScale: 1.03, maxMetalness: 0.12, minRoughness: 0.52 });

    return root;
  } catch (e) {
    console.warn("CharacterModel fallback:", characterId, e);
  }

  const isCat = characterId === "cat";
  const isDog = characterId === "dog";
  const isFalcon = characterId === "falcon";
  const isPanda = characterId === "panda";

  const bodyColor = isCat ? 0xf2c38b : isDog ? 0xc1a07a : isFalcon ? 0x9fb4c9 : 0x2d2f36;
  const headColor = isCat ? 0xf5cc95 : isDog ? 0xd2b08f : isFalcon ? 0xbfd3e6 : 0xf0f0f0;

  const torsoGeo = isFalcon ? new THREE.CapsuleGeometry(0.52, 0.54, 3, 8) : new THREE.SphereGeometry(isPanda ? 0.72 : 0.66, 12, 10);

  const body = new THREE.Mesh(
    torsoGeo,
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.88, flatShading: true })
  );
  body.position.y = isFalcon ? 0.45 : 0.35;
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(isFalcon ? 0.52 : 0.56, 12, 10),
    new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.86, flatShading: true })
  );
  head.position.y = 1.1;
  head.castShadow = true;
  root.add(head);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(isFalcon ? 0.6 : 0.63, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf3f6fa, roughness: 0.35, metalness: 0.18, flatShading: true })
  );
  helmet.position.y = 1.12;
  helmet.scale.set(1.02, 0.96, 1.0);
  helmet.castShadow = true;
  root.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(isFalcon ? 0.5 : 0.53, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
    new THREE.MeshStandardMaterial({ color: 0x7eb5ff, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.42, flatShading: true })
  );
  visor.position.set(0, 1.04, 0.06);
  visor.scale.set(1.0, 0.72, 0.92);
  root.add(visor);

  if (isCat) {
    const earL = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.42, 4),
      new THREE.MeshStandardMaterial({ color: 0xd39b62, roughness: 0.86, flatShading: true })
    );
    earL.position.set(-0.28, 1.58, 0.03);
    earL.rotation.z = Math.PI * 0.08;
    root.add(earL);

    const earR = earL.clone();
    earR.position.x = 0.28;
    earR.rotation.z = -Math.PI * 0.08;
    root.add(earR);
  } else if (isDog) {
    const earL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x8c6a4f, roughness: 0.86, flatShading: true })
    );
    earL.position.set(-0.26, 1.52, 0.12);
    earL.rotation.z = Math.PI * 0.15;
    root.add(earL);

    const earR = earL.clone();
    earR.position.x = 0.26;
    earR.rotation.z = -Math.PI * 0.15;
    root.add(earR);

    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.22, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xe7d6bf, roughness: 0.88, flatShading: true })
    );
    snout.position.set(0, 0.96, 0.52);
    root.add(snout);
  } else if (isFalcon) {
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.42, 4),
      new THREE.MeshStandardMaterial({ color: 0xf2a900, roughness: 0.6, flatShading: true })
    );
    beak.rotation.x = Math.PI * 0.5;
    beak.position.set(0, 1.02, 0.58);
    root.add(beak);

    const crest = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.34, 4),
      new THREE.MeshStandardMaterial({ color: 0x4d6a87, roughness: 0.74, flatShading: true })
    );
    crest.position.set(0, 1.56, -0.04);
    root.add(crest);
  } else if (isPanda) {
    const earL = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x23252b, roughness: 0.82, flatShading: true })
    );
    earL.position.set(-0.3, 1.5, 0.02);
    root.add(earL);

    const earR = earL.clone();
    earR.position.x = 0.3;
    root.add(earR);

    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.18, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.86, flatShading: true })
    );
    snout.position.set(0, 0.98, 0.52);
    root.add(snout);
  }

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.6, flatShading: true });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
  eyeL.position.set(-0.15, 1.13, 0.5);
  root.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.15;
  root.add(eyeR);

  const browColor = isPanda ? 0x1f2126 : isFalcon ? 0x37516a : 0x6f4e37;
  const brow = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.05, 0.05),
    new THREE.MeshStandardMaterial({ color: browColor, roughness: 0.88, flatShading: true })
  );
  brow.position.set(-0.14, 1.22, 0.5);
  root.add(brow);
  const browR = brow.clone();
  browR.position.x = 0.14;
  root.add(browR);

  const pawL = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.88, flatShading: true })
  );
  pawL.position.set(-0.22, 0.68, 0.46);
  root.add(pawL);

  const pawR = pawL.clone();
  pawR.position.x = 0.22;
  root.add(pawR);

  const gloveMat = new THREE.MeshStandardMaterial({ color: 0x2f3c4a, roughness: 0.6, metalness: 0.08, flatShading: true });
  const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), gloveMat);
  gloveL.position.copy(pawL.position).add(new THREE.Vector3(0, -0.03, 0.05));
  root.add(gloveL);
  const gloveR = gloveL.clone();
  gloveR.position.copy(pawR.position).add(new THREE.Vector3(0, -0.03, 0.05));
  root.add(gloveR);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.12, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.58, metalness: 0.18, flatShading: true })
  );
  belt.position.set(0, 0.74, -0.2);
  root.add(belt);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.78, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xe71d36, roughness: 0.55, metalness: 0.04, flatShading: true })
  );
  backpack.position.set(0, 1.02, -0.58);
  backpack.castShadow = true;
  if (!isFalcon) root.add(backpack);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.13, 0.64),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, flatShading: true })
  );
  stripe.position.set(0, 1.16, -0.58);
  if (!isFalcon) root.add(stripe);

  if (isFalcon) {
    const wingL = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.45, 0.88),
      new THREE.MeshStandardMaterial({ color: 0x4d6a87, roughness: 0.84, flatShading: true })
    );
    wingL.position.set(-0.5, 0.96, -0.12);
    wingL.rotation.z = Math.PI * 0.12;
    root.add(wingL);

    const wingR = wingL.clone();
    wingR.position.x = 0.5;
    wingR.rotation.z = -Math.PI * 0.12;
    root.add(wingR);
  }

  applyStickerToonLook(root, { maxOutlinedMeshes: 20, edgeThreshold: 24, edgeWidthScale: 1.04, maxMetalness: 0.12, minRoughness: 0.52 });

  return root;
}

export class PlayerController {
  constructor(vehicle, stats) {
    this.vehicle = vehicle;
    this.stats = stats;
  }

  update(dt, keys, surfaceGripMultiplier = 1) {
    const v = this.vehicle;

    const up = keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0;
    const down = keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0;
    const left = keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0;
    const right = keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0;
    const driftKey = keys.has("Space");

    const throttle = up - down;

    if (throttle > 0) v.speed += this.stats.accel * dt;
    else if (throttle < 0) v.speed -= this.stats.brake * dt;
    else v.speed = THREE.MathUtils.damp(v.speed, 0, this.stats.drag, dt);

    if (v.boostTimer > 0) v.boostTimer -= dt;

    const driftLocked = driftKey || v.driftFactor > 0.22;
    if ((keys.has("ShiftLeft") || keys.has("ShiftRight")) && !driftLocked) {
      if (v.boostTimer <= 0 && v.turboEnergy >= 28) {
        v.boostTimer = 1.15;
        v.turboEnergy = Math.max(0, v.turboEnergy - 28);
      }
    }

    const top = v.boostTimer > 0 ? this.stats.boostMaxSpeed : this.stats.maxSpeed;
    v.speed = THREE.MathUtils.clamp(v.speed, -11, top);

    let steerInput = 0;
    if (left && !right) steerInput = -1;
    if (right && !left) steerInput = 1;

    const speedRatio = THREE.MathUtils.clamp(Math.abs(v.speed) / Math.max(top, 1), 0, 1);
    const wantsDrift = driftKey && Math.abs(steerInput) > 0.1 && Math.abs(v.speed) > this.stats.driftSpeedThreshold;

    const grip = (wantsDrift ? this.stats.driftGrip : this.stats.normalGrip) * surfaceGripMultiplier;
    const steerRate = wantsDrift ? this.stats.driftSteerRate : this.stats.steerRate;

    v.heading += steerInput * STEER_Y_SIGN * steerRate * speedRatio * dt;

    v.driftFactor = THREE.MathUtils.damp(v.driftFactor, wantsDrift ? 1 : 0, 8.5, dt);
    v.driftTimer = wantsDrift ? v.driftTimer + dt : 0;

    if (wantsDrift) {
      const chargeRate = 26 + Math.abs(steerInput) * 18;
      v.turboEnergy = THREE.MathUtils.clamp(v.turboEnergy + chargeRate * dt, 0, 100);
    }

    const forward = new THREE.Vector3(Math.sin(v.heading), 0, Math.cos(v.heading));
    const side = new THREE.Vector3(forward.z, 0, -forward.x);

    const sideTarget = steerInput * Math.abs(v.speed) * (0.22 + v.driftFactor * 0.54);
    v.sideSlip = THREE.MathUtils.damp(v.sideSlip, sideTarget, wantsDrift ? 2.1 : 7.2, dt);

    const desiredVel = forward.clone().multiplyScalar(v.speed).addScaledVector(side, v.sideSlip);
    const blend = 1 - Math.exp(-grip * dt);
    v.velocity.lerp(desiredVel, blend);

    v.position.addScaledVector(v.velocity, dt);

    if (v.mesh.userData.driverRoot) {
      const bob = Math.sin(performance.now() * 0.011) * (0.05 + v.driftFactor * 0.05);
      v.mesh.userData.driverRoot.position.y = 2.4 + bob;
      v.mesh.userData.driverRoot.rotation.z = -steerInput * 0.1;
    }
  }
}
