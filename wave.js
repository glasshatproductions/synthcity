/* =====================================================================
   SYNTH CITY — THE RECEIVER (sound-wave look)
   Same public API as gem.js. Her voice travels through a stack of
   holographic rings around a small crystal core: the signal, made visible.
   Select with ?look=wave (gem.js stays the default).
   ===================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const PINK = new THREE.Color('#ff2d78');
const CYAN = new THREE.Color('#00f5ff');

function starTexture() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), m = s / 2;
  const rg = g.createRadialGradient(m, m, 0, m, m, m);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(0.06, 'rgba(255,255,255,0.85)');
  rg.addColorStop(0.22, 'rgba(255,190,225,0.16)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'lighter';
  const spike = (angle, len, w, a) => {
    g.save(); g.translate(m, m); g.rotate(angle);
    const lg = g.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,255,255,${a})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.fillRect(-len, -w / 2, len * 2, w); g.restore();
  };
  spike(0, m, 3, 1); spike(Math.PI / 2, m, 3, 1);
  spike(Math.PI / 4, m * 0.55, 2, 0.6); spike(-Math.PI / 4, m * 0.55, 2, 0.6);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function backdropTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, s, s);
  const rg = g.createRadialGradient(s / 2, s * 0.46, 0, s / 2, s * 0.46, s * 0.5);
  rg.addColorStop(0, 'rgba(255,45,120,0.30)');
  rg.addColorStop(0.35, 'rgba(120,20,70,0.12)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, s, s);
  // faint light bars — gives the refraction something to bend
  for (let i = 0; i < 9; i++) {
    g.fillStyle = i % 3 === 0 ? 'rgba(0,245,255,0.05)' : 'rgba(255,255,255,0.025)';
    g.fillRect(0, s * (0.2 + i * 0.07), s, 1 + (i % 2));
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


/* ===================================================================== */
export async function createGem(canvas, { reduceMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020103);

  const FOV = 30, CAMZ = 8;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAMZ);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: backdropTexture(), toneMapped: false })
  );
  backdrop.position.z = -6;
  scene.add(backdrop);

  // The year — lives *behind* the stone so it refracts through it.
  const yc = document.createElement('canvas'); yc.width = 1024; yc.height = 320;
  const yctx = yc.getContext('2d');
  const yearTex = new THREE.CanvasTexture(yc); yearTex.colorSpace = THREE.SRGBColorSpace;
  // dimmed so the bloom pass doesn't blow the digits out to white
  const yearMat = new THREE.MeshBasicMaterial({ map: yearTex, color: new THREE.Color(0.72, 0.72, 0.72), transparent: true, opacity: 0, depthWrite: false });
  const yearPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), yearMat);
  yearPlane.position.z = -1.6;
  scene.add(yearPlane);
  let yearText = '', yearColor = '#e8e4d8', yearDirty = false, yearDrawnAt = 0;
  function drawYear() {
    yctx.clearRect(0, 0, yc.width, yc.height);
    yctx.font = '400 270px "Bebas Neue", "Arial Narrow", sans-serif';
    yctx.textAlign = 'center'; yctx.textBaseline = 'middle';
    // tabular digits sized from the real font, so any fallback still fits
    let dw = yctx.measureText('0').width * 1.04;
    const n = yearText.length;
    if (dw * n > yc.width * 0.94) {
      const s = (yc.width * 0.94) / (dw * n);
      yctx.font = `400 ${Math.floor(270 * s)}px "Bebas Neue", "Arial Narrow", sans-serif`;
      dw = yctx.measureText('0').width * 1.04;
    }
    const x0 = yc.width / 2 - (n * dw) / 2 + dw / 2, y = yc.height / 2 + 12;
    yctx.save();
    yctx.globalAlpha = 0.55; yctx.shadowColor = yearColor; yctx.shadowBlur = 24; yctx.fillStyle = yearColor;
    for (let i = 0; i < n; i++) yctx.fillText(yearText[i], x0 + i * dw, y);
    yctx.restore();
    yctx.fillStyle = yearColor;
    for (let i = 0; i < n; i++) yctx.fillText(yearText[i], x0 + i * dw, y);
    yearTex.needsUpdate = true;
  }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('400 100px "Bebas Neue"').then(() => yearText && drawYear()).catch(() => { });
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => yearText && drawYear());
  }


  // The receiver
  const orb = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.add(orb); scene.add(tilt);
  tilt.rotation.x = 0.38;

  // Rings: a sphere-shaped stack of horizontal loops, drawn as one LineSegments.
  const RINGS = 44, SEG = 144;
  const ringY = [], ringR0 = [];
  for (let i = 0; i < RINGS; i++) {
    const y = -0.92 + (1.84 * i) / (RINGS - 1);
    ringY.push(y); ringR0.push(Math.sqrt(Math.max(0.02, 1 - y * y)));
  }
  const ringPos = new Float32Array(RINGS * SEG * 2 * 3);
  const ringCol = new Float32Array(RINGS * SEG * 2 * 3);
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  ringGeo.setAttribute('color', new THREE.BufferAttribute(ringCol, 3));
  const ringMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const rings = new THREE.LineSegments(ringGeo, ringMat);
  orb.add(rings);
  const baseCol = [];
  for (let i = 0; i < RINGS; i++) {
    const t = i / (RINGS - 1);
    // cyan at the poles, pink through the middle band
    const m = Math.pow(Math.sin(t * Math.PI), 1.6);
    baseCol.push(new THREE.Color().copy(CYAN).lerp(PINK, m));
  }

  // Faint meridians give the stack a body when it turns.
  const MER = 10, MSEG = 48;
  const merPos = new Float32Array(MER * MSEG * 2 * 3);
  const merGeo = new THREE.BufferGeometry(); merGeo.setAttribute('position', new THREE.BufferAttribute(merPos, 3));
  const merMat = new THREE.LineBasicMaterial({ color: 0x5fdfff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  orb.add(new THREE.LineSegments(merGeo, merMat));

  // Crystal core: the earth-formed stone that carries the call.
  const coreGeo = new THREE.OctahedronGeometry(0.2, 0);
  const core = new THREE.Group();
  const coreWire = new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, toneMapped: false }));
  const coreFill = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: PINK.clone(), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  core.add(coreFill, coreWire); orb.add(core);

  // Signal dust drifting around the stack
  const DUST = 360, dustPos = new Float32Array(DUST * 3), dustSeed = [];
  for (let i = 0; i < DUST; i++) dustSeed.push([Math.random() * Math.PI * 2, 1.05 + Math.random() * 0.55, (Math.random() - 0.5) * 1.9, 0.15 + Math.random() * 0.35]);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xbff8ff, size: 0.018, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  orb.add(dust);

  const starTex = starTexture();
  const bigGlint = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, blending: THREE.AdditiveBlending, depthTest: false, transparent: true, toneMapped: false, opacity: 0 }));
  bigGlint.visible = false; scene.add(bigGlint);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.3, 0.1);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- state ---------- */
  const HIST = RINGS;                // voice history: one sample per ring
  const hist = new Float32Array(HIST);
  const st = {
    slot: null, yearSlot: null,
    pos: new THREE.Vector3(), scale: 0.0001, snap: true,
    spin: 0.35, spinTarget: 0.35, rotBoost: 0,
    pulse: 0, level: () => 0, glintRate: 0.6, histAcc: 0,
    tint: PINK.clone(), tintTarget: PINK.clone(),
    yearOpacity: 0, yearOpacityTarget: 0,
    ptr: { x: 0, y: 0 }, tiltX: 0, tiltZ: 0,
    out: null, running: true, collapse: 0,
  };

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const vh = 2 * (CAMZ - backdrop.position.z) * Math.tan((FOV * Math.PI) / 360);
    backdrop.scale.set(vh * camera.aspect * 1.1, vh * 1.1, 1);
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('pointermove', (e) => {
    st.ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
    st.ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function placeFromRect(r, z) {
    const H = window.innerHeight, W = window.innerWidth;
    const k = (2 * (CAMZ - z) * Math.tan((FOV * Math.PI) / 360)) / H;
    return { x: (r.left + r.width / 2 - W / 2) * k, y: -(r.top + r.height / 2 - H / 2) * k, w: r.width * k, h: r.height * k };
  }

  let quality = 2, useBloom = true, fpsT = 0, fpsN = 0;
  function degrade() {
    quality--;
    if (quality === 1) { renderer.setPixelRatio(1); resize(); }
    if (quality === 0) useBloom = false;
  }

  const tmp = new THREE.Color();
  let last = performance.now();
  function frame(now) {
    if (!st.running) return;
    requestAnimationFrame(frame);
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw); last = now;
    if (!document.hidden && raw < 1) {
      fpsT += raw; fpsN++;
      if (fpsT >= 1.5) { if (fpsN / fpsT < 28 && quality > 0) degrade(); fpsT = 0; fpsN = 0; }
    }
    const ease = (rate) => 1 - Math.exp(-dt * rate);
    const t = now / 1000;

    if (st.slot && !st.out) {
      const r = st.slot.getBoundingClientRect();
      if (r.width > 0) {
        const p = placeFromRect(r, 0);
        const sc = Math.min(p.w / 2, p.h / 2) * 0.9;
        const k = st.snap ? 1 : ease(3.2);
        st.pos.x += (p.x - st.pos.x) * k; st.pos.y += (p.y - st.pos.y) * k;
        st.scale += (sc - st.scale) * k;
        st.snap = false;
      }
    }
    if (st.yearSlot) {
      const r = st.yearSlot.getBoundingClientRect();
      if (r.width > 0) {
        const p = placeFromRect(r, yearPlane.position.z);
        yearPlane.position.x = p.x; yearPlane.position.y = p.y;
        yearPlane.scale.set(p.h * (yc.width / yc.height), p.h, 1);
      }
    }
    if (yearDirty && now - yearDrawnAt > 50) { drawYear(); yearDirty = false; yearDrawnAt = now; }
    st.yearOpacity += (st.yearOpacityTarget - st.yearOpacity) * ease(5);
    yearMat.opacity = st.yearOpacity;

    // her voice: push into a history so each sample travels outward from the equator
    const lvl = Math.max(0, Math.min(1, st.level() || 0));
    st.histAcc += dt;
    while (st.histAcc > 1 / 50) { st.histAcc -= 1 / 50; hist.copyWithin(1, 0); hist[0] = Math.max(lvl, st.pulse * 0.8); }

    st.spin += (st.spinTarget - st.spin) * ease(2.5);
    orb.rotation.y += dt * (st.spin * 0.6 + st.rotBoost + lvl * 0.3);
    st.rotBoost *= Math.exp(-dt * 2);
    st.tiltX += ((reduceMotion ? 0 : st.ptr.y * 0.25) - st.tiltX) * ease(3);
    st.tiltZ += ((reduceMotion ? 0 : -st.ptr.x * 0.18) - st.tiltZ) * ease(3);
    tilt.rotation.x = 0.38 + st.tiltX; tilt.rotation.z = st.tiltZ;
    tilt.position.copy(st.pos);
    tilt.position.y += Math.sin(now / 1400) * 0.03 * st.scale;
    tilt.scale.setScalar(Math.max(st.scale, 0.0001));

    st.pulse *= Math.exp(-dt * 3.2);
    st.tint.lerp(st.tintTarget, ease(2));
    const collapse = st.collapse;           // 0..1 during the outro

    // rings
    let v = 0;
    for (let i = 0; i < RINGS; i++) {
      const y = ringY[i];
      const d = Math.min(HIST - 1, Math.floor(Math.abs(y) * (HIST - 1)));
      const amp = 0.035 + hist[d] * 0.42;
      const yy = y * (1 - collapse);
      tmp.copy(baseCol[i]).lerp(st.tint, 0.25);
      const bright = 0.28 + hist[d] * 1.1 + st.pulse * 0.35;
      const cr = tmp.r * bright, cg = tmp.g * bright, cb = tmp.b * bright;
      for (let j = 0; j < SEG; j++) {
        for (let e = 0; e < 2; e++) {
          const jj = (j + e) % SEG;
          const a = (jj / SEG) * Math.PI * 2;
          const w = Math.sin(a * 6 + t * 2.2 + i * 0.35) * 0.6 + Math.sin(a * 11 - t * 3.1 + i * 0.2) * 0.4;
          const r = ringR0[i] * (1 + amp * w) * (1 + collapse * 0.6);
          ringPos[v * 3] = Math.cos(a) * r; ringPos[v * 3 + 1] = yy; ringPos[v * 3 + 2] = Math.sin(a) * r;
          ringCol[v * 3] = cr; ringCol[v * 3 + 1] = cg; ringCol[v * 3 + 2] = cb;
          v++;
        }
      }
    }
    ringGeo.attributes.position.needsUpdate = true;
    ringGeo.attributes.color.needsUpdate = true;
    ringMat.opacity = 0.8 * (1 - collapse * 0.7);

    // meridians follow the same envelope, quietly
    let m = 0;
    for (let k = 0; k < MER; k++) {
      const a = (k / MER) * Math.PI * 2;
      for (let s = 0; s < MSEG; s++) {
        for (let e = 0; e < 2; e++) {
          const y = -0.92 + 1.84 * ((s + e) / MSEG);
          const r = Math.sqrt(Math.max(0.02, 1 - y * y)) * (1 + collapse * 0.6);
          merPos[m * 3] = Math.cos(a) * r; merPos[m * 3 + 1] = y * (1 - collapse); merPos[m * 3 + 2] = Math.sin(a) * r; m++;
        }
      }
    }
    merGeo.attributes.position.needsUpdate = true;

    // core
    core.rotation.y -= dt * 1.4; core.rotation.x += dt * 0.6;
    core.scale.setScalar(1 + lvl * 0.9 + st.pulse * 0.8);
    coreFill.material.color.copy(st.tint);
    coreFill.material.opacity = 0.25 + lvl * 0.5 + st.pulse * 0.5;

    // dust
    for (let i = 0; i < DUST; i++) {
      const sd = dustSeed[i], a = sd[0] + t * sd[3];
      dustPos[i * 3] = Math.cos(a) * sd[1]; dustPos[i * 3 + 1] = sd[2] * (1 - collapse) + Math.sin(t + i) * 0.02; dustPos[i * 3 + 2] = Math.sin(a) * sd[1];
    }
    dustGeo.attributes.position.needsUpdate = true;

    bloom.strength = 0.45 + st.pulse * 0.25 + lvl * 0.3;

    if (st.out) {
      const o = st.out; o.t += dt;
      const p = Math.min(1, o.t / o.dur);
      st.rotBoost = 6 * p;
      st.collapse = Math.min(1, p * 1.4);
      tilt.scale.setScalar(Math.max(0.0001, o.fromScale * (1 - p) ** 2));
      bigGlint.visible = true;
      bigGlint.position.copy(o.at);
      const g = Math.sin(Math.min(1, p * 1.25) * Math.PI);
      bigGlint.material.opacity = g;
      bigGlint.scale.setScalar(o.fromScale * (0.5 + g * 5));
      bloom.strength = 0.9 + g * 2.2;
      if (!o.peaked && p >= o.peakAt) { o.peaked = true; o.onPeak && o.onPeak(); }
      if (p >= 1 && !o.done) { o.done = true; bigGlint.visible = false; o.onDone && o.onDone(); }
    }

    if (useBloom) composer.render(dt); else renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    setSlot(el, { snap = false } = {}) { st.slot = el; if (snap) st.snap = true; },
    setYearSlot(el) { st.yearSlot = el; },
    setYear(text, color) {
      const c = color || yearColor;
      if (text === yearText && c === yearColor) return;
      yearText = String(text); yearColor = c; yearDirty = true;
    },
    showYear(on) { st.yearOpacityTarget = typeof on === 'number' ? on : (on ? 1 : 0); },
    ring() { st.pulse = Math.max(st.pulse, 0.6); st.rotBoost += 0.6; },
    flash(s = 1.4) { st.pulse = Math.max(st.pulse, s); st.rotBoost += 2.5; },
    setLevel(fn) { st.level = fn || (() => 0); },
    setSpin(s) { st.spinTarget = s; },
    kick(v = 1) { st.rotBoost += v; },
    setGlintRate(r) { st.glintRate = r; },
    setTint(hex) { st.tintTarget.set(hex); },
    outro({ dur = 1.0, peakAt = 0.55 } = {}) {
      return new Promise((resolve) => {
        st.out = {
          t: 0, dur, peakAt, peaked: false, done: false,
          fromScale: st.scale, at: st.pos.clone().add(new THREE.Vector3(0, 0, 0.5)),
          onPeak: resolve, onDone: null,
        };
      });
    },
    stop() {
      st.running = false;
      window.removeEventListener('resize', resize);
      try { renderer.dispose(); } catch (e) { }
    },
  };
}
