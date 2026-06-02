import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function hexColor(hex) {
  return new THREE.Color(hex);
}

// ---------------------------------------------------------------------------
// FocusTree
// ---------------------------------------------------------------------------

export class FocusTree {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    this.animId = null;
    this.resizeObserver = null;

    // Progress state
    this._targetProgress = 0;
    this._currentProgress = 0;

    // Scene groups
    this.groundGroup = null;
    this.trunkGroup = null;
    this.branchGroups = []; // { mesh, baseScale, basePos, angle, phaseOffset }
    this.leafClusters = []; // { mesh, baseScale, attachProgress }
    this.flowerMeshes = []; // { mesh, baseScale, attachProgress }
    this.particleSystem = null;
    this.sproutMesh = null;
    this.moundMesh = null;
    this.glowLight = null;

    // Shared materials (created once)
    this.materials = {};
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      throw new Error(`Container #${this.containerId} not found`);
    }

    this._createRenderer();
    this._createScene();
    this._createCamera();
    this._createControls();
    this._createMaterials();
    this._buildGround();
    this._buildTree();
    this._buildParticles();
    this._setupResize();
    this._onResize();
    this._animate();
  }

  setProgress(p) {
    this._targetProgress = clamp(p, 0, 1);
  }

  getProgress() {
    return this._currentProgress;
  }

  dispose() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.scene = null;
    }
    for (const key in this.materials) {
      this.materials[key].dispose();
    }
    this.materials = {};
    this.branchGroups = [];
    this.leafClusters = [];
    this.flowerMeshes = [];
  }

  // -----------------------------------------------------------------------
  // Renderer / Scene / Camera / Controls
  // -----------------------------------------------------------------------

  _createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  _createScene() {
    this.scene = new THREE.Scene();

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Directional light (sun)
    const dir = new THREE.DirectionalLight(0xfff4e6, 0.8);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    // Point light near tree that grows with progress
    this.glowLight = new THREE.PointLight(0x00d4aa, 0, 8);
    this.glowLight.position.set(0, 2, 0);
    this.scene.add(this.glowLight);
  }

  _createCamera() {
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 3.5, 7);
    this.camera.lookAt(0, 2, 0);
  }

  _createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 2, 0);
    this.controls.minDistance = 3;
    this.controls.maxDistance = 14;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.4;
    this.controls.enablePan = false;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY,
    };
  }

  // -----------------------------------------------------------------------
  // Materials
  // -----------------------------------------------------------------------

  _createMaterials() {
    this.materials.trunkDark = new THREE.MeshLambertMaterial({
      color: hexColor('#5D4037'),
      flatShading: true,
    });
    this.materials.trunkLight = new THREE.MeshLambertMaterial({
      color: hexColor('#795548'),
      flatShading: true,
    });
    this.materials.leafA = new THREE.MeshLambertMaterial({
      color: hexColor('#6fa545'),
      flatShading: true,
    });
    this.materials.leafB = new THREE.MeshLambertMaterial({
      color: hexColor('#1b511a'),
      flatShading: true,
    });
    this.materials.flower = new THREE.MeshLambertMaterial({
      color: hexColor('#e3e16c'),
      flatShading: true,
      emissive: hexColor('#f9f579ff'),
      emissiveIntensity: 0.3,
    });
    this.materials.ground = new THREE.MeshLambertMaterial({
      color: hexColor('#3e2723'),
      flatShading: true,
    });
    this.materials.grass = new THREE.MeshLambertMaterial({
      color: hexColor('#2d6a4f'),
      flatShading: true,
    });
    this.materials.sprout = new THREE.MeshLambertMaterial({
      color: hexColor('#34d399'),
      flatShading: true,
    });
    this.materials.mound = new THREE.MeshLambertMaterial({
      color: hexColor('#5D4037'),
      flatShading: true,
    });
  }

  // -----------------------------------------------------------------------
  // Ground
  // -----------------------------------------------------------------------

  _buildGround() {
    this.groundGroup = new THREE.Group();

    // Main circular ground plane
    const groundGeo = new THREE.CircleGeometry(3.5, 16);
    const groundMesh = new THREE.Mesh(groundGeo, this.materials.ground);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.02;
    this.groundGroup.add(groundMesh);

    // Mound of earth at center
    const moundGeo = new THREE.SphereGeometry(0.5, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    this.moundMesh = new THREE.Mesh(moundGeo, this.materials.mound);
    this.moundMesh.position.y = 0;
    this.moundMesh.scale.set(1, 0.5, 1);
    this.groundGroup.add(this.moundMesh);

    // Small grass tufts
    const grassGeo = new THREE.ConeGeometry(0.04, 0.18, 4);
    const positions = [
      [0.7, 0, 0.5],
      [-0.6, 0, 0.8],
      [0.9, 0, -0.4],
      [-0.8, 0, -0.6],
      [0.3, 0, 1.0],
      [-1.1, 0, 0.2],
      [1.2, 0, 0.1],
      [-0.3, 0, -0.9],
    ];
    for (const [x, y, z] of positions) {
      const tuft = new THREE.Mesh(grassGeo, this.materials.grass);
      tuft.position.set(x, y + 0.09, z);
      tuft.rotation.z = (Math.random() - 0.5) * 0.3;
      tuft.scale.y = 0.6 + Math.random() * 0.6;
      this.groundGroup.add(tuft);
    }

    this.scene.add(this.groundGroup);
  }

  // -----------------------------------------------------------------------
  // Tree construction
  // -----------------------------------------------------------------------

  _buildTree() {
    // ---- Sprout ----
    const sproutGeo = new THREE.ConeGeometry(0.04, 0.25, 5);
    this.sproutMesh = new THREE.Mesh(sproutGeo, this.materials.sprout);
    this.sproutMesh.position.set(0, 0.12, 0);
    this.sproutMesh.scale.set(0, 0, 0);
    this.scene.add(this.sproutMesh);

    // ---- Trunk ----
    this.trunkGroup = new THREE.Group();
    // Main trunk as tapered cylinder (use two stacked cylinders for taper feel)
    const trunkLowerGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.5, 6);
    const trunkLower = new THREE.Mesh(trunkLowerGeo, this.materials.trunkDark);
    trunkLower.position.y = 0.75;
    this.trunkGroup.add(trunkLower);

    const trunkUpperGeo = new THREE.CylinderGeometry(0.07, 0.12, 1.2, 6);
    const trunkUpper = new THREE.Mesh(trunkUpperGeo, this.materials.trunkLight);
    trunkUpper.position.y = 2.1;
    this.trunkGroup.add(trunkUpper);

    this.trunkGroup.scale.set(0, 0, 0);
    this.scene.add(this.trunkGroup);

    // ---- Branches ----
    this._buildBranches();

    // ---- Leaf clusters ----
    this._buildLeaves();

    // ---- Flowers ----
    this._buildFlowers();
  }

  _buildBranches() {
    const branchData = [
      // [yPos, length, radiusBottom, radiusTop, angleY, angleZ, appearProgress]
      { y: 1.3, len: 0.8, rBot: 0.05, rTop: 0.03, ay: 0, az: -0.7, appear: 0.18 },
      { y: 1.7, len: 0.7, rBot: 0.045, rTop: 0.025, ay: Math.PI * 0.6, az: 0.65, appear: 0.22 },
      { y: 2.0, len: 0.6, rBot: 0.04, rTop: 0.02, ay: Math.PI * 1.2, az: -0.6, appear: 0.28 },
      { y: 2.3, len: 0.9, rBot: 0.05, rTop: 0.02, ay: Math.PI * 0.3, az: 0.55, appear: 0.35 },
      { y: 2.5, len: 0.7, rBot: 0.04, rTop: 0.02, ay: Math.PI * 1.0, az: -0.5, appear: 0.40 },
      { y: 2.7, len: 0.65, rBot: 0.035, rTop: 0.018, ay: Math.PI * 1.6, az: 0.6, appear: 0.45 },
      { y: 1.5, len: 0.75, rBot: 0.045, rTop: 0.025, ay: Math.PI * 0.9, az: -0.55, appear: 0.32 },
      { y: 2.1, len: 0.55, rBot: 0.035, rTop: 0.018, ay: Math.PI * 1.8, az: 0.7, appear: 0.50 },
    ];

    for (const bd of branchData) {
      const geo = new THREE.CylinderGeometry(bd.rTop, bd.rBot, bd.len, 5);
      geo.translate(0, bd.len / 2, 0);
      const mesh = new THREE.Mesh(
        geo,
        Math.random() > 0.5 ? this.materials.trunkDark : this.materials.trunkLight
      );
      mesh.position.set(0, bd.y, 0);
      mesh.rotation.order = 'YXZ';
      mesh.rotation.y = bd.ay;
      mesh.rotation.z = bd.az;
      mesh.scale.set(0, 0, 0);
      this.scene.add(mesh);

      this.branchGroups.push({
        mesh,
        baseScale: 1,
        baseY: bd.y,
        angleZ: bd.az,
        phaseOffset: Math.random() * Math.PI * 2,
        appearProgress: bd.appear,
        length: bd.len,
        angleY: bd.ay,
      });
    }
  }

  _buildLeaves() {
    // Leaf clusters at branch tips and around canopy
    const leafPositions = [
      // [x, y, z, scale, attachProgress]
      { x: -0.7, y: 1.9, z: 0.15, s: 0.35, appear: 0.36 },
      { x: 0.55, y: 2.2, z: -0.3, s: 0.3, appear: 0.38 },
      { x: -0.3, y: 2.6, z: 0.5, s: 0.4, appear: 0.42 },
      { x: 0.4, y: 2.8, z: 0.35, s: 0.38, appear: 0.46 },
      { x: -0.5, y: 2.9, z: -0.4, s: 0.35, appear: 0.50 },
      { x: 0.0, y: 3.2, z: 0.0, s: 0.5, appear: 0.45 },
      { x: 0.6, y: 2.5, z: 0.4, s: 0.32, appear: 0.52 },
      { x: -0.6, y: 2.4, z: -0.2, s: 0.36, appear: 0.48 },
      { x: 0.2, y: 3.0, z: -0.5, s: 0.42, appear: 0.55 },
      { x: -0.15, y: 3.4, z: 0.2, s: 0.38, appear: 0.58 },
      // Extra canopy for mature stage
      { x: 0.7, y: 3.0, z: 0.0, s: 0.36, appear: 0.62 },
      { x: -0.7, y: 3.1, z: 0.3, s: 0.34, appear: 0.65 },
      { x: 0.0, y: 3.6, z: -0.15, s: 0.45, appear: 0.60 },
      { x: 0.35, y: 3.3, z: 0.45, s: 0.30, appear: 0.68 },
      { x: -0.4, y: 3.5, z: -0.35, s: 0.33, appear: 0.70 },
    ];

    const geoA = new THREE.IcosahedronGeometry(1, 0);
    const geoB = new THREE.IcosahedronGeometry(1, 1);

    for (let i = 0; i < leafPositions.length; i++) {
      const lp = leafPositions[i];
      const geo = i % 2 === 0 ? geoA : geoB;
      const mat = i % 3 === 0 ? this.materials.leafB : this.materials.leafA;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(lp.x, lp.y, lp.z);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      mesh.scale.set(0, 0, 0);
      this.scene.add(mesh);

      this.leafClusters.push({
        mesh,
        baseScale: lp.s,
        attachProgress: lp.appear,
        phaseOffset: Math.random() * Math.PI * 2,
        baseY: lp.y,
      });
    }
  }

  _buildFlowers() {
    const flowerPositions = [
      { x: 0.5, y: 3.1, z: 0.3, s: 0.12, appear: 0.86 },
      { x: -0.45, y: 3.3, z: -0.2, s: 0.10, appear: 0.88 },
      { x: 0.15, y: 3.5, z: 0.4, s: 0.11, appear: 0.87 },
      { x: -0.3, y: 2.8, z: 0.5, s: 0.10, appear: 0.90 },
      { x: 0.6, y: 2.6, z: -0.3, s: 0.09, appear: 0.89 },
      { x: -0.55, y: 3.0, z: 0.1, s: 0.11, appear: 0.92 },
      { x: 0.25, y: 3.6, z: -0.1, s: 0.13, appear: 0.91 },
      { x: -0.1, y: 3.7, z: 0.25, s: 0.10, appear: 0.93 },
      { x: 0.4, y: 3.4, z: 0.35, s: 0.09, appear: 0.94 },
      { x: -0.5, y: 2.7, z: -0.4, s: 0.11, appear: 0.95 },
    ];

    const flowerGeo = new THREE.IcosahedronGeometry(1, 0);

    for (const fp of flowerPositions) {
      const mesh = new THREE.Mesh(flowerGeo, this.materials.flower);
      mesh.position.set(fp.x, fp.y, fp.z);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      mesh.scale.set(0, 0, 0);
      this.scene.add(mesh);

      this.flowerMeshes.push({
        mesh,
        baseScale: fp.s,
        attachProgress: fp.appear,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  // -----------------------------------------------------------------------
  // Particles
  // -----------------------------------------------------------------------

  _buildParticles() {
    const count = 40;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this._particleData = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 2.5;
      const height = 0.5 + Math.random() * 4.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      sizes[i] = 3 + Math.random() * 4;

      this._particleData.push({
        angle,
        radius,
        baseHeight: height,
        speed: 0.15 + Math.random() * 0.3,
        floatSpeed: 0.3 + Math.random() * 0.5,
        floatAmplitude: 0.15 + Math.random() * 0.25,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      color: 0x00d4aa,
      size: 0.06,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(geometry, particleMat);
    this.scene.add(this.particleSystem);
  }

  // -----------------------------------------------------------------------
  // Resize
  // -----------------------------------------------------------------------

  _setupResize() {
    this.resizeObserver = new ResizeObserver(() => this._onResize());
    this.resizeObserver.observe(this.container);
  }

  _onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // -----------------------------------------------------------------------
  // Animation Loop
  // -----------------------------------------------------------------------

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Smooth lerp progress
    this._currentProgress = lerp(
      this._currentProgress,
      this._targetProgress,
      Math.min(1, dt * 2.5)
    );
    const p = this._currentProgress;

    this._updateSprout(p, elapsed);
    this._updateTrunk(p);
    this._updateBranches(p, elapsed);
    this._updateLeaves(p, elapsed);
    this._updateFlowers(p, elapsed);
    this._updateParticles(p, elapsed, dt);
    this._updateGlow(p, elapsed);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // -----------------------------------------------------------------------
  // Per-frame updates
  // -----------------------------------------------------------------------

  _updateSprout(p, t) {
    // Sprout visible from 0.02 to ~0.25, then fades as trunk takes over
    const sproutAppear = smoothstep(0.02, 0.08, p);
    const sproutFade = 1 - smoothstep(0.18, 0.30, p);
    const s = sproutAppear * sproutFade;
    this.sproutMesh.scale.set(s, s, s);
    // Slight sway
    this.sproutMesh.rotation.z = Math.sin(t * 2) * 0.1 * s;
  }

  _updateTrunk(p) {
    // Trunk starts appearing at 0.15, full at 0.55
    const trunkScale = smoothstep(0.05, 0.5, p);
    // Also thicken with progress
    const thickness = lerp(0.5, 1.0, smoothstep(0.25, 0.70, p));
    this.trunkGroup.scale.set(thickness, trunkScale, thickness);
  }

  _updateBranches(p, t) {
    for (const b of this.branchGroups) {
      const appear = smoothstep(b.appearProgress, b.appearProgress + 0.12, p);
      const s = appear * b.baseScale;
      b.mesh.scale.set(s, s, s);

      // Gentle sway on branches
      if (appear > 0.01) {
        const swayAmount = 0.04 * appear;
        b.mesh.rotation.z =
          b.angleZ + Math.sin(t * 2.5 + b.phaseOffset) * swayAmount;
      }
    }
  }

  _updateLeaves(p, t) {
    for (const lc of this.leafClusters) {
      const appear = smoothstep(lc.attachProgress, lc.attachProgress + 0.10, p);
      const s = appear * lc.baseScale;
      lc.mesh.scale.set(s, s, s);

      // Gentle bob
      if (appear > 0.01) {
        lc.mesh.position.y =
          lc.baseY + Math.sin(t * 0.8 + lc.phaseOffset) * 0.03 * appear;
        lc.mesh.rotation.y += 0.002 * appear;
      }
    }
  }

  _updateFlowers(p, t) {
    for (const f of this.flowerMeshes) {
      const appear = smoothstep(f.attachProgress, f.attachProgress + 0.05, p);
      const pulse = 1 + Math.sin(t * 2.5 + f.phaseOffset) * 0.15 * appear;
      const s = appear * f.baseScale * pulse;
      f.mesh.scale.set(s, s, s);
      f.mesh.rotation.y += 0.01 * appear;
    }

    // Emissive intensity on flower material
    const bloomFactor = smoothstep(0.85, 1.0, p);
    this.materials.flower.emissiveIntensity = lerp(0.3, 0.8, bloomFactor);
  }

  _updateParticles(p, t, dt) {
    if (!this.particleSystem) return;

    // Particles start appearing faintly at 0.2, increasing with progress
    const particleOpacity = smoothstep(0.2, 0.6, p) * lerp(0.3, 0.8, smoothstep(0.6, 1.0, p));
    this.particleSystem.material.opacity = particleOpacity;

    // More visible particles as progress increases
    const activeRatio = smoothstep(0.15, 0.9, p);
    const posAttr = this.particleSystem.geometry.getAttribute('position');
    const count = this._particleData.length;
    const activeCount = Math.floor(activeRatio * count);

    for (let i = 0; i < count; i++) {
      const pd = this._particleData[i];
      if (i < activeCount) {
        pd.angle += pd.speed * dt;
        const x = Math.cos(pd.angle) * pd.radius;
        const z = Math.sin(pd.angle) * pd.radius;
        const y =
          pd.baseHeight +
          Math.sin(t * pd.floatSpeed + pd.phaseOffset) * pd.floatAmplitude;
        posAttr.setXYZ(i, x, y, z);
      } else {
        // Hide inactive particles below ground
        posAttr.setXYZ(i, 0, -10, 0);
      }
    }
    posAttr.needsUpdate = true;

    // Color shifts toward warmer with bloom
    const bloomFactor = smoothstep(0.85, 1.0, p);
    this.particleSystem.material.color.lerpColors(
      hexColor('#00d4aa'),
      hexColor('#e879f9'),
      bloomFactor * 0.5
    );
  }

  _updateGlow(p, t) {
    if (!this.glowLight) return;
    // Intensity grows with progress, pulses gently
    const baseIntensity = smoothstep(0.3, 0.9, p) * 1.5;
    const pulse = 1 + Math.sin(t * 1.5) * 0.15;
    this.glowLight.intensity = baseIntensity * pulse;
    this.glowLight.position.y = lerp(1, 2.8, smoothstep(0.2, 0.7, p));

    // Color shifts from green toward warm at bloom
    const bloomFactor = smoothstep(0.85, 1.0, p);
    this.glowLight.color.lerpColors(hexColor('#00d4aa'), hexColor('#e879f9'), bloomFactor * 0.4);
  }
}
