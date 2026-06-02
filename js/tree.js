import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function rand(lo = 0, hi = 1) { return lo + Math.random() * (hi - lo); }
function hexColor(hex) { return new THREE.Color(hex); }

function jitter(geo, amount) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setX(i, p.getX(i) + (Math.random() - 0.5) * amount);
    p.setY(i, p.getY(i) + (Math.random() - 0.5) * amount);
    p.setZ(i, p.getZ(i) + (Math.random() - 0.5) * amount);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function paintFaces(geo, baseHex, variation = 0.06) {
  const cnt = geo.attributes.position.count;
  const cols = new Float32Array(cnt * 3);
  const base = new THREE.Color(baseHex);
  for (let i = 0; i < cnt; i += 3) {
    const c = base.clone();
    c.r = clamp(c.r + (Math.random() - 0.5) * variation, 0, 1);
    c.g = clamp(c.g + (Math.random() - 0.5) * variation, 0, 1);
    c.b = clamp(c.b + (Math.random() - 0.5) * variation, 0, 1);
    for (let j = 0; j < 3; j++) { cols[(i+j)*3]=c.r; cols[(i+j)*3+1]=c.g; cols[(i+j)*3+2]=c.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

// ─── FocusTree ──────────────────────────────────────────────────────────────

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

    this._targetProgress = 0;
    this._currentProgress = 0;

    // Scene objects
    this.groundGroup = null;
    this.trunkGroup = null;
    this.branchGroups = [];
    this.leafClusters = [];
    this.flowerMeshes = [];
    this.fruitMeshes = [];
    this.particleSystem = null;
    this._particleData = [];
    this.sproutMesh = null;
    this.glowLight = null;
    this.grassBlades = [];
    this.fireflies = [];

    this.materials = {};
  }

  // ── Public API ────────────────────────────────────────────────────────────

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    this._createRenderer();
    this._createScene();
    this._createCamera();
    this._createControls();
    this._createMaterials();
    this._buildGround();
    this._buildGrass();
    this._buildTree();
    this._buildParticles();
    this._buildFireflies();
    this._setupResize();
    this._onResize();
    this._animate();
  }

  setProgress(p) { this._targetProgress = clamp(p, 0, 1); }
  getProgress() { return this._currentProgress; }

  dispose() {
    if (this.animId !== null) { cancelAnimationFrame(this.animId); this.animId = null; }
    if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
    if (this.controls) { this.controls.dispose(); this.controls = null; }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement?.parentNode?.removeChild(this.renderer.domElement);
      this.renderer = null;
    }
    if (this.scene) {
      this.scene.traverse(o => {
        o.geometry?.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      this.scene = null;
    }
    for (const k in this.materials) this.materials[k].dispose();
    this.materials = {};
  }

  // ── Renderer / Scene / Camera / Controls ──────────────────────────────────

  _createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setClearColor(0xefece6, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  _createScene() {
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0xfff8ee, 0.85));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(5, 10, 7);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd0e0ff, 0.3);
    fill.position.set(-4, 3, -3);
    this.scene.add(fill);

    this.glowLight = new THREE.PointLight(0x66bb6a, 0, 8);
    this.glowLight.position.set(0, 2, 0);
    this.scene.add(this.glowLight);
  }

  _createCamera() {
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(44, aspect, 0.1, 100);
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
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY };
  }

  // ── Materials ─────────────────────────────────────────────────────────────

  _createMaterials() {
    this.materials.trunkDark = new THREE.MeshLambertMaterial({ color: hexColor('#5D4037'), flatShading: true });
    this.materials.trunkLight = new THREE.MeshLambertMaterial({ color: hexColor('#795548'), flatShading: true });
    // Leaf greens — varied for painterly look
    this.materials.leafA = new THREE.MeshLambertMaterial({ color: hexColor('#7cb342'), flatShading: true });
    this.materials.leafB = new THREE.MeshLambertMaterial({ color: hexColor('#558b2f'), flatShading: true });
    this.materials.leafC = new THREE.MeshLambertMaterial({ color: hexColor('#9ccc65'), flatShading: true });
    this.materials.leafD = new THREE.MeshLambertMaterial({ color: hexColor('#689f38'), flatShading: true });
    this.materials.flower = new THREE.MeshLambertMaterial({
      color: hexColor('#ff80ab'), flatShading: true,
      emissive: hexColor('#ff80ab'), emissiveIntensity: 0.2,
    });
    this.materials.flowerB = new THREE.MeshLambertMaterial({
      color: hexColor('#ce93d8'), flatShading: true,
      emissive: hexColor('#ce93d8'), emissiveIntensity: 0.2,
    });
    this.materials.fruit = new THREE.MeshLambertMaterial({
      color: hexColor('#ef5350'), flatShading: true,
      emissive: hexColor('#ef5350'), emissiveIntensity: 0.1,
    });
    this.materials.fruitB = new THREE.MeshLambertMaterial({
      color: hexColor('#ffa726'), flatShading: true,
      emissive: hexColor('#ffa726'), emissiveIntensity: 0.1,
    });
    this.materials.ground = new THREE.MeshLambertMaterial({ color: hexColor('#7cb868'), flatShading: true });
    this.materials.mound = new THREE.MeshLambertMaterial({ color: hexColor('#6aad55'), flatShading: true });
    this.materials.grass = new THREE.MeshLambertMaterial({ color: hexColor('#5a9a48'), flatShading: true });
    this.materials.grassB = new THREE.MeshLambertMaterial({ color: hexColor('#8bc34a'), flatShading: true });
    this.materials.sprout = new THREE.MeshLambertMaterial({ color: hexColor('#66bb6a'), flatShading: true });
  }

  // ── Ground ────────────────────────────────────────────────────────────────

  _buildGround() {
    this.groundGroup = new THREE.Group();

    const groundGeo = jitter(new THREE.CircleGeometry(4, 14), 0.06);
    paintFaces(groundGeo, 0x7cb868, 0.03);
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.groundGroup.add(ground);

    const moundGeo = jitter(new THREE.SphereGeometry(0.7, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0.035);
    const mound = new THREE.Mesh(moundGeo, this.materials.mound);
    mound.scale.set(1.1, 0.4, 1.1);
    this.groundGroup.add(mound);

    this.scene.add(this.groundGroup);
  }

  // ── Grass ─────────────────────────────────────────────────────────────────

  _buildGrass() {
    const mats = [this.materials.grass, this.materials.grassB];
    for (let i = 0; i < 50; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(0.5, 3.0);
      const h = rand(0.12, 0.28);
      const geo = new THREE.ConeGeometry(0.025 + rand(0, 0.015), h, 4);
      const blade = new THREE.Mesh(geo, mats[i % 2]);
      blade.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      blade.rotation.z = rand(-0.2, 0.2);
      this.scene.add(blade);
      this.grassBlades.push({
        mesh: blade, baseRotZ: blade.rotation.z,
        phase: rand(0, 6.28), speed: rand(1.5, 3),
      });
    }
  }

  // ── Tree ──────────────────────────────────────────────────────────────────

  _buildTree() {
    this._buildSprout();
    this._buildTrunk();
    this._buildBranches();
    this._buildLeaves();
    this._buildFlowers();
    this._buildFruits();
  }

  _buildSprout() {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(
      jitter(new THREE.CylinderGeometry(0.02, 0.035, 0.4, 5), 0.004),
      this.materials.sprout
    );
    stem.position.y = 0.2;
    g.add(stem);
    for (const side of [-1, 1]) {
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 5, 4),
        this.materials.sprout
      );
      leaf.scale.set(1, 0.5, 1.3);
      leaf.position.set(side * 0.07, 0.42, 0);
      leaf.rotation.z = side * -0.5;
      g.add(leaf);
    }
    g.scale.setScalar(0);
    this.scene.add(g);
    this.sproutMesh = g;
  }

  _buildTrunk() {
    this.trunkGroup = new THREE.Group();

    // Lower trunk — thick, dark
    const lowerGeo = jitter(new THREE.CylinderGeometry(0.11, 0.19, 1.5, 7, 3), 0.012);
    paintFaces(lowerGeo, 0x5D4037, 0.04);
    const lower = new THREE.Mesh(lowerGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    lower.position.y = 0.75;
    this.trunkGroup.add(lower);

    // Upper trunk — thinner, lighter
    const upperGeo = jitter(new THREE.CylinderGeometry(0.06, 0.11, 1.2, 6, 2), 0.01);
    paintFaces(upperGeo, 0x795548, 0.04);
    const upper = new THREE.Mesh(upperGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    upper.position.y = 2.1;
    this.trunkGroup.add(upper);

    this.trunkGroup.scale.setScalar(0);
    this.scene.add(this.trunkGroup);
  }

  _buildBranches() {
    const data = [
      { y: 1.3, len: 0.8,  rBot: 0.05,  rTop: 0.03,  ay: 0,              az: -0.7,  appear: 0.18 },
      { y: 1.7, len: 0.7,  rBot: 0.045, rTop: 0.025, ay: Math.PI * 0.6,  az: 0.65,  appear: 0.22 },
      { y: 2.0, len: 0.6,  rBot: 0.04,  rTop: 0.02,  ay: Math.PI * 1.2,  az: -0.6,  appear: 0.28 },
      { y: 2.3, len: 0.9,  rBot: 0.05,  rTop: 0.02,  ay: Math.PI * 0.3,  az: 0.55,  appear: 0.35 },
      { y: 2.5, len: 0.7,  rBot: 0.04,  rTop: 0.02,  ay: Math.PI * 1.0,  az: -0.5,  appear: 0.40 },
      { y: 2.7, len: 0.65, rBot: 0.035, rTop: 0.018, ay: Math.PI * 1.6,  az: 0.6,   appear: 0.45 },
      { y: 1.5, len: 0.75, rBot: 0.045, rTop: 0.025, ay: Math.PI * 0.9,  az: -0.55, appear: 0.32 },
      { y: 2.1, len: 0.55, rBot: 0.035, rTop: 0.018, ay: Math.PI * 1.8,  az: 0.7,   appear: 0.50 },
    ];

    for (const bd of data) {
      const geo = new THREE.CylinderGeometry(bd.rTop, bd.rBot, bd.len, 5);
      geo.translate(0, bd.len / 2, 0);
      const mesh = new THREE.Mesh(geo, Math.random() > 0.5 ? this.materials.trunkDark : this.materials.trunkLight);
      mesh.position.set(0, bd.y, 0);
      mesh.rotation.order = 'YXZ';
      mesh.rotation.y = bd.ay;
      mesh.rotation.z = bd.az;
      mesh.scale.setScalar(0);
      this.scene.add(mesh);
      this.branchGroups.push({
        mesh, baseScale: 1, baseY: bd.y, angleZ: bd.az,
        phaseOffset: rand(0, 6.28), appearProgress: bd.appear,
      });
    }
  }

  _buildLeaves() {
    // Dense canopy — leaves positioned at branch tips and canopy volume
    const leafData = [
      // Branch-tip clusters (appear with their branch)
      { x: -0.7, y: 1.9, z: 0.15, s: 0.35, appear: 0.30 },
      { x: 0.55, y: 2.2, z: -0.3, s: 0.30, appear: 0.33 },
      { x: -0.3, y: 2.6, z: 0.5,  s: 0.40, appear: 0.38 },
      { x: 0.4,  y: 2.8, z: 0.35, s: 0.38, appear: 0.42 },
      { x: -0.5, y: 2.9, z: -0.4, s: 0.35, appear: 0.46 },
      { x: 0.0,  y: 3.2, z: 0.0,  s: 0.50, appear: 0.44 },
      { x: 0.6,  y: 2.5, z: 0.4,  s: 0.32, appear: 0.48 },
      { x: -0.6, y: 2.4, z: -0.2, s: 0.36, appear: 0.45 },
      // Upper canopy
      { x: 0.2,  y: 3.0, z: -0.5, s: 0.42, appear: 0.52 },
      { x: -0.15,y: 3.4, z: 0.2,  s: 0.38, appear: 0.55 },
      { x: 0.7,  y: 3.0, z: 0.0,  s: 0.36, appear: 0.58 },
      { x: -0.7, y: 3.1, z: 0.3,  s: 0.34, appear: 0.60 },
      { x: 0.0,  y: 3.6, z: -0.15,s: 0.45, appear: 0.56 },
      { x: 0.35, y: 3.3, z: 0.45, s: 0.30, appear: 0.62 },
      { x: -0.4, y: 3.5, z: -0.35,s: 0.33, appear: 0.65 },
      // Extra fill for dense look
      { x: -0.8, y: 2.7, z: -0.1, s: 0.38, appear: 0.50 },
      { x: 0.5,  y: 3.2, z: 0.3,  s: 0.32, appear: 0.57 },
      { x: -0.2, y: 2.5, z: 0.6,  s: 0.30, appear: 0.43 },
    ];

    const leafMats = [this.materials.leafA, this.materials.leafB, this.materials.leafC, this.materials.leafD];
    const geoA = jitter(new THREE.IcosahedronGeometry(1, 1), 0.08);
    const geoB = jitter(new THREE.IcosahedronGeometry(1, 0), 0.1);

    for (let i = 0; i < leafData.length; i++) {
      const lp = leafData[i];
      const geo = (i % 2 === 0 ? geoA : geoB).clone();
      const mesh = new THREE.Mesh(geo, leafMats[i % leafMats.length]);
      mesh.position.set(lp.x, lp.y, lp.z);
      mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      mesh.scale.setScalar(0);
      this.scene.add(mesh);
      this.leafClusters.push({
        mesh, baseScale: lp.s, attachProgress: lp.appear,
        phaseOffset: rand(0, 6.28), baseY: lp.y,
      });
    }
  }

  _buildFlowers() {
    const data = [
      { x: 0.5,  y: 3.1, z: 0.3,  s: 0.10, appear: 0.82 },
      { x: -0.45,y: 3.3, z: -0.2, s: 0.09, appear: 0.84 },
      { x: 0.15, y: 3.5, z: 0.4,  s: 0.10, appear: 0.83 },
      { x: -0.3, y: 2.8, z: 0.5,  s: 0.09, appear: 0.86 },
      { x: 0.6,  y: 2.6, z: -0.3, s: 0.08, appear: 0.85 },
      { x: -0.55,y: 3.0, z: 0.1,  s: 0.10, appear: 0.88 },
      { x: 0.25, y: 3.6, z: -0.1, s: 0.11, appear: 0.87 },
      { x: -0.1, y: 3.7, z: 0.25, s: 0.09, appear: 0.90 },
      { x: 0.4,  y: 3.4, z: 0.35, s: 0.08, appear: 0.89 },
      { x: -0.5, y: 2.7, z: -0.4, s: 0.10, appear: 0.91 },
    ];

    const flowerGeo = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < data.length; i++) {
      const fp = data[i];
      const mat = i % 2 === 0 ? this.materials.flower : this.materials.flowerB;
      const mesh = new THREE.Mesh(flowerGeo, mat);
      mesh.position.set(fp.x, fp.y, fp.z);
      mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      mesh.scale.setScalar(0);
      this.scene.add(mesh);
      this.flowerMeshes.push({
        mesh, mat, baseScale: fp.s, attachProgress: fp.appear,
        phaseOffset: rand(0, 6.28),
      });
    }
  }

  _buildFruits() {
    const data = [
      { x: 0.45, y: 2.55, z: 0.3,  s: 0.055, appear: 0.88 },
      { x: -0.4, y: 2.75, z: -0.25,s: 0.05,  appear: 0.90 },
      { x: 0.2,  y: 3.15, z: 0.45, s: 0.055, appear: 0.91 },
      { x: -0.3, y: 2.95, z: 0.4,  s: 0.05,  appear: 0.93 },
      { x: 0.55, y: 2.95, z: -0.15,s: 0.05,  appear: 0.92 },
      { x: -0.5, y: 2.45, z: 0.3,  s: 0.045, appear: 0.94 },
    ];

    const fruitGeo = new THREE.SphereGeometry(1, 6, 5);
    for (let i = 0; i < data.length; i++) {
      const fd = data[i];
      const mat = i % 2 === 0 ? this.materials.fruit : this.materials.fruitB;
      const mesh = new THREE.Mesh(fruitGeo, mat);
      mesh.position.set(fd.x, fd.y, fd.z);
      mesh.scale.setScalar(0);
      this.scene.add(mesh);
      this.fruitMeshes.push({
        mesh, mat, baseScale: fd.s, attachProgress: fd.appear,
        phaseOffset: rand(0, 6.28),
      });
    }
  }

  // ── Particles (firefly-like energy) ───────────────────────────────────────

  _buildParticles() {
    const count = 40;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    this._particleData = [];

    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const radius = 0.5 + rand(0, 2.5);
      const height = 0.5 + rand(0, 4.5);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      sizes[i] = 3 + rand(0, 4);
      this._particleData.push({
        angle, radius, baseHeight: height,
        speed: 0.15 + rand(0, 0.3),
        floatSpeed: 0.3 + rand(0, 0.5),
        floatAmplitude: 0.15 + rand(0, 0.25),
        phaseOffset: rand(0, Math.PI * 2),
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleSystem = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0x66bb6a, size: 0.06, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.scene.add(this.particleSystem);
  }

  // ── Fireflies ─────────────────────────────────────────────────────────────

  _buildFireflies() {
    for (let i = 0; i < 18; i++) {
      const geo = new THREE.SphereGeometry(0.03, 4, 3);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      const a = rand(0, 6.28), d = rand(0.8, 2.5), y = rand(1.0, 4.0);
      mesh.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
      this.scene.add(mesh);
      this.fireflies.push({
        mesh, angle: a, dist: d, baseY: y,
        speed: rand(0.2, 0.6), floatSpd: rand(0.4, 1.0), floatAmp: rand(0.15, 0.45),
        phase: rand(0, 6.28), blinkPhase: rand(0, 6.28), blinkSpd: rand(1.5, 3.5),
      });
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  _setupResize() {
    this.resizeObserver = new ResizeObserver(() => this._onResize());
    this.resizeObserver.observe(this.container);
  }

  _onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth, h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Animation Loop ────────────────────────────────────────────────────────

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    this._currentProgress = lerp(this._currentProgress, this._targetProgress, Math.min(1, dt * 2.5));
    const p = this._currentProgress;

    this._updateGrass(t);
    this._updateSprout(p, t);
    this._updateTrunk(p);
    this._updateBranches(p, t);
    this._updateLeaves(p, t);
    this._updateFlowers(p, t);
    this._updateFruits(p, t);
    this._updateParticles(p, t, dt);
    this._updateFireflies(p, t, dt);
    this._updateGlow(p, t);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ── Per-frame updates ─────────────────────────────────────────────────────

  _updateGrass(t) {
    for (const g of this.grassBlades) {
      g.mesh.rotation.z = g.baseRotZ + Math.sin(t * g.speed + g.phase) * 0.06;
    }
  }

  _updateSprout(p, t) {
    const appear = smoothstep(0.01, 0.06, p);
    const fade = 1 - smoothstep(0.15, 0.28, p);
    const s = appear * fade * 1.5;
    this.sproutMesh.scale.setScalar(s);
    this.sproutMesh.rotation.z = Math.sin(t * 2) * 0.08 * s;
  }

  _updateTrunk(p) {
    // Trunk grows up from ground — scaleY drives height, width thickens
    const scaleY = smoothstep(0.08, 0.50, p);
    const thickness = lerp(0.4, 1.0, smoothstep(0.15, 0.60, p));
    this.trunkGroup.scale.set(thickness, scaleY, thickness);
  }

  _updateBranches(p, t) {
    for (const b of this.branchGroups) {
      const appear = smoothstep(b.appearProgress, b.appearProgress + 0.12, p);
      b.mesh.scale.setScalar(appear * b.baseScale);
      if (appear > 0.01) {
        b.mesh.rotation.z = b.angleZ + Math.sin(t * 1.2 + b.phaseOffset) * 0.04 * appear;
      }
    }
  }

  _updateLeaves(p, t) {
    for (const lc of this.leafClusters) {
      const appear = smoothstep(lc.attachProgress, lc.attachProgress + 0.10, p);
      const s = appear * lc.baseScale;
      // Breathing
      const breath = 1 + Math.sin(t * 1.2 + lc.phaseOffset) * 0.025 * appear;
      lc.mesh.scale.setScalar(s * breath);
      if (appear > 0.01) {
        lc.mesh.position.y = lc.baseY + Math.sin(t * 0.8 + lc.phaseOffset) * 0.025 * appear;
        lc.mesh.rotation.y += 0.002 * appear;
      }
    }
  }

  _updateFlowers(p, t) {
    for (const f of this.flowerMeshes) {
      const appear = smoothstep(f.attachProgress, f.attachProgress + 0.05, p);
      const pulse = 1 + Math.sin(t * 2.5 + f.phaseOffset) * 0.15 * appear;
      f.mesh.scale.setScalar(appear * f.baseScale * pulse);
      f.mesh.rotation.y += 0.01 * appear;
    }
    // Bloom glow
    const bloom = smoothstep(0.82, 1.0, p);
    this.materials.flower.emissiveIntensity = lerp(0.2, 0.7, bloom);
    this.materials.flowerB.emissiveIntensity = lerp(0.2, 0.7, bloom);
  }

  _updateFruits(p, t) {
    for (const fr of this.fruitMeshes) {
      const appear = smoothstep(fr.attachProgress, fr.attachProgress + 0.04, p);
      const dangle = 1 + Math.sin(t * 1.6 + fr.phaseOffset) * 0.1 * appear;
      fr.mesh.scale.setScalar(appear * fr.baseScale * dangle);
    }
    const bloom = smoothstep(0.88, 1.0, p);
    this.materials.fruit.emissiveIntensity = lerp(0.1, 0.4, bloom);
    this.materials.fruitB.emissiveIntensity = lerp(0.1, 0.4, bloom);
  }

  _updateParticles(p, t, dt) {
    if (!this.particleSystem) return;
    const opacity = smoothstep(0.2, 0.6, p) * lerp(0.3, 0.8, smoothstep(0.6, 1.0, p));
    this.particleSystem.material.opacity = opacity;

    const activeRatio = smoothstep(0.15, 0.9, p);
    const posAttr = this.particleSystem.geometry.getAttribute('position');
    const count = this._particleData.length;
    const activeCount = Math.floor(activeRatio * count);

    for (let i = 0; i < count; i++) {
      const pd = this._particleData[i];
      if (i < activeCount) {
        pd.angle += pd.speed * dt;
        posAttr.setXYZ(i,
          Math.cos(pd.angle) * pd.radius,
          pd.baseHeight + Math.sin(t * pd.floatSpeed + pd.phaseOffset) * pd.floatAmplitude,
          Math.sin(pd.angle) * pd.radius
        );
      } else {
        posAttr.setXYZ(i, 0, -10, 0);
      }
    }
    posAttr.needsUpdate = true;

    const bloom = smoothstep(0.85, 1.0, p);
    this.particleSystem.material.color.lerpColors(hexColor('#66bb6a'), hexColor('#ce93d8'), bloom * 0.5);
  }

  _updateFireflies(p, t, dt) {
    const vis = smoothstep(0.50, 0.60, p);
    if (vis <= 0) return;
    for (const ff of this.fireflies) {
      ff.angle += ff.speed * dt;
      ff.mesh.position.set(
        Math.cos(ff.angle) * ff.dist,
        ff.baseY + Math.sin(t * ff.floatSpd + ff.phase) * ff.floatAmp,
        Math.sin(ff.angle) * ff.dist
      );
      const blink = Math.pow((Math.sin(t * ff.blinkSpd + ff.blinkPhase) + 1) * 0.5, 2);
      ff.mesh.material.opacity = vis * blink * 0.85;
      ff.mesh.scale.setScalar(lerp(0.5, 1.3, blink) * vis);
    }
  }

  _updateGlow(p, t) {
    if (!this.glowLight) return;
    const base = smoothstep(0.3, 0.9, p) * 1.8;
    this.glowLight.intensity = base * (1 + Math.sin(t * 1.5) * 0.12);
    this.glowLight.position.y = lerp(1, 3.0, smoothstep(0.2, 0.7, p));
    const bloom = smoothstep(0.85, 1.0, p);
    this.glowLight.color.lerpColors(hexColor('#66bb6a'), hexColor('#ce93d8'), bloom * 0.4);
  }
}
