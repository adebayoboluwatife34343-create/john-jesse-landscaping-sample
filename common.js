import * as THREE from './three.module.min.js';
export { THREE };
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const st = { px: 0, py: 0 };
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
export { $, $$ };

/* pointer, reveal, nav, intro */
export function initCommon({ introMs = 3200 } = {}) {
  if (!RM) addEventListener('pointermove', e => { st.px = e.clientX / innerWidth * 2 - 1; st.py = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.rv').forEach(el => io.observe(el));
  const menu = $('#menu'), nav = $('#nav');
  if (menu && nav) {
    menu.addEventListener('click', () => { const o = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', o); });
    $$('a', nav).forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', false); }));
    addEventListener('keydown', e => { if (e.key === 'Escape') { nav.classList.remove('open'); menu.setAttribute('aria-expanded', false); } });
  }
  const intro = $('#intro');
  if (intro) {
    const done = () => { intro.classList.add('out'); document.body.classList.add('ready'); setTimeout(() => intro.remove(), 900); };
    if (RM) { intro.remove(); document.body.classList.add('ready'); }
    else {
      requestAnimationFrame(() => intro.classList.add('go'));
      const t = setTimeout(done, introMs);
      const skip = () => { clearTimeout(t); done(); };
      $('.skip', intro)?.addEventListener('click', skip);
      addEventListener('keydown', e => { if (e.key === 'Escape') skip(); }, { once: true });
    }
  } else document.body.classList.add('ready');
  // scroll progress css var
  const sp = () => document.documentElement.style.setProperty('--sp', (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(4));
  if (!RM) { addEventListener('scroll', sp, { passive: true }); sp(); }
}

/* WhatsApp quote form: opens wa.me with a ready message, never submits anywhere */
export function initForm(form, build) {
  const status = $('.fstatus', form);
  $$('[data-pick]', form).forEach(b => b.addEventListener('click', () => {
    const inp = $('[name=service]', form), val = b.dataset.pick, cur = inp.value ? inp.value.split(', ') : [];
    const i = cur.indexOf(val); i > -1 ? cur.splice(i, 1) : cur.push(val);
    inp.value = cur.join(', '); b.classList.toggle('on', i === -1); b.setAttribute('aria-pressed', i === -1);
  }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (!d.name?.trim() || !d.details?.trim()) { status.textContent = 'Please add your name and a few details about the job.'; status.className = 'fstatus bad'; (!d.name?.trim() ? form.elements.name : form.elements.details).focus(); return; }
    const text = build(d);
    const url = 'https://wa.me/' + form.dataset.wa + '?text=' + encodeURIComponent(text);
    status.textContent = 'Opening WhatsApp with your message ready. Nothing is sent until you press send there.'; status.className = 'fstatus ok';
    const w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url;
  });
}

/* 3D stage: lazy, visibility-aware, drag + keyboard + pointer + scroll aware */
export function mountStage(el, build, o = {}) {
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' }); } catch (e) { el.classList.add('nogl'); return null; }
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(r.domElement);
  r.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(o.fov || 35, 1, .1, 200);
  const cp = o.cam || [0, 1.5, 9]; cam.position.set(...cp);
  const root = new THREE.Group(); scene.add(root);
  const api = build({ THREE, scene, root, cam, RM }) || {};
  const slider = o.slider ? $(o.slider) : null; let touched = false;
  if (slider) { slider.addEventListener('input', () => { touched = true; }); }
  let vis = true, drag = 0, vel = 0, lx = null, rotY = o.rot ?? 0, pp = 0, lp = 0, last = performance.now(), T = 0;
  new IntersectionObserver(es => { vis = es[0].isIntersecting; if (vis) { last = performance.now(); loop(); } }, { rootMargin: '100px' }).observe(el);
  const size = () => { const w = el.clientWidth || 300, h = el.clientHeight || 300; r.setSize(w, h, false); r.domElement.style.width = '100%'; r.domElement.style.height = '100%'; cam.aspect = w / h; cam.updateProjectionMatrix(); if (api.resize) api.resize(w, h, cam); };
  new ResizeObserver(size).observe(el); size();
  el.addEventListener('pointerdown', e => { lx = e.clientX; el.setPointerCapture?.(e.pointerId); el.classList.add('drag'); });
  el.addEventListener('pointermove', e => { if (lx !== null) { const dx = e.clientX - lx; lx = e.clientX; rotY += dx * .01; vel = dx * .01; } });
  const up = () => { lx = null; el.classList.remove('drag'); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') rotY -= .2; if (e.key === 'ArrowRight') rotY += .2; if (api.key) api.key(e); });
  function prog() { if (o.progress) return o.progress(); const b = el.getBoundingClientRect(); const v = innerHeight; return Math.min(1, Math.max(0, (v - b.top) / (v + b.height))); }
  function loop() {
    if (!vis || document.hidden) return;
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!RM) T += dt;
    const target = RM ? (o.progress ? o.progress() : .5) : prog(); pp += (target - pp) * (RM ? 1 : .08);
    const eff = slider ? (touched ? +slider.value / 100 : (slider.value = Math.round(pp * 100), pp)) : pp;
    if (!RM) { rotY += vel; vel *= .92; }
    const ctx = { t: T, dt, p: eff, scroll: pp, px: RM ? 0 : st.px, py: RM ? 0 : st.py, rot: rotY, cam, root, scene, drag: lx !== null, RM };
    if (api.update) api.update(ctx); else root.rotation.y = rotY;
    r.render(scene, cam);
    if (!RM || lx !== null || touched) requestAnimationFrame(loop); else { /* RM: render on demand */ requestAnimationFrame(() => { }); setTimeout(loop, 250); }
  }
  loop();
  return { r, api, release() { touched = false; } };
}
