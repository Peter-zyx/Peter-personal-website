import { DEFAULTS, frame, duration } from './f2-core.mjs';
const $ = selector => document.querySelector(selector);
let model, time = 0, playing = false, stamp = null, span = 6, max = 1;
let p = { ...DEFAULTS };
const values = [];
function draw() {
  const f = frame(model, p, time);
  $('#heatmap').replaceChildren(...f.map.map(value => {
    const cell = document.createElement('span');
    const intensity = Math.min(1, value / max);
    cell.style.background = `hsl(143 25% ${14 + intensity * 65}%)`;
    cell.style.color = intensity > .6 ? '#142c1e' : '#ecf7ec';
    cell.textContent = value.toFixed(2);
    return cell;
  }));
  $('#heatmap').setAttribute('aria-label', `Illuminance in lux at ${p.distance / 1000} metres. Minimum ${f.minimum.toFixed(2)}, mean ${f.mean.toFixed(2)}.`);
  $('#minimum').textContent = f.minimum.toFixed(2);
  $('#mean').textContent = f.mean.toFixed(2);
  $('#active-state').textContent = `${f.state.replaceAll('_', ' ')} / ${f.colour === 'red' ? 'Red policy · uncalibrated spectrum' : f.colour === 'off' ? 'Lights off' : 'White policy'}`;
  $('#time').value = time;
  $('#clock').textContent = `${time.toFixed(2)} s`;
  $('#warning').textContent = f.state === 'slewing' && p.regime === 'A' ? 'Slew blanking conflicts with the Regime A lighting floor.' : f.colour === 'red' ? 'Capture lux uses an equal-flux monochromatic proxy, not actual red output.' : '';
  const x = 8 + 484 * time / span;
  $('#playhead')?.setAttribute('x1', x);
  $('#playhead')?.setAttribute('x2', x);
}
function pause() { playing = false; stamp = null; $('#play').textContent = 'Play'; }
function reset() {
  pause(); time = 0;
  p = { ...DEFAULTS, state: $('#state').value, distance: Number($('#distance').value), regime: $('#regime').value };
  span = duration(p); $('#time').max = span;
  values.length = 0; max = 0;
  for (let i = 0; i <= 200; i++) {
    const f = frame(model, p, span * i / 200); values.push(f.mean); max = Math.max(max, ...f.map);
  }
  max = Math.max(max, .001);
  const peak = Math.max(...values, .001);
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${8 + i * 484 / 200},${91 - v / peak * 72}`).join(' ');
  $('#trace').innerHTML = `<path d="${path}" fill="none" stroke="#b3d7b8" stroke-width="2"/><line x1="8" x2="492" y1="92" y2="92" stroke="#405d4a"/><line id="playhead" x1="8" x2="8" y1="12" y2="94" stroke="#dcb59d" stroke-dasharray="3 3"/><text x="8" y="8" fill="#a3baa9" font-size="8">${peak.toFixed(2)} lx</text><text x="464" y="104" fill="#a3baa9" font-size="8">${span} s</text>`;
  draw();
}
function tick(now) {
  if (playing && !document.hidden) {
    if (stamp !== null) time = Math.min(span, time + Math.min(.1, (now - stamp) / 1000));
    stamp = now; draw(); if (time >= span) pause();
  } else stamp = null;
  requestAnimationFrame(tick);
}
try {
  const response = await fetch('./data/f2-model.json'); if (!response.ok) throw Error('Model data unavailable');
  model = await response.json(); reset();
  for (const id of ['state','distance','regime']) $(`#${id}`).addEventListener('change', reset);
  $('#play').disabled = $('#restart').disabled = $('#time').disabled = false;
  $('#play').onclick = () => { if (playing) pause(); else { if (time >= span) time = 0; playing = true; stamp = null; $('#play').textContent = 'Pause'; } };
  $('#restart').onclick = () => { pause(); time = 0; draw(); };
  $('#time').oninput = () => { pause(); time = Number($('#time').value); draw(); };
  $('#status').textContent = 'W45_N12_G10 / 12 per-source responses · Preview uses sampled curves. The full app calculates and exports at 0.5 ms.';
  requestAnimationFrame(tick);
} catch (error) { $('#status').textContent = 'The preview could not load. Open the full app or reload to retry.'; console.error(error); }
