import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

/**
 * VehicleModels_Enhanced.js - Modelos 3D realistas y modernos para vehículos arcade.
 * Estilos: Stylized-realistic con materiales metallic/matte.
 * Inspirados en autos reales pero sin copiar diseños exactos.
 */

// ======================== HELPER - MATERIALES MEJORADOS ========================

function createMetallicMaterial(color, roughness = 0.3) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.9,
    envMapIntensity: 0.8,
  });
}

function createMatteCarMaterial(color, roughness = 0.5) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.3,
    envMapIntensity: 0.6,
  });
}

function createGlassMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.6,
    metalness: 0.0,
    roughness: 0.1,
    envMapIntensity: 0.4,
  });
}

// ======================== RUEDA MEJORADA ========================

function createEnhancedWheel(radius = 0.62, width = 0.54) {
  const group = new THREE.Group();

  // Neumático principal (gomita)
  const tireMat = createMetallicMaterial(0x1a1a1a, 0.7);
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * 0.28, 16, 32),
    tireMat
  );
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  group.add(tire);

  // Costado del neumático
  const sidewall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 20),
    createMatteCarMaterial(0x2a2a2a, 0.6)
  );
  sidewall.rotation.z = Math.PI / 2;
  sidewall.castShadow = true;
  group.add(sidewall);

  // Rín deportivo (varias capas)
  const rimOuterMat = createMetallicMaterial(0xd4af37, 0.25); // Gold
  const rimOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 1.3, 12),
    rimOuterMat
  );
  rimOuter.rotation.z = Math.PI / 2;
  group.add(rimOuter);

  // Centro del rín (plateado)
  const rimCenterMat = createMetallicMaterial(0xcccccc, 0.2);
  const rimCenter = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, width * 1.2, 8),
    rimCenterMat
  );
  rimCenter.rotation.z = Math.PI / 2;
  group.add(rimCenter);

  return group;
}

// ======================== SUPERCAR DEPORTIVO (Speedster - Mejorado) ========================

export function createSpeedster(colorHex) {
  const color = new THREE.Color(colorHex);
  const group = new THREE.Group();
  const bodyMat = createMatteCarMaterial(color, 0.35);

  // CHASIS - Fuselaje aerodinámico bajo y largo
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.88, 6.2),
    bodyMat
  );
  chassis.position.y = 1.0;
  chassis.castShadow = true;
  group.add(chassis);

  // CABINA - Techo acristalado aerodinámico
  const cabinMat = createGlassMaterial();
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.6, 2.2),
    cabinMat
  );
  cabin.position.set(0, 1.68, 0.95);
  cabin.castShadow = true;
  group.add(cabin);

  // TECHO interior visible
  const roofMat = createMatteCarMaterial(0x1a1a1a, 0.5);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.15, 2.0),
    roofMat
  );
  roof.position.set(0, 1.75, 0.95);
  group.add(roof);

  // ALERÓN TRASERO (Gran alerón tipo GT)
  const wingMat = createMatteCarMaterial(0xff4500, 0.4);
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.9, 0.18),
    wingMat
  );
  wing.position.set(0, 1.6, -3.3);
  wing.castShadow = true;
  group.add(wing);

  // Soporte del alerón
  const wingSupport = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.8, 0.2),
    createMatteCarMaterial(0x1a1a1a, 0.5)
  );
  wingSupport.position.set(0, 1.2, -3.1);
  group.add(wingSupport);

  // PARACHOQUES FRONTAL
  const bumperFront = new THREE.Mesh(
    new THREE.BoxGeometry(3.9, 0.5, 0.35),
    createMatteCarMaterial(0x0a0a0a, 0.6)
  );
  bumperFront.position.set(0, 0.65, 3.0);
  group.add(bumperFront);

  // TOMAS DE AIRE LATERALES
  const intakeMat = createMatteCarMaterial(0x1a1a1a, 0.4);
  const intakeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.4, 0.8),
    intakeMat
  );
  intakeL.position.set(-2.0, 0.95, 1.2);
  group.add(intakeL);

  const intakeR = intakeL.clone();
  intakeR.position.x = 2.0;
  group.add(intakeR);

  // FAROS LED (2 delanteros)
  const headlightMat = createMetallicMaterial(0xffff99, 0.15);
  const headlightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.35),
    headlightMat
  );
  headlightL.position.set(-1.7, 0.98, 3.05);
  headlightL.castShadow = true;
  group.add(headlightL);

  const headlightR = headlightL.clone();
  headlightR.position.x = 1.7;
  group.add(headlightR);

  // LUCES TRASERAS (LED rojos)
  const tailLightMat = createMetallicMaterial(0xff0000, 0.2);
  const tailLightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.25, 0.25),
    tailLightMat
  );
  tailLightL.position.set(-1.8, 0.9, -3.1);
  group.add(tailLightL);

  const tailLightR = tailLightL.clone();
  tailLightR.position.x = 1.8;
  group.add(tailLightR);

  // RUEDAS (deportivas)
  const wheelPositions = [
    [-1.76, 0.62, 1.9],
    [1.76, 0.62, 1.9],
    [-1.76, 0.62, -1.9],
    [1.76, 0.62, -1.9],
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createEnhancedWheel(0.62, 0.54);
    wheel.position.set(...pos);
    group.add(wheel);
  });

  // DETALLES - Línea roja deportiva
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.05, 6.0),
    createMatteCarMaterial(0xff4500, 0.4)
  );
  stripe.position.set(0, 1.05, 0);
  group.add(stripe);

  return group;
}

// ======================== SUV TODOTERRENO (Offroad - Mejorado) ========================

export function createOffroad(colorHex) {
  const color = new THREE.Color(colorHex);
  const group = new THREE.Group();
  const bodyMat = createMatteCarMaterial(color, 0.4);

  // CHASIS grande y elevado
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(3.9, 1.35, 5.8),
    bodyMat
  );
  chassis.position.y = 1.35;
  chassis.castShadow = true;
  group.add(chassis);

  // CABINA SUV (boxy but modern)
  const cabinMat = createGlassMaterial();
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.9, 0.85, 2.0),
    cabinMat
  );
  cabin.position.set(0, 2.15, 0.8);
  cabin.castShadow = true;
  group.add(cabin);

  // TECHO SUV (recto)
  const roofMat = createMatteCarMaterial(0x222222, 0.45);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.2, 1.8),
    roofMat
  );
  roof.position.set(0, 2.3, 0.8);
  group.add(roof);

  // PORTA-EQUIPAJES (roof rack)
  const rackMat = createMatteCarMaterial(0x555555, 0.5);
  const rack = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.25, 1.4),
    rackMat
  );
  rack.position.set(0, 2.5, 0.5);
  group.add(rack);

  // PROTECCIÓN INFERIOR (skid plate)
  const skidMat = createMatteCarMaterial(0x333333, 0.6);
  const skid = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.25, 5.2),
    skidMat
  );
  skid.position.set(0, 0.55, 0);
  group.add(skid);

  // PARACHOQUES REFORZADO
  const bumperFront = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.7, 0.4),
    createMatteCarMaterial(0x1a1a1a, 0.55)
  );
  bumperFront.position.set(0, 0.9, 2.85);
  group.add(bumperFront);

  // PROTECTOR TRASERO
  const bumperRear = new THREE.Mesh(
    new THREE.BoxGeometry(3.9, 0.6, 0.3),
    createMatteCarMaterial(0x1a1a1a, 0.55)
  );
  bumperRear.position.set(0, 0.95, -2.85);
  group.add(bumperRear);

  // FAROS LED tipo proyector
  const headlightMat = createMetallicMaterial(0xffff99, 0.2);
  const headlightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.45, 0.45),
    headlightMat
  );
  headlightL.position.set(-1.8, 1.25, 2.85);
  headlightL.castShadow = true;
  group.add(headlightL);

  const headlightR = headlightL.clone();
  headlightR.position.x = 1.8;
  group.add(headlightR);

  // LUCES TRASERAS
  const tailLightMat = createMetallicMaterial(0xff0000, 0.2);
  const tailLightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.3),
    tailLightMat
  );
  tailLightL.position.set(-1.9, 1.0, -2.8);
  group.add(tailLightL);

  const tailLightR = tailLightL.clone();
  tailLightR.position.x = 1.9;
  group.add(tailLightR);

  // RUEDAS GRANDES (todoterreno)
  const wheelPositions = [
    [-1.85, 0.75, 1.8],
    [1.85, 0.75, 1.8],
    [-1.85, 0.75, -1.8],
    [1.85, 0.75, -1.8],
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createEnhancedWheel(0.75, 0.62);
    wheel.position.set(...pos);
    group.add(wheel);
  });

  // DETALLES - Línea naranja características
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.06, 5.2),
    createMatteCarMaterial(0xff8c00, 0.4)
  );
  stripe.position.set(0, 1.4, 0);
  group.add(stripe);

  return group;
}

// ======================== AUTO DE CARRERAS LIGERO (Formula - Mejorado) ========================

export function createFormula(colorHex) {
  const color = new THREE.Color(colorHex);
  const group = new THREE.Group();
  const bodyMat = createMatteCarMaterial(color, 0.3);

  // CHASIS ultra bajo y ligero
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.7, 6.5),
    bodyMat
  );
  chassis.position.y = 0.88;
  chassis.castShadow = true;
  group.add(chassis);

  // CABINA mínima (monocasco)
  const cabinMat = createGlassMaterial();
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.48, 1.6),
    cabinMat
  );
  cabin.position.set(0, 1.38, 1.0);
  cabin.castShadow = true;
  group.add(cabin);

  // ALERÓN FRONTAL (ala inversora)
  const frontWingMat = createMatteCarMaterial(0x1a1a1a, 0.5);
  const frontWing = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.25, 0.5),
    frontWingMat
  );
  frontWing.position.set(0, 0.6, 3.1);
  group.add(frontWing);

  // Gran ALERÓN TRASERO (downforce)
  const rearWingMat = createMatteCarMaterial(0x1a1a1a, 0.5);
  const rearWing = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 1.1, 0.25),
    rearWingMat
  );
  rearWing.position.set(0, 1.9, -3.4);
  group.add(rearWing);

  // Soporte del alerón trasero
  const rearWingSupport = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.0, 0.15),
    frontWingMat
  );
  rearWingSupport.position.set(0, 1.4, -3.2);
  group.add(rearWingSupport);

  // TOMAS DE AIRE (aerodinámica)
  const airIntakeMat = createMatteCarMaterial(0x0a0a0a, 0.6);
  const airIntake1 = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.4, 0.25),
    airIntakeMat
  );
  airIntake1.position.set(0, 1.2, 3.15);
  group.add(airIntake1);

  // Entradas laterales
  const airIntakeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.35, 0.6),
    airIntakeMat
  );
  airIntakeL.position.set(-1.7, 0.85, 1.5);
  group.add(airIntakeL);

  const airIntakeR = airIntakeL.clone();
  airIntakeR.position.x = 1.7;
  group.add(airIntakeR);

  // FAROS LED minimalistas
  const headlightMat = createMetallicMaterial(0xffff99, 0.1);
  const headlightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.28, 0.28),
    headlightMat
  );
  headlightL.position.set(-1.5, 0.8, 3.15);
  group.add(headlightL);

  const headlightR = headlightL.clone();
  headlightR.position.x = 1.5;
  group.add(headlightR);

  // LUCES TRASERAS
  const tailLightMat = createMetallicMaterial(0xff0000, 0.15);
  const tailLightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.2, 0.2),
    tailLightMat
  );
  tailLightL.position.set(-1.5, 0.75, -3.2);
  group.add(tailLightL);

  const tailLightR = tailLightL.clone();
  tailLightR.position.x = 1.5;
  group.add(tailLightR);

  // RUEDAS deportivas pequeñas
  const wheelPositions = [
    [-1.65, 0.5, 2.2],
    [1.65, 0.5, 2.2],
    [-1.65, 0.5, -2.0],
    [1.65, 0.5, -2.0],
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createEnhancedWheel(0.58, 0.52);
    wheel.position.set(...pos);
    group.add(wheel);
  });

  // LÍNEAS DE CARRERA (stripes)
  const stripeCenter = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.04, 6.2),
    createMatteCarMaterial(0xffff00, 0.35)
  );
  stripeCenter.position.set(0, 0.92, 0);
  group.add(stripeCenter);

  const stripeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 6.2),
    createMatteCarMaterial(0xff4500, 0.35)
  );
  stripeL.position.set(-0.3, 0.92, 0);
  group.add(stripeL);

  const stripeR = stripeL.clone();
  stripeR.position.x = 0.3;
  group.add(stripeR);

  return group;
}

// ======================== TRUCK - Camión Potente ========================

export function createTruck(colorHex) {
  const color = new THREE.Color(colorHex);
  const group = new THREE.Group();
  const bodyMat = createMatteCarMaterial(color, 0.45);

  // CHASIS masivo
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 1.4, 6.4),
    bodyMat
  );
  chassis.position.y = 1.4;
  chassis.castShadow = true;
  group.add(chassis);

  // CABINA cuadrada tipo pickup
  const cabinMat = createGlassMaterial();
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.95, 1.8),
    cabinMat
  );
  cabin.position.set(-0.6, 2.2, 1.6);
  cabin.castShadow = true;
  group.add(cabin);

  // CAJA DE CARGA
  const bedMat = createMatteCarMaterial(0x4a4a4a, 0.5);
  const bed = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 1.1, 3.4),
    bedMat
  );
  bed.position.set(0.4, 1.65, -1.3);
  group.add(bed);

  // Borde de caja
  const bedRail = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.15, 0.2),
    createMatteCarMaterial(0x1a1a1a, 0.6)
  );
  bedRail.position.set(0.4, 2.15, -1.3);
  group.add(bedRail);

  // PARACHOQUES robustos
  const bumperMat = createMatteCarMaterial(0x0a0a0a, 0.6);
  const bumperFront = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.75, 0.45),
    bumperMat
  );
  bumperFront.position.set(0, 0.95, 3.15);
  group.add(bumperFront);

  // FAROS grandes tipo LED
  const headlightMat = createMetallicMaterial(0xffff99, 0.2);
  const headlightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 0.5),
    headlightMat
  );
  headlightL.position.set(-1.9, 1.35, 3.15);
  headlightL.castShadow = true;
  group.add(headlightL);

  const headlightR = headlightL.clone();
  headlightR.position.x = 1.9;
  group.add(headlightR);

  // LUCES TRASERAS grandes
  const tailLightMat = createMetallicMaterial(0xff0000, 0.2);
  const tailLightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.4, 0.35),
    tailLightMat
  );
  tailLightL.position.set(-1.95, 1.2, -3.15);
  group.add(tailLightL);

  const tailLightR = tailLightL.clone();
  tailLightR.position.x = 1.95;
  group.add(tailLightR);

  // RUEDAS enormes (dual traseras)
  const wheelPositions = [
    [-1.85, 0.8, 1.75],
    [1.85, 0.8, 1.75],
    [-1.85, 0.8, -1.75],
    [1.85, 0.8, -1.75],
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createEnhancedWheel(0.80, 0.68);
    wheel.position.set(...pos);
    group.add(wheel);
  });

  return group;
}

// ======================== BUGGY - Vehículo Ligero Ágil ========================

export function createBuggy(colorHex) {
  const color = new THREE.Color(colorHex);
  const group = new THREE.Group();
  const bodyMat = createMatteCarMaterial(color, 0.35);

  // CHASIS abierto y ligero
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.95, 5.1),
    bodyMat
  );
  chassis.position.y = 0.98;
  chassis.castShadow = true;
  group.add(chassis);

  // JAULA DE SEGURIDAD (visible roll bars)
  const tubeMat = createMatteCarMaterial(0x1a1a1a, 0.6);
  const rollBarFront = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8),
    tubeMat
  );
  rollBarFront.position.set(0, 1.9, 1.2);
  rollBarFront.rotation.z = Math.PI / 2;
  group.add(rollBarFront);

  const rollBarMain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 2.8, 8),
    tubeMat
  );
  rollBarMain.position.set(0, 1.95, 0);
  rollBarMain.rotation.z = Math.PI / 2;
  group.add(rollBarMain);

  // PARABRISAS deportivo (windshield)
  const windshieldMat = createGlassMaterial();
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.45, 0.12),
    windshieldMat
  );
  windshield.position.set(0, 1.25, 1.15);
  windshield.rotation.x = 0.35;
  group.add(windshield);

  // VOLANTE VISIBLE (steering wheel outline)
  const steeringMat = createMatteCarMaterial(0x333333, 0.5);
  const steering = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.1, 8, 16),
    steeringMat
  );
  steering.position.set(-0.85, 1.35, 0.6);
  steering.rotation.x = Math.PI / 3;
  group.add(steering);

  // FAROS deportivos
  const headlightMat = createMetallicMaterial(0xffff99, 0.18);
  const headlightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.35, 0.35),
    headlightMat
  );
  headlightL.position.set(-1.4, 0.98, 2.5);
  group.add(headlightL);

  const headlightR = headlightL.clone();
  headlightR.position.x = 1.4;
  group.add(headlightR);

  // LUCES TRASERAS LED
  const tailLightMat = createMetallicMaterial(0xff0000, 0.18);
  const tailLightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.3, 0.3),
    tailLightMat
  );
  tailLightL.position.set(-1.45, 0.85, -2.5);
  group.add(tailLightL);

  const tailLightR = tailLightL.clone();
  tailLightR.position.x = 1.45;
  group.add(tailLightR);

  // RUEDAS medianas (todo terreno)
  const wheelPositions = [
    [-1.55, 0.6, 1.7],
    [1.55, 0.6, 1.7],
    [-1.55, 0.6, -1.7],
    [1.55, 0.6, -1.7],
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createEnhancedWheel(0.62, 0.56);
    wheel.position.set(...pos);
    group.add(wheel);
  });

  // LÍNEA DEPORTIVA
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.05, 5.0),
    createMatteCarMaterial(0xffff00, 0.35)
  );
  stripe.position.set(0, 1.02, 0);
  group.add(stripe);

  return group;
}

// ======================== VEHÍCULO ESTABLE ========================

export function createStable(colorHex) {
  const color = new THREE.Color(colorHex);
  const group = new THREE.Group();
  const bodyMat = createMatteCarMaterial(color, 0.45);

  // CHASIS estable y ancho
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 1.05, 5.4),
    bodyMat
  );
  chassis.position.y = 1.05;
  chassis.castShadow = true;
  group.add(chassis);

  // CABINA cuadrada amigable
  const cabinMat = createGlassMaterial();
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.8, 2.1),
    cabinMat
  );
  cabin.position.set(0, 1.8, 0.8);
  cabin.castShadow = true;
  group.add(cabin);

  // PARACHOQUES reforzado
  const bumperMat = createMatteCarMaterial(0x333333, 0.55);
  const bumper = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.55, 0.35),
    bumperMat
  );
  bumper.position.set(0, 0.75, 2.65);
  group.add(bumper);

  // Defensa trasera
  const rear = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.45, 0.25),
    bumperMat
  );
  rear.position.set(0, 0.8, -2.65);
  group.add(rear);

  // FAROS medianos
  const headlightMat = createMetallicMaterial(0xffff99, 0.2);
  const headlightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.38, 0.38),
    headlightMat
  );
  headlightL.position.set(-1.6, 1.15, 2.65);
  group.add(headlightL);

  const headlightR = headlightL.clone();
  headlightR.position.x = 1.6;
  group.add(headlightR);

  // LUCES TRASERAS
  const tailLightMat = createMetallicMaterial(0xff0000, 0.2);
  const tailLightL = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.32, 0.28),
    tailLightMat
  );
  tailLightL.position.set(-1.7, 0.9, -2.65);
  group.add(tailLightL);

  const tailLightR = tailLightL.clone();
  tailLightR.position.x = 1.7;
  group.add(tailLightR);

  // RUEDAS de tamaño medio
  const wheelPositions = [
    [-1.75, 0.68, 1.9],
    [1.75, 0.68, 1.9],
    [-1.75, 0.68, -1.85],
    [1.75, 0.68, -1.85],
  ];

  wheelPositions.forEach((pos) => {
    const wheel = createEnhancedWheel(0.66, 0.58);
    wheel.position.set(...pos);
    group.add(wheel);
  });

  // LÍNEA característica
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.05, 5.2),
    createMatteCarMaterial(0x00ff00, 0.35)
  );
  stripe.position.set(0, 1.08, 0);
  group.add(stripe);

  return group;
}

// ======================== FACTORY & SPECS ========================

export const VEHICLE_SPECS = {
  speedster: {
    create: createSpeedster,
    name: "Speedster",
    description: "Supercar rápido y aerodinámico",
    maxSpeed: 6,
    handling: -0.25,
    acceleration: 0,
    weight: 0.8,
  },
  stable: {
    create: createStable,
    name: "Stable",
    description: "Sedán equilibrado y controlable",
    maxSpeed: -2,
    handling: 0.15,
    acceleration: 2,
    weight: 1.2,
  },
  offroad: {
    create: createOffroad,
    name: "Offroad",
    description: "SUV todoterreno con agarre",
    maxSpeed: -4,
    handling: 0.2,
    acceleration: 4.4,
    weight: 1.0,
  },
  formula: {
    create: createFormula,
    name: "Formula",
    description: "Auto de carrera ultra rápido",
    maxSpeed: 9,
    handling: -0.45,
    acceleration: 1.4,
    weight: 0.7,
  },
  truck: {
    create: createTruck,
    name: "Truck",
    description: "Camión potente y resistente",
    maxSpeed: -3,
    handling: -0.15,
    acceleration: 3.0,
    weight: 1.5,
  },
  buggy: {
    create: createBuggy,
    name: "Buggy",
    description: "Vehículo ligero y ágil",
    maxSpeed: 2,
    handling: 0.35,
    acceleration: 3.5,
    weight: 0.6,
  },
};

export function getVehicleModel(vehicleId, colorHex = "#ff4d6d") {
  const spec = VEHICLE_SPECS[vehicleId];
  return spec?.create?.(colorHex) || createSpeedster(colorHex);
}

export const AVAILABLE_VEHICLES = Object.keys(VEHICLE_SPECS);
