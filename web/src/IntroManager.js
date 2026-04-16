import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

export class IntroManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x0a0a0a);
    this.renderer.setSize(canvas.width, canvas.height);

    this.startTime = performance.now();
    this.duration = 6.0; // 6 segundos
    this.isSkipped = false;
    this.onComplete = null;

    this._setupScene();
    this._setupLights();
    this._setupLogo();
    this._setupKeyListener();
  }

  _setupScene() {
    // Fondo con gradiente
    const geometry = new THREE.IcosahedronGeometry(200, 4);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      emissive: 0x0f3460,
      emissiveIntensity: 0.3,
      roughness: 0.8,
      metalness: 0.2,
      flatShading: true,
    });
    const background = new THREE.Mesh(geometry, material);
    this.scene.add(background);
    this.backgroundMesh = background;

    // Luces
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(10, 15, 20);
    this.scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x4080ff, 0.6);
    this.scene.add(ambientLight);

    this.camera.position.z = 5;
  }

  _setupLights() {
    const pointLight1 = new THREE.PointLight(0xff00ff, 1.5, 100);
    pointLight1.position.set(15, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00ffff, 1.2, 100);
    pointLight2.position.set(-15, -10, -10);
    this.scene.add(pointLight2);
  }

  _setupLogo() {
    // Crear logo con KART 3D arcade
    const kartGroup = new THREE.Group();

    // Chasis del kart (cuadro principal)
    const chassisGeo = new THREE.BoxGeometry(1.2, 0.5, 2.0);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      emissive: 0xff6b35,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.3;
    kartGroup.add(chassis);

    // Cabina/asiento (verde neon)
    const cabinGeo = new THREE.BoxGeometry(0.9, 0.6, 1.0);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.3,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.9, -0.2);
    kartGroup.add(cabin);

    // Ala frontal (cyan)
    const wingGeo = new THREE.BoxGeometry(1.4, 0.3, 0.3);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x00d9ff,
      emissive: 0x00d9ff,
      emissiveIntensity: 0.7,
      metalness: 0.9,
      roughness: 0.1,
    });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.set(0, 0.7, -1.0);
    wing.rotation.z = 0.2;
    kartGroup.add(wing);

    // 4 Ruedas
    const wheelPositions = [
      [-0.55, 0.2, -0.6],
      [0.55, 0.2, -0.6],
      [-0.55, 0.2, 0.6],
      [0.55, 0.2, 0.6],
    ];

    for (let i = 0; i < wheelPositions.length; i++) {
      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
      const wheelMat = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.5,
        metalness: 0.95,
        roughness: 0.05,
      });
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(...wheelPositions[i]);
      wheel.userData.wheelIndex = i;
      kartGroup.add(wheel);
    }

    // Detalles adicionales - cilindros en el chasis
    const detailGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
    const detailMat = new THREE.MeshStandardMaterial({
      color: 0xffa500,
      emissive: 0xffa500,
      emissiveIntensity: 0.4,
    });
    const detail = new THREE.Mesh(detailGeo, detailMat);
    detail.rotation.z = Math.PI / 2;
    detail.position.set(0, 0.3, 0);
    kartGroup.add(detail);

    kartGroup.position.z = 0;
    this.scene.add(kartGroup);
    this.logoGroup = kartGroup;
  }

  _setupKeyListener() {
    this.keyHandler = (e) => {
      if (!this.isSkipped) {
        this.isSkipped = true;
        this.skip();
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  skip() {
    this.isSkipped = true;
    if (this.onComplete) this.onComplete();
  }

  update(currentTime) {
    if (this.isSkipped) return true;

    const elapsed = (currentTime - this.startTime) / 1000;
    const progress = Math.min(elapsed / this.duration, 1);
    
    // Asegurar que el canvas y overlays están en estado correcto
    this.canvas.style.display = "block";

    // Rotación del background
    this.backgroundMesh.rotation.x += 0.0003;
    this.backgroundMesh.rotation.y += 0.0005;

    // Animación del kart
    this.logoGroup.rotation.y += 0.008; // Kart girando
    
    // Girar ruedas
    for (let child of this.logoGroup.children) {
      if (child.userData.wheelIndex !== undefined) {
        child.rotation.x += 0.06; // Ruedas girando
      }
    }
    
    // Pulso/escala suave
    const pulse = 1 + Math.sin(elapsed * 1.5) * 0.06;
    this.logoGroup.scale.set(pulse, pulse, pulse);
    
    // Movimiento vertical suave
    this.logoGroup.position.y = Math.sin(elapsed * 0.8) * 0.3;

    // Fade out al final
    if (progress > 0.85) {
      const fadeProgress = (progress - 0.85) / 0.15;
      this.renderer.domElement.style.opacity = 1 - fadeProgress;
    }

    // Completado
    if (progress >= 1) {
      // Restaurar opacidad del canvas
      this.renderer.domElement.style.opacity = 1;
      // Ocultar overlays
      const mainMenuOverlay = document.getElementById("mainMenuOverlay");
      if (mainMenuOverlay) mainMenuOverlay.classList.remove("visible");
      if (this.onComplete) this.onComplete();
      return true;
    }

    this.renderer.render(this.scene, this.camera);
    return false;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener("keydown", this.keyHandler);
    this.renderer.dispose();
  }
}
