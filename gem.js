/* =====================================================================
   SYNTH CITY — THE RECEIVER
   A real-time round-brilliant diamond. In the story, only earth-formed
   crystal can carry a signal back from 2187 — so the stone is the phone.

   Layout is driven by DOM "slots": the page tells the gem which element
   to occupy (gem.setSlot(el)) and it glides there, so all positioning
   stays in CSS and is responsive for free.
   ===================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const PINK = new THREE.Color('#ff2d78');
const CYAN = new THREE.Color('#00f5ff');

/* ---------- Round brilliant geometry (57 facets, flat-shaded) ---------- */
function brilliantGeometry() {
  const TOP = 0.32, GT = 0.025, GB = -0.025, CULET = -0.86;
  const P = (r, a, y) => new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));
  const q = Math.PI / 4, e = Math.PI / 8;
  const T = [], S = [], G = [], Gb = [], L = [];
  for (let i = 0; i < 8; i++) {
    T.push(P(0.56, i * q, TOP));                 // table octagon
    S.push(P(0.80, (i + 0.5) * q, 0.18));        // star points
    L.push(P(0.34, i * q, -0.56));               // lower-girdle meets
  }
  for (let k = 0; k < 16; k++) { G.push(P(1, k * e, GT)); Gb.push(P(1, k * e, GB)); }
  const C = new THREE.Vector3(0, TOP, 0), cul = new THREE.Vector3(0, CULET, 0);
  const n8 = (i) => (i + 8) % 8, n16 = (k) => (k + 16) % 16;

  const tris = [];
  const t = (a, b, c) => tris.push([a, b, c]);
  for (let i = 0; i < 8; i++) {
    t(C, T[i], T[n8(i + 1)]);                              // table
    t(T[i], T[n8(i + 1)], S[i]);                           // star
    t(T[i], S[n8(i - 1)], G[2 * i]); t(T[i], G[2 * i], S[i]); // bezel kite
    t(S[i], G[2 * i], G[n16(2 * i + 1)]);                  // upper girdle
    t(S[i], G[n16(2 * i + 1)], G[n16(2 * i + 2)]);
    t(Gb[2 * i], Gb[n16(2 * i + 1)], L[i]);                // lower girdle
    t(Gb[n16(2 * i + 1)], Gb[n16(2 * i + 2)], L[n8(i + 1)]);
    t(Gb[n16(2 * i + 1)], L[n8(i + 1)], L[i]);
    t(L[i], L[n8(i + 1)], cul);                            // pavilion main
  }
  for (let k = 0; k < 16; k++) {                           // girdle band
    t(G[k], G[n16(k + 1)], Gb[n16(k + 1)]); t(G[k], Gb[n16(k + 1)], Gb[k]);
  }

  // Force every face to point outward, whatever order it was listed in.
  const center = new THREE.Vector3(0, -0.15, 0), pos = [];
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nrm = new THREE.Vector3(), cen = new THREE.Vector3();
  for (const [a, b, c] of tris) {
    ab.subVectors(b, a); ac.subVectors(c, a); nrm.crossVectors(ab, ac);
    cen.copy(a).add(b).add(c).divideScalar(3).sub(center);
    const [x, y, z] = nrm.dot(cen) >= 0 ? [a, b, c] : [a, c, b];
    pos.push(x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.userData.glintPoints = [...T, ...S, ...G.filter((_, k) => k % 2 === 1), C];
  return g;
}

/* ---------- Procedural textures ---------- */
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020103);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;

  const FOV = 30, CAMZ = 8;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAMZ);

  // Backdrop
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

  // The stone
  const geo = brilliantGeometry();
  const gem = new THREE.Group();
  const tilt = new THREE.Group();          // pointer tilt
  tilt.add(gem); scene.add(tilt);

  const inner = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xdfe6ff, metalness: 1, roughness: 0.04, envMapIntensity: 2.2,
    side: THREE.BackSide, flatShading: true, emissive: PINK.clone(), emissiveIntensity: 0,
  }));
  inner.scale.setScalar(0.985);
  const outer = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 1.4,
    ior: 2.42, dispersion: 6, specularIntensity: 1, envMapIntensity: 1.8,
    flatShading: true, emissive: PINK.clone(), emissiveIntensity: 0,
  }));
  gem.add(inner, outer);
  gem.rotation.x = 0.0;
  tilt.rotation.x = 0.32;  // three-quarter view: table + pavilion both read

  // Coloured key lights for brand-tinted specular hits
  const lp = new THREE.PointLight(PINK, 30, 20); lp.position.set(-3, 2, 4); scene.add(lp);
  const lc = new THREE.PointLight(CYAN, 18, 20); lc.position.set(3.5, -1, 3); scene.add(lc);
  const lw = new THREE.PointLight(0xffffff, 40, 20); lw.position.set(0, 4, 5); scene.add(lw);

  // Glints
  const starTex = starTexture();
  const glints = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: starTex, blending: THREE.AdditiveBlending, depthTest: false, transparent: true, toneMapped: false, opacity: 0,
    }));
    s.userData = { life: 0, max: 0.4, size: 0.5 };
    s.visible = false;
    gem.add(s); glints.push(s);
  }
  const bigGlint = new THREE.Sprite(new THREE.SpriteMaterial({
    map: starTex, blending: THREE.AdditiveBlending, depthTest: false, transparent: true, toneMapped: false, opacity: 0,
  }));
  bigGlint.visible = false; scene.add(bigGlint);
  const gp = geo.userData.glintPoints;
  function fireGlint(sizeMul = 1) {
    const s = glints.find((g) => !g.visible); if (!s) return;
    s.position.copy(gp[Math.floor(Math.random() * gp.length)]);
    s.userData.life = 0; s.userData.max = 0.25 + Math.random() * 0.35;
    s.userData.size = (0.35 + Math.random() * 0.55) * sizeMul;
    s.material.rotation = Math.random() * 0.6 - 0.3;
    s.visible = true;
  }

  // Post: bloom makes the fire read
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.55, 0.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------- state ---------- */
  const st = {
    slot: null, yearSlot: null,
    pos: new THREE.Vector3(), scale: 0.0001, snap: true,
    spin: 0.35, spinTarget: 0.35, rotBoost: 0,
    pulse: 0, level: () => 0, glintRate: 0.6, glintAcc: 0,
    tint: PINK.clone(), tintTarget: PINK.clone(),
    yearOpacity: 0, yearOpacityTarget: 0,
    ptr: { x: 0, y: 0 }, tiltX: 0, tiltZ: 0,
    out: null, running: true, hidden: false,
  };

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // backdrop always overfills the frame
    const vh = 2 * (CAMZ - backdrop.position.z) * Math.tan((FOV * Math.PI) / 360);
    backdrop.scale.set(vh * camera.aspect * 1.1, vh * 1.1, 1);
  }
  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('pointermove', (e) => {
    st.ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
    st.ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // DOM rect -> world placement at depth z
  function placeFromRect(r, z) {
    const H = window.innerHeight, W = window.innerWidth;
    const k = (2 * (CAMZ - z) * Math.tan((FOV * Math.PI) / 360)) / H;
    return { x: (r.left + r.width / 2 - W / 2) * k, y: -(r.top + r.height / 2 - H / 2) * k, w: r.width * k, h: r.height * k };
  }

  // Adaptive quality: if a device can't hold ~28fps, step down
  // (2 = full, 1 = 1x pixel ratio, 0 = no bloom).
  let quality = 2, useBloom = true, fpsT = 0, fpsN = 0;
  function degrade() {
    quality--;
    if (quality === 1) { renderer.setPixelRatio(1); resize(); }
    if (quality === 0) useBloom = false;
  }

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

    // layout
    if (st.slot && !st.out) {
      const r = st.slot.getBoundingClientRect();
      if (r.width > 0) {
        const p = placeFromRect(r, 0);
        const sc = Math.min(p.w / 2, (p.h / 1.25)) * 0.92;
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
    // year texture: redraw at most ~20x/sec (each redraw is a GPU upload)
    if (yearDirty && now - yearDrawnAt > 50) { drawYear(); yearDirty = false; yearDrawnAt = now; }
    st.yearOpacity += (st.yearOpacityTarget - st.yearOpacity) * ease(5);
    yearMat.opacity = st.yearOpacity;

    // motion
    const lvl = Math.max(0, Math.min(1, st.level() || 0));
    st.spin += (st.spinTarget - st.spin) * ease(2.5);
    gem.rotation.y += dt * (st.spin + st.rotBoost + lvl * 0.5);
    st.rotBoost *= Math.exp(-dt * 2);
    st.tiltX += ((reduceMotion ? 0 : st.ptr.y * 0.22) - st.tiltX) * ease(3);
    st.tiltZ += ((reduceMotion ? 0 : -st.ptr.x * 0.16) - st.tiltZ) * ease(3);
    tilt.rotation.x = 0.32 + st.tiltX; tilt.rotation.z = st.tiltZ;
    tilt.position.copy(st.pos);
    // a slow float so it never looks parked
    tilt.position.y += Math.sin(now / 1400) * 0.03 * st.scale;
    tilt.scale.setScalar(Math.max(st.scale, 0.0001));

    // light from inside: ring pulses + her voice
    st.pulse *= Math.exp(-dt * 3.2);
    st.tint.lerp(st.tintTarget, ease(2));
    const glow = st.pulse * 1.5 + lvl * 0.55;
    inner.material.emissive.copy(st.tint); inner.material.emissiveIntensity = glow * 0.55;
    outer.material.emissive.copy(st.tint); outer.material.emissiveIntensity = glow * 0.05;
    lp.color.copy(st.tint);
    lp.intensity = 30 + glow * 14;
    bloom.strength = 0.4 + st.pulse * 0.42 + lvl * 0.12;

    // glints
    st.glintAcc += dt * (st.glintRate + lvl * 3 + st.pulse * 3);
    while (st.glintAcc > 1) { st.glintAcc -= 1; fireGlint(); }
    for (const s of glints) {
      if (!s.visible) continue;
      s.userData.life += dt;
      const t = s.userData.life / s.userData.max;
      if (t >= 1) { s.visible = false; s.material.opacity = 0; continue; }
      const a = Math.sin(t * Math.PI);
      s.material.opacity = a;
      s.scale.setScalar(s.userData.size * (0.4 + a));
    }

    // outro: the stone collapses into one glint
    if (st.out) {
      const o = st.out; o.t += dt;
      const p = Math.min(1, o.t / o.dur);
      st.rotBoost = 6 * p;
      tilt.scale.setScalar(Math.max(0.0001, o.fromScale * (1 - p) ** 2));
      bigGlint.visible = true;
      bigGlint.position.copy(o.at);
      const g = Math.sin(Math.min(1, p * 1.25) * Math.PI);
      bigGlint.material.opacity = g;
      bigGlint.scale.setScalar(o.fromScale * (0.5 + g * 5));
      bloom.strength = 0.6 + g * 2.2;
      if (!o.peaked && p >= o.peakAt) { o.peaked = true; o.onPeak && o.onPeak(); }
      if (p >= 1 && !o.done) { o.done = true; bigGlint.visible = false; o.onDone && o.onDone(); }
    }

    if (useBloom) composer.render(dt); else renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  /* ---------- public API ---------- */
  return {
    setSlot(el, { snap = false } = {}) { st.slot = el; if (snap) st.snap = true; },
    setYearSlot(el) { st.yearSlot = el; },
    setYear(text, color) {
      const c = color || yearColor;
      if (text === yearText && c === yearColor) return;
      yearText = String(text); yearColor = c; yearDirty = true;
    },
    showYear(on) { st.yearOpacityTarget = typeof on === 'number' ? on : (on ? 1 : 0); },
    ring() { st.pulse = Math.max(st.pulse, 0.6); st.rotBoost += 0.6; for (let i = 0; i < 3; i++) fireGlint(1.2); },
    flash(s = 1.4) { st.pulse = Math.max(st.pulse, s); st.rotBoost += 2.5; for (let i = 0; i < 6; i++) fireGlint(1.6); },
    setLevel(fn) { st.level = fn || (() => 0); },
    setSpin(s) { st.spinTarget = s; },
    kick(v = 1) { st.rotBoost += v; },
    setGlintRate(r) { st.glintRate = r; },
    setTint(hex) { st.tintTarget.set(hex); },
    // Spins up, collapses into a single star-glint. onPeak fires at max flare.
    outro({ dur = 1.0, peakAt = 0.55 } = {}) {
      return new Promise((resolve) => {
        st.out = {
          t: 0, dur, peakAt, peaked: false, done: false,
          fromScale: st.scale, at: st.pos.clone().add(new THREE.Vector3(0, 0.15 * st.scale, 0.5)),
          onPeak: resolve, onDone: null,
        };
      });
    },
    stop() {
      st.running = false;
      window.removeEventListener('resize', resize);
      try { renderer.dispose(); pmrem.dispose(); } catch (e) { }
    },
  };
}
