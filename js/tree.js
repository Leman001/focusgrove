import * as THREE from 'three';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}
function rand(lo = 0, hi = 1) { return lo + Math.random() * (hi - lo); }

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

// Build a curved trunk from a Catmull-Rom spline extruded as a tube
function buildCurvedTrunk(radiusBottom, radiusTop, height, curve, segments) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = Math.sin(t * Math.PI * 0.3) * curve * (1 - t * 0.4);
    const z = Math.cos(t * Math.PI * 0.2) * curve * 0.3 * t;
    pts.push(new THREE.Vector3(x, t * height, z));
  }
  const path = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(path, segments * 2, undefined, 8, false);
  // Vary radius along the tube
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = clamp(y / height, 0, 1);
    const r = lerp(radiusBottom, radiusTop, t);
    const baseR = geo.parameters?.radius || 1;
    // Scale x/z relative to center of tube cross-section
    // We approximate by scaling distance from the spine
    const spineX = Math.sin(t * Math.PI * 0.3) * curve * (1 - t * 0.4);
    const spineZ = Math.cos(t * Math.PI * 0.2) * curve * 0.3 * t;
    const dx = pos.getX(i) - spineX;
    const dz = pos.getZ(i) - spineZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 0.001) {
      const scale = r / Math.max(dist, 0.01);
      pos.setX(i, spineX + dx * scale);
      pos.setZ(i, spineZ + dz * scale);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ─── Palette ────────────────────────────────────────────────────────────────

const P = {
  ground: 0x7cb868, groundDark: 0x5a9a48,
  mound: 0x6aad55,
  trunk: 0x8b6042, trunkDark: 0x6b4530,
  // Crown: light→dark greens for variety
  leaf: [0x8bc34a, 0x7cb342, 0x689f38, 0x558b2f, 0x9ccc65, 0xaed581, 0x7cb868, 0x66bb6a],
  flower: [0xff80ab, 0xffab91, 0xce93d8, 0xfff176],
  fruit: [0xef5350, 0xffa726, 0xffee58],
  firefly: 0xfff59d,
};

// ─── FocusTree ──────────────────────────────────────────────────────────────

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
    this._prevMilestone = -1;

    this.root = new THREE.Group();
    this.grassBlades = [];
    this.sprout = null;
    this.trunk = null;
    this.crownParts = [];
    this.flowers = [];
    this.fruits = [];
    this.fireflies = [];
    this.sparkles = [];
    this.glowLight = null;
  }

  // ── Public ────────────────────────────────────────────────────────────────

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;
    this._setup();
    this._buildScene();
    this._setupResize();
    this._onResize();
    this._animate();
  }

  setProgress(p) { this._targetProgress = clamp(p, 0, 1); }
  getProgress() { return this._currentProgress; }

  dispose() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
    this.renderer?.dispose();
    this.renderer?.domElement?.parentNode?.removeChild(this.renderer.domElement);
    this.scene?.traverse(o => {
      o.geometry?.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  _setup() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setClearColor(0xefece6, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.add(this.root);

    // Lighting: warm cinematic 3-point
    this.scene.add(new THREE.AmbientLight(0xfff8ee, 0.9));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.1);
    sun.position.set(4, 8, 5);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd4e8ff, 0.3);
    fill.position.set(-5, 3, -3);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8cc, 0.35);
    rim.position.set(-2, 7, -6);
    this.scene.add(rim);

    this.glowLight = new THREE.PointLight(0x66bb6a, 0, 8);
    this.glowLight.position.set(0, 2, 0);
    this.root.add(this.glowLight);

    // Camera
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera = new THREE.PerspectiveCamera(44, w / (h || 1), 0.1, 100);
    this.camera.position.set(0, 2.5, 5.5);
    this.camera.lookAt(0, 1.2, 0);
  }

  _buildScene() {
    this._buildGround();
    this._buildGrass();
    this._buildSprout();
    this._buildTrunk();
    this._buildCrown();
    this._buildFlowers();
    this._buildFruits();
    this._buildFireflies();
    this._buildSparkles();
  }

  // ── Ground ────────────────────────────────────────────────────────────────

  _buildGround() {
    // Green grass mound (like reference)
    const gGeo = jitter(new THREE.CircleGeometry(3.8, 14), 0.06);
    paintFaces(gGeo, P.ground, 0.04);
    const ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    this.root.add(ground);

    // Raised mound at center
    const mGeo = jitter(new THREE.SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.04);
    paintFaces(mGeo, P.mound, 0.04);
    const mound = new THREE.Mesh(mGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    mound.scale.set(1.2, 0.35, 1.2);
    this.root.add(mound);
  }

  // ── Grass (dense, like reference base) ────────────────────────────────────

  _buildGrass() {
    const greens = [P.ground, P.groundDark, P.mound, 0x8bc34a];
    for (let i = 0; i < 60; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(0.4, 3.0);
      const h = rand(0.12, 0.32);
      const geo = new THREE.ConeGeometry(0.025 + rand(0, 0.015), h, 4);
      const mat = new THREE.MeshLambertMaterial({ color: greens[i % greens.length], flatShading: true });
      const blade = new THREE.Mesh(geo, mat);
      blade.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      blade.rotation.z = rand(-0.15, 0.15);
      this.root.add(blade);
      this.grassBlades.push({ mesh: blade, baseRotZ: blade.rotation.z, phase: rand(0, 6.28), speed: rand(1.5, 3) });
    }
  }

  // ── Sprout ────────────────────────────────────────────────────────────────

  _buildSprout() {
    const g = new THREE.Group();
    const stemGeo = jitter(new THREE.CylinderGeometry(0.02, 0.035, 0.4, 5), 0.004);
    g.add(new THREE.Mesh(stemGeo, new THREE.MeshLambertMaterial({ color: 0x66bb6a, flatShading: true })));
    g.children[0].position.y = 0.2;
    const lMat = new THREE.MeshLambertMaterial({ color: 0x81c784, flatShading: true });
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 4), lMat);
      l.scale.set(1, 0.5, 1.4);
      l.position.set(s * 0.07, 0.42, 0);
      l.rotation.z = s * -0.5;
      g.add(l);
    }
    g.scale.setScalar(0);
    this.root.add(g);
    this.sprout = g;
  }

  // ── Curved Trunk (like reference — organic, slightly bent) ────────────────

  _buildTrunk() {
    // Main trunk: curved tube
    const trunkGeo = buildCurvedTrunk(0.18, 0.07, 2.5, 0.25, 10);
    jitter(trunkGeo, 0.01);
    paintFaces(trunkGeo, P.trunk, 0.05);
    this.trunk = new THREE.Mesh(trunkGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    this.trunk.scale.setScalar(0);
    this.root.add(this.trunk);
  }

  // ── Crown (dense cluster like reference — many overlapping blobs) ─────────

  _buildCrown() {
    // Dense canopy: ~18 overlapping icospheres of varying size
    // Arranged in a roughly hemispherical shape, slightly asymmetric (wider left)
    const defs = [
      // Core
      { x: 0.0,  y: 3.0, z: 0.0,  r: 0.85 },
      { x: -0.15, y: 3.3, z: 0.1,  r: 0.70 },
      { x: 0.2,  y: 2.85, z: -0.1, r: 0.65 },
      // Left side (wider, like reference)
      { x: -0.75, y: 2.7, z: 0.15, r: 0.70 },
      { x: -0.55, y: 3.2, z: -0.2, r: 0.55 },
      { x: -0.9,  y: 3.0, z: -0.1, r: 0.50 },
      { x: -0.4,  y: 2.5, z: 0.4,  r: 0.55 },
      // Right side
      { x: 0.6,  y: 2.75, z: -0.15, r: 0.58 },
      { x: 0.45, y: 3.15, z: 0.2,  r: 0.52 },
      { x: 0.7,  y: 2.9, z: 0.3,  r: 0.42 },
      // Front/back
      { x: 0.1,  y: 2.6, z: 0.55, r: 0.50 },
      { x: -0.2, y: 2.65, z: -0.55, r: 0.52 },
      { x: 0.3,  y: 3.35, z: -0.3, r: 0.45 },
      // Top
      { x: 0.0,  y: 3.55, z: 0.05, r: 0.55 },
      { x: -0.3, y: 3.5, z: -0.15, r: 0.42 },
      { x: 0.2,  y: 3.45, z: 0.2,  r: 0.40 },
      // Bottom filler
      { x: -0.5, y: 2.4, z: -0.3, r: 0.45 },
      { x: 0.4,  y: 2.45, z: 0.35, r: 0.42 },
    ];

    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const color = P.leaf[i % P.leaf.length];
      const geo = jitter(new THREE.IcosahedronGeometry(d.r, 1), d.r * 0.1);
      paintFaces(geo, color, 0.07);
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.x, d.y, d.z);
      mesh.rotation.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28));
      mesh.scale.setScalar(0);
      this.root.add(mesh);

      // Each blob has a unique normalized appear time spread smoothly across 0.15–0.80
      const t = i / (defs.length - 1); // 0→1
      this.crownParts.push({
        mesh, baseY: d.y, baseScale: 1,
        // Smooth continuous appear: bottom blobs first, top last
        appear: 0.15 + t * 0.65,
        phase: rand(0, 6.28),
      });
    }
  }

  // ── Flowers ───────────────────────────────────────────────────────────────

  _buildFlowers() {
    const positions = [
      [0.55, 3.1, 0.35], [-0.5, 3.2, -0.25], [0.2, 3.5, 0.4],
      [-0.35, 2.7, 0.55], [0.6, 2.6, -0.35], [-0.55, 2.9, 0.15],
      [0.3, 3.6, -0.15], [-0.15, 3.7, 0.3], [0.45, 3.3, 0.45],
      [-0.6, 2.6, -0.4], [0.0, 3.8, 0.0], [0.7, 2.8, 0.1],
    ];
    for (let i = 0; i < positions.length; i++) {
      const [x, y, z] = positions[i];
      const color = P.flower[i % P.flower.length];
      const geo = new THREE.DodecahedronGeometry(0.07, 0);
      const mat = new THREE.MeshLambertMaterial({
        color, flatShading: true,
        emissive: new THREE.Color(color), emissiveIntensity: 0.15,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28));
      mesh.scale.setScalar(0);
      this.root.add(mesh);
      // Spread smoothly across 0.65–0.90
      this.flowers.push({ mesh, mat, appear: 0.65 + (i / positions.length) * 0.25, phase: rand(0, 6.28) });
    }
  }

  // ── Fruits ────────────────────────────────────────────────────────────────

  _buildFruits() {
    const positions = [
      [0.4, 2.6, 0.3], [-0.45, 2.8, -0.2], [0.15, 3.2, 0.5],
      [-0.3, 3.0, 0.4], [0.55, 3.0, -0.15], [-0.5, 2.5, 0.3],
      [0.0, 3.5, -0.3], [0.35, 2.4, -0.45],
    ];
    for (let i = 0; i < positions.length; i++) {
      const [x, y, z] = positions[i];
      const color = P.fruit[i % P.fruit.length];
      const geo = new THREE.SphereGeometry(0.055, 6, 5);
      const mat = new THREE.MeshLambertMaterial({
        color, flatShading: true,
        emissive: new THREE.Color(color), emissiveIntensity: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(0);
      this.root.add(mesh);
      // Spread smoothly across 0.78–0.96
      this.fruits.push({ mesh, mat, appear: 0.78 + (i / positions.length) * 0.18, phase: rand(0, 6.28) });
    }
  }

  // ── Fireflies ─────────────────────────────────────────────────────────────

  _buildFireflies() {
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.SphereGeometry(0.028, 4, 3);
      const mat = new THREE.MeshBasicMaterial({ color: P.firefly, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      const a = rand(0, 6.28), d = rand(0.7, 2.5), y = rand(1.0, 4.2);
      mesh.position.set(Math.cos(a) * d, y, Math.sin(a) * d);
      this.root.add(mesh);
      this.fireflies.push({
        mesh, angle: a, dist: d, baseY: y,
        speed: rand(0.2, 0.6), floatSpd: rand(0.4, 1.0), floatAmp: rand(0.15, 0.45),
        phase: rand(0, 6.28), blinkPhase: rand(0, 6.28), blinkSpd: rand(1.5, 3.5),
      });
    }
  }

  // ── Sparkles ──────────────────────────────────────────────────────────────

  _buildSparkles() {
    for (let i = 0; i < 30; i++) {
      const geo = new THREE.SphereGeometry(0.022, 4, 3);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.sparkles.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 0 });
    }
  }

  _burst(y) {
    const colors = [0xffffff, 0xfff59d, 0xff80ab, 0xce93d8, 0x81c784, 0xffab91];
    for (const s of this.sparkles) {
      s.mesh.visible = true;
      s.mesh.position.set(rand(-0.3, 0.3), y + rand(-0.3, 0.3), rand(-0.3, 0.3));
      s.vel.set(rand(-2.5, 2.5), rand(1.5, 5), rand(-2.5, 2.5));
      s.life = 0; s.maxLife = rand(0.5, 1.3);
      s.mesh.material.opacity = 1;
      s.mesh.material.color.setHex(colors[Math.floor(rand(0, colors.length))]);
    }
  }

  // ── Resize ────────────────────────────────────────────────────────────────

  _setupResize() {
    this.resizeObs = new ResizeObserver(() => this._onResize());
    this.resizeObs.observe(this.container);
  }
  _onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth, h = this.container.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Animation ─────────────────────────────────────────────────────────────

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    // Smooth continuous progress — never jumpy
    this._currentProgress = lerp(this._currentProgress, this._targetProgress, Math.min(1, dt * 2.0));
    const p = this._currentProgress;

    // Milestone sparkle bursts every 10%
    const ms = Math.floor(p * 10);
    if (ms > this._prevMilestone && ms > 0) {
      this._prevMilestone = ms;
      this._burst(lerp(1.0, 3.5, p));
    }

    this._camUpdate(p, t);
    this._grassUpdate(t);
    this._sproutUpdate(p, t);
    this._trunkUpdate(p);
    this._crownUpdate(p, t);
    this._flowerUpdate(p, t);
    this._fruitUpdate(p, t);
    this._fireflyUpdate(p, t, dt);
    this._sparkleUpdate(dt);
    this._glowUpdate(p, t);

    this.renderer.render(this.scene, this.camera);
  }

  // ── Smooth updates (no stages — everything is a continuous function of p) ─

  _camUpdate(p, t) {
    const angle = t * 0.12;
    // Continuous zoom: close at p=0, pulls back as tree grows
    const dist = lerp(3.8, 6.5, p);
    const camY = lerp(1.8, 4.2, p);
    const lookY = lerp(0.4, 2.2, p);
    this.camera.position.set(Math.sin(angle) * dist, camY, Math.cos(angle) * dist);
    this.camera.lookAt(0, lookY, 0);
  }

  _grassUpdate(t) {
    for (const g of this.grassBlades) {
      g.mesh.rotation.z = g.baseRotZ + Math.sin(t * g.speed + g.phase) * 0.07;
    }
  }

  _sproutUpdate(p, t) {
    // Smooth: fully visible at p=0, shrinks continuously to 0 by p=0.3
    const s = clamp(1.5 * (1 - p / 0.3), 0, 1.5);
    this.sprout.scale.setScalar(s);
    this.sprout.rotation.z = Math.sin(t * 2.2) * 0.08 * s;
    this.sprout.position.y = Math.sin(t * 2.8) * 0.008 * s;
  }

  _trunkUpdate(p) {
    // Smooth continuous growth: starts at p=0.05, full at p=0.55
    const s = smoothstep(0.05, 0.55, p);
    // Width also grows
    const w = lerp(0.3, 1.0, smoothstep(0.05, 0.6, p));
    this.trunk.scale.set(w, s, w);
  }

  _crownUpdate(p, t) {
    for (const cp of this.crownParts) {
      // Each blob smoothly grows over its own range (spread = 0.12)
      const raw = smoothstep(cp.appear, cp.appear + 0.12, p);
      // Breathing pulse
      const breath = 1 + Math.sin(t * 1.2 + cp.phase) * 0.025;
      const s = raw * breath;
      cp.mesh.scale.setScalar(s);
      // Gentle bob
      if (s > 0.001) {
        cp.mesh.position.y = cp.baseY + Math.sin(t * 0.7 + cp.phase) * 0.02 * s;
        cp.mesh.rotation.y += 0.0015 * s;
      }
    }
  }

  _flowerUpdate(p, t) {
    for (const f of this.flowers) {
      const raw = smoothstep(f.appear, f.appear + 0.06, p);
      const pulse = 1 + Math.sin(t * 2.8 + f.phase) * 0.12 * raw;
      f.mesh.scale.setScalar(raw * pulse);
      f.mesh.rotation.y += 0.012 * raw;
      if (f.mat.emissive) f.mat.emissiveIntensity = lerp(0.15, 0.5, (Math.sin(t * 2 + f.phase) + 1) * 0.5) * raw;
    }
  }

  _fruitUpdate(p, t) {
    for (const fr of this.fruits) {
      const raw = smoothstep(fr.appear, fr.appear + 0.05, p);
      const dangle = Math.sin(t * 1.6 + fr.phase) * 0.008 * raw;
      fr.mesh.scale.setScalar(raw);
      fr.mesh.position.y += dangle;
      if (fr.mat.emissive) fr.mat.emissiveIntensity = lerp(0.1, 0.35, (Math.sin(t * 1.8 + fr.phase) + 1) * 0.5) * raw;
    }
  }

  _fireflyUpdate(p, t, dt) {
    // Smooth fade-in starting at p=0.45
    const vis = smoothstep(0.45, 0.55, p);
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

  _sparkleUpdate(dt) {
    for (const s of this.sparkles) {
      if (s.life >= s.maxLife) { s.mesh.visible = false; continue; }
      s.life += dt;
      s.vel.y -= 7 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      const t = s.life / s.maxLife;
      s.mesh.material.opacity = 1 - t;
      s.mesh.scale.setScalar(lerp(1.0, 0.15, t));
    }
  }

  _glowUpdate(p, t) {
    if (!this.glowLight) return;
    const base = p * 2.0;
    this.glowLight.intensity = base * (1 + Math.sin(t * 1.3) * 0.1);
    this.glowLight.position.y = lerp(1, 3.2, p);
    const c = new THREE.Color(0x66bb6a);
    if (p > 0.5) c.lerp(new THREE.Color(0xfff176), (p - 0.5) * 0.6);
    if (p > 0.8) c.lerp(new THREE.Color(0xce93d8), (p - 0.8) * 2);
    this.glowLight.color.copy(c);
  }
}
