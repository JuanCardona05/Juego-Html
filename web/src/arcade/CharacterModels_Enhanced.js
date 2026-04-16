import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

/**
 * CharacterModels_Enhanced.js - Modelos 3D mejorados para todos los personajes.
 * Estilos: Stylized-realistic con proporciones naturales y detalles modernos.
 * Material: MeshStandardMaterial con roughness y metalness realista.
 */

// ======================== PALETA DE COLORES ========================
const COLORS = {
  catOrange: 0xff8c42,
  catWhite: 0xf5f5f5,
  dogBrown: 0x8b6f47,
  dogTan: 0xd4a574,
  falconBrown: 0x5d4037,
  falconGold: 0xffd700,
  pandaBlack: 0x1a1a1a,
  pandaWhite: 0xffffff,
  monkeyBrown: 0xb8860b,
  monkeyTan: 0xd4a574,
  rabbitPink: 0xff69b4,
  rabbitWhite: 0xffffff,
};

// ======================== ENHANCED MATERIALS ========================

function createCharacterMaterial(color, roughness = 0.75, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    envMapIntensity: 0.6,
  });
}

// ======================== GATO (CAT) - MEJORADO ========================
export function createCatCharacter() {
  const group = new THREE.Group();

  // Cabeza - IcosahedronGeometry para formas más suaves
  const headGeo = new THREE.IcosahedronGeometry(0.9, 4);
  const headMat = createCharacterMaterial(COLORS.catOrange, 0.7, 0.05);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.85;
  head.castShadow = true;
  head.scale.set(1.1, 1.0, 1.0); // Un poco más ancho
  group.add(head);

  // Orejas puntiagudas (conos mejorados)
  const earGeo = new THREE.ConeGeometry(0.35, 0.9, 8);
  const earMat = createCharacterMaterial(COLORS.catOrange, 0.7, 0.05);
  
  const earL = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-0.55, 2.6, 0);
  earL.rotation.z = -0.35;
  earL.castShadow = true;
  earL.scale.set(0.9, 1.1, 0.9);
  group.add(earL);

  const earR = earL.clone();
  earR.position.x = 0.55;
  earR.rotation.z = 0.35;
  group.add(earR);

  // Interior de orejas (detalles)
  const innerEarMat = createCharacterMaterial(0xffb88c, 0.8, 0.1);
  const innerEarL = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 6), innerEarMat);
  innerEarL.position.set(-0.55, 2.3, 0.1);
  innerEarL.rotation.z = -0.35;
  innerEarL.scale.set(0.8, 0.9, 0.8);
  group.add(innerEarL);

  const innerEarR = innerEarL.clone();
  innerEarR.position.x = 0.55;
  innerEarR.rotation.z = 0.35;
  group.add(innerEarR);

  // Ojos - Más realistas
  const eyeWhiteMat = createCharacterMaterial(0xffffff, 0.6, 0.0);
  const eyePupilMat = createCharacterMaterial(0x00aa00, 0.4, 0.2);
  
  // Ojo izquierdo
  const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), eyeWhiteMat);
  eyeWhiteL.position.set(-0.3, 2.0, 0.75);
  eyeWhiteL.scale.z = 0.4;
  group.add(eyeWhiteL);
  
  const eyePupilL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyePupilMat);
  eyePupilL.position.set(-0.3, 2.0, 0.8);
  group.add(eyePupilL);

  // Ojo derecho
  const eyeWhiteR = eyeWhiteL.clone();
  eyeWhiteR.position.x = 0.3;
  group.add(eyeWhiteR);
  
  const eyePupilR = eyePupilL.clone();
  eyePupilR.position.x = 0.3;
  group.add(eyePupilR);

  // Hocico
  const snoutMat = createCharacterMaterial(0xffb88c, 0.75, 0.05);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), snoutMat);
  snout.position.set(0, 1.65, 0.8);
  snout.scale.set(1.0, 0.8, 0.6);
  snout.castShadow = true;
  group.add(snout);

  // Nariz
  const noseMat = createCharacterMaterial(0xff6b8a, 0.7, 0.1);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), noseMat);
  nose.position.set(0, 1.6, 1.0);
  group.add(nose);

  // Cuerpo - BoxGeometry mejorada
  const bodyMat = createCharacterMaterial(COLORS.catOrange, 0.7, 0.05);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 1.0), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  // Barriga clara
  const bellyMat = createCharacterMaterial(0xffcc99, 0.75, 0.05);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.3), bellyMat);
  belly.position.set(0, 0.8, 0.4);
  group.add(belly);

  // Patas - Cilindros mejorados
  const legMat = createCharacterMaterial(COLORS.catOrange, 0.7, 0.05);
  const legPositions = [
    [-0.25, 0.25, -0.25],
    [0.25, 0.25, -0.25],
    [-0.25, 0.25, 0.25],
    [0.25, 0.25, 0.25],
  ];

  for (let i = 0; i < legPositions.length; i++) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.9, 8),
      legMat
    );
    leg.position.set(...legPositions[i]);
    leg.castShadow = true;
    group.add(leg);

    // Patas - detalle de pies
    const footMat = createCharacterMaterial(0xffb88c, 0.75, 0.05);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), footMat);
    foot.position.set(legPositions[i][0], -0.15, legPositions[i][2]);
    foot.scale.set(1.0, 0.6, 1.2);
    group.add(foot);
  }

  // Cola
  const tailMat = createCharacterMaterial(COLORS.catOrange, 0.7, 0.05);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 1.2, 8), tailMat);
  tail.position.set(0, 1.2, -0.8);
  tail.rotation.z = 0.3;
  tail.castShadow = true;
  group.add(tail);

  group.position.y = 0;
  return group;
}

// ======================== PERRO (DOG) - MEJORADO ========================
export function createDogCharacter() {
  const group = new THREE.Group();

  // Cabeza - Forma alargada
  const headMat = createCharacterMaterial(COLORS.dogBrown, 0.75, 0.05);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.8, 1.1), headMat);
  head.position.y = 1.95;
  head.castShadow = true;
  group.add(head);

  // Hocico alargado
  const snoutMat = createCharacterMaterial(COLORS.dogTan, 0.75, 0.05);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.8), snoutMat);
  snout.position.set(0, 1.7, 0.8);
  snout.castShadow = true;
  group.add(snout);

  // Nariz
  const noseMat = createCharacterMaterial(0x5d4037, 0.6, 0.1);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), noseMat);
  nose.position.set(0, 1.55, 1.1);
  group.add(nose);

  // Orejas colgantes (más realistas)
  const earMat = createCharacterMaterial(COLORS.dogBrown, 0.75, 0.05);
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.25), earMat);
  earL.position.set(-0.55, 2.3, -0.2);
  earL.rotation.z = -0.45;
  earL.castShadow = true;
  group.add(earL);

  const earR = earL.clone();
  earR.position.x = 0.55;
  earR.rotation.z = 0.45;
  group.add(earR);

  // Ojos
  const eyeMat = createCharacterMaterial(0x3e2723, 0.4, 0.1);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), eyeMat);
  eyeL.position.set(-0.25, 2.05, 0.75);
  group.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.25;
  group.add(eyeR);

  // Cuerpo robusto
  const bodyMat = createCharacterMaterial(COLORS.dogBrown, 0.75, 0.05);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.3, 1.15), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  // Manchas (spots)
  const spotMat = createCharacterMaterial(COLORS.dogTan, 0.75, 0.05);
  const spot1 = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), spotMat);
  spot1.position.set(-0.2, 1.3, 0.3);
  group.add(spot1);

  const spot2 = spot1.clone();
  spot2.position.set(0.25, 0.9, -0.4);
  group.add(spot2);

  // Patas
  const legMat = createCharacterMaterial(COLORS.dogBrown, 0.75, 0.05);
  const legPositions = [
    [-0.25, 0.2, -0.3],
    [0.25, 0.2, -0.3],
    [-0.25, 0.2, 0.3],
    [0.25, 0.2, 0.3],
  ];

  for (const pos of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 1.0, 8),
      legMat
    );
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
  }

  // Cola
  const tailMat = createCharacterMaterial(COLORS.dogBrown, 0.75, 0.05);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 1.3, 8), tailMat);
  tail.position.set(0, 1.0, -0.9);
  tail.rotation.z = 0.4;
  tail.castShadow = true;
  group.add(tail);

  group.position.y = 0;
  return group;
}

// ======================== HALCÓN (FALCON) - MEJORADO ========================
export function createFalconCharacter() {
  const group = new THREE.Group();

  // Cabeza - Forma de águila
  const headMat = createCharacterMaterial(COLORS.falconBrown, 0.7, 0.1);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 3), headMat);
  head.position.y = 2.2;
  head.scale.set(1.2, 0.9, 0.8);
  head.castShadow = true;
  group.add(head);

  // Pico
  const beakMat = createCharacterMaterial(0xffaa00, 0.6, 0.3);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 6), beakMat);
  beak.position.set(0, 2.1, 0.9);
  beak.rotation.x = -Math.PI / 6;
  beak.castShadow = true;
  group.add(beak);

  // Ojos
  const eyeMat = createCharacterMaterial(0xffff00, 0.4, 0.2);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), eyeMat);
  eyeL.position.set(-0.3, 2.25, 0.6);
  group.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.3;
  group.add(eyeR);

  // Cuerpo de águila (aerodinámico)
  const bodyMat = createCharacterMaterial(COLORS.falconBrown, 0.7, 0.1);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.95), bodyMat);
  body.position.y = 0.8;
  body.castShadow = true;
  group.add(body);

  // Pecho blanco
  const breastMat = createCharacterMaterial(0xf5deb3, 0.75, 0.05);
  const breast = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.3), breastMat);
  breast.position.set(0, 0.9, 0.4);
  group.add(breast);

  // Alas (detalles laterales)
  const wingMat = createCharacterMaterial(COLORS.falconBrown, 0.7, 0.1);
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 1.2), wingMat);
  wingL.position.set(-0.55, 1.2, 0.5);
  wingL.rotation.z = 0.4;
  group.add(wingL);

  const wingR = wingL.clone();
  wingR.position.x = 0.55;
  wingR.rotation.z = -0.4;
  group.add(wingR);

  // Patas águila
  const legMat = createCharacterMaterial(0xffaa00, 0.6, 0.2);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), legMat);
  legL.position.set(-0.25, 0.15, 0.2);
  legL.castShadow = true;
  group.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.25;
  group.add(legR);

  // Cola
  const tailMat = createCharacterMaterial(COLORS.falconBrown, 0.7, 0.1);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 1.0), tailMat);
  tail.position.set(0, 0.8, -0.9);
  tail.castShadow = true;
  group.add(tail);

  group.position.y = 0;
  return group;
}

// ======================== PANDA (PANDA) - MEJORADO ========================
export function createPandaCharacter() {
  const group = new THREE.Group();

  // Cabeza redonda
  const headMat = createCharacterMaterial(COLORS.pandaWhite, 0.75, 0.05);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), headMat);
  head.position.y = 1.8;
  head.castShadow = true;
  group.add(head);

  // Manchas de ojos negras
  const eyePatchMat = createCharacterMaterial(COLORS.pandaBlack, 0.6, 0.05);
  const eyePatchL = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), eyePatchMat);
  eyePatchL.position.set(-0.35, 1.95, 0.8);
  eyePatchL.scale.set(0.8, 1.0, 0.6);
  group.add(eyePatchL);

  const eyePatchR = eyePatchL.clone();
  eyePatchR.position.x = 0.35;
  group.add(eyePatchR);

  // Ojos blancos
  const eyeWhiteMat = createCharacterMaterial(COLORS.pandaWhite, 0.6, 0.0);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), eyeWhiteMat);
  eyeL.position.set(-0.35, 2.0, 0.95);
  group.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.35;
  group.add(eyeR);

  // Orejas redondasnegras
  const earMat = createCharacterMaterial(COLORS.pandaBlack, 0.6, 0.05);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), earMat);
  earL.position.set(-0.55, 2.6, 0);
  group.add(earL);

  const earR = earL.clone();
  earR.position.x = 0.55;
  group.add(earR);

  // Nariz
  const noseMat = createCharacterMaterial(COLORS.pandaBlack, 0.6, 0.05);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), noseMat);
  nose.position.set(0, 1.6, 1.0);
  group.add(nose);

  // Cuerpo redondeado
  const bodyMat = createCharacterMaterial(COLORS.pandaWhite, 0.75, 0.05);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8), bodyMat);
  body.position.y = 0.7;
  body.scale.set(1.0, 1.2, 1.0);
  body.castShadow = true;
  group.add(body);

  // Barriga blanca (ya está en el cuerpo)

  // Patas
  const legMat = createCharacterMaterial(COLORS.pandaBlack, 0.6, 0.05);
  const legPositions = [
    [-0.3, 0.05, -0.3],
    [0.3, 0.05, -0.3],
    [-0.3, 0.05, 0.3],
    [0.3, 0.05, 0.3],
  ];

  for (const pos of legPositions) {
    const leg = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), legMat);
    leg.position.set(...pos);
    leg.scale.set(0.9, 0.7, 1.0);
    group.add(leg);
  }

  group.position.y = 0;
  return group;
}

// ======================== MONO (MONKEY) - MEJORADO ========================
export function createMonkeyCharacter() {
  const group = new THREE.Group();

  // Cabeza
  const headMat = createCharacterMaterial(COLORS.monkeyBrown, 0.75, 0.05);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 3), headMat);
  head.position.y = 1.9;
  head.scale.set(1.1, 1.0, 0.95);
  head.castShadow = true;
  group.add(head);

  // Cara (más clara)
  const faceMat = createCharacterMaterial(COLORS.monkeyTan, 0.75, 0.05);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), faceMat);
  face.position.set(0, 1.85, 0.6);
  group.add(face);

  // Orejas
  const earMat = createCharacterMaterial(COLORS.monkeyBrown, 0.75, 0.05);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), earMat);
  earL.position.set(-0.5, 2.4, 0);
  group.add(earL);

  const earR = earL.clone();
  earR.position.x = 0.5;
  group.add(earR);

  // Ojos
  const eyeMat = createCharacterMaterial(0x2c2c2c, 0.4, 0.1);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 6), eyeMat);
  eyeL.position.set(-0.2, 2.0, 0.8);
  group.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.2;
  group.add(eyeR);

  // Cuerpo musculoso
  const bodyMat = createCharacterMaterial(COLORS.monkeyBrown, 0.75, 0.05);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.3, 0.9), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  // Barriga tan
  const bellyMat = createCharacterMaterial(COLORS.monkeyTan, 0.75, 0.05);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.2), bellyMat);
  belly.position.set(0, 0.8, 0.45);
  group.add(belly);

  // Brazos largos
  const armMat = createCharacterMaterial(COLORS.monkeyBrown, 0.75, 0.05);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 1.2, 8), armMat);
  armL.position.set(-0.6, 1.3, 0);
  armL.rotation.z = 0.2;
  armL.castShadow = true;
  group.add(armL);

  const armR = armL.clone();
  armR.position.x = 0.6;
  armR.rotation.z = -0.2;
  group.add(armR);

  // Patas
  const legMat = createCharacterMaterial(COLORS.monkeyBrown, 0.75, 0.05);
  const legPositions = [
    [-0.25, 0.15, -0.2],
    [0.25, 0.15, -0.2],
    [-0.25, 0.15, 0.3],
    [0.25, 0.15, 0.3],
  ];

  for (const pos of legPositions) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 8), legMat);
    leg.position.set(...pos);
    leg.castShadow = true;
    group.add(leg);
  }

  // Cola larga
  const tailMat = createCharacterMaterial(COLORS.monkeyBrown, 0.75, 0.05);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 1.5, 8), tailMat);
  tail.position.set(0, 0.7, -0.8);
  tail.rotation.z = 0.35;
  tail.castShadow = true;
  group.add(tail);

  group.position.y = 0;
  return group;
}

// ======================== CONEJO (RABBIT) - MEJORADO ========================
export function createRabbitCharacter() {
  const group = new THREE.Group();

  // Cabeza
  const headMat = createCharacterMaterial(COLORS.rabbitWhite, 0.75, 0.05);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 3), headMat);
  head.position.y = 2.1;
  head.castShadow = true;
  group.add(head);

  // Orejas largas características
  const earMat = createCharacterMaterial(COLORS.rabbitWhite, 0.75, 0.05);
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.3, 8), earMat);
  earL.position.set(-0.3, 3.1, 0);
  earL.rotation.z = -0.2;
  earL.castShadow = true;
  group.add(earL);

  const earR = earL.clone();
  earR.position.x = 0.3;
  earR.rotation.z = 0.2;
  group.add(earR);

  // Interior orejas rosa
  const innerEarMat = createCharacterMaterial(COLORS.rabbitPink, 0.75, 0.05);
  const innerEarL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.9, 6), innerEarMat);
  innerEarL.position.set(-0.3, 2.8, 0.05);
  innerEarL.rotation.z = -0.2;
  group.add(innerEarL);

  const innerEarR = innerEarL.clone();
  innerEarR.position.x = 0.3;
  innerEarR.rotation.z = 0.2;
  group.add(innerEarR);

  // Ojos grandes
  const eyeMat = createCharacterMaterial(COLORS.rabbitPink, 0.4, 0.2);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), eyeMat);
  eyeL.position.set(-0.25, 2.15, 0.7);
  group.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.25;
  group.add(eyeR);

  // Nariz rosa
  const noseMat = createCharacterMaterial(COLORS.rabbitPink, 0.7, 0.1);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), noseMat);
  nose.position.set(0, 1.95, 0.95);
  group.add(nose);

  // Cuerpo
  const bodyMat = createCharacterMaterial(COLORS.rabbitWhite, 0.75, 0.05);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.3, 0.95), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);

  // Barriga rosa
  const bellyMat = createCharacterMaterial(COLORS.rabbitPink, 0.75, 0.05);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.25), bellyMat);
  belly.position.set(0, 0.8, 0.45);
  group.add(belly);

  // Patas traseras grandes
  const legMat = createCharacterMaterial(COLORS.rabbitWhite, 0.75, 0.05);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.95, 8), legMat);
  legL.position.set(-0.3, 0.1, 0.25);
  legL.castShadow = true;
  group.add(legL);

  const legR = legL.clone();
  legR.position.x = 0.3;
  group.add(legR);

  // Patas delanteras
  const frontLegMat = createCharacterMaterial(COLORS.rabbitWhite, 0.75, 0.05);
  const frontLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8), frontLegMat);
  frontLegL.position.set(-0.25, 0.2, -0.25);
  frontLegL.castShadow = true;
  group.add(frontLegL);

  const frontLegR = frontLegL.clone();
  frontLegR.position.x = 0.25;
  group.add(frontLegR);

  // Cola de pom pom
  const tailMat = createCharacterMaterial(COLORS.rabbitWhite, 0.75, 0.05);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), tailMat);
  tail.position.set(0, 0.5, -0.8);
  tail.castShadow = true;
  group.add(tail);

  group.position.y = 0;
  return group;
}

// ======================== EXPORT ========================

export const CHARACTER_MODELS = {
  cat: {
    create: createCatCharacter,
    ability: "Velocidad + Aceleración",
    label: "Gato (Velocidad)",
  },
  dog: {
    create: createDogCharacter,
    ability: "Manejo + Grip",
    label: "Perro (Manejo)",
  },
  falcon: {
    create: createFalconCharacter,
    ability: "Aceleración + Ligereza",
    label: "Halcón (Aceleración)",
  },
  panda: {
    create: createPandaCharacter,
    ability: "Resistencia + Peso",
    label: "Panda (Resistencia)",
  },
  monkey: {
    create: createMonkeyCharacter,
    ability: "Equilibrio + Control",
    label: "Mono (Equilibrio)",
  },
  rabbit: {
    create: createRabbitCharacter,
    ability: "Drift + Agilidad",
    label: "Conejo (Agilidad)",
  },
};

export function getCharacterModel(characterId) {
  return CHARACTER_MODELS[characterId]?.create?.() || createCatCharacter();
}

export const AVAILABLE_CHARACTERS = Object.keys(CHARACTER_MODELS);
