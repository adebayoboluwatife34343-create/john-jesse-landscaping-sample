export default function build({ THREE, scene, root, cam, RM }) {
  scene.add(new THREE.HemisphereLight(0xfff6df, 0x4cc07a, 1.15));
  const key = new THREE.DirectionalLight(0xfff0c8, 2.3); key.position.set(5, 8, 6); scene.add(key);
  const std = (c, r = .85, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, flatShading: true }, o));
  const ease = (x) => x * x * (3 - 2 * x), seg = (p, a, b) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))));
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7, .6, 56), std(0x67cf80, 1)); ground.position.y = -.3; root.add(ground);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, .4, 56), std(0x8b5a2b, 1)); soil.position.y = -.8; root.add(soil);
  // tree
  const tree = new THREE.Group(); tree.position.set(-1.8, 0, -.8); root.add(tree);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(.22, .36, 2.2, 10), std(0x8a5a30)); tr.position.y = 1.1; tree.add(tr);
  const fol = []; [[0, 3, 0, 1.5, 0x3fae66], [-.9, 2.6, .3, 1.1, 0x4cc07a], [.9, 2.7, -.2, 1.15, 0x58cf84], [0, 3.8, .1, 1.0, 0x4cc07a]].forEach(([x, y, z, r, c]) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), std(c)); m.position.set(x, y, z); tree.add(m); fol.push(m); });
  // hedge (noisy -> trimmed)
  const hedges = [], hg = []; for (let i = 0; i < 4; i++) {
    const g = new THREE.BoxGeometry(1.5, 1, 1, 6, 4, 4); const base = g.attributes.position.array.slice(); const m = new THREE.Mesh(g, std(0x2f9a58)); m.position.set(1 + i * 1.5 - 1.2 + 0, .5, 2.6); hedges.push(m); hg.push({ g, base, seed: i * 7 }); root.add(m);
  }
  // mulch ring
  const mulch = new THREE.Mesh(new THREE.RingGeometry(.5, 2.1, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6b3f1f, roughness: 1 })); mulch.position.set(-1.8, .02, -.8); mulch.scale.setScalar(.001); root.add(mulch);
  // gravel path
  const gravel = new THREE.Group(); root.add(gravel); const gm = std(0xcdc7bb, 1);
  for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.13 + Math.random() * .06), gm); const t = i / 70; m.position.set(-.3 + Math.sin(t * 5) * .4 + (Math.random() - .5) * .8, .08, 5.4 - t * 6 - 0); m.userData.t = t; m.scale.setScalar(.001); gravel.add(m); }
  gravel.position.set(-.5, 0, -1.5);
  // patio tiles to wash
  const patio = new THREE.Group(); patio.position.set(3.3, 0, -1.4); root.add(patio); const tiles = [], dirty = new THREE.Color(0x7d6b4c), clean = new THREE.Color(0xf6f1e4);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const m = new THREE.MeshStandardMaterial({ color: dirty.clone(), roughness: .9, flatShading: true }); const t = new THREE.Mesh(new THREE.BoxGeometry(.72, .1, .72), m); t.position.set(i * .76 - 1.1, .05, j * .76 - 1.1); patio.add(t); tiles.push({ m, k: (i + j) / 6 }); }
  const spray = new THREE.Mesh(new THREE.ConeGeometry(.4, 1.5, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: .4, side: THREE.DoubleSide })); spray.position.y = .9; patio.add(spray);
  // lights
  const lights = [], lm = [0xffc531, 0xff7a5c, 0x7fe3b0, 0x8fd3f4];
  for (let i = 0; i < 44; i++) { const a = i / 44 * 6.283; const m = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 8), new THREE.MeshBasicMaterial({ color: lm[i % 4] })); m.userData = { a, i }; m.visible = false; root.add(m); lights.push(m); }
  // sun
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.8, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffc531 })); sun.position.set(4.6, 5, -6); scene.add(sun);
  return {
    update({ t, p, px, py, rot, RM }) {
      const grow = seg(p, .08, .3), trim = seg(p, .3, .5), mu = seg(p, .5, .66), wash = seg(p, .66, .82), xm = seg(p, .84, .98);
      tree.scale.setScalar(.35 + .65 * Math.max(grow, p > .08 ? 0 : p / .08 * .0)); tree.scale.y = .2 + .8 * (p < .08 ? p / .08 * .3 + .0 : grow * .7 + .3);
      if (p < .08) tree.scale.setScalar(.5 + p * 3);
      fol.forEach((f, i) => { const s = RM ? 1 : 1 + Math.sin(t * 1.2 + i) * .015; f.scale.setScalar(s); f.rotation.y = px * .1; });
      hedges.forEach((h, i) => {
        const o = hg[i], pos = h.geometry.attributes.position; const amp = (1 - trim) * .2;
        for (let v = 0; v < pos.count; v++) { const x = o.base[v * 3], y = o.base[v * 3 + 1], z = o.base[v * 3 + 2]; const n = Math.sin(x * 9 + o.seed) * Math.cos(y * 7 + z * 5 + o.seed * .3); const edge = (Math.abs(x) > .7 || Math.abs(z) > .45 || y > .45) ? 1 : 0; pos.setXYZ(v, x + n * amp * edge * .6, y + n * amp * edge * (y > 0 ? 1 : .2), z + n * amp * edge * .6); }
        pos.needsUpdate = true; h.geometry.computeVertexNormals(); h.scale.y = .55 + .35 * grow; h.position.y = .5 * h.scale.y;
      });
      mulch.scale.setScalar(.001 + mu); gravel.children.forEach(g => { const k = Math.min(1, Math.max(0, (mu * 1.3 - g.userData.t * .8) * 3)); g.scale.setScalar(.001 + k); });
      tiles.forEach(o => o.m.color.copy(dirty).lerp(clean, Math.min(1, Math.max(0, wash * 1.5 - o.k * .5))));
      spray.visible = wash > .02 && wash < .98; spray.position.x = -1.1 + wash * 2.2; spray.position.z = Math.sin(wash * 14) * .9; spray.material.opacity = .25 + (RM ? 0 : Math.sin(t * 20) * .1);
      lights.forEach(l => { const u = l.userData, on = xm * 44 > u.i; l.visible = on; const a = u.a; l.position.set(-1.8 + Math.cos(a) * (1.7 - (u.i % 3) * .3), 2 + (u.i % 11) * .22, -.8 + Math.sin(a) * (1.7 - (u.i % 3) * .3)); const tw = RM ? 1 : .6 + .4 * Math.sin(t * 4 + u.i); l.scale.setScalar(1.7 + tw * 1.3); });
      sun.position.x = 4.6 + px * .8; sun.position.y = 5 - py * .5;
      root.rotation.y = Math.max(-1.2, Math.min(1.2, rot * .5 + px * .15 - .25 + p * .3)); root.rotation.x = py * .04;
      cam.position.x = px * .4; cam.position.y = 5.6 - py * .4 - p * .4; cam.lookAt(0, 1.2, .3);
    }
  };
}
