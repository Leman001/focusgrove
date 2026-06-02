import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Jitter geometry vertices for organic low-poly look
function jitter(geo, amount) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * amount);
    pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * amount);
    pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * amount);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// Palette helpers
const C_SPRING  = new THREE.Color(0x5ba06e);
const C_SUMMER  = new THREE.Color(0x3d8a57);
const C_GOLDEN  = new THREE.Color(0xc8952a);
const C_AUTUMN  = new THREE.Color(0xe8631a);
const C_TRUNK   = new THREE.Color(0x9c7c52);
const C_TRUNK_D = new THREE.Color(0x7a5c35);
const C_GROUND  = new THREE.Color(0xd6cbb5);
const C_MOUND   = new THREE.Color(0xb89b6e);

export class FocusTree {
  constructor(containerId) {
    this.containerId = containerId;
    this.container   = null;
    this.renderer    = null;
    this.scene       = null;
    this.camera      = null;
    this.controls    = null;
    this.clock       = new THREE.Clock();
    this.animId      = null;
    this.resizeObs   = null;

    this._targetProgress  = 0;
    this._currentProgress = 0;

    // Tree parts
    this.sprout    = null;
    this.trunk     = null;
    this.crownMain = null;
    this.crownMat  = null;
    this.sats      = []; // { mesh, mat, appear }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    // Renderer — opaque background matching app surface colour
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setClearColor(0xefece6, 1); // matches --bg
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Lighting — bright ambient so flat faces read clearly
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xfff4e0, 0.9);
    sun.position.set(3, 7, 5);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe0eeff, 0.4);
    fill.position.set(-4, 2, -3);
    this.scene.add(fill);

    // Camera
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera = new THREE.PerspectiveCamera(42, w / (h || 1), 0.1, 100);
    this.camera.position.set(0, 3.2, 7);
    this.camera.lookAt(0, 2.2, 0);

    // Orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping   = true;
    this.controls.dampingFactor   = 0.08;
    this.controls.target.set(0, 2.2, 0);
    this.controls.minDistance     = 4;
    this.controls.maxDistance     = 12;
    this.controls.maxPolarAngle   = Math.PI * 0.48;
    this.controls.minPolarAngle   = Math.PI * 0.12;
    this.controls.autoRotate      = true;
    this.controls.autoRotateSpeed = 0.55;
    this.controls.enablePan       = false;

    this._buildGround();
    this._buildTree();
    this._setupResize();
    this._onResize();
    this._animate();
  }

  setProgress(p) { this._targetProgress = clamp(p, 0, 1); }

  dispose() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
    this.controls?.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement?.parentNode?.removeChild(this.renderer.domElement);
    }
    this.scene?.traverse(o => {
      o.geometry?.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      }
    });
  }

  // ── Scene building ──────────────────────────────────────────────────────────

  _buildGround() {
    // Low-poly ground disc
    const gGeo = jitter(new THREE.CircleGeometry(3.4, 9), 0.06);
    const ground = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ color: C_GROUND, flatShading: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

    // Dirt mound at base
    const mGeo = jitter(new THREE.SphereGeometry(0.6, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0.04);
    const mound = new THREE.Mesh(mGeo, new THREE.MeshLambertMaterial({ color: C_MOUND, flatShading: true }));
    mound.scale.set(1, 0.42, 1);
    this.scene.add(mound);
  }

  _buildTree() {
    // ── Sprout ──
    const sGeo = jitter(new THREE.ConeGeometry(0.055, 0.3, 5), 0.01);
    this.sprout = new THREE.Mesh(sGeo, new THREE.MeshLambertMaterial({ color: 0x5cb874, flatShading: true }));
    this.sprout.position.y = 0.15;
    this.sprout.scale.setScalar(0);
    this.scene.add(this.sprout);

    // ── Trunk — 7-sided tapered low-poly cylinder ──
    const tGeo = jitter(new THREE.CylinderGeometry(0.1, 0.24, 2.4, 7, 2), 0.018);
    this.trunk = new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ color: C_TRUNK, flatShading: true }));
    this.trunk.position.y = 1.2;
    this.trunk.scale.setScalar(0);
    this.scene.add(this.trunk);

    // Upper trunk / neck
    const nGeo = jitter(new THREE.CylinderGeometry(0.07, 0.11, 0.9, 6), 0.012);
    const neck = new THREE.Mesh(nGeo, new THREE.MeshLambertMaterial({ color: C_TRUNK_D, flatShading: true }));
    neck.position.y = 2.85;
    neck.scale.setScalar(0);
    this.scene.add(neck);
    this._neck = neck;

    // ── Main crown — icosahedron, detail=1 for rich facets ──
    const cGeo = jitter(new THREE.IcosahedronGeometry(1.18, 1), 0.14);
    this.crownMat = new THREE.MeshLambertMaterial({ color: C_SPRING.clone(), flatShading: true });
    this.crownMain = new THREE.Mesh(cGeo, this.crownMat);
    this.crownMain.position.y = 3.2;
    this.crownMain.scale.setScalar(0);
    this.scene.add(this.crownMain);

    // ── Satellite crowns (organic blobs) ──
    const satDefs = [
      { x: -0.92, y: 2.55, z:  0.20, r: 0.70, appear: 0.32 },
      { x:  0.85, y: 2.65, z: -0.15, r: 0.62, appear: 0.38 },
      { x:  0.08, y: 2.50, z:  0.82, r: 0.55, appear: 0.44 },
      { x: -0.30, y: 2.72, z: -0.80, r: 0.50, appear: 0.50 },
    ];
    for (const d of satDefs) {
      const geo = jitter(new THREE.IcosahedronGeometry(d.r, 1), 0.09);
      const mat = new THREE.MeshLambertMaterial({ color: C_SPRING.clone(), flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.x, d.y, d.z);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mesh.scale.setScalar(0);
      this.scene.add(mesh);
      this.sats.push({ mesh, mat, appear: d.appear });
    }
  }

  // ── Resize ──────────────────────────────────────────────────────────────────

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

  // ── Animation ────────────────────────────────────────────────────────────────

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    const dt = this.clock.getDelta();
    const t  = this.clock.getElapsedTime();

    this._currentProgress = lerp(this._currentProgress, this._targetProgress, Math.min(1, dt * 2.5));
    const p = this._currentProgress;

    this._updateTree(p, t);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _updateTree(p, t) {
    // Sprout (0 → 0.25)
    const sS = smoothstep(0.01, 0.09, p) * (1 - smoothstep(0.16, 0.30, p));
    this.sprout.scale.setScalar(sS);
    this.sprout.rotation.z = Math.sin(t * 1.9) * 0.09 * sS;

    // Trunk (0.06 → 0.50)
    const tS = smoothstep(0.06, 0.50, p);
    const thick = lerp(0.35, 1.0, smoothstep(0.2, 0.65, p));
    this.trunk.scale.set(thick, tS, thick);
    if (this._neck) this._neck.scale.set(thick, tS, thick);

    // Main crown (0.22 → 0.70)
    const cS = smoothstep(0.22, 0.70, p);
    this.crownMain.scale.setScalar(cS);
    this.crownMain.rotation.y = t * 0.1;

    // Satellites
    for (const sat of this.sats) {
      const s = smoothstep(sat.appear, sat.appear + 0.22, p);
      sat.mesh.scale.setScalar(s);
    }

    // ── Colour transition ──
    // 0.00 → 0.52: spring green
    // 0.52 → 0.76: green → golden
    // 0.76 → 1.00: golden → deep autumn orange
    let col;
    if (p < 0.52) {
      col = C_SPRING.clone();
    } else if (p < 0.76) {
      col = C_SPRING.clone().lerp(C_GOLDEN, (p - 0.52) / 0.24);
    } else {
      col = C_GOLDEN.clone().lerp(C_AUTUMN, (p - 0.76) / 0.24);
    }
    this.crownMat.color.copy(col);

    // Satellites slightly darker
    const satCol = col.clone().multiplyScalar(0.8);
    for (const sat of this.sats) sat.mat.color.copy(satCol);
  }
}
