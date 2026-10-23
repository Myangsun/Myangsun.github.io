type ProjectScene = {
  select: (index: number) => void;
  point: (x: number, y: number) => void;
  pulse: () => void;
  visible: (value: boolean) => void;
  dispose: () => void;
};

document.querySelectorAll<HTMLElement>('[data-project-explorer]').forEach(explorer => {
  const rows = [...explorer.querySelectorAll<HTMLAnchorElement>('[data-project-row]')];
  const stage = explorer.querySelector<HTMLElement>('[data-project-stage]')!;
  const visual = explorer.querySelector<HTMLButtonElement>('[data-project-visual]')!;
  const image = explorer.querySelector<HTMLImageElement>('[data-preview-image]')!;
  const title = explorer.querySelector<HTMLElement>('[data-preview-title]')!;
  const summary = explorer.querySelector<HTMLElement>('[data-preview-summary]')!;
  const counter = explorer.querySelector<HTMLElement>('[data-preview-index]')!;
  const topic = explorer.querySelector<HTMLElement>('[data-preview-topic]')!;
  const link = explorer.querySelector<HTMLAnchorElement>('[data-preview-link]')!;
  const status = explorer.querySelector<HTMLElement>('[data-project-announcement]')!;
  const instruction = explorer.querySelector<HTMLElement>('[data-project-instruction]')!;
  const previewButtons = [...explorer.querySelectorAll<HTMLButtonElement>('[data-preview-project]')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const stacked = window.matchMedia('(max-width: 760px)');
  let active = 0;
  let scene: ProjectScene | undefined;
  let starting = false;
  let visible = false;
  let generation = 0;
  let suspended = false;
  let fallbackAnimation: Animation | undefined;

  // Previously shared design-comparison URLs now open the single Spatial design.
  const address = new URL(window.location.href);
  if (address.searchParams.has('view')) {
    address.searchParams.delete('view');
    window.history.replaceState(null, '', address);
  }

  function select(index: number, announce = false) {
    if (index === active && !announce) return;
    active = (index + rows.length) % rows.length;
    const row = rows[active];
    rows.forEach((item, position) => item.classList.toggle('is-active', position === active));
    previewButtons.forEach((button, position) => button.setAttribute('aria-pressed', String(position === active)));
    link.href = row.href;
    link.setAttribute('aria-label', `Open ${row.dataset.title}`);
    title.textContent = row.dataset.title!;
    summary.textContent = row.dataset.summary!;
    topic.textContent = row.dataset.topic!;
    counter.textContent = String(active + 1).padStart(2, '0');
    image.src = row.dataset.cover!;
    scene?.select(active);
    if (announce) status.textContent = `Previewing ${row.dataset.title}, project ${active + 1} of ${rows.length}.`;
  }

  function pulse() {
    if (reduced.matches) return;
    if (scene && visual.classList.contains('is-webgl')) scene.pulse();
    else {
      fallbackAnimation?.cancel();
      fallbackAnimation = image.animate([
        { transform: 'translateY(-50%) perspective(900px) rotateY(-6deg) rotateZ(-2deg)' },
        { transform: 'translateY(-50%) perspective(900px) rotateY(9deg) rotateX(5deg) scale(1.025)' },
        { transform: 'translateY(-50%) perspective(900px) rotateY(-6deg) rotateZ(-2deg)' },
      ], { duration: 800, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    }
  }

  rows.forEach((row, index) => {
    row.addEventListener('pointerenter', event => { if (!stacked.matches && event.pointerType !== 'touch') select(index); });
    row.addEventListener('focus', () => select(index));
  });
  previewButtons.forEach((button, index) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      select(index, true);
      pulse();
      if (stacked.matches) {
        (visual.disabled ? link : visual).focus({ preventScroll: true });
        stage.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });
  visual.addEventListener('click', pulse);
  visual.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      select(active + (event.key === 'ArrowRight' ? 1 : -1), true);
    }
  });

  async function start() {
    if (scene || starting || suspended || document.hidden || !visible || reduced.matches) return;
    starting = true;
    const token = ++generation;
    try {
      const { createProjectScene } = await import('./project-scene.js');
      if (token !== generation || suspended || document.hidden || !visible || reduced.matches) return;
      const created = await createProjectScene(visual, rows.map(row => row.dataset.cover!));
      if (token !== generation || suspended || reduced.matches) { created?.dispose(); return; }
      scene = created;
      scene?.select(active);
      scene?.visible(visible && !document.hidden);
    } catch {
      // Project links and the ordinary image remain available without WebGL.
    } finally {
      starting = false;
      if (token !== generation && !suspended) void start();
    }
  }

  function configure() {
    visual.disabled = reduced.matches;
    instruction.textContent = stacked.matches || !finePointer.matches
      ? 'Tap a number to preview · Tap a title to explore'
      : 'Hover to preview · Click a title to explore';
    if (reduced.matches) {
      generation++;
      scene?.dispose();
      scene = undefined;
      fallbackAnimation?.cancel();
    } else void start();
  }

  explorer.classList.add('is-enhanced');
  instruction.hidden = false;
  configure();
  explorer.addEventListener('pointermove', event => {
    if (!scene || !finePointer.matches || reduced.matches) return;
    const bounds = visual.getBoundingClientRect();
    scene.point(((event.clientX - bounds.left) / bounds.width - .5) * 2, ((event.clientY - bounds.top) / bounds.height - .5) * 2);
  });
  explorer.addEventListener('pointerleave', () => scene?.point(0, 0));
  explorer.addEventListener('pointerdown', event => {
    if (event.target instanceof Element && !event.target.closest('a, button')) pulse();
  });

  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    scene?.visible(visible && !document.hidden);
    if (visible) void start();
  }, { rootMargin: '100px' });
  observer.observe(stage);
  reduced.addEventListener('change', configure);
  stacked.addEventListener('change', configure);
  finePointer.addEventListener('change', configure);
  document.addEventListener('visibilitychange', () => {
    scene?.visible(visible && !document.hidden);
    if (!document.hidden) void start();
  });
  window.addEventListener('pagehide', () => {
    suspended = true; generation++;
    scene?.dispose(); scene = undefined;
    fallbackAnimation?.cancel();
  });
  window.addEventListener('pageshow', () => { suspended = false; void start(); });
});
