const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector<HTMLElement>('.site-header');

function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 24);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

// The same small spatial response on every project collection.
const fineCardPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const cards = [...document.querySelectorAll<HTMLElement>('.project-card')];
function resetCard(card: HTMLElement) {
  card.style.removeProperty('--tilt-x');
  card.style.removeProperty('--tilt-y');
}
cards.forEach(card => {
  card.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !fineCardPointer.matches || event.pointerType !== 'mouse') return;
    const bounds = card.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - .5) * 2));
    card.style.setProperty('--tilt-x', `${-y * 3}deg`);
    card.style.setProperty('--tilt-y', `${x * 3}deg`);
  }, { passive: true });
  card.addEventListener('pointerleave', () => resetCard(card));
});
const resetCards = () => cards.forEach(resetCard);
fineCardPointer.addEventListener('change', resetCards);
reducedMotion.addEventListener('change', resetCards);
window.addEventListener('blur', resetCards);

// Core content is visible without JavaScript. Only off-screen work is revealed.
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  const pending = new Set<HTMLElement>();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const element = entry.target as HTMLElement;
        element.classList.remove('reveal-pending');
        pending.delete(element);
        observer.unobserve(element);
      }
    }
  }, { threshold: 0.05 });

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
    if (element.getBoundingClientRect().top >= window.innerHeight) {
      pending.add(element);
      element.classList.add('reveal-pending');
      observer.observe(element);
    }
  });

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      pending.forEach(element => element.classList.remove('reveal-pending'));
      pending.clear();
      observer.disconnect();
    }
  });
}

document.querySelectorAll<HTMLDetailsElement>('.mobile-menu').forEach(menu => {
  const trigger = menu.querySelector('summary');
  const closeMenu = () => {
    menu.open = false;
    trigger?.focus();
  };

  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) closeMenu();
  });

  menu.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('a')) {
      menu.open = false;
    }
  });

  document.addEventListener('pointerdown', event => {
    if (menu.open && event.target instanceof Node && !menu.contains(event.target)) {
      menu.open = false;
    }
  });
});
