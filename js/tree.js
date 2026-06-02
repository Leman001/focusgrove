import * as THREE from 'three';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function rand(lo = 0, hi = 1) { return lo + Math.random() * (hi - lo); }

/** Jitter vertices for organic low-poly feel */
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

/** Assign per-face colors for painterly variation */
function paintFaces(geo, baseColor, variation = 0.08) {
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const base = new THREE.Color(baseColor);
  for (let i = 0; i < count; i += 3) {
    const c = base.clone();
    c.r += (Math.random() - 0.5) * variation;
    c.g += (Math.random() - 0.5) * variation;
    c.b += (Math.random() - 0.5) * variation;
    for (let j = 0; j < 3; j++) {
      colors[(i + j) * 3] = c.r;
      colors[(i + j) * 3 + 1] = c.g;
      colors[(i + j) * 3 + 2] = c.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

// ─── Colour Palette ──────────────────────────────────────────────────────────

const PAL = {
  ground:  0xd2c9a8,
  mound:   0xb8a57a,
  grass1:  0x5cba6f,
  grass2:  0x3d9952,
  grass3:  0x7ed890,
  trunk:   0x9c7c52,
  trunkD:  0x7a5c35,
  leaf1:   0x5ba06e,
  leaf2:   0x3d8a57,
  leaf3:   0x7ec48a,
  flower1: 0xff8aac,
  flower2: 0xffb347,
  flower3: 0xc084fc,
  fruit1:  0xff6b6b,
  fruit2:  0xfbbf24,
  fruit3:  0xff8a4c,
  firefly: 0xfde68a,
  sparkle: 0xffffff,
};

// ─── FocusTree ───────────────────────────────────────────────────────────────

export class FocusTree {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    this.animId = null;
    this.resizeObs = null;

    this._targetProgress = 0;
    this._currentProgress = 0;
    this._prevMilestone = -1; // for burst effects

    // Scene objects
    this.sceneRoot = new THREE.Group();
    this.grassBlades = [];
    this.sprout = null;
    this.trunkParts = [];
    this.crownParts = [];   // { mesh, mat, baseY, baseScale, appear }
    this.flowers = [];       // { mesh, appear, phase }
    this.fruits = [];        // { mesh, appear, phase }
    this.fireflies = [];     // { mesh, vel, phase }
    this.sparkles = [];      // burst particles
    this.glowLight = null;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    this._createRenderer();
    this._createScene();
    this._createCamera();
    this._buildGround();
    this._buildGrass();
    this._buildSprout();
    this._buildTrunk();
    this._buildCrown();
    this._buildFlowersAndFruits();
    this._buildFireflies();
    this._buildSparkles();
    this._setupResize();
    this._onResize();
    this._animate();
  }

  setProgress(p) { this._targetProgress = clamp(p, 0, 1); }

  dispose() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement?.parentNode?.removeChild(this.renderer.domElement);
    }
    this.scene?.traverse(o => {
      o.geometry?.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
  }

  // ── Renderer / Scene / Camera ─────────────────────────────────────────────

  _createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setClearColor(0xefece6, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  _createScene() {
    this.scene = new THREE.Scene();
    this.scene.add(this.sceneRoot);

    // Warm ambient
    this.scene.add(new THREE.AmbientLight(0xfff8ee, 1.0));

    // Key light (sun, warm)
    const sun = new THREE.DirectionalLight(0xfff0cc, 1.2);
    sun.position.set(3, 8, 5);
    this.scene.add(sun);

    // Fill light (cool blue, subtle)
    const fill = new THREE.DirectionalLight(0xd0e0ff, 0.35);
    fill.position.set(-4, 3, -3);
    this.scene.add(fill);

    // Rim light (back-light for drama)
    const rim = new THREE.DirectionalLight(0xffe4c4, 0.45);
    rim.position.set(-2, 6, -5);
    this.scene.add(rim);

    // Point glow that grows with the tree
    this.glowLight = new THREE.PointLight(0x5cba6f, 0, 6);
    this.glowLight.position.set(0, 2, 0);
    this.sceneRoot.add(this.glowLight);
  }

  _createCamera() {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera = new THREE.PerspectiveCamera(48, w / (h || 1), 0.1, 100);
    // Initial position — will be animated
    this.camera.position.set(0, 2.5, 5.5);
    this.camera.lookAt(0, 1.2, 0);
  }

  // ── Ground ────────────────────────────────────────────────────────────────

  _buildGround() {
    // Large ground disc
    const gGeo = jitter(new THREE.CircleGeometry(4.5, 12), 0.08);
    paintFaces(gGeo, PAL.ground, 0.03);
    const ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({
      vertexColors: true, flatShading: true,
    }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.sceneRoot.add(ground);

    // Central mound
    const mGeo = jitter(new THREE.SphereGeometry(0.7, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0.04);
    const mound = new THREE.Mesh(mGeo, new THREE.MeshLambertMaterial({
      color: PAL.mound, flatShading: true,
    }));
    mound.scale.set(1, 0.4, 1);
    this.sceneRoot.add(mound);

    // Decorative rocks
    const rockMat = new THREE.MeshLambertMaterial({ color: 0xb8a88a, flatShading: true });
    const rocks = [
      [1.5, 0.06, 0.8, 0.14], [-1.7, 0.05, -0.6, 0.11], [0.8, 0.07, -1.5, 0.16],
      [-0.7, 0.04, 1.6, 0.09], [2.1, 0.05, -0.3, 0.10], [-2.0, 0.06, 0.4, 0.12],
    ];
    for (const [x, y, z, s] of rocks) {
      const rGeo = jitter(new THREE.IcosahedronGeometry(s, 0), 0.025);
      const rock = new THREE.Mesh(rGeo, rockMat);
      rock.position.set(x, y, z);
      rock.rotation.set(rand(0, Math.PI), rand(0, Math.PI), 0);
      rock.scale.y = 0.55;
      this.sceneRoot.add(rock);
    }
  }

  // ── Grass ─────────────────────────────────────────────────────────────────

  _buildGrass() {
    const grassColors = [PAL.grass1, PAL.grass2, PAL.grass3];

    // Ring of grass clusters
    for (let i = 0; i < 40; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(0.6, 3.2);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const h = rand(0.15, 0.35);
      const geo = new THREE.ConeGeometry(0.03 + rand(0, 0.02), h, 4);
      const mat = new THREE.MeshLambertMaterial({
        color: grassColors[Math.floor(rand(0, 3))],
        flatShading: true,
      });
      const blade = new THREE.Mesh(geo, mat);
      blade.position.set(x, h / 2, z);
      blade.rotation.z = rand(-0.2, 0.2);
      blade.rotation.x = rand(-0.1, 0.1);
      this.sceneRoot.add(blade);

      this.grassBlades.push({
        mesh: blade,
        baseY: h / 2,
        baseRotZ: blade.rotation.z,
        phase: rand(0, Math.PI * 2),
        speed: rand(1.5, 3.0),
      });
    }
  }

  // ── Sprout ────────────────────────────────────────────────────────────────

  _buildSprout() {
    const group = new THREE.Group();

    // Stem
    const stemGeo = jitter(new THREE.CylinderGeometry(0.025, 0.04, 0.5, 5), 0.005);
    const stem = new THREE.Mesh(stemGeo, new THREE.MeshLambertMaterial({
      color: 0x5cb874, flatShading: true,
    }));
    stem.position.y = 0.25;
    group.add(stem);

    // Two leaves
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x6ec97e, flatShading: true });
    for (const side of [-1, 1]) {
      const lGeo = new THREE.SphereGeometry(0.07, 5, 4);
      lGeo.scale(1, 0.5, 1.5);
      const leaf = new THREE.Mesh(lGeo, leafMat);
      leaf.position.set(side * 0.08, 0.48, 0);
      leaf.rotation.z = side * -0.5;
      group.add(leaf);
    }

    group.scale.setScalar(0);
    this.sceneRoot.add(group);
    this.sprout = group;
  }

  // ── Trunk ─────────────────────────────────────────────────────────────────

  _buildTrunk() {
    // Lower trunk (thick, darker)
    const t1Geo = jitter(new THREE.CylinderGeometry(0.09, 0.2, 1.6, 8, 3), 0.015);
    paintFaces(t1Geo, PAL.trunk, 0.06);
    const t1 = new THREE.Mesh(t1Geo, new THREE.MeshLambertMaterial({
      vertexColors: true, flatShading: true,
    }));
    t1.position.y = 0.8;
    t1.scale.setScalar(0);
    this.sceneRoot.add(t1);
    this.trunkParts.push({ mesh: t1, appear: 0.08, targetScale: 1 });

    // Upper trunk (thinner, lighter)
    const t2Geo = jitter(new THREE.CylinderGeometry(0.06, 0.1, 1.0, 7, 2), 0.012);
    paintFaces(t2Geo, PAL.trunkD, 0.05);
    const t2 = new THREE.Mesh(t2Geo, new THREE.MeshLambertMaterial({
      vertexColors: true, flatShading: true,
    }));
    t2.position.y = 2.1;
    t2.scale.setScalar(0);
    this.sceneRoot.add(t2);
    this.trunkParts.push({ mesh: t2, appear: 0.15, targetScale: 1 });

    // Branches
    const branches = [
      { y: 1.4, len: 0.6, rBot: 0.04, rTop: 0.02, ay: 0, az: -0.65, appear: 0.22 },
      { y: 1.8, len: 0.5, rBot: 0.035, rTop: 0.018, ay: Math.PI * 0.65, az: 0.60, appear: 0.28 },
      { y: 2.0, len: 0.55, rBot: 0.035, rTop: 0.018, ay: Math.PI * 1.3, az: -0.55, appear: 0.34 },
      { y: 2.2, len: 0.4, rBot: 0.03, rTop: 0.015, ay: Math.PI * 0.35, az: 0.50, appear: 0.40 },
    ];
    for (const b of branches) {
      const geo = new THREE.CylinderGeometry(b.rTop, b.rBot, b.len, 5);
      geo.translate(0, b.len / 2, 0);
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
        color: rand() > 0.5 ? PAL.trunk : PAL.trunkD, flatShading: true,
      }));
      mesh.position.y = b.y;
      mesh.rotation.order = 'YXZ';
      mesh.rotation.y = b.ay;
      mesh.rotation.z = b.az;
      mesh.scale.setScalar(0);
      this.sceneRoot.add(mesh);
      this.trunkParts.push({ mesh, appear: b.appear, targetScale: 1, angleZ: b.az, phase: rand(0, Math.PI * 2) });
    }
  }

  // ── Crown ─────────────────────────────────────────────────────────────────

  _buildCrown() {
    const crownDefs = [
      // Main crown clusters — detail 1 for smoother look
      { x: 0.0,  y: 2.9, z: 0.0,  r: 1.05, detail: 1, appear: 0.28, color: PAL.leaf1 },
      { x: -0.7, y: 2.4, z: 0.2,  r: 0.72, detail: 1, appear: 0.34, color: PAL.leaf2 },
      { x: 0.65, y: 2.5, z: -0.2, r: 0.65, detail: 1, appear: 0.38, color: PAL.leaf3 },
      { x: 0.1,  y: 2.3, z: 0.65, r: 0.55, detail: 1, appear: 0.42, color: PAL.leaf1 },
      { x: -0.3, y: 2.5, z: -0.6, r: 0.50, detail: 1, appear: 0.46, color: PAL.leaf2 },
      // Upper canopy (appears later)
      { x: 0.0,  y: 3.4, z: 0.0,  r: 0.75, detail: 1, appear: 0.52, color: PAL.leaf3 },
      { x: 0.5,  y: 3.0, z: 0.4,  r: 0.50, detail: 1, appear: 0.56, color: PAL.leaf1 },
      { x: -0.5, y: 3.1, z: -0.3, r: 0.48, detail: 1, appear: 0.58, color: PAL.leaf2 },
    ];

    for (const d of crownDefs) {
      const geo = jitter(new THREE.IcosahedronGeometry(d.r, d.detail), d.r * 0.12);
      paintFaces(geo, d.color, 0.06);
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.x, d.y, d.z);
      mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      mesh.scale.setScalar(0);
      this.sceneRoot.add(mesh);
      this.crownParts.push({
        mesh, mat, appear: d.appear,
        baseY: d.y, baseScale: 1,
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  // ── Flowers & Fruits ──────────────────────────────────────────────────────

  _buildFlowersAndFruits() {
    // Flowers — appear at 70%
    const flowerColors = [PAL.flower1, PAL.flower2, PAL.flower3];
    const flowerDefs = [
      { x: 0.55, y: 3.1, z: 0.35 }, { x: -0.5, y: 3.2, z: -0.25 },
      { x: 0.2,  y: 3.5, z: 0.4 },  { x: -0.35, y: 2.7, z: 0.55 },
      { x: 0.6,  y: 2.6, z: -0.35 }, { x: -0.55, y: 2.9, z: 0.15 },
      { x: 0.3,  y: 3.6, z: -0.15 }, { x: -0.15, y: 3.7, z: 0.3 },
      { x: 0.45, y: 3.3, z: 0.45 },  { x: -0.6,  y: 2.6, z: -0.4 },
      { x: 0.0,  y: 3.8, z: 0.0 },   { x: 0.7,   y: 2.8, z: 0.1 },
    ];
    for (let i = 0; i < flowerDefs.length; i++) {
      const fd = flowerDefs[i];
      // Small 5-petal flower = dodecahedron
      const geo = new THREE.DodecahedronGeometry(0.08, 0);
      const color = flowerColors[i % flowerColors.length];
      const mat = new THREE.MeshLambertMaterial({
        color, flatShading: true,
        emissive: new THREE.Color(color), emissiveIntensity: 0.2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(fd.x, fd.y, fd.z);
      mesh.rotation.set(rand(0, Math.PI), rand(0, Math.PI), rand(0, Math.PI));
      mesh.scale.setScalar(0);
      this.sceneRoot.add(mesh);
      this.flowers.push({ mesh, mat, appear: 0.70 + i * 0.018, phase: rand(0, Math.PI * 2) });
    }

    // Fruits — appear at 82%
    const fruitColors = [PAL.fruit1, PAL.fruit2, PAL.fruit3];
    const fruitDefs = [
      { x: 0.4, y: 2.6, z: 0.3 }, { x: -0.45, y: 2.8, z: -0.2 },
      { x: 0.15, y: 3.2, z: 0.5 }, { x: -0.3, y: 3.0, z: 0.4 },
      { x: 0.55, y: 3.0, z: -0.15 }, { x: -0.5, y: 2.5, z: 0.3 },
      { x: 0.0, y: 3.5, z: -0.3 }, { x: 0.35, y: 2.4, z: -0.45 },
    ];
    for (let i = 0; i < fruitDefs.length; i++) {
      const fd = fruitDefs[i];
      const geo = new THREE.SphereGeometry(0.06, 6, 5);
      const color = fruitColors[i % fruitColors.length];
      const mat = new THREE.MeshLambertMaterial({
        color, flatShading: true,
        emissive: new THREE.Color(color), emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(fd.x, fd.y, fd.z);
      mesh.scale.setScalar(0);
      this.sceneRoot.add(mesh);
      this.fruits.push({ mesh, mat, appear: 0.82 + i * 0.02, phase: rand(0, Math.PI * 2) });
    }
  }

  // ── Fireflies ─────────────────────────────────────────────────────────────

  _buildFireflies() {
    const mat = new THREE.MeshBasicMaterial({
      color: PAL.firefly, transparent: true, opacity: 0,
    });

    for (let i = 0; i < 20; i++) {
      const geo = new THREE.SphereGeometry(0.03, 4, 3);
      const mesh = new THREE.Mesh(geo, mat.clone());

      const angle = rand(0, Math.PI * 2);
      const dist = rand(0.8, 2.2);
      const y = rand(1.0, 4.0);
      mesh.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
      this.sceneRoot.add(mesh);

      this.fireflies.push({
        mesh,
        baseAngle: angle,
        baseDist: dist,
        baseY: y,
        speed: rand(0.3, 0.8),
        floatSpeed: rand(0.5, 1.2),
        floatAmp: rand(0.2, 0.5),
        phase: rand(0, Math.PI * 2),
        blinkPhase: rand(0, Math.PI * 2),
        blinkSpeed: rand(1.5, 4.0),
      });
    }
  }

  // ── Sparkle Burst (milestone reward) ──────────────────────────────────────

  _buildSparkles() {
    const mat = new THREE.MeshBasicMaterial({
      color: PAL.sparkle, transparent: true, opacity: 0,
    });

    for (let i = 0; i < 30; i++) {
      const geo = new THREE.SphereGeometry(0.025, 4, 3);
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(0, 2, 0);
      mesh.visible = false;
      this.sceneRoot.add(mesh);
      this.sparkles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
      });
    }
  }

  _triggerBurst(y) {
    for (const s of this.sparkles) {
      s.mesh.visible = true;
      s.mesh.position.set(rand(-0.3, 0.3), y + rand(-0.2, 0.2), rand(-0.3, 0.3));
      s.vel.set(rand(-2, 2), rand(1, 4), rand(-2, 2));
      s.life = 0;
      s.maxLife = rand(0.6, 1.2);
      s.mesh.material.opacity = 1;
      s.mesh.material.color.setHex(
        [0xffffff, 0xfde68a, 0xff8aac, 0xc084fc, 0x5cba6f][Math.floor(rand(0, 5))]
      );
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  _setupResize() {
    this.resizeObs = new ResizeObserver(() => this._onResize());
    this.resizeObs.observe(this.container);
  }

  _onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Animation Loop ────────────────────────────────────────────────────────

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    // Smooth progress lerp
    this._currentProgress = lerp(this._currentProgress, this._targetProgress, Math.min(1, dt * 2.5));
    const p = this._currentProgress;

    // Check milestones for burst
    const milestone = Math.floor(p * 10); // every 10%
    if (milestone > this._prevMilestone && milestone > 0) {
      this._prevMilestone = milestone;
      this._triggerBurst(lerp(1.0, 3.5, p));
    }

    this._updateCamera(p, t);
    this._updateGrass(p, t);
    this._updateSprout(p, t);
    this._updateTrunk(p, t);
    this._updateCrown(p, t);
    this._updateFlowers(p, t);
    this._updateFruits(p, t);
    this._updateFireflies(p, t, dt);
    this._updateSparkles(dt);
    this._updateGlow(p, t);

    this.renderer.render(this.scene, this.camera);
  }

  // ── Per-Frame Updates ─────────────────────────────────────────────────────

  _updateCamera(p, t) {
    // Orbit gently around the tree
    const orbitAngle = t * 0.15;
    const dist = lerp(4.5, 6.5, smoothstep(0.0, 0.5, p));
    const height = lerp(2.0, 4.5, smoothstep(0.0, 0.5, p));
    const lookY = lerp(0.5, 2.0, smoothstep(0.0, 0.5, p));

    this.camera.position.set(
      Math.sin(orbitAngle) * dist,
      height,
      Math.cos(orbitAngle) * dist
    );
    this.camera.lookAt(0, lookY, 0);
  }

  _updateGrass(p, t) {
    for (const g of this.grassBlades) {
      // Gentle wave sway
      const sway = Math.sin(t * g.speed + g.phase) * 0.08;
      g.mesh.rotation.z = g.baseRotZ + sway;

      // Grow slightly with progress
      const grow = lerp(0.7, 1.0, smoothstep(0.0, 0.3, p));
      g.mesh.scale.setScalar(grow);
    }
  }

  _updateSprout(p, t) {
    // Appears at 0%, fades by 25%
    const appear = smoothstep(0.0, 0.03, p);
    const fade = 1 - smoothstep(0.18, 0.32, p);
    const s = Math.max(1.5, 1.5 * appear) * fade;
    this.sprout.scale.setScalar(s);
    this.sprout.rotation.z = Math.sin(t * 2.2) * 0.1 * s;
    // Subtle bounce
    this.sprout.position.y = Math.sin(t * 3.0) * 0.01 * s;
  }

  _updateTrunk(p, t) {
    for (const tp of this.trunkParts) {
      const s = smoothstep(tp.appear, tp.appear + 0.15, p) * tp.targetScale;
      tp.mesh.scale.setScalar(s);

      // Branches sway
      if (tp.angleZ !== undefined && s > 0.01) {
        tp.mesh.rotation.z = tp.angleZ + Math.sin(t * 2.0 + tp.phase) * 0.04 * s;
      }
    }
  }

  _updateCrown(p, t) {
    for (const cp of this.crownParts) {
      const s = smoothstep(cp.appear, cp.appear + 0.15, p) * cp.baseScale;
      cp.mesh.scale.setScalar(s);

      if (s > 0.01) {
        // Gentle bob
        cp.mesh.position.y = cp.baseY + Math.sin(t * 0.9 + cp.phase) * 0.03 * s;
        // Slow rotate
        cp.mesh.rotation.y += 0.002 * s;

        // Breathing scale (ADHD dopamine — subtle size pulse)
        const breath = 1 + Math.sin(t * 1.5 + cp.phase) * 0.03;
        cp.mesh.scale.setScalar(s * breath);
      }
    }
  }

  _updateFlowers(p, t) {
    for (const f of this.flowers) {
      const s = smoothstep(f.appear, f.appear + 0.05, p);
      // Pop-in with overshoot
      const overshoot = s > 0 && s < 1 ? 1 + Math.sin(s * Math.PI) * 0.3 : 1;
      const pulse = 1 + Math.sin(t * 3.0 + f.phase) * 0.15 * s;
      f.mesh.scale.setScalar(s * pulse * overshoot);
      f.mesh.rotation.y += 0.015 * s;

      // Emissive pulse for glow
      if (f.mat.emissive) {
        f.mat.emissiveIntensity = lerp(0.2, 0.6, (Math.sin(t * 2.5 + f.phase) + 1) * 0.5) * s;
      }
    }
  }

  _updateFruits(p, t) {
    for (const fr of this.fruits) {
      const s = smoothstep(fr.appear, fr.appear + 0.04, p);
      // Juicy bounce-in
      const bounce = s > 0 && s < 1 ? 1 + Math.sin(s * Math.PI) * 0.5 : 1;
      const dangle = Math.sin(t * 1.8 + fr.phase) * 0.06 * s;
      fr.mesh.scale.setScalar(s * bounce);
      fr.mesh.position.y += dangle * 0.01;

      if (fr.mat.emissive) {
        fr.mat.emissiveIntensity = lerp(0.15, 0.45, (Math.sin(t * 2.0 + fr.phase) + 1) * 0.5) * s;
      }
    }
  }

  _updateFireflies(p, t, dt) {
    const fireflyAppear = smoothstep(0.50, 0.60, p);
    if (fireflyAppear <= 0) return;

    for (const ff of this.fireflies) {
      // Orbit around tree
      ff.baseAngle += ff.speed * dt;
      const x = Math.cos(ff.baseAngle) * ff.baseDist;
      const z = Math.sin(ff.baseAngle) * ff.baseDist;
      const y = ff.baseY + Math.sin(t * ff.floatSpeed + ff.phase) * ff.floatAmp;
      ff.mesh.position.set(x, y, z);

      // Blink
      const blink = (Math.sin(t * ff.blinkSpeed + ff.blinkPhase) + 1) * 0.5;
      const glow = blink * blink; // Ease-in for snappier blink
      ff.mesh.material.opacity = fireflyAppear * glow * 0.9;

      // Size pulse
      const size = lerp(0.6, 1.2, glow);
      ff.mesh.scale.setScalar(size * fireflyAppear);

      // Color shift — warm yellow to green
      ff.mesh.material.color.lerpColors(
        new THREE.Color(PAL.firefly),
        new THREE.Color(0xbbffbb),
        blink * 0.3
      );
    }
  }

  _updateSparkles(dt) {
    for (const s of this.sparkles) {
      if (s.life >= s.maxLife) {
        s.mesh.visible = false;
        continue;
      }
      s.life += dt;
      const t = s.life / s.maxLife;

      // Physics
      s.vel.y -= 6 * dt; // gravity
      s.mesh.position.addScaledVector(s.vel, dt);

      // Fade + shrink
      s.mesh.material.opacity = 1 - t;
      s.mesh.scale.setScalar(lerp(1.0, 0.2, t));
    }
  }

  _updateGlow(p, t) {
    if (!this.glowLight) return;
    // Intensity ramps up with progress
    const base = smoothstep(0.2, 0.8, p) * 1.8;
    const pulse = 1 + Math.sin(t * 1.5) * 0.12;
    this.glowLight.intensity = base * pulse;
    this.glowLight.position.y = lerp(1.0, 3.0, smoothstep(0.15, 0.6, p));

    // Color: green → warm golden → purple-ish at bloom
    const bloom = smoothstep(0.80, 1.0, p);
    const mid = smoothstep(0.40, 0.80, p);
    this.glowLight.color.set(0x5cba6f);
    if (mid > 0) this.glowLight.color.lerp(new THREE.Color(0xfbbf24), mid * 0.5);
    if (bloom > 0) this.glowLight.color.lerp(new THREE.Color(0xc084fc), bloom * 0.4);
  }
}
