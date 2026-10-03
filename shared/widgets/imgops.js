// Gallery of photometric vs geometric operations applied to the test image.
// config: { group: "photometric" | "geometric", tile: [w, h] }
import { h, testImage, inv3 } from './util.js';

const PHOTOMETRIC = [
  ['original', g => g],
  ['brightness +40%', 'brightness(1.4)'],
  ['contrast −50%', 'contrast(0.5)'],
  ['greyscale', 'grayscale(1)'],
  ['hue shift', 'hue-rotate(120deg)'],
  ['blur', 'blur(2.5px)'],
  ['noise', 'noise'],
];

const GEOMETRIC = [
  ['original', { m: [1, 0, 0, 1, 0, 0] }],
  ['crop + resize', { crop: [0.45, 0.25, 0.5, 0.5] }],
  ['horizontal flip', { m: [-1, 0, 0, 1, 1, 0] }],
  ['rotate 20°', { rot: 20 }],
  ['scale ×0.6', { m: [0.6, 0, 0, 0.6, 0.2, 0.2] }],
  ['skew', { m: [1, 0, 0.4, 1, -0.2, 0] }],
  ['perspective', { H: [0.8, 0.12, 0.08, 0.0, 0.9, 0.05, -0.25, 0.15, 1] }],
];

export function mount(el, cfg) {
  const [TW, TH] = cfg.tile || [150, 112];
  const ops = cfg.group === 'geometric' ? GEOMETRIC : PHOTOMETRIC;
  const names = cfg.ops;
  const src = testImage(320, 240);
  el.classList.add('widget');
  const row = h('div', { style: 'display:flex; gap:0.5em; flex-wrap:wrap' });
  for (const [label, op] of ops) {
    if (names && !names.includes(label)) continue;
    const c = h('canvas', { width: TW, height: TH });
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, TW, TH);
    if (cfg.group === 'geometric') drawGeometric(g, src, op, TW, TH);
    else drawPhotometric(g, src, op, TW, TH);
    row.append(h('div', { style: 'text-align:center' }, c, h('div', { class: 'dim', style: 'margin-top:0.15em' }, label)));
  }
  el.append(row);
}

function drawPhotometric(g, src, op, W, H) {
  if (typeof op === 'string' && op !== 'noise') g.filter = op;
  g.drawImage(src, 0, 0, W, H);
  g.filter = 'none';
  if (op === 'noise') {
    const d = g.getImageData(0, 0, W, H);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
    for (let i = 0; i < d.data.length; i += 4) {
      const n = rnd() * 110;
      d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
    }
    g.putImageData(d, 0, 0);
  }
}

function drawGeometric(g, src, op, W, H) {
  if (op.crop) {
    const [x, y, w, hh] = op.crop;
    g.drawImage(src, x * src.width, y * src.height, w * src.width, hh * src.height, 0, 0, W, H);
  } else if (op.m) {
    const [a, b, c, d, e, f] = op.m; // in units of the tile size
    g.setTransform(a, b, c, d, e * W, f * H);
    g.drawImage(src, 0, 0, W, H);
    g.setTransform(1, 0, 0, 1, 0, 0);
  } else if (op.rot) {
    g.translate(W / 2, H / 2); g.rotate(op.rot * Math.PI / 180); g.translate(-W / 2, -H / 2);
    g.drawImage(src, 0, 0, W, H);
    g.setTransform(1, 0, 0, 1, 0, 0);
  } else if (op.H) {
    // backward warp with a homography in normalised [0,1]^2 tile coordinates
    const Hm = op.H, sg = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    const out = g.createImageData(W, H);
    const inv = inv3(Hm);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x / W, Y = y / H;
      const w = inv[6] * X + inv[7] * Y + inv[8];
      const u = (inv[0] * X + inv[1] * Y + inv[2]) / w, v = (inv[3] * X + inv[4] * Y + inv[5]) / w;
      const di = 4 * (y * W + x);
      if (u < 0 || v < 0 || u >= 1 || v >= 1) { out.data[di + 3] = 255; continue; }
      const si = 4 * (Math.floor(v * src.height) * src.width + Math.floor(u * src.width));
      out.data[di] = sg[si]; out.data[di + 1] = sg[si + 1]; out.data[di + 2] = sg[si + 2]; out.data[di + 3] = 255;
    }
    g.putImageData(out, 0, 0);
  }
}
