export {};

// An elastic halo, a precise cursor tip, and a short trail.
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const cursor = document.createElement('div');
cursor.className = 'site-pointer';
cursor.setAttribute('aria-hidden', 'true');
for (const part of ['ring', 'core', 'label']) {
  const element = document.createElement('span');
  element.className = `pointer-${part}`;
  cursor.append(element);
}
const label = cursor.querySelector<HTMLElement>('.pointer-label')!;
const trails = Array.from({ length: 3 }, (_, index) => {
  const element = document.createElement('span');
  element.className = 'pointer-trail'; element.setAttribute('aria-hidden', 'true');
  element.style.setProperty('--trail-size', `${6 - index}px`);
  return { element, x: 0, y: 0 };
});
const waves = new Set<HTMLElement>();
const pointer = { x: 0, y: 0 };
const target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
let enabled = false;
let frame = 0;
let lastFrame = 0;

function draw(now: number) {
  const delta = Math.min((now - lastFrame) / 1000, .05);
  lastFrame = now;
  const dx = target.x - current.x, dy = target.y - current.y;
  const distance = Math.hypot(dx, dy);
  const ease = 1 - Math.exp(-delta * 18);
  current.x += dx * ease; current.y += dy * ease;
  cursor.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
  cursor.style.setProperty('--pointer-angle', `${Math.atan2(dy, dx)}rad`);
  cursor.style.setProperty('--pointer-stretch', String(1 + Math.min(distance / 170, .4)));
  cursor.style.setProperty('--pointer-squash', String(1 - Math.min(distance / 340, .2)));
  cursor.style.setProperty('--tip-x', `${pointer.x - current.x}px`);
  cursor.style.setProperty('--tip-y', `${pointer.y - current.y}px`);
  let followX = pointer.x, followY = pointer.y;
  let unsettled = distance;
  trails.forEach((trail, index) => {
    const blend = 1 - Math.exp(-delta * (15 - index * 3));
    unsettled += Math.hypot(followX - trail.x, followY - trail.y);
    trail.x += (followX - trail.x) * blend; trail.y += (followY - trail.y) * blend;
    trail.element.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0) translate(-50%, -50%)`;
    trail.element.style.opacity = String(Math.min(distance / 45, .55) * (1 - index * .18));
    followX = trail.x; followY = trail.y;
  });
  if (unsettled > .25) frame = requestAnimationFrame(draw);
  else frame = 0;
}

function move(event: PointerEvent) {
  if (!enabled || event.pointerType !== 'mouse') return;
  pointer.x = target.x = event.clientX; pointer.y = target.y = event.clientY;
  const control = event.target instanceof Element ? event.target.closest('a, button, summary, [role="button"]') : null;
  const interactive = !!control && !(control instanceof HTMLButtonElement && control.disabled);
  const artwork = interactive && !!control?.matches('[data-project-visual]');
  if (interactive && control && !artwork) {
    const bounds = control.getBoundingClientRect();
    if (bounds.width < 140 && bounds.height < 90) {
      target.x += Math.max(-12, Math.min(12, bounds.left + bounds.width / 2 - pointer.x)) * .55;
      target.y += Math.max(-12, Math.min(12, bounds.top + bounds.height / 2 - pointer.y)) * .55;
    }
  }
  if (!cursor.classList.contains('is-active')) {
    current.x = pointer.x; current.y = pointer.y;
    trails.forEach(trail => { trail.x = pointer.x; trail.y = pointer.y; });
    cursor.classList.add('is-active');
  }
  cursor.classList.toggle('is-over-link', interactive && !artwork);
  cursor.classList.toggle('is-over-artwork', artwork);
  cursor.classList.toggle('is-over-control', interactive && !artwork && !control?.matches('a'));
  label.textContent = artwork ? 'Play' : !interactive ? '' : control?.matches('[data-preview-project]') ? 'Preview' : control?.matches('a') ? '↗' : '+';
  if (!frame) { lastFrame = performance.now(); frame = requestAnimationFrame(draw); }
}

function hide() {
  cursor.classList.remove('is-active', 'is-pressed');
  trails.forEach(trail => { trail.element.style.opacity = '0'; });
  cancelAnimationFrame(frame); frame = 0;
}

function configure() {
  enabled = fine.matches && !reduce.matches;
  document.documentElement.classList.toggle('has-pointer-effects', enabled);
  if (enabled) document.body.append(...trails.map(trail => trail.element), cursor);
  else {
    hide(); cursor.remove(); trails.forEach(trail => trail.element.remove());
    waves.forEach(wave => wave.remove()); waves.clear();
  }
}

document.addEventListener('pointermove', move, { passive: true });
document.addEventListener('pointerdown', event => {
  if (!enabled || event.pointerType !== 'mouse' || event.button !== 0) return;
  move(event); cursor.classList.add('is-pressed');
  for (let index = 0; index < 3; index++) {
    if (waves.size >= 12) { const first = waves.values().next().value; first?.remove(); if (first) waves.delete(first); }
    const wave = document.createElement('span');
    wave.className = 'site-click-wave'; wave.setAttribute('aria-hidden', 'true');
    wave.style.left = `${event.clientX}px`; wave.style.top = `${event.clientY}px`;
    document.body.append(wave); waves.add(wave);
    const animation = wave.animate([
      { opacity: .65 - index * .12, transform: 'translate(-50%, -50%) scale(.15)' },
      { opacity: 0, transform: `translate(-50%, -50%) scale(${2.5 + index * .3})` },
    ], { duration: 800, delay: index * 80, fill: 'both', easing: 'cubic-bezier(.16, 1, .3, 1)' });
    const remove = () => { wave.remove(); waves.delete(wave); };
    void animation.finished.then(remove, remove);
  }
}, { passive: true });
document.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'), { passive: true });
document.addEventListener('pointercancel', hide);
document.documentElement.addEventListener('pointerleave', hide);
window.addEventListener('blur', hide);
document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
fine.addEventListener('change', configure); reduce.addEventListener('change', configure);
configure();
