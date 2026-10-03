// Shared deck bootstrap: reveal.js + KaTeX auto-render + lazy widget mounting.
// Usage in a lecture: <script type="module" src="../../shared/deck.js"></script>
// Widgets: <div data-widget="warp2d" data-config='{"preset":"skew"}'></div>
import Reveal from '../vendor/reveal/reveal.mjs';
import Notes from '../vendor/reveal/plugin/notes.mjs';

const widgetModules = {
  warp2d: () => import('./widgets/warp2d.js'),
  homog: () => import('./widgets/homog.js'),
  imgops: () => import('./widgets/imgops.js'),
  shear3d: () => import('./widgets/shear3d.js'),
  slido: () => import('./widgets/slido.js'),
  rot3d: () => import('./widgets/rot3d.js'),
  camera3d: () => import('./widgets/camera3d.js'),
  distort: () => import('./widgets/distort.js'),
  order2d: () => import('./widgets/order2d.js'),
  fwdbwd: () => import('./widgets/fwdbwd.js'),
  lines2d: () => import('./widgets/lines2d.js'),
  pinhole3d: () => import('./widgets/pinhole3d.js'),
  teaser: () => import('./widgets/teaser.js'),
  rigid3d: () => import('./widgets/rigid3d.js'),
  pinhole2d: () => import('./widgets/pinhole2d.js'),
  lens2d: () => import('./widgets/lens2d.js'),
};

function renderMath(root) {
  window.renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
  });
}

async function mountWidget(el) {
  if (el.dataset.mounted) return;
  el.dataset.mounted = '1';
  const gen = el.dataset.gen = String((+el.dataset.gen || 0) + 1);
  const load = widgetModules[el.dataset.widget];
  if (!load) { el.textContent = `Unknown widget: ${el.dataset.widget}`; return; }
  const config = el.dataset.config ? JSON.parse(el.dataset.config) : {};
  const mod = await load();
  if (el.dataset.gen !== gen || !el.dataset.mounted) return; // unmounted while loading
  mod.mount(el, config);
}

// Browsers allow only ~16 live WebGL contexts; release widgets on slides we are not near.
function unmountWidget(el) {
  if (!el.dataset.mounted) return;
  el.querySelectorAll('canvas').forEach(c => {
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  el.replaceChildren();
  el.removeAttribute('style');
  el.classList.remove('widget');
  delete el.dataset.mounted;
  el.dataset.gen = String((+el.dataset.gen || 0) + 1);
}

const deck = new Reveal({
  width: 1280,
  height: 720,
  margin: 0.04,
  hash: true,
  slideNumber: 'c/t',
  transition: 'fade',
  transitionSpeed: 'fast',
  center: false,
  pdfSeparateFragments: false,
  plugins: [Notes],
});

await deck.initialize();
renderMath(document.querySelector('.reveal .slides'));

// Mount widgets on the current slide and its neighbours; in print view mount everything.
function mountAround() {
  if (deck.isPrintView()) {
    document.querySelectorAll('[data-widget]').forEach(mountWidget);
    return;
  }
  const cur = deck.getCurrentSlide();
  const keep = [cur?.previousElementSibling, cur, cur?.nextElementSibling].filter(Boolean);
  document.querySelectorAll('.reveal .slides section').forEach(sec => {
    if (!keep.includes(sec)) sec.querySelectorAll('[data-widget][data-mounted]').forEach(unmountWidget);
  });
  keep.forEach(s => s.querySelectorAll('[data-widget]').forEach(mountWidget));
}

deck.on('ready', mountAround);
deck.on('slidechanged', mountAround);
mountAround();

window.deck = deck;
